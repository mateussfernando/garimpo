import { JANELA_KEY, janelaValida } from "@/config/janela";
import { getSetting } from "@/lib/settings";

/** A janela da Vitrine em horas (src/config/janela.ts): o que o admin escolheu no Painel, ou 48. */
export async function getJanelaHoras(): Promise<number> {
  return janelaValida((await getSetting<number>(JANELA_KEY))?.value);
}
