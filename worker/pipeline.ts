import { ALVOS_V0 } from "@/config/alvos";
import { STORES, cleanUrl, decodeTrackingUrl, isShortener, storeByName, storeForUrl } from "@/config/stores";
import { Prisma } from "@/generated/prisma/client";
import { NOTIFY_CHANNEL, pool } from "@/lib/db";
import { prisma } from "@/lib/db/prisma";
import { alvoFromDb, json, jsonOrNull, type EventDetail } from "@/lib/db/types";
import { DIA, HORA, MIN, atras } from "@/lib/tempo";
import { COMMUNITIES } from "./collect/communities-config";
import { VITRINES } from "./collect/vitrines-config";
import { offerFromMessage } from "./ingest/message";
import { effectiveTargets, matchAlvo, median, targetsFrom, type AlvoLite } from "./match/alvos";
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
  // Os Alvos de config/alvos.ts entram uma vez. Depois, quem manda é a tela Alvos: um Alvo que o usuário editou
  // ou apagou não é mais sobrescrito, e ligar/desligar é sempre dele.
  for (const a of ALVOS_V0) {
    await prisma.alvo.createMany({ data: [{ slug: a.slug, name: a.name, terms: a.terms, exclusions: a.exclusions }], skipDuplicates: true });
    await prisma.alvo.updateMany({ where: { slug: a.slug, editedAt: null, deletedAt: null }, data: { name: a.name, terms: a.terms, exclusions: a.exclusions } });
  }
  // Alvo do código que saiu da lista (o antigo "Acessórios") fica desligado. Nada é apagado.
  await prisma.alvo.updateMany({ where: { origin: "seed", editedAt: null, slug: { notIn: ALVOS_V0.map((a) => a.slug) } }, data: { active: false } });
}

export async function activeAlvos() {
  return (await prisma.alvo.findMany({ where: { active: true, deletedAt: null } })).map(alvoFromDb);
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
  const { alvo, specs, band } = classify(input.title, await activeAlvos());
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
  await scoreOffer(row.id);
  if (alvo) await logEvent("nova", row.id, input.title, { to: parsed.priceCardCents ?? undefined, store: store?.slug ?? null, band: band?.label });
  return row.id;
}

/**
 * Recalcula a referência de uma faixa: mediana, preço-alvo (85%) e teto (115%) dos preços vistos em 7 dias.
 * Entram as ofertas da faixa e os preços de mercado das vitrines; cada produto conta uma vez só.
 * Devolve true se o preço-alvo mudou.
 */
export async function refreshRef(alvoId: number, bandKey: string, label?: string): Promise<boolean> {
  const week = atras(7 * DIA);
  const obs = await prisma.marketObs.findMany({ where: { alvoId, bandKey, seenAt: { gte: week } } });
  const rows = (
    await prisma.offer.findMany({
      where: { alvoId, bandKey, priceCardCents: { not: null }, createdAt: { gte: week } },
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

/** Reescreve o preço-alvo de uma faixa (o usuário mexeu nele) e refaz as notas das ofertas da faixa. */
export async function rescoreBand(alvoId: number, bandKey: string) {
  await refreshRef(alvoId, bandKey);
  const peers = await prisma.offer.findMany({ where: { alvoId, bandKey, createdAt: { gte: atras(7 * DIA) } }, select: { id: true } });
  for (const p of peers) await scoreOffer(p.id, { silent: true });
  await notify({ type: "offer" });
}

export async function scoreOffer(offerId: number, opts: { silent?: boolean } = {}) {
  const o = await prisma.offer.findUnique({ where: { id: offerId } });
  if (!o) return;
  const ref = o.alvoId && o.bandKey ? await prisma.alvoRef.findUnique({ where: { alvoId_bandKey: { alvoId: o.alvoId, bandKey: o.bandKey } } }) : null;
  const store = o.store ? STORES.find((s) => s.slug === o.store) : null;
  // Calor social: fontes distintas com o mesmo produto (ou título igual) em 15 min.
  const since = new Date(o.createdAt.getTime() - 15 * MIN);
  const same = o.productId ? Prisma.sql`product_id = ${o.productId}` : Prisma.sql`lower(title) = lower(${o.title})`;
  const [{ n }] = await prisma.$queryRaw<{ n: number }[]>`select count(distinct source_id)::int as n from offers where ${same} and created_at >= ${since}`;
  const r = notaRapida({
    priceCardCents: o.priceCardCents,
    targetCents: ref?.targetCents ?? null,
    ceilingCents: ref?.ceilingCents ?? null,
    storeTrust: store?.trust ?? null,
    freeShipping: o.freeShipping,
    shippingCents: o.shippingCents,
    sources15: n,
  });
  // Alvo atingido de verdade: preço conferido na loja, dentro de uma faixa com referência, e ainda à venda.
  const hit = r.alvoAtingido && !!o.alvoId && o.verifyStatus === "verificado" && o.available !== false;
  const firstHit = hit && !o.hitAt;
  await prisma.offer.update({ where: { id: offerId }, data: { nota: r.nota, notaParts: json(r.parts), ...(firstHit ? { hitAt: new Date() } : {}) } });
  // Na reclassificação silenciosa (subida do worker) marca sem avisar, para o alerta não tocar por oferta antiga.
  if (firstHit && !opts.silent) {
    await logEvent("alvo", offerId, o.title, { to: o.priceCardCents ?? undefined, target: ref?.targetCents ?? undefined, band: ref?.label, store: o.store });
  }
  if (!opts.silent) await notify({ type: "offer", id: offerId, alvoAtingido: hit });
}

/** Registra um acontecimento na faixa "Ao vivo" e avisa as telas. */
export async function logEvent(type: "nova" | "preco" | "esgotou" | "alvo" | "canal", offerId: number | null, title: string, detail: EventDetail = {}) {
  const row = await prisma.event.create({ data: { type, offerId, title: title.slice(0, 200), detail: json(detail) }, select: { id: true } });
  await notify({ type: "event", id: row.id, kind: type, offerId });
}

/**
 * Reclassifica as ofertas dos últimos 7 dias com as regras atuais de Alvo e faixa, recalcula as referências
 * e as notas. Roda quando o worker sobe: é barato e mantém as ofertas antigas coerentes com as regras novas.
 */
export async function rematchOffers(): Promise<{ total: number; changed: number; bands: number }> {
  const list = await activeAlvos();
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
        rawMessage: { select: { text: true, url: true } },
      },
    })
  ).map(({ source, rawMessage, ...o }) => ({ ...o, kind: source.kind, text: rawMessage.text, postUrl: rawMessage.url }));
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
  await notify({ type: "offer" });
  return { total: rows.length, changed, bands: bands.size };
}

/** Depois que o preço de uma oferta muda: atualiza a referência da faixa e, se o alvo mexeu, as notas da faixa. */
export async function afterPriceChange(offerId: number) {
  const o = await prisma.offer.findUnique({ where: { id: offerId }, select: { alvoId: true, bandKey: true } });
  if (o?.alvoId && o.bandKey) {
    const moved = await refreshRef(o.alvoId, o.bandKey);
    if (moved) {
      const peers = await prisma.offer.findMany({
        where: { alvoId: o.alvoId, bandKey: o.bandKey, id: { not: offerId }, createdAt: { gte: atras(48 * HORA) } },
        select: { id: true },
      });
      for (const p of peers) await scoreOffer(p.id, { silent: true });
    }
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
  const base = { verifyStatus: "pendente", dismissed: false } satisfies Prisma.OfferWhereInput;
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
