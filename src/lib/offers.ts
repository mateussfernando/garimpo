import { STORES } from "@/config/stores";
import { prisma } from "@/lib/db/prisma";
import { NA_VITRINE, asJson, type OfferExtra, type OfferSpecs } from "@/lib/db/types";
import { getAiStatus, type AiStatus } from "@/lib/ai-usage";
import { clusterSameProduct } from "@/lib/same-product";
import { getSetting } from "@/lib/settings";
import { HORA, atras, inicioDoDia } from "@/lib/tempo";

export type Verdict = "excelente" | "boa" | "ok" | "fraca" | "evitar";
/** Análise da IA da oferta (worker/ai/analises.ts). */
export type OfferAiDTO = {
  verdict: Verdict;
  score: number;
  confidence: "alta" | "media" | "baixa";
  summary: string;
  pros: string[];
  cons: string[];
  at: string;
};

/** O mesmo produto numa loja: a melhor oferta daquela loja dentro do card (para comparar as lojas). */
export type StoreQuoteDTO = {
  id: number;
  /** Nome da loja; null = loja não identificada (link de encurtador que não abriu). */
  store: string | null;
  title: string;
  url: string | null;
  priceCardCents: number | null;
  installments: number | null;
  installmentCents: number | null;
  interest: boolean | null;
  cashCents: number | null;
  freeShipping: boolean | null;
  shippingCents: number | null;
  coupon: string | null;
  verifyStatus: string;
  verifiedAt: string | null;
  available: boolean | null;
  sources: string[];
  createdAt: string;
};

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
  /** Slug da categoria (src/config/categories.ts); null = ainda sem categoria (a IA classifica em lote). */
  category: string | null;
  /** O que a IA acha da oferta; null = ainda não analisada. */
  ia: OfferAiDTO | null;
  /** "regra" ou "ia". */
  categorySource: string | null;
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
  /** Todas as fontes que postaram este produto, e as ofertas reunidas neste card. */
  sources: string[];
  groupIds: number[];
  /** Uma linha por loja que tem este produto, a mais barata primeiro (esgotada por último). Uma só = nada a comparar. */
  lojas: StoreQuoteDTO[];
  /** Na Vitrine de todos (is_active). false = um admin tirou esta oferta. */
  isActive: boolean;
  /** O produto está na Vitrine; false = um admin tirou o produto inteiro; null = oferta sem produto da loja. */
  productActive: boolean | null;
  createdAt: string;
};

/**
 * A Vitrine de uma conta: as ofertas de produto de 48 h, menos as que ela descartou, com o Alvo, a nota, o preço-alvo
 * e o "Alvo atingido" dela (oferta_alvo) e as marcações dela (oferta_usuario). Sem Alvo dela na oferta, vale a nota geral.
 */
