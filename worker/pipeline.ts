import { and, desc, eq, gte, isNotNull, ne, sql } from "drizzle-orm";
import { ALVOS_V0 } from "@/config/alvos";
import { STORES, cleanUrl, storeByName, storeForUrl } from "@/config/stores";
import { db, NOTIFY_CHANNEL, pool, schema } from "@/lib/db";
import { COMMUNITIES } from "./collect/communities-config";
import { matchAlvo, targetsFrom } from "./match/alvos";
import { parseOfferText } from "./parse/parser";
import { notaRapida } from "./score/nota";

const { sources, rawMessages, offers, alvos } = schema;

export async function notify(payload: Record<string, unknown>) {
  await pool.query("select pg_notify($1, $2)", [NOTIFY_CHANNEL, JSON.stringify(payload)]);
}

/** Fontes e Alvos v0 entram sozinhos; o usuário não digita nada. */
export async function ensureSeed() {
  for (const c of COMMUNITIES) {
    await db
      .insert(sources)
      .values({ slug: c.slug, kind: "comunidade", name: c.name, url: c.url })
      .onConflictDoUpdate({ target: sources.slug, set: { name: c.name, url: c.url } });
  }
  for (const a of ALVOS_V0) {
    await db
      .insert(alvos)
      .values({ slug: a.slug, name: a.name, terms: a.terms, exclusions: a.exclusions })
      .onConflictDoUpdate({ target: alvos.slug, set: { name: a.name, terms: a.terms, exclusions: a.exclusions } });
  }
}

export async function activeAlvos() {
  return db.select().from(alvos).where(eq(alvos.active, true));
}

export type RawInput = {
  sourceId: number;
  externalId: string;
  title: string;
  text: string;
  url: string | null;
  outboundUrl: string | null;
  imageUrl: string | null;
  storeName?: string | null;
};

/** Grava o item cru (uma vez só) e cria a oferta. Devolve o id da oferta nova, ou null se já existia. */
export async function ingestRaw(input: RawInput): Promise<number | null> {
  const inserted = await db
    .insert(rawMessages)
    .values({
      sourceId: input.sourceId,
      externalId: input.externalId,
      text: input.text,
      url: input.url,
      outboundUrl: input.outboundUrl,
      imageUrl: input.imageUrl,
    })
    .onConflictDoNothing()
    .returning({ id: rawMessages.id });
  if (!inserted.length) return null;
  return createOffer(inserted[0].id, input);
}

async function createOffer(rawId: number, input: RawInput): Promise<number> {
  const parsed = parseOfferText(input.text);
  const alvo = matchAlvo(input.title, await activeAlvos());
  const store =
    (input.outboundUrl && storeForUrl(input.outboundUrl)) || (input.storeName ? storeByName(input.storeName) : null);
  const buyUrl = input.outboundUrl ? cleanUrl(input.outboundUrl) : input.url;
  const [row] = await db
    .insert(offers)
    .values({
      rawMessageId: rawId,
      sourceId: input.sourceId,
      alvoId: alvo?.id ?? null,
      title: input.title.slice(0, 300),
      store: store?.slug ?? null,
      url: buyUrl,
      imageUrl: input.imageUrl,
      priceCardCents: parsed.priceCardCents,
      priceBasis: parsed.priceBasis,
      installments: parsed.installments,
      installmentCents: parsed.installmentCents,
      interest: parsed.interest,
      cashCents: parsed.cashCents,
      listPriceCents: parsed.listPriceCents,
      shippingCents: parsed.shippingCents,
      freeShipping: parsed.freeShipping,
      coupon: parsed.coupon,
      verifyStatus: input.outboundUrl ? "pendente" : "nao_verificado",
      verifyNote: input.outboundUrl ? null : "sem link da loja no post",
    })
    .returning({ id: offers.id });
  if (alvo) await refreshTarget(alvo.id);
  await scoreOffer(row.id);
  return row.id;
}

/** Recalcula preço-alvo e teto do Alvo com as ofertas dos últimos 7 dias. */
export async function refreshTarget(alvoId: number) {
  const rows = await db
    .select({ p: offers.priceCardCents })
    .from(offers)
    .where(and(eq(offers.alvoId, alvoId), isNotNull(offers.priceCardCents), gte(offers.createdAt, sql`now() - interval '7 days'`)));
  const t = targetsFrom(rows.map((r) => r.p!));
  await db.update(alvos).set(t).where(eq(alvos.id, alvoId));
}

export async function scoreOffer(offerId: number) {
  const [o] = await db.select().from(offers).where(eq(offers.id, offerId));
  if (!o) return;
  const alvo = o.alvoId ? (await db.select().from(alvos).where(eq(alvos.id, o.alvoId)))[0] : null;
  const store = o.store ? STORES.find((s) => s.slug === o.store) : null;
  // Calor social: fontes distintas com o mesmo produto (ou título igual) em 15 min.
  const same = o.productId
    ? eq(offers.productId, o.productId)
    : sql`lower(${offers.title}) = lower(${o.title})`;
  const [{ n }] = await db
    .select({ n: sql<number>`count(distinct ${offers.sourceId})::int` })
    .from(offers)
    .where(and(same, gte(offers.createdAt, sql`${o.createdAt}::timestamptz - interval '15 minutes'`)));
  const r = notaRapida({
    priceCardCents: o.priceCardCents,
    targetCents: alvo?.targetCents ?? null,
    ceilingCents: alvo?.ceilingCents ?? null,
    storeTrust: store?.trust ?? null,
    freeShipping: o.freeShipping,
    shippingCents: o.shippingCents,
    sources15: n,
  });
  await db.update(offers).set({ nota: r.nota, notaParts: r.parts }).where(eq(offers.id, offerId));
  await notify({ type: "offer", id: offerId, alvoAtingido: r.alvoAtingido });
}

export async function setSourceStatus(slug: string, status: string, note: string | null) {
  await db.update(sources).set({ status, statusNote: note, lastRunAt: new Date() }).where(eq(sources.slug, slug));
  await notify({ type: "source", slug, status });
}

export async function pendingOffers(limit: number) {
  return db
    .select()
    .from(offers)
    .where(and(eq(offers.verifyStatus, "pendente"), ne(offers.dismissed, true)))
    .orderBy(desc(offers.createdAt))
    .limit(limit);
}
