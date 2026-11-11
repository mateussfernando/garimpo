// "É o mesmo produto?" entre ofertas de lojas e grupos diferentes, para a Vitrine juntar num card só e comparar as lojas.
// Errar juntando dois produtos diferentes é pior do que deixar de juntar, então as regras são conservadoras:
// 1. mesmo produto na loja (product_id, com título parecido) ou mesmo título (sem acento, pontuação e espaços);
// 2. mesmo código de modelo (VG279QM5F, 55UT8050) com títulos parecidos;
// 3. títulos muito parecidos (≥ 70% das palavras) e com os mesmos números (iPhone 15 ≠ iPhone 16, 128 GB ≠ 256 GB).
// Nas regras 2 e 3, categorias diferentes ou preços longe demais (mais que o dobro) nunca juntam.
import { normalize } from "./money";

export type SameProductInput = { id: number; title: string; productId: number | null; category: string | null; priceCardCents: number | null };

// Palavras que não dizem qual é o produto: ligação, cor, condição do post.
const NOISE = new Set(
  "para com sem por the and new novo nova original oficial oferta promo promocao cupom frete gratis envio full loja internacional nacional versao modelo kit cor preto preta branco branca azul cinza prata grafite rosa verde vermelho vermelha dourado roxo amarelo bege titanio natural unidade unidades".split(" "),
);
const SPEC = /^\d+(?:[.,]\d+)?(hz|ghz|mhz|ms|gb|tb|mb|mm|cm|w|p|k|pol|dpi|mah|fps|v|l|ml|g|kg|m)?$/;

type Sig = { words: Set<string>; nums: Set<string>; key: string; code: string | null };

function signature(title: string): Sig {
  const flat = normalize(title).replace(/(\d),(\d)/g, "$1.$2");
  const tokens = flat.match(/[a-z0-9]+(?:\.[a-z0-9]+)*/g) ?? []; // hífen separa: 27GS60F-B tem o código 27GS60F
  const words = new Set(tokens.filter((t) => (t.length >= 3 || /\d/.test(t)) && !NOISE.has(t)));
  const nums = new Set(tokens.filter((t) => /\d/.test(t)));
  // Código do modelo: letras e números juntos, 5+ caracteres, que não seja medida (144hz, 512gb, 1080p).
  const codes = tokens.filter((t) => t.length >= 5 && /[a-z]/.test(t) && /\d/.test(t) && !SPEC.test(t) && !/^\d+x\d+(?:mm|cm|m)?$/.test(t));
  return { words, nums, key: flat.replace(/[^a-z0-9]+/g, ""), code: codes.sort((a, b) => b.length - a.length)[0] ?? null };
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}

const subset = (a: Set<string>, b: Set<string>) => [...a].every((x) => b.has(x));

/** Preços a menos do dobro um do outro (ou algum sem preço). */
const closePrice = (a: SameProductInput, b: SameProductInput) =>
  !a.priceCardCents || !b.priceCardCents || Math.max(a.priceCardCents, b.priceCardCents) <= 2 * Math.min(a.priceCardCents, b.priceCardCents);

function samePair(a: SameProductInput, sa: Sig, b: SameProductInput, sb: Sig): boolean {
  if (!closePrice(a, b)) return false;
  if (sa.key.length >= 8 && sa.key === sb.key) return true;
  if (a.category && b.category && a.category !== b.category) return false;
  // Os números de um título têm de estar no outro: "TV 55 4K" e "TV 55 4K 55UT8050" juntam; "iPhone 15" e "iPhone 16", não.
  if (!subset(sa.nums, sb.nums) && !subset(sb.nums, sa.nums)) return false;
  const sim = jaccard(sa.words, sb.words);
  if (sa.code && sa.code === sb.code) return sim >= (sa.code.length >= 7 ? 0.2 : 0.5);
  // Título sem nenhum número ("Fone de Ouvido Bluetooth") é genérico demais para juntar só pela semelhança.
  return sa.nums.size > 0 && sb.nums.size > 0 && sim >= 0.7;
}

/** Junta as ofertas do mesmo produto. Devolve os grupos, cada um com os índices em `list`, na ordem original. */
export function clusterSameProduct(list: SameProductInput[]): number[][] {
  const sigs = list.map((o) => signature(o.title));
  const parent = list.map((_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  // Faixa de preço de cada grupo: o grupo inteiro fica dentro do dobro, não só cada par.
  // Sem isso, um post sem preço liga "R$ 4,99" a "R$ 3.725" porque é parecido com os dois.
  const lo = list.map((o) => o.priceCardCents || Infinity);
  const hi = list.map((o) => o.priceCardCents || 0);
  const unite = (i: number, j: number): boolean => {
    const a = find(i);
    const b = find(j);
    if (a === b) return true;
    const min = Math.min(lo[a], lo[b]);
    const max = Math.max(hi[a], hi[b]);
    if (max > 0 && min !== Infinity && max > 2 * min) return false;
    parent[b] = a;
    lo[a] = min;
    hi[a] = max;
    return true;
  };
  // Só compara pares que têm alguma palavra em comum (o índice evita comparar tudo com tudo).
  const byWord = new Map<string, number[]>();
  sigs.forEach((s, i) => {
    for (const w of s.words) byWord.set(w, [...(byWord.get(w) ?? []), i]);
  });
  // Mesmo produto na loja: junta direto. Mesmo título: junta se o preço não for longe demais
  // (um post com o preço errado, "PS5 por R$ 100", não entra no grupo do PS5 de verdade).
  const exact = new Map<string, number[]>();
  // O mesmo product_id também precisa de título parecido: páginas de erro da loja (AliExpress /error/404)
  // já viraram um "produto" só para ofertas sem nada a ver.
  const join = (k: string, i: number, ok: (r: number) => boolean) => {
    const reps = exact.get(k) ?? [];
    if (!reps.some((r) => ok(r) && unite(r, i))) exact.set(k, [...reps, i]);
  };
  list.forEach((o, i) => {
    if (o.productId != null) join(`p:${o.productId}`, i, (r) => closePrice(list[r], o) && (jaccard(sigs[r].words, sigs[i].words) >= 0.3 || (!!sigs[i].code && sigs[i].code === sigs[r].code)));
    if (sigs[i].key.length >= 8) join(`t:${sigs[i].key}`, i, (r) => closePrice(list[r], o));
  });
  for (let i = 0; i < list.length; i++) {
    const seen = new Set<number>();
    for (const w of sigs[i].words) {
      const bucket = byWord.get(w)!;
      // Palavra que aparece em muitas ofertas ("smart", "fone") não ajuda a achar o par.
      if (bucket.length > 80) continue;
      for (const j of bucket) {
        if (j <= i || seen.has(j)) continue;
        seen.add(j);
        if (find(i) !== find(j) && samePair(list[i], sigs[i], list[j], sigs[j])) unite(i, j);
      }
    }
  }
  const groups = new Map<number, number[]>();
  list.forEach((_, i) => groups.set(find(i), [...(groups.get(find(i)) ?? []), i]));
  return [...groups.values()];
}

export const __test = { signature, samePair };
