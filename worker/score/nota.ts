// Nota rápida do plano acelerado:
// N = 100 x (0,45 A + 0,25 C + 0,20 F + 0,10 S)
// Desconto real e Black Fraude voltam depois do 11.11, com histórico.

export type NotaInput = {
  priceCardCents: number | null;
  targetCents: number | null;
  ceilingCents: number | null;
  storeTrust: number | null;
  freeShipping: boolean | null;
  shippingCents: number | null;
  sources15: number;
};

export type Nota = { nota: number; parts: { A: number; C: number; F: number; S: number }; alvoAtingido: boolean };

const clamp = (n: number) => Math.max(0, Math.min(1, n));

export function notaRapida(i: NotaInput): Nota {
  let A = 0.5; // sem referência ainda
  if (i.priceCardCents != null && i.targetCents != null && i.ceilingCents != null && i.ceilingCents > i.targetCents) {
    A = clamp((i.ceilingCents - i.priceCardCents) / (i.ceilingCents - i.targetCents));
  }
  const C = i.storeTrust ?? 0.2;
  let F = 0.3; // frete desconhecido
  if (i.freeShipping) F = 1;
  else if (i.shippingCents != null && i.priceCardCents) F = i.shippingCents <= i.priceCardCents * 0.05 ? 0.5 : 0;
  const S = clamp(i.sources15 / 4);
  const nota = Math.round(100 * (0.45 * A + 0.25 * C + 0.2 * F + 0.1 * S));
  const alvoAtingido = i.priceCardCents != null && i.targetCents != null && i.priceCardCents <= i.targetCents;
  return { nota, parts: { A: round2(A), C: round2(C), F: round2(F), S: round2(S) }, alvoAtingido };
}

const round2 = (n: number) => Math.round(n * 100) / 100;
