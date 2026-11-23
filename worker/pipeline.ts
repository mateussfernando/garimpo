import { ALVOS_V0 } from "@/config/alvos";
import { estatisticas, pontoD } from "@/lib/historico";
import { STORES, cleanUrl, decodeTrackingUrl, isShortener, storeByName, storeForUrl } from "@/config/stores";
import { Prisma } from "@/generated/prisma/client";
import { NOTIFY_CHANNEL, pool } from "@/lib/db";
import { prisma } from "@/lib/db/prisma";
import { NA_VITRINE, alvoFromDb, json, jsonOrNull, type EventDetail } from "@/lib/db/types";
import { contasSemAlvos, darAlvosIniciais } from "@/lib/alvos-iniciais";
import { DADOS_ANTIGOS_KEY } from "@/lib/dados-antigos";
import { DIA, HORA, atras } from "@/lib/tempo";
import { COMMUNITIES } from "./collect/communities-config";
import { VITRINES } from "./collect/vitrines-config";
import { offerFromMessage } from "./ingest/message";
import { effectiveTargets, matchAlvo, median, mercadoDe, targetsFrom, type AlvoLite } from "./match/alvos";
import { categorize } from "./match/category";
import { couponFromPost, couponKey, couponsFromPost, isCouponMessage, type CouponInfo } from "./parse/coupons";
import { bandOf, extractSpecs, type Band } from "./match/specs";
import { parseOfferText } from "./parse/parser";
import { notaRapida } from "./score/nota";

export async function notify(payload: Record<string, unknown>) {
  await pool.query("select pg_notify($1, $2)", [NOTIFY_CHANNEL, JSON.stringify(payload)]);
}

/** Fontes e os Alvos iniciais entram sozinhos. Os Alvos depois se ajustam na tela Alvos. */
export async function ensureSeed() {
  for (const c of COMMUNITIES) {
    await prisma.source.upsert({ where: { slug: c.slug }, create: { slug: c.slug, kind: "comunidade", name: c.name, url: c.url }, update: { name: c.name, url: c.url } });
  }
  for (const v of VITRINES) {
    await prisma.source.upsert({ where: { slug: v.slug }, create: { slug: v.slug, kind: "loja", name: v.name, url: v.url }, update: { name: v.name, url: v.url } });
  }
  // Cada conta tem os seus Alvos, que começam como cópia dos de config/alvos.ts (src/lib/alvos-iniciais.ts). Depois,
  // quem manda é a tela Alvos: a cópia que o dono editou ou apagou não é mais sobrescrita, e ligar/desligar é dele.
  for (const a of ALVOS_V0) {
    await prisma.alvo.updateMany({ where: { slug: a.slug, origin: "seed", editedAt: null, deletedAt: null }, data: { name: a.name, terms: a.terms, exclusions: a.exclusions } });
  }
  // Alvo do código que saiu da lista (o antigo "Acessórios") fica desligado. Nada é apagado.
  await prisma.alvo.updateMany({ where: { origin: "seed", editedAt: null, slug: { notIn: ALVOS_V0.map((a) => a.slug) } }, data: { isActive: false } });
  // Conta criada antes de cada um ter os seus Alvos ganha a cópia agora.
  for (const id of await contasSemAlvos()) await darAlvosIniciais(id);
}

/**
 * Alvos do sistema: os ligados de quem gerencia as fontes (cargo com todas as permissões ou com `fontes.gerenciar`),
 * e os de antes das contas enquanto nenhum admin os assumiu. Decidem a coleta (vitrines, buscas nas lojas, título das
 * mensagens do Telegram) e o mercado (mediana da faixa, nota geral, análise da IA). O que um usuário comum põe nos
 * Alvos dele só classifica as ofertas para ele: nunca muda a coleta, a IA nem o que os outros veem.
 */
