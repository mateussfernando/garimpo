// Categoria do produto, sem IA: vale o primeiro nome de produto do título, como nos Alvos.
// "Suporte para TV" é TV (o termo mais longo vence no empate), "Kit com Shampoo" não é Beleza
// (o termo vem depois de preposição) e fica para a IA, em lote.
import { CATEGORIES } from "@/config/categories";
import { isObjectOfPreposition, plain, stripPrefixes, wordIndex } from "./alvos";

/** Slug da categoria, ou null quando nenhuma regra serve. */
export function categorize(title: string): string | null {
  const text = plain(stripPrefixes(title));
  if (!text) return null;
  let best: { pos: number; len: number; slug: string } | null = null;
  for (const c of CATEGORIES) {
    for (const term of c.terms) {
      const pos = wordIndex(text, term);
      if (pos < 0 || isObjectOfPreposition(text, pos)) continue;
      const len = term.length;
      if (!best || pos < best.pos || (pos === best.pos && len > best.len)) best = { pos, len, slug: c.slug };
    }
  }
  return best?.slug ?? null;
}
