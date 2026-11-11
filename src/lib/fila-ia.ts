import { and, desc, eq, gte, isNull, sql } from "drizzle-orm";
import { STORES } from "@/config/stores";
import { db, schema } from "@/lib/db";
import { normalize } from "@/lib/money";
import { cleanTitle, type Verdict } from "@/lib/offers";

const { offers, offerAnalyses, sources, products } = schema;

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
  const where = and(eq(offers.kind, "produto"), eq(offers.dismissed, false), gte(offers.createdAt, sql`now() - interval '48 hours'`));
  const [{ total, analyzed }] = await db
    .select({ total: sql<number>`count(*)::int`, analyzed: sql<number>`count(${offerAnalyses.offerId})::int` })
    .from(offers)
    .leftJoin(offerAnalyses, eq(offerAnalyses.offerId, offers.id))
    .where(where);

  const rows = await db
    .select({ o: offers, source: sources.name, image: products.imageUrl })
    .from(offers)
    .innerJoin(sources, eq(sources.id, offers.sourceId))
    .leftJoin(products, eq(products.id, offers.productId))
    .leftJoin(offerAnalyses, eq(offerAnalyses.offerId, offers.id))
    .where(and(where, isNull(offerAnalyses.offerId)))
    .orderBy(sql`${offers.nota} desc nulls last`, desc(offers.createdAt))
    .limit(3000);
  const groups = new Map<string, FilaItem>();
  for (const { o, source, image } of rows) {
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

  const done = await db
    .select({ o: offers, a: offerAnalyses, source: sources.name, image: products.imageUrl })
    .from(offerAnalyses)
    .innerJoin(offers, eq(offers.id, offerAnalyses.offerId))
    .innerJoin(sources, eq(sources.id, offers.sourceId))
    .leftJoin(products, eq(products.id, offers.productId))
    .where(where)
    .orderBy(desc(offerAnalyses.createdAt))
    .limit(60);
  const seen = new Set<string>();
  const recent: FilaDTO["recent"] = [];
  for (const { o, a, source, image } of done) {
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