export async function alvosDoSistema() {
  const ids = await prisma.$queryRaw<{ id: number }[]>`
    select a.id from alvos a
    left join usuarios u on u.id = a.owner_id
    left join cargos c on c.id = coalesce((select id from cargos where id = u.cargo_id and is_active), (select id from cargos where padrao order by id limit 1))
    where a.is_active and a.deleted_at is null and (
      (a.owner_id is null and not exists (select 1 from app_settings where key = ${DADOS_ANTIGOS_KEY}))
      or (a.owner_id is not null and u.is_active and (c.todas or exists (select 1 from cargo_permissoes cp where cp.cargo_id = c.id and cp.permissao_slug = 'fontes.gerenciar')))
    )`;
  if (!ids.length) return [];
  return (await prisma.alvo.findMany({ where: { id: { in: ids.map((r) => r.id) } }, orderBy: { id: "asc" } })).map(alvoFromDb);
}

/** O usuário é dos que decidem a coleta (os Alvos dele entram nos do sistema)? */
export async function ehDoSistema(userId: number): Promise<boolean> {
  const [r] = await prisma.$queryRaw<{ ok: boolean }[]>`
    select coalesce(c.todas or exists (select 1 from cargo_permissoes cp where cp.cargo_id = c.id and cp.permissao_slug = 'fontes.gerenciar'), false) as ok
    from usuarios u
    left join cargos c on c.id = coalesce((select id from cargos where id = u.cargo_id and is_active), (select id from cargos where padrao order by id limit 1))
    where u.id = ${userId}`;
  return !!r?.ok;
}

type AlvoDb = Awaited<ReturnType<typeof alvosDoSistema>>[number];

/** Alvos ligados de cada conta (os pessoais), por dono. Com `userId`, só os dele. */
export async function alvosPorDono(userId?: number): Promise<Map<number, AlvoDb[]>> {
  const rows = (
    // Conta desativada: os Alvos dela param (ficam como estão, sem ofertas novas).
    await prisma.alvo.findMany({ where: { ownerId: userId ?? { not: null }, owner: { isActive: true }, isActive: true, deletedAt: null }, orderBy: { id: "asc" } })
  ).map(alvoFromDb);
  const by = new Map<number, AlvoDb[]>();
  for (const a of rows) by.set(a.ownerId!, [...(by.get(a.ownerId!) ?? []), a]);
  if (userId && !by.has(userId)) by.set(userId, []);
  return by;
}

/** Classifica uma oferta nos Alvos de cada conta e grava em oferta_alvo. Devolve quem tem a oferta num Alvo. */
async function classificarParaDonos(offerId: number, title: string) {
  const out: { userId: number; band: Band | null }[] = [];
  for (const [userId, list] of await alvosPorDono()) {
    const c = classify(title, list);
    if (!c.alvo) continue;
    const v = { alvoId: c.alvo.id, bandKey: c.band?.key ?? null };
    await prisma.ofertaAlvo.upsert({ where: { offerId_userId: { offerId, userId } }, create: { offerId, userId, ...v }, update: v });
    if (c.band) await refreshRef(c.alvo.id, c.band.key, c.band.label);
    out.push({ userId, band: c.band });
  }
  return out;
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
  /** Promobit: mínimo e máximo de referência da página e curtidas (histórico que a própria página traz). */
  refMinCents?: number | null;
  refMaxCents?: number | null;
  curtidas?: number | null;
};

/** Grava o item cru (uma vez só) e cria a oferta. Devolve o id da oferta nova, ou null se já existia. */
export async function ingestRaw(input: RawInput): Promise<number | null> {
  // "on conflict do nothing returning id" num comando só: a mesma mensagem chegando duas vezes ao mesmo tempo
  // (Telegram e coleta, ou duas rodadas) nunca vira duas ofertas.
  const inserted = await prisma.$queryRaw<{ id: number }[]>`
    insert into raw_messages (source_id, external_id, text, url, outbound_url, image_url)
    values (${input.sourceId}, ${input.externalId}, ${input.text}, ${input.url}, ${input.outboundUrl}, ${input.imageUrl})
    on conflict do nothing
    returning id`;
  if (!inserted.length) return null;
  return createOffer(inserted[0].id, input);
}

