import { eq } from "drizzle-orm";
import { cleanUrl, decodeTrackingUrl, isShortener, storeForUrl } from "@/config/stores";
import { db, schema } from "@/lib/db";
import type { OfferExtra } from "@/lib/db/schema";
import { ldProduct, meta, stripTags } from "../http/html";
import { PausedError, RobotsError, politeFetch, unshorten } from "../http/polite";
import { parseOfferText } from "../parse/parser";
import { afterPriceChange, notify, pendingOffers } from "../pipeline";
import { adapterFor } from "./adapters";

const { offers, products, pricePoints, rawMessages } = schema;

type Offer = typeof offers.$inferSelect;

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
    image: ld?.image ?? meta(html, "og:image"),
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

async function markNotVerified(o: Offer, note: string) {
  await db.update(offers).set({ verifyStatus: "nao_verificado", verifyNote: note, verifiedAt: new Date() }).where(eq(offers.id, o.id));
  await notify({ type: "offer", id: o.id });
}

const inFlight = new Map<number, string>();

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
  const [o] = await db.select().from(offers).where(eq(offers.id, offerId));
  if (o && o.verifyStatus === "pendente") await verifyOffer(o);
}

async function verifyInner(o: Offer) {
  const [raw] = await db.select().from(rawMessages).where(eq(rawMessages.id, o.rawMessageId));
  const start0 = raw?.outboundUrl ?? o.url;
  const decoded = start0 ? decodeTrackingUrl(start0) : null;
  if (!decoded) return markNotVerified(o, "sem link da loja");
  // Link direto de loja conhecida: abre o endereço limpo. Os parâmetros de afiliado não mudam o produto,
  // e o robots.txt de várias lojas (Pichau, por exemplo) só permite o endereço sem parâmetros.
  const start = storeForUrl(decoded) && !isShortener(decoded) ? cleanUrl(decoded) : decoded;
  try {
    const finalUrl = cleanUrl(await unshorten(start));
    const store = storeForUrl(finalUrl);
    if (!store) {
      // Fora de config/stores.ts = suspeito: não abre a página.
      await db.update(offers).set({ url: finalUrl }).where(eq(offers.id, o.id));
      return markNotVerified(o, "loja fora da lista (suspeito)");
    }
    const [state] = await db.select().from(schema.storeState).where(eq(schema.storeState.slug, store.slug));
    if (state?.pausedByUser) return markNotVerified(o, "loja pausada por você");
    const pid = store.productId?.(new URL(finalUrl)) ?? new URL(finalUrl).pathname;
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

    const [prod] = await db
      .insert(products)
      .values({ store: store.slug, storeProductId: pid, canonicalUrl: finalUrl, title: v.title, imageUrl: v.image })
      .onConflictDoUpdate({
        target: [products.store, products.storeProductId],
        set: { canonicalUrl: finalUrl, ...(v.title ? { title: v.title } : {}), ...(v.image ? { imageUrl: v.image } : {}) },
      })
      .returning({ id: products.id });

    await db.insert(pricePoints).values({
      productId: prod.id,
      priceCardCents: v.priceCard,
      cashCents: v.cashCents,
      installments: v.installments,
      interest: v.interest,
      shippingCents: v.shippingCents,
      freeShipping: v.freeShipping,
      imageUrl: v.image,
      origin: "loja",
    });

    await db
      .update(offers)
      .set({
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
        extra: v.extra ?? o.extra,
        verifyStatus: v.priceCard ? "verificado" : "nao_verificado",
        verifyNote: v.priceCard ? (exact ? null : "leitura genérica da página") : "a página não mostrou o preço",
        verifiedAt: new Date(),
      })
      .where(eq(offers.id, o.id));
    await afterPriceChange(o.id);
  } catch (err) {
    if (err instanceof PausedError) return markNotVerified(o, err.message);
    if (err instanceof RobotsError) return markNotVerified(o, "o robots.txt da loja não permite");
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
