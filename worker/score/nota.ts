// A nota do algoritmo mora em src/lib/nota-algoritmo.ts (o site recalcula o A quando o preço em destaque é o Pix).
// Este arquivo fica só para o worker e os testes continuarem importando daqui.
export { PESOS, notaDePartes, notaRapida, pontoA } from "@/lib/nota-algoritmo";
export type { Nota, NotaInput, Partes, Sinal } from "@/lib/nota-algoritmo";
