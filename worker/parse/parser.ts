import { normalize, parseBRL } from "@/lib/money";
import { extractCouponCode } from "./coupons";

// Parser BR: lê preço no cartão, parcelas, juros, à vista, frete, cupom e links
// de um texto de oferta (título de comunidade, post ou mensagem).

export type ParsedOffer = {
  /** Total no cartão (melhor estimativa). */
  priceCardCents: number | null;
  /** Como o total no cartão foi obtido. */
  priceBasis: "parcelado" | "cartao" | "avista" | "unico" | null;
  installments: number | null;
  installmentCents: number | null;
  /** true = com juros, false = sem juros, null = não disse. */
  interest: boolean | null;
  cashCents: number | null;
  listPriceCents: number | null;
  freeShipping: boolean | null;
  shippingCents: number | null;
  coupon: string | null;
  links: string[];
};

type Role = "cash" | "card" | "ship" | "off" | "none";
type Price = { cents: number; index: number; end: number; role: Role };

const MONEY = String.raw`R\$\s*(\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d+\.\d{2}(?!\d)|\d+(?:,\d{1,2})?)`;
// O rótulo pode vir entre parênteses ou colchetes: "R$ 549,00 [no pix]", "R$ 99 (no cartão)".
const CASH_AFTER = /^\s*[-–([]?\s*(no |via |a |em )?(pix|a vista|boleto)\b/;
const CARD_AFTER = /^\s*[-–([]?\s*(no |em |via )?(cartao|credito|parcelado|a prazo)\b/;
// Pix ou cartão ditos em outra linha do post ("pagando no PIX!", "| PIX" no título, "CUPOM + PIX", "em até 10x").
// "10% off no Pix" fala de um desconto extra, não do preço anunciado: não vale.
const PIX_NO_POST = /\b(no|via|com|pelo)\s+pix\b|[|+]\s*pix\b|\bpix\s*[|+]|\[\s*pix\s*\]|\(\s*pix\s*\)/;
const PIX_DESCONTO = /%\s*(off|de desconto|desconto)?\s*(no|via|pelo|pagando no)?\s*pix\b/;
const CARTAO_NO_POST = /\b(no|em|via|pelo)\s+cartao\b|\bem ate \d{1,2}\s*x\b|\bparcelad[oa]\b/;
const CASH_BEFORE = /(pix|a vista|boleto)\s*[:\-–]?\s*$/;
const CARD_BEFORE = /(cartao|credito|parcelado)\s*[:\-–]?\s*$/;
const SHIP_BEFORE = /frete\s*(de|:|por)?\s*$/;
// Quanto se economiza, não o preço: "Por R$ 271 (-R$ 39,58)", "economize R$ 50", "R$ 30 OFF" (27/11).
// O sinal de menos colado no R$ ("-R$ 39" ou "(- R$ 39)"); "R$ 1.599 - R$ 1.007" (de / por) continua valendo.
const OFF_BEFORE = /(economi[zs]e|economia( de)?|desconto( de)?)\s*$/;
const MENOS_COLADO = /(\(\s*[-−–]\s*|[-−–])$/;
const OFF_AFTER = /^\s*(off|de desconto|a menos)\b/;

function findPrices(text: string): Price[] {
  const out: Price[] = [];
  for (const m of text.matchAll(new RegExp(MONEY, "gi"))) {
    const cents = parseBRL(m[1]);
    if (cents == null) continue;
    const index = m.index!;
    const end = index + m[0].length;
    // O rótulo vale só na mesma linha do preço.
    const after = normalize(text.slice(end, end + 18).split("\n")[0]);
    const before = normalize(text.slice(Math.max(0, index - 14), index).split("\n").pop() ?? "");
    let role: Role = "none";
    if (SHIP_BEFORE.test(before)) role = "ship";
    else if (OFF_BEFORE.test(before) || OFF_AFTER.test(after) || MENOS_COLADO.test(text.slice(Math.max(0, index - 4), index))) role = "off";
    else if (CASH_AFTER.test(after)) role = "cash";
    else if (CARD_AFTER.test(after)) role = "card";
    else if (CASH_BEFORE.test(before)) role = "cash";
    else if (CARD_BEFORE.test(before)) role = "card";
    out.push({ cents, index, end, role });
  }
  return out;
}

/**
 * Post com vários produtos ("Fontes · menor preço por modelo": um bloco com preço, nome e link para cada um): o trecho do
 * produto escolhido como título, para o preço sair dele e não do último produto da lista (27/11: a fonte 650W saiu com
 * o preço da 1600W, R$ 2.549). null quando o post é de um produto só ou o título não está num bloco com preço.
 */
export function trechoDaOferta(text: string, title: string): string | null {
  const blocos = text.split(/\n\s*\n/).filter((b) => b.trim());
  if (blocos.filter((b) => /https?:\/\//.test(b)).length < 2) return null;
  const alvo = normalize(title).replace(/[^a-z0-9]+/g, " ").trim().slice(0, 40);
  if (alvo.length < 8) return null;
  const bloco = blocos.find((b) => normalize(b).replace(/[^a-z0-9]+/g, " ").includes(alvo));
  return bloco && findPrices(bloco).some((p) => p.role !== "off") ? bloco : null;
}

export function parseOfferText(input: string): ParsedOffer {
  const text = input.replace(/ /g, " ");
  const norm = normalize(text);
  const result: ParsedOffer = {
    priceCardCents: null,
    priceBasis: null,
    installments: null,
    installmentCents: null,
    interest: null,
    cashCents: null,
    listPriceCents: null,
    freeShipping: null,
    shippingCents: null,
    coupon: null,
    links: [...new Set(text.match(/https?:\/\/[^\s<>"')\]]+/g) ?? [])],
  };

  // Parcelas: "10x de R$ 129,90 sem juros", "12x R$ 35,83", "12x sem juros de R$ 99"
  const flagRe = String.raw`(sem juros|s\/\s*juros|com juros|c\/\s*juros)?`;
  const inst = new RegExp(String.raw`(\d{1,2})\s*x\s*` + flagRe + String.raw`\s*(?:de\s*)?` + MONEY + String.raw`\s*` + flagRe, "i");
  const im = text.match(inst);
  let instSpan: [number, number] | null = null;
  if (im) {
    const n = Number(im[1]);
    const each = parseBRL(im[3]);
    if (n >= 1 && n <= 24 && each != null) {
      result.installments = n;
      result.installmentCents = each;
      const flag = normalize(im[2] ?? im[4] ?? "");
      if (flag.startsWith("sem") || flag.startsWith("s/")) result.interest = false;
      else if (flag.startsWith("com") || flag.startsWith("c/")) result.interest = true;
      instSpan = [im.index!, im.index! + im[0].length];
    }
  }
  if (result.installments && result.interest == null) {
    if (/sem juros|s\/ ?juros/.test(norm)) result.interest = false;
    else if (/com juros|c\/ ?juros/.test(norm)) result.interest = true;
  }

  const prices = findPrices(text).filter((p) => !instSpan || p.index < instSpan[0] || p.index >= instSpan[1]);

  const ship = prices.find((p) => p.role === "ship");
  const cash = prices.find((p) => p.role === "cash");
  const card = prices.find((p) => p.role === "card");
  if (cash) result.cashCents = cash.cents;

  // "de R$ X por R$ Y"
  let mainCents: number | null = null;
  // Também com dois-pontos em linhas separadas: "DE: R$ 299,00 / POR: R$ 151,46".
  const dePor = text.match(new RegExp(String.raw`\bde\s*:?\s*` + MONEY + String.raw`\s*(?:por|→|->|por apenas|sai por)\s*:?\s*` + MONEY, "i"));
  if (dePor) {
    result.listPriceCents = parseBRL(dePor[1]);
    mainCents = parseBRL(dePor[2]);
  }

  const plain = prices.filter((p) => p.role === "none");
  // Comunidades escrevem "R$ 1.599,00 R$1.007,27" (de / por) no fim do título.
  if (!dePor && plain.length >= 2) {
    const last = plain[plain.length - 1];
    const prev = plain[plain.length - 2];
    const between = text.slice(prev.end, last.index);
    if (/^\s*(por|->|→)?\s*$/i.test(between) && prev.cents > last.cents) {
      result.listPriceCents = prev.cents;
      mainCents = last.cents;
    }
  }
  if (mainCents == null && plain.length) {
    const rest = plain.filter((p) => p.cents !== result.listPriceCents);
    mainCents = (rest.length ? rest : plain)[(rest.length ? rest : plain).length - 1].cents;
  }

  // Total no cartão: parcelado > explícito no cartão > preço principal > à vista
  if (result.installments && result.installmentCents) {
    const total = result.installments * result.installmentCents;
    // Parcelas arredondadas: se um preço cheio estiver a poucos centavos do total, vale ele.
    const close = [card?.cents, mainCents, cash?.cents].find(
      (c) => c != null && Math.abs(c - total) <= result.installments!,
    );
    result.priceCardCents = close ?? total;
    result.priceBasis = "parcelado";
  } else if (card) {
    result.priceCardCents = card.cents;
    result.priceBasis = "cartao";
  } else if (mainCents != null) {
    result.priceCardCents = mainCents;
    result.priceBasis = "unico";
  } else if (result.cashCents != null) {
    result.priceCardCents = result.cashCents;
    result.priceBasis = "avista";
  }

  // O preço principal é o próprio Pix ("Por R$ 487,51 no Pix" depois de um "De R$ 712,38"): o post é só Pix.
  if (result.priceBasis === "unico" && result.cashCents != null && result.priceCardCents === result.cashCents) result.priceBasis = "avista";
  // Um preço só, e a forma de pagamento dita em outra linha do post.
  if (result.priceBasis === "unico" && result.cashCents == null && !card) {
    const semLinks = norm.replace(/https?:\/\/\S+/g, " ");
    if (PIX_NO_POST.test(semLinks) && !PIX_DESCONTO.test(semLinks)) {
      result.cashCents = result.priceCardCents;
      result.priceBasis = "avista";
    } else if (CARTAO_NO_POST.test(semLinks)) result.priceBasis = "cartao";
  }

  // Frete
  if (/frete (gratis|free|gratuito)|entrega gratis/.test(norm)) {
    result.freeShipping = true;
    result.shippingCents = 0;
  } else if (ship) {
    result.shippingCents = ship.cents;
    result.freeShipping = false;
  }

  // Cupom: "cupom: BLACK10", "use o cupom X", "código X". "Cupom AQUI" e "cupom EXCLUSIVO" não são código.
  result.coupon = extractCouponCode(text);

  return result;
}
