import { and, desc, eq, gte, isNotNull, ne, notInArray, sql } from "drizzle-orm";
import { ALVOS_V0 } from "@/config/alvos";
import { STORES, cleanUrl, decodeTrackingUrl, storeByName, storeForUrl } from "@/config/stores";
import { db, NOTIFY_CHANNEL, pool, schema } from "@/lib/db";
import { COMMUNITIES } from "./collect/communities-config";
import { VITRINES } from "./collect/vitrines-config";
import { offerFromMessage } from "./ingest/message";
import { matchAlvo, median, targetsFrom, type AlvoLite } from "./match/alvos";
import { bandOf, extractSpecs, type Band } from "./match/specs";
import { parseOfferText } from "./parse/parser";
import { notaRapida } from "./score/nota";

const { sources, rawMessages, offers, alvos, alvoRefs, marketObs, products } = schema;

export async function notify(payload: Record<string, unknown>) {
  await pool.query("select pg_notify($1, $2)", [NOTIFY_CHANNEL, JSON.stringify(payload)]);
}

/** Fontes e Alvos entram sozinhos; o usuário não digita nada. */
export async function ensureSeed() {
  for (const c of COMMUNITIES) {
    await db
      .insert(sources)
      .values({ slug: c.slug, kind: "comunidade", name: c.name, url: c.url })
      .onConflictDoUpdate({ target: sources.slug, set: { name: c.name, url: c.url } });
  }
  for (const v of VITRINES) {
    await db
      .insert(sources)
      .values({ slug: v.slug, kind: "loja", name: v.name, url: v.url })
      .onConflictDoUpdate({ target: sources.slug, set: { name: v.name, url: v.url } });
  }
  for (const a of ALVOS_V0) {
    await db
      .insert(alvos)
      .values({ slug: a.slug, name: a.name, terms: a.terms, exclusions: a.exclusions })
      .onConflictDoUpdate({ target: alvos.slug, set: { name: a.name, terms: a.terms, exclusions: a.exclusions, active: true } });
  }
  // Alvo que saiu da lista (o antigo "Acessórios") fica desligado. Nada é apagado.
  await db
    .update(alvos)
    .set({ active: false })
    .where(notInArray(alvos.slug, ALVOS_V0.map((a) => a.slug)));
}

export async function activeAlvos() {
  return db.select().from(alvos).where(eq(alvos.active, true));
}

