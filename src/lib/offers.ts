import { and, desc, eq, gte, sql } from "drizzle-orm";
import { STORES } from "@/config/stores";
import { db, schema } from "@/lib/db";
import type { OfferExtra, OfferSpecs } from "@/lib/db/schema";
import { getAiStatus, type AiStatus } from "@/lib/ai-usage";

const { offers, alvos, alvoRefs, sources, products } = schema;

/** Posts do Pelando começam com "Por R$ 26,69:"; o preço já aparece à parte. */
export const cleanTitle = (t: string) => t.replace(/^\s*Por\s+R\$\s*[\d.,]+\s*:\s*/i, "").trim();

export type OfferDTO = {
  id: number;
  title: string;
  store: string | null;
  url: string | null;
  imageUrl: string | null;
  priceCardCents: number | null;
  priceBasis: string | null;
  installments: number | null;
  installmentCents: number | null;
  interest: boolean | null;
  cashCents: number | null;
  listPriceCents: number | null;
  freeShipping: boolean | null;
  shippingCents: number | null;
  coupon: string | null;
  verifyStatus: string;
  verifyNote: string | null;
  verifiedAt: string | null;
  nota: number | null;
  notaParts: { A: number; C: number; F: number; S: number } | null;
  watched: boolean;
  snoozedUntil: string | null;
  /** O Alvo e o preço-alvo da faixa do produto (null = faixa ainda sem referência). */
  alvo: { slug: string; name: string; targetCents: number | null } | null;
  /** Faixa em que o produto é comparado (ex.: Monitor 27" QHD), com a mediana e quantos preços a formam. */
  band: { key: string; label: string; medianCents: number | null; n: number } | null;
  alvoTetoCents: number | null;
  alvoAtingido: boolean;
  specs: OfferSpecs | null;
  /** false = a loja diz que acabou; null = não sabemos. */
  available: boolean | null;
  extra: OfferExtra | null;
  source: string;
  sourceKind: string;
  createdAt: string;
};

export async function listOffers(opts: { onlyId?: number } = {}): Promise<OfferDTO[]> {
  const rows = await db
    .select({
      o: offers,
      alvo: { slug: alvos.slug, name: alvos.name },
      ref: { label: alvoRefs.label, medianCents: alvoRefs.medianCents, targetCents: alvoRefs.targetCents, ceilingCents: alvoRefs.ceilingCents, n: alvoRefs.n },
      source: sources.name,
      sourceKind: sources.kind,
      productImage: products.imageUrl,
    })
    .from(offers)
    .leftJoin(alvos, and(eq(offers.alvoId, alvos.id), eq(alvos.active, true)))
    .leftJoin(alvoRefs, and(eq(alvoRefs.alvoId, offers.alvoId), eq(alvoRefs.bandKey, offers.bandKey)))
    .innerJoin(sources, eq(offers.sourceId, sources.id))
    .leftJoin(products, eq(offers.productId, products.id))
    .where(
      opts.onlyId != null
        ? eq(offers.id, opts.onlyId)
        : and(eq(offers.dismissed, false), gte(offers.createdAt, sql`now() - interval '48 hours'`)),
    )
    .orderBy(sql`${offers.nota} desc nulls last`, desc(offers.createdAt))
    .limit(300);
  return rows.map(({ o, alvo, ref, source, sourceKind, productImage }) => ({
    id: o.id,
    title: cleanTitle(o.title),
    store: STORES.find((s) => s.slug === o.store)?.name ?? null,
    url: o.url,
    // A foto da página da loja vale mais que o banner da comunidade.
    imageUrl: productImage ?? o.imageUrl,
    priceCardCents: o.priceCardCents,
    priceBasis: o.priceBasis,
    installments: o.installments,
    installmentCents: o.installmentCents,
    interest: o.interest,
    cashCents: o.cashCents,
    listPriceCents: o.listPriceCents,
    freeShipping: o.freeShipping,
    shippingCents: o.shippingCents,
    coupon: o.coupon,
    verifyStatus: o.verifyStatus,
    verifyNote: o.verifyNote,
    verifiedAt: o.verifiedAt?.toISOString() ?? null,
    nota: o.nota,
    notaParts: (o.notaParts as OfferDTO["notaParts"]) ?? null,
    watched: o.watched,
    snoozedUntil: o.snoozedUntil?.toISOString() ?? null,
    alvo: alvo?.slug ? { slug: alvo.slug, name: alvo.name!, targetCents: ref?.targetCents ?? null } : null,
    band: alvo?.slug && o.bandKey && ref?.label ? { key: o.bandKey, label: ref.label, medianCents: ref.medianCents, n: ref.n ?? 0 } : null,
    alvoTetoCents: ref?.ceilingCents ?? null,
    // Só vale com o preço conferido na loja e o produto à venda: preço de post e item esgotado não disparam ouro.
    alvoAtingido: !!(
      alvo?.slug &&
      ref?.targetCents &&
      o.priceCardCents &&
      o.priceCardCents <= ref.targetCents &&
      o.available !== false &&
      o.verifyStatus === "verificado"
    ),
    specs: o.specs,
    available: o.available,
    extra: o.extra,
    source,
    sourceKind,
    createdAt: o.createdAt.toISOString(),
  }));
}

export type StatusDTO = {
  sources: { slug: string; name: string; status: string; note: string | null; lastRunAt: string | null }[];
  /** Escuta do Telegram: grupos ligados e total de grupos e canais achados. */
  telegram: { on: number; total: number } | null;
  ai: AiStatus;
  pending: number;
  today: number;
  alvos: { slug: string; name: string; targetCents: number | null; ceilingCents: number | null }[];
};

export async function getStatus(): Promise<StatusDTO> {
  const all = await db.select().from(sources).orderBy(sources.id);
  const tg = all.filter((s) => s.kind === "telegram");
  const src = all.filter((s) => s.kind !== "telegram");
  const [{ pending }] = await db.select({ pending: sql<number>`count(*)::int` }).from(offers).where(eq(offers.verifyStatus, "pendente"));
  const [{ today }] = await db
    .select({ today: sql<number>`count(*)::int` })
    .from(offers)
    .where(gte(offers.createdAt, sql`date_trunc('day', now())`));
  const al = await db.select().from(alvos).where(eq(alvos.active, true)).orderBy(alvos.id);
  return {
    telegram: tg.length ? { on: tg.filter((s) => s.enabled).length, total: tg.length } : null,
    ai: await getAiStatus(),
    sources: src.map((s) => ({ slug: s.slug, name: s.name, status: s.status, note: s.statusNote, lastRunAt: s.lastRunAt?.toISOString() ?? null })),
    pending,
    today,
    alvos: al.map((a) => ({ slug: a.slug, name: a.name, targetCents: a.targetCents, ceilingCents: a.ceilingCents })),
  };
}
