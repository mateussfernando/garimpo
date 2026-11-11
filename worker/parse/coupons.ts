// Cupons, sem IA e sem rede: reconhece post que é só cupom ("Cupom Amazon 25% OFF", "R$ 780 de desconto em compras
// a partir de R$ 4.350") e lê código, desconto, compra mínima, limite e condições. Também acha o código citado
// num post de produto ("use o cupom AFFNOV02").
import { STORES } from "@/config/stores";
import { parseBRL } from "@/lib/money";
import { plain } from "../match/alvos";

export type CouponInfo = {
  code: string | null;
  /** pct = % de desconto; reais = R$ de desconto (centavos); cashback = % de volta; frete = frete grátis. */
  discountKind: "pct" | "reais" | "cashback" | "frete" | null;
  discountValue: number | null;
  /** Limite do desconto em % ("até R$ 500"), em centavos. */
  capCents: number | null;
  /** Compra mínima, em centavos. */
  minCents: number | null;
  conditions: string[];
  /** Loja citada no texto (slug), quando há. */
  storeFromText: string | null;
};

/** Palavras em maiúsculas que aparecem perto de "cupom" e não são código. */
const NOT_CODES = new Set([
  "AQUI", "EXCLUSIVO", "EXCLUSIVA", "AMAZON", "SHOPEE", "MAGALU", "KABUM", "ALIEXPRESS", "DESCONTO", "DESCONTOS", "GRATIS", "VALIDO", "APLICADO",
  "PRIME", "NUBANK", "LIMITADO", "LIMITADOS", "RENOVADO", "RENOVADOS", "RENOVOU", "NOVO", "NOVOS", "DISPONIVEL", "DISPONIVEIS", "OFF", "CUPOM",
  "CUPONS", "LINK", "SITE", "LOJA", "APP", "PAGINA", "ABAIXO", "ACIMA", "RESGATE", "ATIVE", "CLIQUE", "OFERTA", "OFERTAS", "BLACK", "FRIDAY",
  "MERCADO", "LIVRE", "APROVEITE", "SELECAO", "GARANTA", "CONFIRA", "ASSINE", "ADICIONE", "COMECOU", "RENOVA", "PAGO", "VIP", "PIX", "FRETE", "TODOS", "TODAS", "HOJE", "AGORA", "CORRE", "ESGOTA", "SELECIONADOS", "PRODUTOS",
]);

function validCode(raw: string | undefined): string | null {
  if (!raw) return null;
  const c = raw.trim();
  // O código vem em maiúsculas no post; palavra comum em minúsculas ("Cupons shopee") não é código.
  if (c !== c.toUpperCase() || c.length < 4 || c.length > 24) return null;
  if (NOT_CODES.has(plain(c).toUpperCase().replace(/\s/g, ""))) return null;
  if (!/\d/.test(c) && c.length < 6) return null;
  return c;
}

