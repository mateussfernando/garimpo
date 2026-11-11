// Filtros inteligentes da Vitrine, sem IA e sem rede: a busca entende frases como
// "tv até 2000 frete grátis", "air fryer shopee", "notebook entre 3 mil e 5 mil sem juros", "mais barato".
// O que não é filtro vira palavra procurada no título.
import { CATEGORIES } from "@/config/categories";
import { STORES } from "@/config/stores";
import { normalize } from "@/lib/money";

export type Sort = "nota" | "ia" | "preco" | "novos" | "desconto";

export type Parsed = {
  terms: string[];
  category: string | null;
  store: string | null;
  minCents: number | null;
  maxCents: number | null;
  free: boolean;
  noInterest: boolean;
  coupon: boolean;
  verified: boolean;
  /** Só o que a IA chamou de excelente ou boa compra. */
  aiPick: boolean;
  sort: Sort | null;
};

const EMPTY: Parsed = { terms: [], category: null, store: null, minCents: null, maxCents: null, free: false, noInterest: false, coupon: false, verified: false, aiPick: false, sort: null };

/** Minúsculas, sem acento, pontuação virando espaço (mantém dígitos, ponto e vírgula dos valores). */
export const plainText = (s: string) =>
  normalize(s)
    .replace(/[^a-z0-9.,$<>% ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** "1.299,90" | "1299" | "2k" | "3 mil" -> centavos. */
function money(raw: string, mil?: string): number | null {
  let s = raw.replace(/^r\$/, "").trim();
  let mult = 1;
  if (/k$/.test(s)) {
    mult = 1000;
    s = s.slice(0, -1);
  }
  if (mil) mult = 1000;
  const n = Number(s.replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", "."));
  return Number.isFinite(n) && n > 0 ? Math.round(n * mult * 100) : null;
}

const NUM = String.raw`(?:r\$\s?)?(\d[\d.,]*k?)(?:\s?(mil|reais))?`;
const PATTERNS: [RegExp, (m: RegExpMatchArray, p: Parsed) => void][] = [
  [new RegExp(String.raw`\b(?:entre|de)\s+${NUM}\s+(?:e|a|ate)\s+${NUM}`), (m, p) => {
    p.minCents = money(m[1], m[2] === "mil" ? m[2] : undefined);
    p.maxCents = money(m[3], m[4] === "mil" ? m[4] : undefined);
  }],
  [new RegExp(String.raw`(?:\bate|\babaixo de|\bmenos de|\bmax(?:imo)?|<=?)\s*${NUM}`), (m, p) => void (p.maxCents = money(m[1], m[2] === "mil" ? m[2] : undefined))],
  [new RegExp(String.raw`(?:\bacima de|\bmais de|\ba partir de|\bmin(?:imo)?|>=?)\s*${NUM}`), (m, p) => void (p.minCents = money(m[1], m[2] === "mil" ? m[2] : undefined))],
  [/\bfrete (gratis|gratuito|free)\b|\bfrete\b/, (_m, p) => void (p.free = true)],
  [/\bsem juros\b/, (_m, p) => void (p.noInterest = true)],
  [/\b(com )?cupo(m|ns)\b/, (_m, p) => void (p.coupon = true)],
  [/\b(verificad[oa]s?|conferid[oa]s?)\b/, (_m, p) => void (p.verified = true)],
  [/\b(recomendad[oa]s?|indicad[oa]s?|vale a pena|boas compras?|excelentes?)\b/, (_m, p) => void (p.aiPick = true)],
  [/\b(melhor(es)? (pela|da) ia|nota da ia|pela ia)\b/, (_m, p) => void (p.sort = "ia")],
  [/\b(mais barat[oa]s?|menor preco|barat[oa]s?)\b/, (_m, p) => void (p.sort = "preco")],
  [/\b(mais novas?|recentes?|novidades)\b/, (_m, p) => void (p.sort = "novos")],
  [/\b(maior desconto|mais desconto)\b/, (_m, p) => void (p.sort = "desconto")],
];

const STORE_WORDS: [string, string][] = [
  ...STORES.flatMap((s) => [[plainText(s.name), s.slug], [s.slug, s.slug]] as [string, string][]),
  ["ml", "mercadolivre"],
  ["meli", "mercadolivre"],
  ["magazine luiza", "magalu"],
  ["ali", "aliexpress"],
  ["casas bahia", "casasbahia"],
];

const CATEGORY_WORDS: [string, string][] = CATEGORIES.flatMap((c) =>
  [plainText(c.name), c.slug.replace(/-/g, " "), ...c.aliases].map((w) => [plainText(w), c.slug] as [string, string]),
).sort((a, b) => b[0].length - a[0].length);

/** Lê a busca. Cada pedaço entendido sai do texto; o que sobra são palavras para achar no título. */
export function parseQuery(q: string): Parsed {
  const p: Parsed = { ...EMPTY, terms: [] };
  let t = ` ${plainText(q)} `;
  if (!t.trim()) return p;
  for (const [re, apply] of PATTERNS) {
    const m = t.match(re);
    if (m) {
      apply(m, p);
      t = t.replace(m[0], " ");
    }
  }
  for (const [w, slug] of [...STORE_WORDS].sort((a, b) => b[0].length - a[0].length)) {
    if (p.store) break;
    if (t.includes(` ${w} `)) {
      p.store = slug;
      t = t.replace(` ${w} `, " ");
    }
  }
  for (const [w, slug] of CATEGORY_WORDS) {
    if (p.category) break;
    // Plural aceito: "tvs", "celulares".
    const m = t.match(new RegExp(` ${w}(e?s)? `));
    if (m) {
      p.category = slug;
      t = t.replace(m[0], " ");
    }
  }
  p.terms = t
    .split(" ")
    .map((w) => w.replace(/^[.,]+|[.,]+$/g, ""))
    .filter((w) => w.length > 1 && !["de", "da", "do", "com", "e", "o", "a", "para", "pra", "no", "na", "em"].includes(w));
  return p;
}

/** Rótulos do que a busca entendeu, para mostrar ao lado da caixa. */
export function describe(p: Parsed, names: { category: (s: string) => string; store: (s: string) => string; brl: (c: number) => string }): string[] {
  const out: string[] = [];
  if (p.category) out.push(names.category(p.category));
  if (p.store) out.push(names.store(p.store));
  if (p.minCents != null && p.maxCents != null) out.push(`${names.brl(p.minCents)} a ${names.brl(p.maxCents)}`);
  else if (p.maxCents != null) out.push(`até ${names.brl(p.maxCents)}`);
  else if (p.minCents != null) out.push(`acima de ${names.brl(p.minCents)}`);
  if (p.free) out.push("frete grátis");
  if (p.noInterest) out.push("sem juros");
  if (p.coupon) out.push("com cupom");
  if (p.verified) out.push("conferidas na loja");
  if (p.aiPick) out.push("recomendadas pela IA");
  if (p.sort === "ia") out.push("melhor nota da IA primeiro");
  if (p.sort === "preco") out.push("mais baratas primeiro");
  if (p.sort === "novos") out.push("mais novas primeiro");
  if (p.sort === "desconto") out.push("maior desconto primeiro");
  for (const w of p.terms) out.push(`“${w}”`);
  return out;
}

/** O título tem todas as palavras? Cada palavra vale como começo de palavra ("lg" acha "LG", "note" acha "notebook"). */
export function titleHas(title: string, terms: string[]): boolean {
  if (!terms.length) return true;
  const t = ` ${plainText(title)}`;
  return terms.every((w) => t.includes(` ${w}`));
}