async function createOffer(rawId: number, input0: RawInput): Promise<number> {
  const input = { ...input0, outboundUrl: input0.outboundUrl ? decodeTrackingUrl(input0.outboundUrl) : null };
  const parsed = parseOfferText(input.text);
  const { alvo, specs, band } = classify(input.title, await alvosDoSistema());
  const store =
    (input.outboundUrl && storeForUrl(input.outboundUrl)) || (input.storeName ? storeByName(input.storeName) : null);
  const buyUrl = input.outboundUrl ? cleanUrl(input.outboundUrl) : input.url;
  const category = categorize(input.title);
  // Post que é só cupom não vai para a Vitrine nem para a verificação: vira linha na tela Cupons.
  const isCoupon = !alvo && isCouponMessage(input.title, input.text, { hasProduct: category != null });
  const row = await prisma.offer.create({
    select: { id: true },
    data: {
      rawMessageId: rawId,
      sourceId: input.sourceId,
      alvoId: alvo?.id ?? null,
      specs: jsonOrNull(specs),
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
      refMinCents: input.refMinCents ?? null,
      refMaxCents: input.refMaxCents ?? null,
      curtidas: input.curtidas ?? null,
      shippingCents: parsed.shippingCents,
      freeShipping: parsed.freeShipping,
      coupon: parsed.coupon,
      verifyStatus: isCoupon ? "nao_verificado" : input.outboundUrl ? "pendente" : "nao_verificado",
      verifyNote: isCoupon ? "post de cupom" : input.outboundUrl ? null : "sem link da loja no post",
      kind: isCoupon ? "cupom" : "produto",
      category: isCoupon ? null : category,
      categorySource: !isCoupon && category ? "regra" : null,
    },
  });
  await saveCoupons({
    offerId: row.id,
    isCoupon,
    title: input.title,
    text: input.text,
    code: parsed.coupon,
    store: store?.slug ?? null,
    url: buyUrl,
    postUrl: input.url,
    sourceId: input.sourceId,
  });
  if (alvo && band) await refreshRef(alvo.id, band.key, band.label);
  // Cupom não entra nos Alvos de ninguém.
  const donos = isCoupon ? [] : await classificarParaDonos(row.id, input.title);
  await scoreOffer(row.id);
  // "Oferta nova" na faixa Ao vivo de quem tem a oferta num Alvo.
  for (const d of donos) {
    await logEvent("nova", row.id, input.title, { to: parsed.priceCardCents ?? undefined, store: store?.slug ?? null, band: d.band?.label }, d.userId);
  }
  return row.id;
}

/**
 * Recalcula a referência de uma faixa de um Alvo: mediana, preço-alvo (85%) e teto (115%) dos preços vistos em 7 dias.
 * Entram as ofertas da faixa (as que o sistema pôs neste Alvo e as que o dono tem nele) e os preços de mercado das
 * vitrines, que valem para todo Alvo com o mesmo nome (o "monitor" de cada conta); cada produto conta uma vez só.
 * Devolve true se o preço-alvo mudou.
 */
