// Preços por milhão de tokens (US$). Fonte: tabela de modelos da Anthropic, conferida em 10/11/2026.
// Haiku 5.5: US$ 0,10 de entrada e US$ 0,50 de saída até 100 mil tokens por prompt;
// acima disso, US$ 0,50 e US$ 2,50. O app só usa este modelo, em qualquer provedor.

export const AI_MODEL = "claude-haiku-5-5";
export const AI_LIMIT_USD = 4.5;

const HAIKU = { inPerM: 0.1, outPerM: 0.5, inPerMLong: 0.5, outPerMLong: 2.5, longAbove: 100_000 };

export function costUsd(inputTokens: number, outputTokens: number): number {
  const long = inputTokens > HAIKU.longAbove;
  const inRate = long ? HAIKU.inPerMLong : HAIKU.inPerM;
  const outRate = long ? HAIKU.outPerMLong : HAIKU.outPerM;
  return (inputTokens * inRate + outputTokens * outRate) / 1_000_000;
}
