import { eq } from "drizzle-orm";
import { cleanUrl, decodeTrackingUrl, storeForUrl } from "@/config/stores";
import { db, schema } from "@/lib/db";
import { ldProduct, meta, stripTags } from "../http/html";
import { PausedError, RobotsError, politeFetch, unshorten } from "../http/polite";
import { parseOfferText } from "../parse/parser";
import { notify, pendingOffers, scoreOffer } from "../pipeline";

const { offers, products, pricePoints, rawMessages } = schema;

type Offer = typeof offers.$inferSelect;

async function markNotVerified(o: Offer, note: string) {
  await db.update(offers).set({ verifyStatus: "nao_verificado", verifyNote: note, verifiedAt: new Date() }).where(eq(offers.id, o.id));
  await notify({ type: "offer", id: o.id });
}

/** Abre a página da loja uma vez e confere preço, parcelas, frete e foto. */
export async function verifyOffer(o: Offer) {
  const [raw] = await db.select().from(rawMessages).where(eq(rawMessages.id, o.rawMessageId));
  const start0 = raw?.outboundUrl ?? o.url;
  const start = start0 ? decodeTrackingUrl(start0) : null;
  if (!start) return markNotVerified(o, "sem link da loja");
  try {
    const finalUrl = cleanUrl(await unshorten(start));
    const store = storeForUrl(finalUrl);
    if (!store) {
      // Fora de config/stores.ts = suspeito: não abre a página.
      await db.update(offers).set({ url: finalUrl }).where(eq(offers.id, o.id));
      return markNotVerified(o, "loja fora da lista (suspeito)");
    }
    const pid = store.productId?.(new URL(finalUrl)) ?? new URL(finalUrl).pathname;
    const page = await politeFetch(finalUrl);
    if (page.status >= 400) return markNotVerified(o, `a loja respondeu ${page.status}`);

    const ld = ldProduct(page.body);
    const image = ld?.image ?? meta(page.body, "og:image");
    const title = ld?.name ?? meta(page.body, "og:title");
    // Parcelas e frete costumam estar no texto da página, não no JSON-LD.
    const text = stripTags(page.body);
    const snippet = (text.match(/[^\n]{0,60}\d{1,2}\s?x\s?(de\s)?R\$\s?[\d.,]+[^\n]{0,40}/i)?.[0] ?? "") + "\n" + (text.match(/[^\n]{0,40}frete[^\n]{0,60}/i)?.[0] ?? "");
    const fromPage = parseOfferText(snippet);
    const ldPrice = ld?.priceCents ?? null;

    let priceCard = o.priceCardCents;
    let installments = o.installments;
    let installmentCents = o.installmentCents;
    let interest = o.interest;
    if (fromPage.installments && fromPage.installmentCents) {
      installments = fromPage.installments;
      installmentCents = fromPage.installmentCents;
      interest = fromPage.interest;
      priceCard = fromPage.priceCardCents;
    } else if (ldPrice) {
      priceCard = ldPrice;
    }
    const freeShipping = fromPage.freeShipping ?? o.freeShipping;
    const shippingCents = fromPage.shippingCents ?? o.shippingCents;

    const [prod] = await db
      .insert(products)
      .values({ store: store.slug, storeProductId: pid, canonicalUrl: finalUrl, title, imageUrl: image })
      .onConflictDoUpdate({
        target: [products.store, products.storeProductId],
        set: { canonicalUrl: finalUrl, ...(title ? { title } : {}), ...(image ? { imageUrl: image } : {}) },
      })
      .returning({ id: products.id });

    await db.insert(pricePoints).values({
      productId: prod.id,
      priceCardCents: priceCard,
      cashCents: ldPrice,
      installments,
      interest,
      shippingCents,
      freeShipping,
      imageUrl: image,
      origin: "loja",
    });

    await db
      .update(offers)
      .set({
        productId: prod.id,
        store: store.slug,
        url: finalUrl,
        imageUrl: o.imageUrl ?? image,
        priceCardCents: priceCard,
        installments,
        installmentCents,
        interest,
        freeShipping,
        shippingCents,
        verifyStatus: priceCard ? "verificado" : "nao_verificado",
        verifyNote: priceCard ? null : "a página não mostrou o preço",
        verifiedAt: new Date(),
      })
      .where(eq(offers.id, o.id));
    await scoreOffer(o.id);
  } catch (err) {
    if (err instanceof PausedError) return markNotVerified(o, err.message);
    if (err instanceof RobotsError) return markNotVerified(o, "o robots.txt da loja não permite");
    return markNotVerified(o, `falhou: ${(err as Error).message.slice(0, 120)}`);
  }
}

let running = false;
/** Confere as ofertas pendentes, poucas por vez (a fila por domínio segura o ritmo). */
export async function verifyTick() {
  if (running) return;
  running = true;
  try {
    const batch = await pendingOffers(4);
    await Promise.all(batch.map((o) => verifyOffer(o)));
  } finally {
    running = false;
  }
}
