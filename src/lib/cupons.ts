import { STORES } from "@/config/stores";
import { prisma } from "@/lib/db/prisma";
import { asJson } from "@/lib/db/types";
import { DIA, atras } from "@/lib/tempo";

export type CupomDTO = {
  id: number;
  store: string | null;
  storeSlug: string | null;
  code: string | null;
  title: string;
  discountKind: "pct" | "reais" | "cashback" | "frete" | null;
  discountValue: number | null;
  capCents: number | null;
  minCents: number | null;
  conditions: string[];
  url: string | null;
  postUrl: string | null;
  /** Quantos posts citaram o cupom e em quais fontes. */
  mentions: number;
  sources: string[];
  /** Cupom citado em post de produto: vale para este produto. */
  forProduct: string | null;
  firstSeenAt: string;
  lastSeenAt: string;
};

/** Cupons vistos nos últimos 3 dias, os mais recentes primeiro. */
export async function getCupons(): Promise<CupomDTO[]> {
  const rows = await prisma.coupon.findMany({
    where: { isActive: true, lastSeenAt: { gte: atras(3 * DIA) } },
    orderBy: { lastSeenAt: "desc" },
    take: 400,
  });
  return rows.map((c) => ({
    id: c.id,
    store: STORES.find((s) => s.slug === c.store)?.name ?? null,
    storeSlug: c.store,
    code: c.code,
    title: c.title,
    discountKind: c.discountKind as CupomDTO["discountKind"],
    discountValue: c.discountValue,
    capCents: c.capCents,
    minCents: c.minCents,
    conditions: asJson<string[]>(c.conditions),
    url: c.url,
    postUrl: c.postUrl,
    mentions: asJson<number[]>(c.offerIds).length,
    sources: asJson<string[]>(c.sourceNames),
    forProduct: c.forProduct,
    firstSeenAt: c.firstSeenAt.toISOString(),
    lastSeenAt: c.lastSeenAt.toISOString(),
  }));
}
