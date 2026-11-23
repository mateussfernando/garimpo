import { STORES, cleanUrl, decodeTrackingUrl, isShortener, productIdFor, storeForUrl } from "@/config/stores";
import type { Offer } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";
import { jsonOrNull, type OfferExtra } from "@/lib/db/types";
import { ldProduct, meta, stripTags } from "../http/html";
import { PausedError, RobotsError, politeFetch, unshorten } from "../http/polite";
import { parseOfferText } from "../parse/parser";
import { afterPriceChange, logEventParaDonos, notify, pendingOffers } from "../pipeline";
import { adapterFor } from "./adapters";



/**
 * O texto da página pode trazer a parcela de OUTRO produto (itens relacionados). O total no cartão vindo do texto só vale
 * se for parecido com o preço de referência (JSON-LD ou o do post): entre 75% e 220% dele. Sem referência, vale.
 */
export function plausibleCardPrice(candidate: number | null, reference: number | null): boolean {
  if (candidate == null) return false;
  if (!reference) return true;
  return candidate >= reference * 0.75 && candidate <= reference * 2.2;
}

type Verified = {
  title: string | null;
  image: string | null;
  priceCard: number | null;
  installments: number | null;
  installmentCents: number | null;
  interest: boolean | null;
  cashCents: number | null;
  listCents: number | null;
  freeShipping: boolean | null;
  shippingCents: number | null;
  available: boolean | null;
  coupon: string | null;
  extra: OfferExtra | null;
};

/** Caminho genérico, para loja sem leitor próprio: JSON-LD, metatags e o texto da página. */
export function readGeneric(html: string, o: Pick<Offer, "priceCardCents" | "installments" | "installmentCents" | "interest" | "freeShipping" | "shippingCents">): Verified {
  const ld = ldProduct(html);
  const text = stripTags(html);
  // Parcelas e frete costumam estar no texto da página, não no JSON-LD.
  const instLine = text.match(/[^\n]{0,60}\d{1,2}\s?x\s?(de\s)?R\$\s?[\d.,]+[^\n]{0,40}/i)?.[0] ?? "";
  const shipLine = text.match(/[^\n]{0,40}frete[^\n]{0,60}/i)?.[0] ?? "";
  // "Frete grátis acima de R$ 199" ou "para Prime" é condição, não frete grátis.
  const shipIsConditional = /frete gr[áa]tis[^\n]{0,50}(acima|a partir|prime|consulte|selecionad|primeir)/i.test(shipLine);
  const fromPage = parseOfferText(instLine + "\n" + (shipIsConditional ? "" : shipLine));
  const ldPrice = ld?.priceCents ?? null;

  let priceCard = o.priceCardCents;
  let installments = o.installments;
  let installmentCents = o.installmentCents;
  let interest = o.interest;
  if (fromPage.installments && fromPage.installmentCents && plausibleCardPrice(fromPage.priceCardCents, ldPrice ?? o.priceCardCents)) {
    installments = fromPage.installments;
    installmentCents = fromPage.installmentCents;
    interest = fromPage.interest;
    priceCard = fromPage.priceCardCents;
  } else if (ldPrice && plausibleCardPrice(ldPrice, o.priceCardCents ?? ldPrice)) {
    priceCard = ldPrice;
  }
  const avail = ld?.availability ?? "";
  return {
    title: ld?.name ?? meta(html, "og:title"),
    image: ld?.image ?? meta(html, "og:image") ?? amazonImage(html),
    priceCard,
    installments,
    installmentCents,
    interest,
    // O preço do JSON-LD costuma ser o do Pix quando é menor que o total no cartão.
    cashCents: ldPrice && priceCard && ldPrice < priceCard ? ldPrice : null,
    listCents: null,
    freeShipping: fromPage.freeShipping ?? o.freeShipping,
    shippingCents: fromPage.shippingCents ?? o.shippingCents,
    available: /OutOfStock|SoldOut|Discontinued/i.test(avail) ? false : /InStock/i.test(avail) ? true : null,
    coupon: null,
    extra: null,
  };
}

