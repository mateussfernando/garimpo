import type { OfferExtra } from "@/lib/db/schema";

/** O que a página do produto de uma loja informa, lido do jeito próprio dessa loja. Preços em centavos. */
export type StoreData = {
  title: string | null;
  imageUrl: string | null;
  /** Total no cartão no maior número de parcelas sem juros (o preço principal do app). */
  cardCents: number | null;
  installments: number | null;
  installmentCents: number | null;
  /** true = com juros, false = sem juros, null = a página não disse. */
  interest: boolean | null;
  /** À vista no Pix. */
  cashCents: number | null;
  /** Preço "de" anunciado pela loja. */
  listCents: number | null;
  /** true só quando a loja afirma frete grátis sem condição; null = depende do CEP ou não disse. */
  freeShipping: boolean | null;
  /** false = esgotado. */
  available: boolean | null;
  coupon: string | null;
  extra: OfferExtra;
};

export type Adapter = (html: string, url: string) => StoreData | null;

export const toCents = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) && v > 0 ? Math.round(v * 100) : null);
