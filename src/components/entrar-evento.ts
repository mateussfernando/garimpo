// O pedido de "entrar ou criar conta": qualquer lugar do app pode abrir o popup (conta-aviso.tsx) sem importar ele.
// Fica separado e sem dependências para o me.ts, o cabeçalho e os botões usarem sem import circular.

export type MotivoConta = "vigiar" | "descartar" | "alvos" | "continuar";
export type PedidoEntrar = {
  modo: "entrar" | "criar";
  motivo?: MotivoConta;
  /** Para onde ir depois de entrar (só caminho do próprio site). */
  de?: string;
};

export const EVENTO_ENTRAR = "garimpo:entrar";

export function pedirEntrar(p: PedidoEntrar) {
  window.dispatchEvent(new CustomEvent<PedidoEntrar>(EVENTO_ENTRAR, { detail: p }));
}