/** A página da Amazon não traz og:image nem imagem no JSON-LD: a foto principal fica em data-old-hires ou "hiRes". */
export function amazonImage(html: string): string | null {
  const m =
    html.match(/data-old-hires=["'](https:\/\/[^"']+\.(?:jpg|jpeg|png|webp))["']/i) ??
    html.match(/"hiRes"\s*:\s*"(https:\/\/[^"]+)"/) ??
    html.match(/id=["']landingImage["'][^>]*\ssrc=["'](https:\/\/[^"']+)["']/i) ??
    html.match(/"large"\s*:\s*"(https:\/\/m\.media-amazon\.com[^"]+)"/);
  return m?.[1] ?? null;
}

export const NOT_PRODUCT = "o link não abre a página de um produto (promoção, busca, live ou erro da loja)";

async function markNotVerified(o: Offer, note: string) {
  await prisma.offer.update({ where: { id: o.id }, data: { verifyStatus: "nao_verificado", verifyNote: note, verifiedAt: new Date() } });
  await notify({ type: "offer", id: o.id });
}

const inFlight = new Map<number, string>();

/**
 * O que o robots.txt de cada loja deixou abrir nas últimas 2 h. Se bloqueou 90% ou mais (com 5 ou mais tentativas),
 * as próximas ofertas da loja ficam "não verificadas" sem abrir nada; 1 em 20 ainda tenta, para notar se mudou.
 */
const robotsLog = new Map<string, { at: number; ok: boolean }[]>();
let robotsProbe = 0;
function noteRobots(slug: string, ok: boolean) {
  const now = Date.now();
  const list = (robotsLog.get(slug) ?? []).filter((x) => now - x.at < 2 * 60 * 60 * 1000);
  list.push({ at: now, ok });
  robotsLog.set(slug, list.slice(-200));
}
function robotsSkip(slug: string): boolean {
  const list = robotsLog.get(slug) ?? [];
  const blocked = list.filter((x) => !x.ok).length;
  if (blocked < 5 || blocked / list.length < 0.9) return false;
  return ++robotsProbe % 20 !== 0;
}

/** Abre a página da loja uma vez e confere preço no cartão e no Pix, parcelas, frete, estoque e foto. */
export async function verifyOffer(o: Offer): Promise<void> {
  if (inFlight.has(o.id)) return;
  inFlight.set(o.id, o.store ?? "?");
  try {
    await verifyInner(o);
  } finally {
    inFlight.delete(o.id);
  }
}

/** Via rápida das fontes ao vivo: confere já, sem esperar a fila. A fila por loja do politeFetch continua valendo. */
export async function verifyNow(offerId: number): Promise<void> {
  const o = await prisma.offer.findUnique({ where: { id: offerId } });
  if (o && o.verifyStatus === "pendente") await verifyOffer(o);
}

async function verifyInner(o: Offer) {
  const raw = await prisma.rawMessage.findUnique({ where: { id: o.rawMessageId } });
  const start0 = raw?.outboundUrl ?? o.url;
  const decoded = start0 ? decodeTrackingUrl(start0) : null;
  if (!decoded) return markNotVerified(o, "sem link da loja");
  // Link direto de loja conhecida: abre o endereço limpo. Os parâmetros de afiliado não mudam o produto,
  // e o robots.txt de várias lojas (Pichau, por exemplo) só permite o endereço sem parâmetros.
  const start = storeForUrl(decoded) && !isShortener(decoded) ? cleanUrl(decoded) : decoded;
  // Loja cujo robots.txt bloqueia quase toda página de produto: não gasta a fila abrindo o link curto à toa.
  const guess = storeForUrl(decoded) ?? (o.store ? STORES.find((s) => s.slug === o.store) ?? null : null);
  if (guess && robotsSkip(guess.slug)) return markNotVerified(o, "o robots.txt da loja não permite (pulado sem abrir)");
  try {
    const finalUrl = cleanUrl(await unshorten(start));
    const store = storeForUrl(finalUrl);
    if (!store) {
      // Fora de config/stores.ts = suspeito: não abre a página.
      await prisma.offer.update({ where: { id: o.id }, data: { url: finalUrl } });
      return markNotVerified(o, "loja fora da lista (suspeito)");
    }
    const state = await prisma.storeState.findUnique({ where: { slug: store.slug } });
    if (state?.pausedByUser) return markNotVerified(o, "loja pausada por você");
    // Só vira "produto" um link que é de um produto. Página de erro (AliExpress /error/404), moedas, live da Shopee,
    // promoção da Amazon ou a home davam um product_id único para ofertas sem nada a ver, e o preço lido dali
    // ia para o card como "conferido". Esses links nem são abertos: o preço continua o do post.
    const pid = productIdFor(store, finalUrl);
    if (!pid) {
      await prisma.offer.update({ where: { id: o.id }, data: { url: finalUrl, store: store.slug } });
      return markNotVerified(o, NOT_PRODUCT);
    }
    const page = await politeFetch(finalUrl);
    if (page.status >= 400) return markNotVerified(o, `a loja respondeu ${page.status}`);

    // Leitor exato da loja, se existir e entender a página; senão, o caminho genérico.
    const exact = adapterFor(store.slug)?.(page.body, finalUrl) ?? null;
    const v: Verified = exact
      ? {
          title: exact.title,
          image: exact.imageUrl,
          priceCard: exact.cardCents,
          installments: exact.installments,
          installmentCents: exact.installmentCents,
          interest: exact.interest,
          cashCents: exact.cashCents,
          listCents: exact.listCents,
          freeShipping: exact.freeShipping,
          shippingCents: exact.freeShipping ? 0 : null,
          available: exact.available,
          coupon: exact.coupon,
          extra: exact.extra,
        }
      : readGeneric(page.body, o);

    const prod = await prisma.product.upsert({
      where: { store_storeProductId: { store: store.slug, storeProductId: pid } },
      create: { store: store.slug, storeProductId: pid, canonicalUrl: finalUrl, title: v.title, imageUrl: v.image },
      update: { canonicalUrl: finalUrl, ...(v.title ? { title: v.title } : {}), ...(v.image ? { imageUrl: v.image } : {}) },
      select: { id: true },
    });

    await prisma.pricePoint.create({ data: {
      productId: prod.id,
      priceCardCents: v.priceCard,
      cashCents: v.cashCents,
      installments: v.installments,
      interest: v.interest,
      shippingCents: v.shippingCents,
      freeShipping: v.freeShipping,
      imageUrl: v.image,
      origin: "loja",
    } });

    await prisma.offer.update({
      where: { id: o.id },
      data: {
        productId: prod.id,
        store: store.slug,
        url: finalUrl,
        imageUrl: v.image ?? o.imageUrl,
        priceCardCents: v.priceCard,
        priceBasis: v.installments ? "parcelado" : o.priceBasis,
        installments: v.installments,
        installmentCents: v.installmentCents,
        interest: v.interest,
        cashCents: v.cashCents ?? (exact ? null : o.cashCents),
        listPriceCents: v.listCents ?? o.listPriceCents,
        freeShipping: v.freeShipping,
        shippingCents: v.shippingCents,
        available: v.available,
        coupon: v.coupon ?? o.coupon,
        extra: jsonOrNull(v.extra ?? o.extra),
        verifyStatus: v.priceCard ? "verificado" : "nao_verificado",
        verifyNote: v.priceCard ? (exact ? null : "leitura genérica da página") : "a página não mostrou o preço",
        verifiedAt: new Date(),
      },
    });
    // Faixa "Ao vivo" de quem tem a oferta num Alvo: preço que mudou de verdade (1% ou mais) depois de uma conferência
    // anterior, e produto que acabou.
    if (o.verifiedAt && o.priceCardCents && v.priceCard && Math.abs(v.priceCard - o.priceCardCents) >= o.priceCardCents * 0.01) {
      await logEventParaDonos("preco", o.id, o.title, { from: o.priceCardCents, to: v.priceCard, store: store.slug });
    }
    if (v.available === false && o.available !== false) await logEventParaDonos("esgotou", o.id, o.title, { store: store.slug });
    await afterPriceChange(o.id);
    noteRobots(store.slug, true);
  } catch (err) {
    if (err instanceof PausedError) return markNotVerified(o, err.message);
    if (err instanceof RobotsError) {
      const blocked = storeForUrl(err.url);
      if (blocked && !isShortener(err.url)) noteRobots(blocked.slug, false);
      return markNotVerified(o, "o robots.txt da loja não permite");
    }
    return markNotVerified(o, `falhou: ${(err as Error).message.slice(0, 120)}`);
  }
}

const MAX_IN_FLIGHT = 8;
const MAX_PER_STORE = 2;

/**
 * Confere as ofertas pendentes sem travar: cada passada dispara as que couberem e não espera terminar.
 * No máximo 2 por loja ao mesmo tempo, então uma loja lenta não segura as outras.
 */
export async function verifyTick() {
  const pending = await pendingOffers(40);
  for (const o of pending) {
    if (inFlight.size >= MAX_IN_FLIGHT) break;
    if (inFlight.has(o.id)) continue;
    const key = o.store ?? "?";
    if ([...inFlight.values()].filter((k) => k === key).length >= MAX_PER_STORE) continue;
    void verifyOffer(o).catch((e) => console.error("[verificação] erro:", e));
  }
}
