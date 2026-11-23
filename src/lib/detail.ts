import { STORES } from "@/config/stores";
import { prisma } from "@/lib/db/prisma";
import { NA_VITRINE, asJson } from "@/lib/db/types";
import { normalize } from "@/lib/money";
import { listOffers, type OfferDTO } from "@/lib/offers";
import { DIA, HORA, atras } from "@/lib/tempo";

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

/** O detalhe de uma oferta para uma conta (com o Alvo, a nota e as marcações dela). */
export async function getOfferDetail(id: number, userId: string): Promise<OfferDetailDTO | null> {
  const row = await prisma.offer.findUnique({ where: { id } });
  if (!row) return null;
  const alone = (await listOffers({ userId, onlyId: id }))[0];
  if (!alone) return null;
  // O card da Vitrine junta o mesmo produto de várias lojas: o detalhe mostra a oferta aberta com as lojas do grupo.
  const group = (await listOffers({ userId })).find((g) => g.groupIds.includes(id));
  const offer = group ? { ...alone, lojas: group.lojas, sources: group.sources, groupIds: group.groupIds } : alone;

  // Histórico de 30 dias: o menor preço do dia, só de pontos da própria loja.
  let history: OfferDetailDTO["history"] = [];
  if (row.productId) {
    const pts = await prisma.$queryRaw<{ day: string; cents: number | null }[]>`
      select to_char(date_trunc('day', observed_at at time zone 'America/Sao_Paulo'), 'YYYY-MM-DD') as day,
        min(price_card_cents)::int as cents
      from price_points
      where product_id = ${row.productId} and observed_at >= ${atras(30 * DIA)}
      group by 1 order by 1`;
    history = pts.filter((p): p is { day: string; cents: number } => p.cents != null);
  }
  const prices = history.map((h) => h.cents);
  const prev = history.slice(0, -1);
  const minPrev = prev.length ? prev.reduce((m, h) => (h.cents < m.cents ? h : m)) : null;

  // Escada de preços: ofertas parecidas, em outras lojas, nas últimas 72 h (menos as que a conta descartou).
  const base = tokens(row.title);
  const recent = (
    await prisma.offer.findMany({
      where: { id: { not: id }, createdAt: { gte: atras(72 * HORA) }, ...NA_VITRINE, ofertasUsuario: { none: { userId, dismissed: true } } },
      include: { source: { select: { name: true, kind: true } } },
      orderBy: { createdAt: "desc" },
      take: 500,
    })
  ).map((o) => ({ o, source: o.source.name, kind: o.source.kind }));
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
  const self = await prisma.source.findUnique({ where: { id: row.sourceId }, select: { name: true, kind: true } });
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
    const ins = await prisma.insight.findFirst({ where: { produtoId: row.productId }, orderBy: { geradoEm: "desc" } });
    if (ins) insight = { ...asJson<Omit<InsightDTO, "geradoEm" | "provedor">>(ins.insight), geradoEm: ins.geradoEm.toISOString(), provedor: ins.provedor };
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
    parts: offer.notaParts,
    ladder,
    heat: [...heatMap.values()].sort((a, b) => b.at.localeCompare(a.at)),
    insight,
  };
}