export async function listOffers(opts: { userId: string; onlyId?: number }): Promise<OfferDTO[]> {
  const { userId } = opts;
  const since = atras(48 * HORA);
  const include = {
    analysis: true,
    source: { select: { name: true, kind: true } },
    product: { select: { imageUrl: true, isActive: true } },
  } as const;
  let found;
  if (opts.onlyId != null) {
    found = await prisma.offer.findMany({ where: { id: opts.onlyId }, include });
  } else {
    const descartadas = (
      await prisma.ofertaUsuario.findMany({ where: { userId, dismissed: true, offer: { createdAt: { gte: since } } }, select: { offerId: true } })
    ).map((r) => r.offerId);
    const where = { kind: "produto", createdAt: { gte: since }, ...NA_VITRINE, ...(descartadas.length ? { id: { notIn: descartadas } } : {}) };
    found = await prisma.offer.findMany({ where, include, orderBy: [{ nota: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }], take: 2000 });
    // As ofertas nos Alvos da conta entram sempre, mesmo fora das 2000 de nota geral mais alta.
    const got = new Set(found.map((o) => o.id));
    const nosAlvos = (await prisma.ofertaAlvo.findMany({ where: { userId, alvoId: { not: null }, offer: where }, select: { offerId: true } }))
      .map((r) => r.offerId)
      .filter((id) => !got.has(id));
    if (nosAlvos.length) found = [...found, ...(await prisma.offer.findMany({ where: { id: { in: nosAlvos } }, include }))];
  }
  const ids = found.map((o) => o.id);
  const [pessoais, marcas] = ids.length
    ? await Promise.all([
        prisma.ofertaAlvo.findMany({
          where: { userId, offerId: { in: ids }, alvoId: { not: null } },
          include: { alvo: { select: { slug: true, name: true, isActive: true, deletedAt: true } } },
        }),
        prisma.ofertaUsuario.findMany({ where: { userId, offerId: { in: ids } } }),
      ])
    : [[], []];
  const meuAlvo = new Map(pessoais.filter((p) => p.alvo?.isActive && !p.alvo.deletedAt).map((p) => [p.offerId, p]));
  const marcaDe = new Map(marcas.map((m) => [m.offerId, m]));
  // A referência da faixa (alvo + faixa) não é uma relação do Prisma: vem numa consulta só e é ligada aqui.
  const alvoIds = [...new Set([...meuAlvo.values()].map((p) => p.alvoId!))];
  const refRows = alvoIds.length ? await prisma.alvoRef.findMany({ where: { alvoId: { in: alvoIds } } }) : [];
  const refBy = new Map(refRows.map((r) => [`${r.alvoId}:${r.bandKey}`, r]));
  const rows = found.map((o) => {
    const p = meuAlvo.get(o.id);
    return {
      o,
      p,
      alvo: p?.alvo ?? null,
      ref: p?.bandKey ? refBy.get(`${p.alvoId}:${p.bandKey}`) : undefined,
      marca: marcaDe.get(o.id),
      source: o.source.name,
      sourceKind: o.source.kind,
      productImage: o.product?.imageUrl ?? null,
      ia: o.analysis,
    };
  });
  const all = rows.map(({ o, p, alvo, ref, marca, source, sourceKind, productImage, ia }) => ({
    productId: o.productId,
    sources: [source],
    groupIds: [o.id],
    lojas: [] as StoreQuoteDTO[],
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
    category: o.category,
    ia: ia
      ? {
          verdict: ia.verdict as Verdict,
          score: ia.score,
          confidence: ia.confidence as OfferAiDTO["confidence"],
          summary: ia.summary,
          pros: asJson<string[]>(ia.pros),
          cons: asJson<string[]>(ia.cons),
          at: ia.createdAt.toISOString(),
        }
      : null,
    categorySource: o.categorySource,
    verifyStatus: o.verifyStatus,
    verifyNote: o.verifyNote,
    verifiedAt: o.verifiedAt?.toISOString() ?? null,
    nota: p ? p.nota : o.nota,
    notaParts: asJson<OfferDTO["notaParts"]>(p ? p.notaParts : o.notaParts) ?? null,
    watched: marca?.watched ?? false,
    snoozedUntil: marca?.snoozedUntil?.toISOString() ?? null,
    alvo: alvo?.slug ? { slug: alvo.slug, name: alvo.name, targetCents: ref?.targetCents ?? null } : null,
    band: alvo?.slug && p?.bandKey && ref?.label ? { key: p.bandKey, label: ref.label, medianCents: ref.medianCents, n: ref.n ?? 0 } : null,
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
    specs: asJson<OfferSpecs | null>(o.specs),
    available: o.available,
    extra: asJson<OfferExtra | null>(o.extra),
    source,
    sourceKind,
    isActive: o.isActive,
    productActive: o.product ? o.product.isActive : null,
    createdAt: o.createdAt.toISOString(),
  }));
  return opts.onlyId != null ? all.map((o) => strip({ ...o, lojas: storeQuotes([o]) })) : groupByProduct(all).map(strip);
}

type Row = OfferDTO & { productId: number | null };
const strip = ({ productId: _p, ...dto }: Row): OfferDTO => {
  void _p;
  return dto;
};

const rank = (o: { verifyStatus: string }) => (o.verifyStatus === "verificado" ? 0 : o.verifyStatus === "pendente" ? 1 : 2);

/** A melhor oferta de cada loja do grupo (conferida primeiro, depois a mais barata), da mais barata para a mais cara. */
export function storeQuotes(g: OfferDTO[]): StoreQuoteDTO[] {
  const byStore = new Map<string, OfferDTO[]>();
  for (const o of g) byStore.set(o.store ?? "", [...(byStore.get(o.store ?? "") ?? []), o]);
  // O mesmo post por um encurtador que não abriu vira "loja não identificada": só entra se não houver loja conhecida.
  if (byStore.size > 1) byStore.delete("");
  return [...byStore.values()]
    .map((list) => {
      const b = [...list].sort((x, y) => (x.available === false ? 1 : 0) - (y.available === false ? 1 : 0) || rank(x) - rank(y) || (x.priceCardCents ?? Infinity) - (y.priceCardCents ?? Infinity))[0];
      return {
        id: b.id,
        store: b.store,
        title: b.title,
        url: b.url,
        priceCardCents: b.priceCardCents,
        installments: b.installments,
        installmentCents: b.installmentCents,
        interest: b.interest,
        cashCents: b.cashCents,
        freeShipping: b.freeShipping,
        shippingCents: b.shippingCents,
        coupon: b.coupon,
        verifyStatus: b.verifyStatus,
        verifiedAt: b.verifiedAt,
        available: b.available,
        sources: [...new Set(list.map((o) => o.source))],
        createdAt: list.reduce((mx, o) => (o.createdAt > mx ? o.createdAt : mx), b.createdAt),
      };
    })
    .sort((a, b) => (a.available === false ? 1 : 0) - (b.available === false ? 1 : 0) || (a.priceCardCents ?? Infinity) - (b.priceCardCents ?? Infinity));
}

/**
 * Código do modelo no título (EK241Y, VG279QM5F, 24MS500): letras e números juntos, 5 ou mais caracteres.
 * Medidas e especificações (1080p, 144hz, 900x300mm, 512gb) não contam.
 */
