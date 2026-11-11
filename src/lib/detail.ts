import { and, desc, eq, gte, ne, sql } from "drizzle-orm";
import { STORES } from "@/config/stores";
import { db, schema } from "@/lib/db";
import { normalize } from "@/lib/money";
import { listOffers, type OfferDTO } from "@/lib/offers";

const { offers, pricePoints, sources, insights } = schema;

export type InsightDTO = { veredito: string; confianca: string; resumo: string; motivos: string[]; geradoEm: string; provedor: string };

export type OfferDetailDTO = {
  offer: OfferDTO;
  history: { day: string; cents: number }[];
  stats: { medianCents: number | null; minPrevCents: number | null; minPrevDay: string | null; alvoCents: number | null; tetoCents: number | null; points: number };
  parts: { A: number; C: number; F: number; S: number } | null;
  ladder: { id: number; store: string; title: string; priceCardCents: number | null; installments: number | null; installmentCents: number | null; interest: boolean | null; freeShipping: boolean | null; shippingCents: number | null; url: string | null }[];
  heat: { source: string; kind: string; at: string }[];
  insight: InsightDTO | null;
};

const tokens = (t: string) => new Set(normalize(t).split(/[^a-z0-9]+/).filter((w) => w.length >= 3));
function jaccard(a: Set<string>, b: Set<string>) {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}

const median = (v: number[]) => {
  if (!v.length) return null;
  const s = [...v].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
};

export async function getOfferDetail(id: number): Promise<OfferDetailDTO | null> {
  const [row] = await db.select().from(offers).where(eq(offers.id, id));
  if (!row) return null;
  const offer = (await listOffers({ onlyId: id }))[0];
  if (!offer) return null;

  // Histórico de 30 dias: o menor preço do dia, só de pontos da própria loja.
  let history: OfferDetailDTO["history"] = [];
  if (row.productId) {
    const pts = await db
      .select({
        day: sql<string>`to_char(date_trunc('day', ${pricePoints.observedAt} at time zone 'America/Sao_Paulo'), 'YYYY-MM-DD')`,
        cents: sql<number>`min(${pricePoints.priceCardCents})::int`,
      })
      .from(pricePoints)
      .where(and(eq(pricePoints.productId, row.productId), gte(pricePoints.observedAt, sql`now() - interval '30 days'`)))
      .groupBy(sql`1`)
      .orderBy(sql`1`);
    history = pts.filter((p) => p.cents != null);
  }
  const prices = history.map((h) => h.cents);
  const prev = history.slice(0, -1);
  const minPrev = prev.length ? prev.reduce((m, h) => (h.cents < m.cents ? h : m)) : null;

  // Escada de preços: ofertas parecidas, em outras lojas, nas últimas 72 h.
  const base = tokens(row.title);
  const recent = await db
    .select({ o: offers, source: sources.name, kind: sources.kind })
    .from(offers)
    .innerJoin(sources, eq(offers.sourceId, sources.id))
    .where(and(ne(offers.id, id), eq(offers.dismissed, false), gte(offers.createdAt, sql`now() - interval '72 hours'`)))
    .orderBy(desc(offers.createdAt))
    .limit(500);
  const similar = recent.filter((r) => jaccard(base, tokens(r.o.title)) >= 0.5 || (row.productId && r.o.productId === row.productId));
  const ladder = similar
    .filter((r) => r.o.store && r.o.store !== row.store && r.o.priceCardCents != null)
    .sort((a, b) => a.o.priceCardCents! - b.o.priceCardCents!)
    .slice(0, 6)
    .map((r) => ({
      id: r.o.id,
      store: STORES.find((s) => s.slug === r.o.store)?.name ?? r.o.store!,
      title: r.o.title,
      priceCardCents: r.o.priceCardCents,
      installments: r.o.installments,
      installmentCents: r.o.installmentCents,
      interest: r.o.interest,
      freeShipping: r.o.freeShipping,
      shippingCents: r.o.shippingCents,
      url: r.o.url,
    }));

  // Calor social: quem postou o mesmo produto (ou título muito parecido) nas últimas 24 h.
  const [self] = await db.select({ name: sources.name, kind: sources.kind }).from(sources).where(eq(sources.id, row.sourceId));
  const heatMap = new Map<string, { source: string; kind: string; at: string }>();
  heatMap.set(self?.name ?? "?", { source: self?.name ?? "?", kind: self?.kind ?? "comunidade", at: row.createdAt.toISOString() });
  for (const r of similar) {
    if (Date.now() - r.o.createdAt.getTime() > 24 * 3600 * 1000) continue;
    if (jaccard(base, tokens(r.o.title)) < 0.7 && !(row.productId && r.o.productId === row.productId)) continue;
    const prevHeat = heatMap.get(r.source);
    if (!prevHeat || prevHeat.at > r.o.createdAt.toISOString()) heatMap.set(r.source, { source: r.source, kind: r.kind, at: r.o.createdAt.toISOString() });
  }

  let insight: InsightDTO | null = null;
  if (row.productId) {
    const [ins] = await db.select().from(insights).where(eq(insights.produtoId, row.productId)).orderBy(desc(insights.geradoEm)).limit(1);
    if (ins) insight = { ...(ins.insight as Omit<InsightDTO, "geradoEm" | "provedor">), geradoEm: ins.geradoEm.toISOString(), provedor: ins.provedor };
  }

  const alvo = offer.alvo;
  return {
    offer,
    history,
    stats: {
      medianCents: median(prices),
      minPrevCents: minPrev?.cents ?? null,
      minPrevDay: minPrev?.day ?? null,
      alvoCents: alvo?.targetCents ?? null,
      tetoCents: offer.alvoTetoCents,
      points: history.length,
    },
    parts: (row.notaParts as OfferDetailDTO["parts"]) ?? null,
    ladder,
    heat: [...heatMap.values()].sort((a, b) => b.at.localeCompare(a.at)),
    insight,
  };
}
