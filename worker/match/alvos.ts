import { OTHER_TYPES } from "@/config/alvos";
import { normalize } from "@/lib/money";

export type AlvoLite = { id: number; slug: string; name: string; terms: string[]; exclusions: string[] };

/** Minúsculas, sem acento e com a pontuação de separação virando espaço ("Placa-Mãe" -> "placa mae", "USB-C" -> "usb c"). */
export function plain(text: string): string {
  return normalize(text)
    .replace(/[-_/|,;:()[\]"'’“”+*!?•·]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Tira o que vem antes do nome do produto: "[ML]", "Amazon -", "CORRE -", "Por R$ 26,69:". */
export function stripPrefixes(title: string): string {
  let t = title.trim();
  for (let i = 0; i < 4; i++) {
    const before = t;
    t = t
      .replace(/^\s*[[(【][^\])】]{1,40}[\])】]\s*[-–:|]?\s*/u, "")
      .replace(/^\s*Por\s+R\$\s*[\d.,]+\s*:\s*/i, "")
      .replace(
        /^\s*(amazon|kabum!?|mercado\s*livre|mercadolivre|ml|magalu|magazine luiza|aliexpress|ali|shopee|pichau|terabyte|casas bahia|carrefour|americanas|netshoes|corre|bug|imperd[ií]vel|oferta|promo[cç][aã]o|rel[aâ]mpago|baixou|menor pre[cç]o)\s*(bf|br|oficial)?\s*[-–:|!]+\s*/i,
        "",
      )
      .replace(/^[^\p{L}\p{N}]+/u, "");
    if (t === before) break;
  }
  return t;
}

/** Posição da primeira ocorrência do termo como palavra inteira (plural aceito), ou -1. */
function wordIndex(text: string, term: string): number {
  const t = plain(term).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const m = new RegExp(`(^|[^a-z0-9])${t}(?:e?s)?(?=[^a-z0-9]|$)`).exec(text);
  return m ? m.index + m[1].length : -1;
}

const PREPOSITIONS = new Set(["para", "pra", "p", "de", "do", "da", "dos", "das", "com", "sem", "no", "na"]);
const PROMO_WORDS = new Set([
  "oferta", "ofertas", "promocao", "promo", "desconto", "cupom", "baixou", "relampago", "imperdivel", "super", "mega", "black",
  "friday", "queima", "liquidacao", "novo", "nova", "lancamento", "so", "hoje", "agora", "corre", "bug", "menor", "preco", "historico",
]);

/**
 * "Escova de limpeza de teclado", "Base para monitor": o termo vem depois de uma preposição, então é o acessório
 * de um teclado ou monitor, e não o próprio. A exceção é a chamada de oferta: em "Promoção de Mouse", o mouse é o produto.
 */
function isObjectOfPreposition(text: string, pos: number): boolean {
  const before = text.slice(0, pos).trim().split(" ").filter(Boolean);
  if (!before.length || !PREPOSITIONS.has(before[before.length - 1])) return false;
  return before.slice(0, -1).some((w) => !PROMO_WORDS.has(w) && !PREPOSITIONS.has(w));
}

const MULTI_UNIT = /\bgrupo de \d|\b\d+ ?(unidades|unid|pecas|pcs)\b|\bpack\b|\blote\b|\bkit (com|de) \d|\b(leve|compre) \d\b/;
const COMBO = /\b(teclado|mouse) (e|com|mais) (teclado|mouse)\b/;

/**
 * O Alvo do título. Vale o primeiro nome de produto que aparece: se for o termo de um Alvo, é esse Alvo;
 * se for outro tipo de produto (notebook, placa-mãe, cabo, kit...), não é Alvo nenhum.
 * Em empate de posição ganha o termo mais longo ("mouse pad" vence "mouse").
 */
export function matchAlvo<T extends AlvoLite>(title: string, alvos: T[]): T | null {
  const whole = plain(title);
  if (MULTI_UNIT.test(whole) || COMBO.test(whole)) return null;
  const text = plain(stripPrefixes(title));

  let best: { pos: number; len: number; alvo: T | null } | null = null;
  const consider = (pos: number, len: number, alvo: T | null) => {
    if (pos < 0) return;
    if (!best || pos < best.pos || (pos === best.pos && len > best.len)) best = { pos, len, alvo };
  };
  for (const alvo of alvos) {
    for (const term of alvo.terms) {
      const pos = wordIndex(text, term);
      if (pos >= 0 && !isObjectOfPreposition(text, pos)) consider(pos, plain(term).length, alvo);
    }
  }
  for (const other of OTHER_TYPES) consider(wordIndex(text, other), other.length, null);

  const winner = (best as { pos: number; len: number; alvo: T | null } | null)?.alvo ?? null;
  if (!winner) return null;
  if (winner.exclusions.some((e) => wordIndex(text, e) >= 0)) return null;
  return winner;
}

/** Pré-filtro barato: o título toca algum Alvo? */
export function touchesAnyAlvo(title: string, alvos: AlvoLite[]): boolean {
  return matchAlvo(title, alvos) !== null;
}

export function median(values: number[]): number | null {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2);
}

/** Preço-alvo = 85% da mediana, teto = 115%, a partir de 5 preços. */
export function targetsFrom(prices: number[]): { targetCents: number | null; ceilingCents: number | null } {
  if (prices.length < 5) return { targetCents: null, ceilingCents: null };
  const m = median(prices)!;
  return { targetCents: Math.round(m * 0.85), ceilingCents: Math.round(m * 1.15) };
}
