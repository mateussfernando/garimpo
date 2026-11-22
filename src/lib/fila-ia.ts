import { STORES } from "@/config/stores";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";
import { normalize } from "@/lib/money";
import { cleanTitle, type Verdict } from "@/lib/offers";
import { HORA, atras } from "@/lib/tempo";

export type FilaItem = {
  id: number;
  title: string;
  store: string | null;
  priceCardCents: number | null;
  imageUrl: string | null;
  sources: string[];
  /** Quantas ofertas iguais (mesmo título e preço, de grupos diferentes) a mesma análise vai cobrir. */
  copies: number;
  createdAt: string;
};

export type FilaDTO = {
  total: number;
  analyzed: number;
  waitingOffers: number;
  waitingProducts: number;
  /** Na ordem em que a IA vai pegar: as de nota maior e as mais novas primeiro. */
  waiting: FilaItem[];
  recent: (FilaItem & { verdict: Verdict; score: number; summary: string; analyzedAt: string })[];
};

const keyOf = (title: string, price: number | null) => `${normalize(title).replace(/[^a-z0-9]+/g, "")}|${price ?? "?"}`;

/** Ofertas de produto das últimas 48 h: quantas já têm análise e quais esperam, agrupadas por produto. */
export async function getFila(): Promise<FilaDTO> {
  const where = { kind: "produto", dismissed: false, createdAt: { gte: atras(48 * HORA) } } satisfies Prisma.OfferWhereInput;
  const [total, analyzed] = await Promise.all([
    prisma.offer.count({ where }),
    prisma.offer.count({ where: { ...where, analysis: { isNot: null } } }),
  ]);
  const extras = { source: { select: { name: true } }, product: { select: { imageUrl: true } } } as const;

  const rows = await prisma.offer.findMany({
    where: { ...where, analysis: { is: null } },
    include: extras,
    orderBy: [{ nota: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
    take: 3000,
  });
  const groups = new Map<string, FilaItem>();
  for (const o of rows) {
    const source = o.source.name;
    const image = o.product?.imageUrl ?? null;
    const k = keyOf(o.title, o.priceCardCents);
    const g = groups.get(k);
    if (g) {
      g.copies++;
      if (!g.sources.includes(source)) g.sources.push(source);
      continue;
    }
    groups.set(k, {
      id: o.id,
      title: cleanTitle(o.title),
      store: STORES.find((s) => s.slug === o.store)?.name ?? null,
      priceCardCents: o.priceCardCents,
      imageUrl: image ?? o.imageUrl,
      sources: [source],
      copies: 1,
      createdAt: o.createdAt.toISOString(),
    });
  }

  const done = await prisma.offerAnalysis.findMany({
    where: { offer: where },
    include: { offer: { include: extras } },
    orderBy: { createdAt: "desc" },
    take: 60,
  });
  const seen = new Set<string>();
  const recent: FilaDTO["recent"] = [];
  for (const a of done) {
    const o = a.offer;
    const source = o.source.name;
    const image = o.product?.imageUrl ?? null;
    const k = keyOf(o.title, o.priceCardCents);
    if (seen.has(k)) continue;
    seen.add(k);
    recent.push({
      id: o.id,
      title: cleanTitle(o.title),
      store: STORES.find((s) => s.slug === o.store)?.name ?? null,
      priceCardCents: o.priceCardCents,
      imageUrl: image ?? o.imageUrl,
      sources: [source],
      copies: 1,
      createdAt: o.createdAt.toISOString(),
      verdict: a.verdict as Verdict,
      score: a.score,
      summary: a.summary,
      analyzedAt: a.createdAt.toISOString(),
    });
    if (recent.length >= 12) break;
  }

  const waiting = [...groups.values()];
  return {
    total,
    analyzed,
    waitingOffers: rows.length,
    waitingProducts: waiting.length,
    waiting: waiting.slice(0, 300),
    recent,
  };
}