export function modelCode(title: string): string | null {
  const tokens = title.toLowerCase().match(/[a-z0-9]+(?:-[a-z0-9]+)*/g) ?? [];
  const codes = tokens.filter(
    (t) => t.length >= 5 && /[a-z]/.test(t) && /\d/.test(t) && !/^\d+(?:[.,]\d+)?(hz|ms|gb|tb|mb|mm|cm|w|p|k|pol|dpi|mah|fps|v|x\d.*)$/.test(t) && !/^\d+x\d+/.test(t),
  );
  return codes.sort((a, b) => b.length - a.length)[0] ?? null;
}

/**
 * Um card por produto. Ofertas do mesmo produto, na mesma loja ou em lojas diferentes (src/lib/same-product.ts),
 * viram uma só: fica a de preço conferido mais baixo, com as fontes que postaram, a data da mais recente e
 * a lista de lojas para comparar.
 */
export function groupByProduct(list: Row[]): Row[] {
  return clusterSameProduct(list)
    .map((idx) => {
      const g = idx.map((i) => list[i]);
      const best = [...g].sort((a, b) => (a.available === false ? 1 : 0) - (b.available === false ? 1 : 0) || rank(a) - rank(b) || (a.priceCardCents ?? Infinity) - (b.priceCardCents ?? Infinity))[0];
      return {
        ...best,
        sources: [...new Set(g.map((o) => o.source))],
        groupIds: g.map((o) => o.id),
        lojas: storeQuotes(g),
        watched: g.some((o) => o.watched),
        // A análise de qualquer cópia do produto vale para o card.
        ia: best.ia ?? g.find((o) => o.ia)?.ia ?? null,
        // Sem foto na melhor oferta: vale a foto de outra cópia do mesmo produto.
        imageUrl: best.imageUrl ?? g.find((o) => o.imageUrl)?.imageUrl ?? null,
        createdAt: g.reduce((mx, o) => (o.createdAt > mx ? o.createdAt : mx), best.createdAt),
      };
    })
    .sort((a, b) => (b.nota ?? -1) - (a.nota ?? -1) || b.createdAt.localeCompare(a.createdAt));
}

export type StatusDTO = {
  sources: { slug: string; name: string; status: string; note: string | null; lastRunAt: string | null }[];
  /** Escuta do Telegram: grupos ligados e total de grupos e canais achados. */
  telegram: { on: number; total: number } | null;
  /** Só para quem gerencia a IA (src/lib/visao.ts); null para os outros. */
  ai: AiStatus | null;
  /** Fila de conferência: só para quem vê o sistema. */
  pending: number | null;
  today: number;
  alvos: { slug: string; name: string; targetCents: number | null; ceilingCents: number | null }[];
  /** Comentário geral da IA sobre o momento (worker/ai/radar.ts). */
  radar: RadarDTO | null;
};

export type RadarDTO = {
  manchete: string;
  destaques: { id: number; porque: string; title: string | null; priceCardCents: number | null }[];
  alertas: string[];
  dicas: string[];
  at: string;
};

export async function getStatus(userId: string): Promise<StatusDTO> {
  const all = await prisma.source.findMany({ orderBy: { id: "asc" } });
  const tg = all.filter((s) => s.kind === "telegram");
  const src = all.filter((s) => s.kind !== "telegram");
  const pending = await prisma.offer.count({ where: { verifyStatus: "pendente" } });
  const today = await prisma.offer.count({ where: { createdAt: { gte: inicioDoDia() } } });
  const al = await prisma.alvo.findMany({ where: { ownerId: userId, isActive: true, deletedAt: null }, orderBy: { id: "asc" } });
  const radar = await getRadar();
  return {
    telegram: tg.length ? { on: tg.filter((s) => s.isActive).length, total: tg.length } : null,
    ai: await getAiStatus(),
    sources: src.map((s) => ({ slug: s.slug, name: s.name, status: s.status, note: s.statusNote, lastRunAt: s.lastRunAt?.toISOString() ?? null })),
    pending,
    today,
    alvos: al.map((a) => ({ slug: a.slug, name: a.name, targetCents: a.targetCents, ceilingCents: a.ceilingCents })),
    radar,
  };
}

type RadarSaved = { radar: { manchete: string; destaques: { id: number; porque: string }[]; alertas: string[]; dicas: string[] }; at: number };

async function getRadar(): Promise<RadarDTO | null> {
  const saved = await getSetting<RadarSaved>("ia_radar");
  if (!saved?.value.radar) return null;
  const r = saved.value.radar;
  const ids = r.destaques.map((d) => d.id);
  const rows = ids.length
    ? (await prisma.offer.findMany({ where: { id: { in: ids } }, select: { id: true, title: true, priceCardCents: true } })).map((x) => ({ id: x.id, title: x.title, p: x.priceCardCents }))
    : [];
  const byId = new Map(rows.map((x) => [x.id, x]));
  return {
    manchete: r.manchete,
    destaques: r.destaques.map((d) => ({ id: d.id, porque: d.porque, title: byId.get(d.id) ? cleanTitle(byId.get(d.id)!.title) : null, priceCardCents: byId.get(d.id)?.p ?? null })),
    alertas: r.alertas,
    dicas: r.dicas,
    at: new Date(saved.value.at).toISOString(),
  };
}