export async function refreshRef(alvoId: number, bandKey: string, label?: string): Promise<boolean> {
  const week = atras(7 * DIA);
  const alvo = await prisma.alvo.findUnique({ where: { id: alvoId }, select: { slug: true } });
  if (!alvo) return false;
  const obs = await prisma.marketObs.findMany({ where: { bandKey, seenAt: { gte: week }, alvo: { slug: alvo.slug } } });
  const rows = (
    await prisma.offer.findMany({
      where: { priceCardCents: { not: null }, createdAt: { gte: week }, ...inBand(alvoId, bandKey) },
      select: { id: true, priceCardCents: true, product: { select: { store: true, storeProductId: true } } },
    })
  ).map((o) => ({ id: o.id, p: o.priceCardCents, store: o.product?.store ?? null, code: o.product?.storeProductId ?? null }));

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
  const medianCents = prices.length >= 5 ? median(prices) : null;
  const prev = await prisma.alvoRef.findUnique({ where: { alvoId_bandKey: { alvoId, bandKey } } });
  // O preço-alvo e o teto que o usuário pôs na tela Alvos valem no lugar dos calculados.
  const t = effectiveTargets(targetsFrom(prices), prev ?? null);
  const values = { medianCents, ...t, n: prices.length, updatedAt: new Date() };
  await prisma.alvoRef.upsert({
    where: { alvoId_bandKey: { alvoId, bandKey } },
    create: { alvoId, bandKey, label: label ?? prev?.label ?? bandKey, ...values },
    update: { ...(label ? { label } : {}), ...values },
  });
  return (prev?.targetCents ?? null) !== t.targetCents;
}

/** Ofertas numa faixa de um Alvo: as que o sistema pôs nele e as que o dono tem nele. */
function inBand(alvoId: number, bandKey: string): Prisma.OfferWhereInput {
  return { OR: [{ alvoId, bandKey }, { ofertasAlvo: { some: { alvoId, bandKey } } }] };
}

/** Reescreve o preço-alvo de uma faixa (o dono mexeu nele) e refaz as notas das ofertas da faixa. */
export async function rescoreBand(alvoId: number, bandKey: string) {
  await refreshRef(alvoId, bandKey);
  const peers = await prisma.offer.findMany({ where: { ...inBand(alvoId, bandKey), createdAt: { gte: atras(7 * DIA) } }, select: { id: true } });
  for (const p of peers) await scoreOffer(p.id, { silent: true });
  await notify({ type: "offer" });
}

/**
 * Notas de uma oferta. A geral (de quem não tem a oferta num Alvo) compara o preço com o mercado da faixa do sistema,
 * sem o preço-alvo de ninguém. A de cada conta que tem a oferta num Alvo usa o preço-alvo dela, e o "Alvo atingido"
 * (com evento e aviso) vale só para ela. Com `so`, refaz só a nota daquela conta.
 */
export async function scoreOffer(offerId: number, opts: { silent?: boolean; so?: number } = {}) {
  const o = await prisma.offer.findUnique({ where: { id: offerId } });
  if (!o) return;
  const store = o.store ? STORES.find((s) => s.slug === o.store) : null;
  // Desconto real (D): o preço de agora contra o histórico do produto (price_points); sem série, o mínimo e o máximo do Promobit.
  const pontos = o.productId && o.priceCardCents
    ? (await prisma.pricePoint.findMany({ where: { productId: o.productId, observedAt: { gte: atras(30 * DIA) } }, select: { observedAt: true, priceCardCents: true } }))
        .filter((x) => x.priceCardCents != null)
        .map((x) => ({ t: x.observedAt.getTime(), cents: x.priceCardCents! }))
    : [];
  const D = pontoD(estatisticas(pontos, o.priceCardCents, o.listPriceCents, Date.now()), { minCents: o.refMinCents, maxCents: o.refMaxCents }, o.priceCardCents);
  const base = {
    priceCardCents: o.priceCardCents,
    D,
    storeTrust: store?.trust ?? null,
    freeShipping: o.freeShipping,
    shippingCents: o.shippingCents,
  };
  if (!opts.so) {
    const ref = o.alvoId && o.bandKey ? await prisma.alvoRef.findUnique({ where: { alvoId_bandKey: { alvoId: o.alvoId, bandKey: o.bandKey } } }) : null;
    const r = notaRapida({ ...base, ...mercadoDe(ref) });
    await prisma.offer.update({ where: { id: offerId }, data: { nota: r.nota, notaParts: json(r.parts) } });
  }
  const mine = await prisma.ofertaAlvo.findMany({ where: { offerId, alvoId: { not: null }, ...(opts.so ? { userId: opts.so } : {}) } });
  for (const p of mine) {
    const ref = p.bandKey ? await prisma.alvoRef.findUnique({ where: { alvoId_bandKey: { alvoId: p.alvoId!, bandKey: p.bandKey } } }) : null;
    const r = notaRapida({ ...base, targetCents: ref?.targetCents ?? null, ceilingCents: ref?.ceilingCents ?? null });
    // Alvo atingido de verdade: preço conferido na loja, dentro de uma faixa com referência, e ainda à venda.
    const hit = r.alvoAtingido && o.verifyStatus === "verificado" && o.available !== false;
    const firstHit = hit && !p.hitAt;
    await prisma.ofertaAlvo.update({
      where: { offerId_userId: { offerId, userId: p.userId } },
      data: { nota: r.nota, notaParts: json(r.parts), ...(firstHit ? { hitAt: new Date() } : {}) },
    });
    // Na reclassificação silenciosa (subida do worker) marca sem avisar, para o alerta não tocar por oferta antiga.
    if (firstHit && !opts.silent) {
      await logEvent("alvo", offerId, o.title, { to: o.priceCardCents ?? undefined, target: ref?.targetCents ?? undefined, band: ref?.label, store: o.store }, p.userId);
    }
  }
  if (!opts.silent) await notify({ type: "offer", id: offerId });
}

