// Nota do algoritmo (0 a 100), sem banco e sem rede: o worker grava, o site recalcula o A quando o preço em destaque é o Pix.
//
//   N = 100 x (0,45 A + 0,25 C + 0,20 F + 0,10 S), só sobre o que se sabe
//
// Sinal desconhecido SAI da conta e os pesos se renormalizam; antes ele valia um número padrão (A = 0,5, C = 0,2, F = 0,3)
// e a nota acabava medindo "quanto dado temos", não "quão boa é a oferta" (23/11: média 46, nenhuma das 1.809 ofertas
// chegava a 80). Sem o A (preço contra o mercado da faixa) o algoritmo não opina: loja, frete e calor social falam do
// vendedor, não do preço, então a nota dessas ofertas vem só da IA.
// Desconto real (D) e Black Fraude entram na Fase 2, com histórico.

export const PESOS = { A: 0.45, C: 0.25, F: 0.2, S: 0.1 } as const;
/** Com o D (desconto real, vindo do histórico de preço) na conta, os pesos são estes. O S toma o lugar do U do desenho original. */
export const PESOS_COM_D = { D: 0.3, A: 0.25, C: 0.15, F: 0.1, S: 0.2 } as const;
export type Sinal = "A" | "C" | "F" | "S" | "D";

/** Cada sinal vai de 0 a 1; null = não se sabe (sai da conta). O D só existe quando há histórico (linhas antigas não têm). */
export type Partes = { A: number | null; C: number | null; F: number | null; S: number | null; D?: number | null };

export type NotaInput = {
  priceCardCents: number | null;
  targetCents: number | null;
  ceilingCents: number | null;
  /** Desconto real (0 a 1) pelo histórico de preço; null = sem histórico (src/lib/historico.ts). */
  D?: number | null;
  storeTrust: number | null;
  freeShipping: boolean | null;
  shippingCents: number | null;
  sources15: number;
};

export type Nota = {
  /** 0 a 100; null = o algoritmo não opina (sem preço contra uma referência). */
  nota: number | null;
  /** Fração do peso total que era conhecida (0 a 1). */
  base: number;
  parts: Partes;
  alvoAtingido: boolean;
};

const clamp = (n: number) => Math.max(0, Math.min(1, n));
const round2 = (n: number | null) => (n == null ? null : Math.round(n * 100) / 100);

/** O A: 1 no preço-alvo ou abaixo, 0 no teto, linear no meio. null = a faixa ainda não tem referência. */
export function pontoA(priceCents: number | null, targetCents: number | null, ceilingCents: number | null): number | null {
  if (priceCents == null || targetCents == null || ceilingCents == null || ceilingCents <= targetCents) return null;
  return clamp((ceilingCents - priceCents) / (ceilingCents - targetCents));
}

/** Preço-alvo e teto de mercado de uma faixa: 85% e 115% da mediana (com 5 preços ou mais). Nunca o número de alguém. */
export function mercadoDe(ref: { medianCents: number | null; n: number } | null) {
  if (!ref || ref.medianCents == null || ref.n < 5) return { targetCents: null, ceilingCents: null };
  return { targetCents: Math.round(ref.medianCents * 0.85), ceilingCents: Math.round(ref.medianCents * 1.15) };
}

/** A nota a partir dos sinais. Também usada para refazer a nota com o A do Pix, sem mexer nos outros sinais. */
export function notaDePartes(p: Partes): { nota: number | null; base: number } {
  const pesos: Partial<Record<Sinal, number>> = p.D != null ? PESOS_COM_D : PESOS;
  let soma = 0;
  let base = 0;
  for (const k of Object.keys(pesos) as Sinal[]) {
    const v = p[k];
    if (v == null) continue;
    soma += pesos[k]! * v;
    base += pesos[k]!;
  }
  // Preço contra alguma referência (mercado da faixa ou histórico) é o que faz o algoritmo opinar.
  if ((p.A == null && p.D == null) || base <= 0) return { nota: null, base: Math.round(base * 100) / 100 };
  return { nota: Math.round((100 * soma) / base), base: Math.round(base * 100) / 100 };
}

export function notaRapida(i: NotaInput): Nota {
  const A = pontoA(i.priceCardCents, i.targetCents, i.ceilingCents);
  const C = i.storeTrust;
  let F: number | null = null; // frete desconhecido não conta nem a favor nem contra
  if (i.freeShipping) F = 1;
  else if (i.shippingCents != null && i.priceCardCents) F = i.shippingCents <= i.priceCardCents * 0.05 ? 0.5 : 0;
  const S = clamp(i.sources15 / 4);
  const D = i.D ?? null;
  const parts: Partes = { A, C, F, S, D };
  const { nota, base } = notaDePartes(parts);
  const alvoAtingido = i.priceCardCents != null && i.targetCents != null && i.priceCardCents <= i.targetCents;
  return { nota, base, parts: { A: round2(A), C: round2(C), F: round2(F), S: round2(S), D: round2(D) }, alvoAtingido };
}
