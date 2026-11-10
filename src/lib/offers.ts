import { and, desc, eq, gte, sql } from "drizzle-orm";
import { STORES } from "@/config/stores";
import { db, schema } from "@/lib/db";

const { offers, alvos, sources } = schema;

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
  watched: boolean;
  alvo: { slug: string; name: string; targetCents: number | null } | null;
  alvoAtingido: boolean;
  source: string;
  createdAt: string;
};

export async function listOffers(): Promise<OfferDTO[]> {
  const rows = await db
    .select({ o: offers, alvo: { slug: alvos.slug, name: alvos.name, targetCents: alvos.targetCents }, source: sources.name })
    .from(offers)
    .leftJoin(alvos, eq(offers.alvoId, alvos.id))
    .innerJoin(sources, eq(offers.sourceId, sources.id))
    .where(and(eq(offers.dismissed, false), gte(offers.createdAt, sql`now() - interval '48 hours'`)))
    .orderBy(sql`${offers.nota} desc nulls last`, desc(offers.createdAt))
    .limit(300);
  return rows.map(({ o, alvo, source }) => ({
    id: o.id,
    title: o.title,
    store: STORES.find((s) => s.slug === o.store)?.name ?? null,
    url: o.url,
    imageUrl: o.imageUrl,
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
    watched: o.watched,
    alvo: alvo?.slug ? { slug: alvo.slug, name: alvo.name!, targetCents: alvo.targetCents } : null,
    alvoAtingido: !!(alvo?.targetCents && o.priceCardCents && o.priceCardCents <= alvo.targetCents),
    source,
    createdAt: o.createdAt.toISOString(),
  }));
}

export type StatusDTO = {
  sources: { slug: string; name: string; status: string; note: string | null; lastRunAt: string | null }[];
  pending: number;
  today: number;
  alvos: { slug: string; name: string; targetCents: number | null; ceilingCents: number | null }[];
};

export async function getStatus(): Promise<StatusDTO> {
  const src = await db.select().from(sources).orderBy(sources.id);
  const [{ pending }] = await db.select({ pending: sql<number>`count(*)::int` }).from(offers).where(eq(offers.verifyStatus, "pendente"));
  const [{ today }] = await db
    .select({ today: sql<number>`count(*)::int` })
    .from(offers)
    .where(gte(offers.createdAt, sql`date_trunc('day', now())`));
  const al = await db.select().from(alvos).where(eq(alvos.active, true)).orderBy(alvos.id);
  return {
    sources: src.map((s) => ({ slug: s.slug, name: s.name, status: s.status, note: s.statusNote, lastRunAt: s.lastRunAt?.toISOString() ?? null })),
    pending,
    today,
    alvos: al.map((a) => ({ slug: a.slug, name: a.name, targetCents: a.targetCents, ceilingCents: a.ceilingCents })),
  };
}