const CODE_PATTERNS = [
  /(?:use|usando|aplique|aplicando|insira)\s+o\s+(?:cupom|c[oó]digo)\s*[:\-–]?\s*["“'`]?([A-Za-z0-9][A-Za-z0-9_-]{3,24})\b/,
  /(?:cupom|cupon|c[oó]digo)\s*(?:de desconto)?\s*[:\-–]?\s*["“'`]?([A-Za-z0-9][A-Za-z0-9_-]{3,24})\b/gi,
  /\bOFF\s*[:\-–]\s*([A-Za-z0-9][A-Za-z0-9_-]{3,24})\b/i,
  // "🎟️ R$15 OFF EM R$ 99:  TODO1111SITE": código no fim da linha, depois de dois-pontos.
  /:\s+([A-Z0-9][A-Z0-9_-]{3,24})[ \t]*$/m,
  /🎟️?\s*[:\-–]?\s*([A-Z0-9][A-Z0-9_-]{3,24})\b/u,
];

/** O código de cupom citado no texto, ou null. */
export function extractCouponCode(text: string): string | null {
  for (const re of CODE_PATTERNS) {
    if (re.global) {
      for (const m of text.matchAll(re)) {
        const c = validCode(m[1]);
        if (c) return c;
      }
    } else {
      const c = validCode(text.match(re)?.[1]);
      if (c) return c;
    }
  }
  return null;
}

const DISCOUNT_WORDS = /\b\d{1,2}\s?%\s?(off|de desconto|de volta)|r\$\s?[\d.,]+\s?(off|de desconto)|cashback|frete gratis/;
const COUPON_WORDS = /\bcupo(m|ns|n)\b/;
const SCOPE_WORDS = /\b(em compras|acima de|a partir de|na loja|no app|pelo app|em todo|site todo|selecionad|em produtos|limitado a)\b/;

/**
 * O post é só um cupom (não um produto com preço)? Começa com "Cupom", ou fala de desconto ("25% OFF", "R$ 50 OFF")
 * junto de "cupom", de uma compra mínima ou do nome da loja, e não começa com o preço de um produto ("Por R$ 39,90:").
 */
export function isCouponPost(title: string, opts: { hasProduct?: boolean } = {}): boolean {
  const t = plain(title);
  if (/^por r\b/.test(t)) return false;
  if (/^(super |novos? |mega )?cupo(m|ns|n)\b/.test(t) || /\bcupo(m|ns) de desconto\b/.test(t)) return true;
  // "RENOVOU ) CUPOM EXCLUSIVO NUBANK NA SHOPEE": fala de cupom e não nomeia produto nenhum.
  if (COUPON_WORDS.test(t) && !opts.hasProduct) return true;
  if (/^seja prime|^exclusivo prime|^prime gratis/.test(t)) return true;
  if (!DISCOUNT_WORDS.test(t)) return false;
  return COUPON_WORDS.test(t) || SCOPE_WORDS.test(t) || storeInText(title) != null || extractCouponCode(title) != null;
}

function storeInText(text: string): string | null {
  const t = plain(text);
  const names: [string, string][] = [
    ["magazine luiza", "magalu"],
    ["mercado livre", "mercadolivre"],
    ["casas bahia", "casasbahia"],
    ...STORES.map((s) => [plain(s.name), s.slug] as [string, string]),
  ];
  let best: { pos: number; slug: string } | null = null;
  for (const [name, slug] of names) {
    const m = new RegExp(`(^|[^a-z0-9])${name}(?=[^a-z0-9]|$)`).exec(t);
    const pos = m ? m.index : -1;
    if (pos >= 0 && (!best || pos < best.pos)) best = { pos, slug };
  }
  return best?.slug ?? null;
}

const money = (s: string | undefined) => (s ? parseBRL(s.replace(/\s/g, "")) : null);

/** Lê o que o texto diz do cupom. Serve para post de cupom e para cupom citado em post de produto. */
export function readCoupon(text: string): CouponInfo {
  // `t` (sem acento) serve para as palavras; os valores em reais são lidos do texto original.
  const t = plain(text);
  const raw = text.replace(/\s+/g, " ");
  let discountKind: CouponInfo["discountKind"] = null;
  let discountValue: number | null = null;

  const reais = raw.match(/R\$\s?([\d.]+(?:,\d{2})?)\s?(?:OFF|de desconto)/i);
  const pct = raw.match(/(\d{1,2})\s?%\s?(?:OFF|de desconto)/i);
  const cashback = raw.match(/(\d{1,2})\s?%\s?(?:de\s)?(?:cashback|de volta)/i);
  if (reais && (!pct || raw.indexOf(reais[0]) < raw.indexOf(pct[0]))) {
    discountKind = "reais";
    discountValue = money(reais[1]);
  } else if (pct) {
    discountKind = "pct";
    discountValue = Number(pct[1]);
  } else if (cashback) {
    discountKind = "cashback";
    discountValue = Number(cashback[1]);
  } else if (/frete gratis/.test(t)) {
    discountKind = "frete";
  }

  const cap = raw.match(/(?:at[eé]|limitad[oa] a|m[aá]ximo de)\s+R\$\s?([\d.]+(?:,\d{2})?)/i);
  const min = raw.match(/(?:acima de|a partir de|compras? de|m[ií]nimo de|pedidos? de|em)\s+R\$\s?([\d.]+(?:,\d{2})?)(?!\s?(?:OFF|de desconto))/i);

  const conditions: string[] = [];
  const add = (cond: string, re: RegExp) => re.test(t) && !conditions.includes(cond) && conditions.push(cond);
  add("Só no app", /\b(so no app|pelo app|no app|via app|exclusivo app)\b/);
  add("Prime", /\bprime\b/);
  add("Nubank", /\bnubank\b/);
  add("Mercado Pago", /\bmercado pago\b/);
  add("Limitado", /\b(limitad[oa]s?|esgota|primeiros \d+|ate acabar)\b/);
  add("1ª compra", /\b(primeira compra|1a compra|novos clientes|novo cliente)\b/);
  add("Itens selecionados", /\b(selecionad[oa]s|produtos participantes)\b/);
  add("Resgatar na página", /\b(resgate|resgatar|ative o cupom|pegue o cupom)\b/);
  add("Cashback em moedas", /\bmoedas\b/);
  add("Frete grátis", /\bfrete gratis\b/);

  return {
    code: extractCouponCode(text),
    discountKind,
    discountValue,
    capCents: discountKind === "pct" ? money(cap?.[1]) : null,
    minCents: money(min?.[1]),
    conditions,
    storeFromText: storeInText(text),
  };
}

/** Chave para juntar o mesmo cupom visto em vários posts: loja + código; sem código, loja + desconto + mínimo. */
export function couponKey(store: string | null, c: CouponInfo, title: string): string {
  const s = store ?? "?";
  if (c.code) return `${s}:${c.code}`;
  if (c.discountKind && c.discountValue != null) return `${s}:${c.discountKind}${c.discountValue}:${c.minCents ?? 0}`;
  return `${s}:${plain(title).slice(0, 60)}`;
}

/**
 * Cupom de um post: o título manda (a página da comunidade traz outros cupons e preços no meio do texto);
 * o começo do texto só completa o que o título não disse.
 */
export function couponFromPost(title: string, text: string): CouponInfo {
  const a = readCoupon(title);
  const head = text.slice(0, 500);
  const b = readCoupon(head);
  const fromText = a.discountKind == null;
  return {
    code: a.code ?? b.code,
    discountKind: a.discountKind ?? b.discountKind,
    discountValue: fromText ? b.discountValue : a.discountValue,
    capCents: a.capCents ?? (fromText || a.discountKind === "pct" ? b.capCents : null),
    minCents: a.minCents ?? (fromText ? b.minCents : null),
    conditions: [...new Set([...a.conditions, ...b.conditions])],
    storeFromText: a.storeFromText ?? b.storeFromText,
  };
}

/**
 * Todos os cupons de um post. Canal de cupom costuma listar vários, um por linha
 * ("🎟️ R$15 OFF EM R$ 99: TODO1111SITE"): cada linha com código e desconto vira um cupom,
 * com as condições da mensagem inteira. Sem lista, vale o cupom do post (título primeiro).
 */
export function couponsFromPost(title: string, text: string): CouponInfo[] {
  const whole = couponFromPost(title, text);
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const listed: CouponInfo[] = [];
  for (const line of lines) {
    const c = readCoupon(line);
    if (c.code && c.discountKind) {
      listed.push({ ...c, conditions: [...new Set([...c.conditions, ...whole.conditions])], storeFromText: c.storeFromText ?? whole.storeFromText });
    }
  }
  if (listed.length >= 2) return listed;
  return [whole];
}
