// Janela da Vitrine (pedido do usuário, 26/11): de quantas horas para trás as ofertas aparecem. O admin escolhe no Painel
// (/admin); fica em app_settings "vitrine_janela_horas". Vale para a Vitrine de todos, os acontecimentos "Ao vivo" e os
// números do Painel. A régua da nota (posições entre as ofertas de 48 h) e a Fila da IA continuam em 48 h.

export const JANELA_KEY = "vitrine_janela_horas";
export const JANELA_PADRAO = 48;
export const JANELA_MIN = 1;
/** Uma semana: mais que isso pesa a Vitrine (até 3.000 ofertas por vez) e mostra preço que já mudou. */
export const JANELA_MAX = 168;
export const ATALHOS_JANELA = [6, 12, 24, 48, 72, 168] as const;

/** Um número válido de horas, ou o padrão. */
export function janelaValida(v: unknown): number {
  return typeof v === "number" && Number.isInteger(v) && v >= JANELA_MIN && v <= JANELA_MAX ? v : JANELA_PADRAO;
}

/** "24 h", "3 dias", "7 dias". */
export function rotuloJanela(h: number): string {
  return h > 48 && h % 24 === 0 ? `${h / 24} dias` : `${h} h`;
}
