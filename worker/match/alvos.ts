import { normalize } from "@/lib/money";

export type AlvoLite = { id: number; slug: string; name: string; terms: string[]; exclusions: string[] };

function has(text: string, term: string): boolean {
  const t = normalize(term);
  const re = new RegExp(`(^|[^a-z0-9])${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z0-9]|$)`);
  return re.test(text);
}

/** O Alvo mais específico que bate com o título (o termo mais longo ganha). */
export function matchAlvo<T extends AlvoLite>(title: string, alvos: T[]): T | null {
  const text = normalize(title);
  let best: { alvo: T; score: number } | null = null;
  for (const alvo of alvos) {
    if (alvo.exclusions.some((e) => has(text, e))) continue;
    const hit = alvo.terms.filter((t) => has(text, t)).sort((a, b) => b.length - a.length)[0];
    if (hit && (!best || hit.length > best.score)) best = { alvo, score: hit.length };
  }
  return best?.alvo ?? null;
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

/** Preço-alvo = 85% da mediana, teto = 115%, a partir de 5 ofertas. */
export function targetsFrom(prices: number[]): { targetCents: number | null; ceilingCents: number | null } {
  if (prices.length < 5) return { targetCents: null, ceilingCents: null };
  const m = median(prices)!;
  return { targetCents: Math.round(m * 0.85), ceilingCents: Math.round(m * 1.15) };
}