/** Registra um acontecimento na faixa "Ao vivo" (de uma conta, ou do sistema sem `userId`) e avisa as telas. */
export async function logEvent(
  type: "nova" | "preco" | "esgotou" | "alvo" | "canal",
  offerId: number | null,
  title: string,
  detail: EventDetail = {},
  userId: number | null = null,
) {
  const row = await prisma.event.create({ data: { type, offerId, title: title.slice(0, 200), detail: json(detail), userId }, select: { id: true } });
  await notify({ type: "event", id: row.id, kind: type, offerId, ...(userId ? { userId } : {}) });
}

/** O mesmo acontecimento para cada conta que tem a oferta num Alvo (preço mudou, esgotou). */
export async function logEventParaDonos(type: "preco" | "esgotou", offerId: number, title: string, detail: EventDetail = {}) {
  const donos = await prisma.ofertaAlvo.findMany({ where: { offerId, alvoId: { not: null } }, select: { userId: true } });
  for (const d of donos) await logEvent(type, offerId, title, detail, d.userId);
}

/**
 * Reclassifica as ofertas dos últimos 7 dias com as regras atuais de Alvo e faixa, recalcula as referências
 * e as notas. Roda quando o worker sobe: é barato e mantém as ofertas antigas coerentes com as regras novas.
 */
