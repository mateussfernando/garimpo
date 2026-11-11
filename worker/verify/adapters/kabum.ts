// KaBuM!: a página do produto traz os dados exatos em __NEXT_DATA__ (props.pageProps.product).
// Conferido em 10/11/2026: prices.price = cartão parcelado, prices.priceWithDiscount = Pix,
// installment = melhor forma no cartão (Nx sem juros, ou 1x com desconto nos itens baratos).
import type { OfferExtra } from "@/lib/db/schema";
import { nextData } from "../../http/html";
import { toCents, type Adapter } from "./types";

type KabumProduct = {
  title?: string;
  thumbnail?: string;
  available?: boolean;
  prices?: { oldPrice?: number; priceWithDiscount?: number; price?: number };
  installment?: { installment?: number; amount?: number; discount?: number; hasFee?: boolean };
  flags?: { isFreeShipping?: boolean; isAvailable?: boolean };
  offer?: { campaignName?: string; endDate?: number; quantity?: number } | null;
  stamps?: { title?: string; description?: string } | null;
  medias?: { type?: string; images?: Record<string, string> }[];
  brands?: { name?: string } | null;
  rating?: { score?: number; count?: number } | null;
};

export const kabum: Adapter = (html) => {
  const data = nextData(html) as { props?: { pageProps?: { product?: KabumProduct } } } | null;
  const p = data?.props?.pageProps?.product;
  if (!p || !p.prices) return null;

  const full = toCents(p.prices.price);
  const pix = toCents(p.prices.priceWithDiscount);
  const old = toCents(p.prices.oldPrice);
  const n = p.installment?.installment ?? null;
  const each = toCents(p.installment?.amount);

  let cardCents = full;
  let installments: number | null = null;
  let installmentCents: number | null = null;
  const extra: OfferExtra = {};
  if (n && each) {
    installments = n;
    installmentCents = each;
    if (n === 1) {
      // Item barato: o cartão só aceita 1x, e a loja dá desconto nessa forma. É isso que se paga no cartão.
      cardCents = each;
      if (p.installment?.discount) extra.card1xDiscountPct = p.installment.discount;
    } else if (full == null || Math.abs(full - n * each) > n) {
      cardCents = n * each;
    }
  }
  if (cardCents == null) return null;

  if (p.offer?.endDate) extra.endsAt = new Date(p.offer.endDate * 1000).toISOString();
  if (typeof p.offer?.quantity === "number") extra.stockLeft = p.offer.quantity;
  if (p.offer?.campaignName) extra.campaign = p.offer.campaignName;
  if (p.stamps?.description) extra.couponNote = p.stamps.description.replace(/\s+/g, " ").trim().slice(0, 200);
  const images = (p.medias ?? [])
    .filter((m) => !m.type || m.type === "image")
    .map((m) => m.images?.g ?? m.images?.gg ?? m.images?.m ?? m.images?.p)
    .filter((u): u is string => !!u)
    .slice(0, 6);
  if (images.length) extra.images = images;
  if (p.brands?.name) extra.brand = p.brands.name;
  if (p.rating?.count) {
    extra.rating = p.rating.score;
    extra.ratingCount = p.rating.count;
  }

  const couponSrc = `${p.stamps?.title ?? ""} ${p.stamps?.description ?? ""}`;
  const coupon = couponSrc.match(/cupom\s+([A-Z0-9][A-Z0-9_-]{3,20})\b/)?.[1] ?? null;

  return {
    title: p.title ?? null,
    imageUrl: images[0] ?? p.thumbnail ?? null,
    cardCents,
    installments,
    installmentCents,
    interest: n ? !!p.installment?.hasFee : null,
    cashCents: pix,
    listCents: old && old > cardCents ? old : null,
    // O frete do KaBuM! depende do CEP: só afirma grátis quando a própria página marca.
    freeShipping: p.flags?.isFreeShipping ? true : null,
    available: p.available === false || p.flags?.isAvailable === false ? false : p.available === true ? true : null,
    coupon,
    extra,
  };
};