/** Alvo, especificações e faixa de um título. Tudo sem IA. */
export function classify<T extends AlvoLite>(title: string, list: T[]) {
  const alvo = matchAlvo(title, list);
  if (!alvo) return { alvo: null, specs: null, band: null as Band | null };
  const specs = extractSpecs(title);
  return { alvo, specs, band: bandOf(alvo.slug, specs) };
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

async function createOffer(rawId: number, input0: RawInput): Promise<number> {
  const input = { ...input0, outboundUrl: input0.outboundUrl ? decodeTrackingUrl(input0.outboundUrl) : null };
  const parsed = parseOfferText(input.text);
  const { alvo, specs, band } = classify(input.title, await activeAlvos());
  const store =
    (input.outboundUrl && storeForUrl(input.outboundUrl)) || (input.storeName ? storeByName(input.storeName) : null);
  const buyUrl = input.outboundUrl ? cleanUrl(input.outboundUrl) : input.url;
  const [row] = await db
    .insert(offers)
    .values({
      rawMessageId: rawId,
      sourceId: input.sourceId,
      alvoId: alvo?.id ?? null,
      specs,
      bandKey: band?.key ?? null,
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
  if (alvo && band) await refreshRef(alvo.id, band.key, band.label);
  await scoreOffer(row.id);
  return row.id;
}

/**
 * Recalcula a referência de uma faixa: mediana, preço-alvo (85%) e teto (115%) dos preços vistos em 7 dias.
 * Entram as ofertas da faixa e os preços de mercado das vitrines; cada produto conta uma vez só.
 * Devolve true se o preço-alvo mudou.
 */
export async function refreshRef(alvoId: number, bandKey: string, label?: string): Promise<boolean> {
  const week = sql`now() - interval '7 days'`;
  const obs = await db
    .select()
    .from(marketObs)
    .where(and(eq(marketObs.alvoId, alvoId), eq(marketObs.bandKey, bandKey), gte(marketObs.seenAt, week)));
  const rows = await db
    .select({ id: offers.id, p: offers.priceCardCents, store: products.store, code: products.storeProductId })
    .from(offers)
    .leftJoin(products, eq(offers.productId, products.id))
    .where(and(eq(offers.alvoId, alvoId), eq(offers.bandKey, bandKey), isNotNull(offers.priceCardCents), gte(offers.createdAt, week)));

  const byProduct = new Map<string, number>();
  for (const o of obs) byProduct.set(`${o.store}:${o.code}`, o.priceCardCents);
  // O preço conferido na loja vale mais que o da vitrine; entre ofertas do mesmo produto, vale o menor.
  const fromOffers = new Map<string, number>();
  for (const r of rows) {
    const key = r.store && r.code ? `${r.store}:${r.code}` : `oferta:${r.id}`;
    fromOffers.set(key, Math.min(fromOffers.get(key) ?? Infinity, r.p!));
  }
  for (const [k, v] of fromOffers) byProduct.set(k, v);

  const prices = [...byProduct.values()];
  const t = targetsFrom(prices);
  const medianCents = prices.length >= 5 ? median(prices) : null;
  const [prev] = await db
    .select()
    .from(alvoRefs)
    .where(and(eq(alvoRefs.alvoId, alvoId), eq(alvoRefs.bandKey, bandKey)));
  const values = { medianCents, ...t, n: prices.length, updatedAt: new Date() };
  await db
    .insert(alvoRefs)
    .values({ alvoId, bandKey, label: label ?? prev?.label ?? bandKey, ...values })
    .onConflictDoUpdate({ target: [alvoRefs.alvoId, alvoRefs.bandKey], set: { ...(label ? { label } : {}), ...values } });
  return (prev?.targetCents ?? null) !== t.targetCents;
}

export async function scoreOffer(offerId: number, opts: { silent?: boolean } = {}) {
  const [o] = await db.select().from(offers).where(eq(offers.id, offerId));
  if (!o) return;
  const ref =
    o.alvoId && o.bandKey
      ? (await db.select().from(alvoRefs).where(and(eq(alvoRefs.alvoId, o.alvoId), eq(alvoRefs.bandKey, o.bandKey))))[0]
      : null;
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
    targetCents: ref?.targetCents ?? null,
    ceilingCents: ref?.ceilingCents ?? null,
    storeTrust: store?.trust ?? null,
    freeShipping: o.freeShipping,
    shippingCents: o.shippingCents,
    sources15: n,
  });
  await db.update(offers).set({ nota: r.nota, notaParts: r.parts }).where(eq(offers.id, offerId));
  if (!opts.silent) await notify({ type: "offer", id: offerId, alvoAtingido: r.alvoAtingido });
}

/**
 * Reclassifica as ofertas dos últimos 7 dias com as regras atuais de Alvo e faixa, recalcula as referências
 * e as notas. Roda quando o worker sobe: é barato e mantém as ofertas antigas coerentes com as regras novas.
 */
export async function rematchOffers(): Promise<{ total: number; changed: number; bands: number }> {
  const list = await activeAlvos();
  const rows = await db
    .select({ id: offers.id, title: offers.title, alvoId: offers.alvoId, bandKey: offers.bandKey, kind: sources.kind, text: rawMessages.text })
    .from(offers)
    .innerJoin(sources, eq(offers.sourceId, sources.id))
    .innerJoin(rawMessages, eq(offers.rawMessageId, rawMessages.id))
    .where(gte(offers.createdAt, sql`now() - interval '7 days'`));
  const bands = new Map<string, { alvoId: number; band: Band }>();
  let changed = 0;
  for (const r of rows) {
    // Mensagem de canal: refaz a escolha do título com as regras atuais (a linha do produto, não a chamada).
    let title = r.title;
    if (r.kind === "telegram") {
      const v = offerFromMessage(r.text, list);
      title = v.kind === "oferta" ? v.title : "";
      if (title && title !== r.title) await db.update(offers).set({ title: title.slice(0, 300) }).where(eq(offers.id, r.id));
    }
    const c = title ? classify(title, list) : { alvo: null, specs: null, band: null };
    const alvoId = c.alvo?.id ?? null;
    const bandKey = c.band?.key ?? null;
    if (alvoId !== r.alvoId || bandKey !== r.bandKey) changed++;
    await db.update(offers).set({ alvoId, specs: c.specs, bandKey }).where(eq(offers.id, r.id));
    if (c.alvo && c.band) bands.set(`${alvoId}:${bandKey}`, { alvoId: c.alvo.id, band: c.band });
  }
  // Faixas que só existem nos preços de mercado também precisam de referência.
  const obsBands = await db.selectDistinct({ alvoId: marketObs.alvoId, bandKey: marketObs.bandKey }).from(marketObs);
  for (const b of bands.values()) await refreshRef(b.alvoId, b.band.key, b.band.label);
  for (const b of obsBands) if (!bands.has(`${b.alvoId}:${b.bandKey}`)) await refreshRef(b.alvoId, b.bandKey);
  for (const r of rows) await scoreOffer(r.id, { silent: true });
  await notify({ type: "offer" });
  return { total: rows.length, changed, bands: bands.size };
}

/** Depois que o preço de uma oferta muda: atualiza a referência da faixa e, se o alvo mexeu, as notas da faixa. */
export async function afterPriceChange(offerId: number) {
  const [o] = await db.select({ alvoId: offers.alvoId, bandKey: offers.bandKey }).from(offers).where(eq(offers.id, offerId));
  if (o?.alvoId && o.bandKey) {
    const moved = await refreshRef(o.alvoId, o.bandKey);
    if (moved) {
      const peers = await db
        .select({ id: offers.id })
        .from(offers)
        .where(and(eq(offers.alvoId, o.alvoId), eq(offers.bandKey, o.bandKey), ne(offers.id, offerId), gte(offers.createdAt, sql`now() - interval '48 hours'`)));
      for (const p of peers) await scoreOffer(p.id, { silent: true });
    }
  }
  await scoreOffer(offerId);
}

export async function setSourceStatus(slug: string, status: string, note: string | null) {
  await db.update(sources).set({ status, statusNote: note, lastRunAt: new Date() }).where(eq(sources.slug, slug));
  await notify({ type: "source", slug, status });
}

/** Fila de verificação. Fontes ao vivo (Telegram) passam na frente; depois, as mais novas. */
export async function pendingOffers(limit: number) {
  const rows = await db
    .select({ o: offers })
    .from(offers)
    .innerJoin(sources, eq(offers.sourceId, sources.id))
    .where(and(eq(offers.verifyStatus, "pendente"), ne(offers.dismissed, true)))
    .orderBy(sql`(${sources.kind} = 'telegram') desc`, desc(offers.createdAt))
    .limit(limit);
  return rows.map((r) => r.o);
}