export async function rematchOffers(): Promise<{ total: number; changed: number; bands: number; pessoais: number }> {
  const list = await alvosDoSistema();
  const rows = (
    await prisma.offer.findMany({
      where: { createdAt: { gte: atras(7 * DIA) } },
      select: {
        id: true,
        title: true,
        alvoId: true,
        bandKey: true,
        store: true,
        url: true,
        coupon: true,
        sourceId: true,
        categorySource: true,
        category: true,
        createdAt: true,
        source: { select: { kind: true } },
        rawMessage: { select: { text: true, url: true, outboundUrl: true } },
      },
    })
  ).map(({ source, rawMessage, ...o }) => ({ ...o, kind: source.kind, text: rawMessage.text, postUrl: rawMessage.url, outboundUrl: rawMessage.outboundUrl }));
  const bands = new Map<string, { alvoId: number; band: Band }>();
  let changed = 0;
  for (const r of rows) {
    // Mensagem de canal: refaz a escolha do título com as regras atuais (a linha do produto, não a chamada).
    let title = r.title;
    if (r.kind === "telegram") {
      const v = offerFromMessage(r.text, list);
      title = v.kind === "oferta" ? v.title : "";
      if (title && title !== r.title) await prisma.offer.update({ where: { id: r.id }, data: { title: title.slice(0, 300) } });
    }
    // Loja pelo domínio do link (mesmo curto, como meli.la): ofertas de antes da regra ficam sem loja até aqui.
    if (!r.store) {
      const s = storeForUrl(r.outboundUrl ?? r.url ?? "");
      if (s) {
        await prisma.offer.update({ where: { id: r.id }, data: { store: s.slug } });
        r.store = s.slug;
      }
    }
    const c = title ? classify(title, list) : { alvo: null, specs: null, band: null };
    const alvoId = c.alvo?.id ?? null;
    const bandKey = c.band?.key ?? null;
    if (alvoId !== r.alvoId || bandKey !== r.bandKey) changed++;
    // Categoria e cupom com as regras atuais. A categoria dada pela IA só é trocada se uma regra servir agora.
    const category = title ? categorize(title) : null;
    const isCoupon = !c.alvo && !!title && isCouponMessage(title, r.text, { hasProduct: category != null });
    const cat = isCoupon
      ? { category: null, categorySource: null }
      : category
        ? { category, categorySource: "regra" }
        : r.categorySource === "ia"
          ? { category: r.category, categorySource: "ia" }
          : { category: null, categorySource: null };
    // Mensagem que, pelas regras de hoje, não é oferta (conversa, sorteio, propaganda do canal) sai da Vitrine.
    await prisma.offer.update({
      where: { id: r.id },
      data: { alvoId, specs: jsonOrNull(c.specs), bandKey, kind: isCoupon ? "cupom" : title ? "produto" : "ruido", ...cat },
    });
    if (title) {
      await saveCoupons({
        offerId: r.id,
        isCoupon,
        title,
        text: r.text,
        code: r.coupon,
        store: r.store,
        url: r.url,
        postUrl: r.postUrl,
        sourceId: r.sourceId,
        seenAt: r.createdAt,
      });
    }
    if (c.alvo && c.band) bands.set(`${alvoId}:${bandKey}`, { alvoId: c.alvo.id, band: c.band });
  }
  // Faixas que só existem nos preços de mercado também precisam de referência.
  const obsBands = await prisma.marketObs.findMany({ distinct: ["alvoId", "bandKey"], select: { alvoId: true, bandKey: true } });
  for (const b of bands.values()) await refreshRef(b.alvoId, b.band.key, b.band.label);
  for (const b of obsBands) if (!bands.has(`${b.alvoId}:${b.bandKey}`)) await refreshRef(b.alvoId, b.bandKey);
  for (const r of rows) await scoreOffer(r.id, { silent: true });
  // Os Alvos de cada conta, depois do sistema (que pode ter trocado o título das mensagens de canal).
  const p = await rematchPessoal();
  await notify({ type: "offer" });
  return { total: rows.length, changed, bands: bands.size, pessoais: p.changed };
}

/**
 * Reclassifica as ofertas de 7 dias nos Alvos de cada conta (ou só de uma, quando ela muda os Alvos na tela) e refaz
 * as referências e as notas dela. Oferta que deixou de bater fica sem Alvo na linha da conta, com o histórico do ouro.
 */
export async function rematchPessoal(userId?: number): Promise<{ users: number; changed: number }> {
  const week = atras(7 * DIA);
  const donos = await alvosPorDono(userId);
  const rows = await prisma.offer.findMany({ where: { createdAt: { gte: week }, kind: "produto" }, select: { id: true, title: true } });
  const have = new Map(
    (
      await prisma.ofertaAlvo.findMany({
        where: { offer: { createdAt: { gte: week } }, ...(userId ? { userId } : {}) },
        select: { offerId: true, userId: true, alvoId: true, bandKey: true },
      })
    ).map((r) => [`${r.offerId}:${r.userId}`, r]),
  );
  // Quem tem linhas mas não tem mais Alvo ligado também entra (as linhas dele ficam sem Alvo).
  const users = new Set([...donos.keys(), ...[...have.values()].map((r) => r.userId)]);
  const touched = new Map<string, { alvoId: number; band: Band }>();
  const rescore = new Map<number, Set<number>>();
  let changed = 0;
  for (const uid of users) {
    const list = donos.get(uid) ?? [];
    const mine = new Set<number>();
    for (const r of rows) {
      const c = list.length ? classify(r.title, list) : null;
      const want = c?.alvo ? { alvoId: c.alvo.id, bandKey: c.band?.key ?? null } : { alvoId: null, bandKey: null };
      const cur = have.get(`${r.id}:${uid}`);
      if (c?.alvo && c.band) touched.set(`${c.alvo.id}:${c.band.key}`, { alvoId: c.alvo.id, band: c.band });
      if (want.alvoId != null) mine.add(r.id);
      if (!cur && want.alvoId == null) continue;
      if (cur && cur.alvoId === want.alvoId && cur.bandKey === want.bandKey) continue;
      changed++;
      if (cur) await prisma.ofertaAlvo.update({ where: { offerId_userId: { offerId: r.id, userId: uid } }, data: want });
      else await prisma.ofertaAlvo.create({ data: { offerId: r.id, userId: uid, ...want } });
    }
    rescore.set(uid, mine);
  }
  for (const b of touched.values()) await refreshRef(b.alvoId, b.band.key, b.band.label);
  for (const [uid, ids] of rescore) for (const id of ids) await scoreOffer(id, { silent: true, so: uid });
  return { users: users.size, changed };
}

/** Depois que o preço de uma oferta muda: atualiza as referências das faixas dela e, se um alvo mexeu, as notas da faixa. */
export async function afterPriceChange(offerId: number) {
  const o = await prisma.offer.findUnique({
    where: { id: offerId },
    select: { alvoId: true, bandKey: true, ofertasAlvo: { where: { alvoId: { not: null }, bandKey: { not: null } }, select: { alvoId: true, bandKey: true } } },
  });
  const pairs = new Map<string, { alvoId: number; bandKey: string }>();
  if (o?.alvoId && o.bandKey) pairs.set(`${o.alvoId}:${o.bandKey}`, { alvoId: o.alvoId, bandKey: o.bandKey });
  for (const p of o?.ofertasAlvo ?? []) pairs.set(`${p.alvoId}:${p.bandKey}`, { alvoId: p.alvoId!, bandKey: p.bandKey! });
  for (const b of pairs.values()) {
    if (!(await refreshRef(b.alvoId, b.bandKey))) continue;
    const peers = await prisma.offer.findMany({
      where: { ...inBand(b.alvoId, b.bandKey), id: { not: offerId }, createdAt: { gte: atras(48 * HORA) } },
      select: { id: true },
    });
    for (const p of peers) await scoreOffer(p.id, { silent: true });
  }
  await scoreOffer(offerId);
}

export async function setSourceStatus(slug: string, status: string, note: string | null) {
  await prisma.source.updateMany({ where: { slug }, data: { status, statusNote: note, lastRunAt: new Date() } });
  await notify({ type: "source", slug, status });
}

/** Fila de verificação. Fontes ao vivo (Telegram) passam na frente; depois, as mais novas. */
export async function pendingOffers(limit: number) {
  // Duas consultas no lugar do "order by (kind = 'telegram') desc": primeiro as do Telegram, depois as outras.
  const base = { verifyStatus: "pendente", dismissed: false, ...NA_VITRINE } satisfies Prisma.OfferWhereInput;
  const live = await prisma.offer.findMany({ where: { ...base, source: { kind: "telegram" } }, orderBy: { createdAt: "desc" }, take: limit });
  if (live.length >= limit) return live;
  const rest = await prisma.offer.findMany({ where: { ...base, source: { kind: { not: "telegram" } } }, orderBy: { createdAt: "desc" }, take: limit - live.length });
  return [...live, ...rest];
}

/**
 * Grava os cupons de um post. Post de cupom: um por cupom listado. Post de produto com código citado:
 * o cupom vale para aquele produto. O mesmo cupom visto de novo só ganha a oferta e a fonte na lista.
 */
export async function saveCoupons(p: {
  offerId: number;
  isCoupon: boolean;
  title: string;
  text: string;
  code: string | null;
  store: string | null;
  url: string | null;
  postUrl: string | null;
  sourceId: number;
  /** Quando o post foi visto (na reclassificação, a data da oferta; senão, agora). */
  seenAt?: Date;
}) {
  let list: CouponInfo[];
  if (p.isCoupon) list = couponsFromPost(p.title, p.text).filter((c) => c.code || c.discountKind);
  else if (p.code) list = [{ ...couponFromPost(p.title, p.text), code: p.code }];
  else return;
  if (!list.length) return;
  const src = await prisma.source.findUnique({ where: { id: p.sourceId }, select: { name: true } });
  for (const c of list) {
    const store = c.storeFromText ?? p.store;
    const key = couponKey(store, c, p.title);
    const values = {
      key,
      store,
      code: c.code,
      title: p.title.slice(0, 200),
      discountKind: c.discountKind,
      discountValue: c.discountValue,
      capCents: c.capCents,
      minCents: c.minCents,
      conditions: c.conditions,
      // Só link de loja (ou encurtador de loja) serve para resgatar; canal de WhatsApp ou Telegram não.
      url: p.url && (storeForUrl(p.url) || isShortener(p.url)) && !/whatsapp\.com|t\.me\//.test(p.url) ? p.url : null,
      postUrl: p.postUrl,
      offerIds: [p.offerId],
      sourceNames: src ? [src.name] : [],
      forProduct: p.isCoupon ? null : p.title.slice(0, 200),
      firstSeenAt: p.seenAt ?? new Date(),
      lastSeenAt: p.seenAt ?? new Date(),
    };
    // Mesmo cupom visto de novo: junta listas sem repetir e guarda o primeiro e o último dia. SQL num comando só.
    await prisma.$executeRaw`
      insert into coupons (key, store, code, title, discount_kind, discount_value, cap_cents, min_cents, conditions, url, post_url, offer_ids, source_names, for_product, first_seen_at, last_seen_at)
      values (${values.key}, ${values.store}, ${values.code}, ${values.title}, ${values.discountKind}, ${values.discountValue}, ${values.capCents}, ${values.minCents},
        ${JSON.stringify(values.conditions)}::jsonb, ${values.url}, ${values.postUrl}, ${JSON.stringify(values.offerIds)}::jsonb, ${JSON.stringify(values.sourceNames)}::jsonb,
        ${values.forProduct}, ${values.firstSeenAt}, ${values.lastSeenAt})
      on conflict (key) do update set
        title = excluded.title,
        discount_kind = coalesce(excluded.discount_kind, coupons.discount_kind),
        discount_value = coalesce(excluded.discount_value, coupons.discount_value),
        cap_cents = coalesce(excluded.cap_cents, coupons.cap_cents),
        min_cents = coalesce(excluded.min_cents, coupons.min_cents),
        conditions = (select coalesce(jsonb_agg(distinct x), '[]'::jsonb) from jsonb_array_elements(coupons.conditions || excluded.conditions) x),
        url = coalesce(excluded.url, coupons.url),
        post_url = coalesce(excluded.post_url, coupons.post_url),
        offer_ids = (select coalesce(jsonb_agg(distinct x), '[]'::jsonb) from jsonb_array_elements(coupons.offer_ids || excluded.offer_ids) x),
        source_names = (select coalesce(jsonb_agg(distinct x), '[]'::jsonb) from jsonb_array_elements(coupons.source_names || excluded.source_names) x),
        first_seen_at = least(coupons.first_seen_at, excluded.first_seen_at),
        last_seen_at = greatest(coupons.last_seen_at, excluded.last_seen_at)`;
  }
  await notify({ type: "coupon" });
}
