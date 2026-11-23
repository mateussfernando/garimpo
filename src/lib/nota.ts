// A nota única de 0 a 10 (uma casa): mistura da nota do algoritmo com a da IA. Puro: sem banco, sem rede, testável.
//
// As duas notas NÃO são somadas nos números brutos. Em 23/11 o algoritmo ia de 36 a 59 e a IA de 35 a 82, com correlação de
// 0,14: uma média simples seria a IA decidindo. Cada uma vira a sua POSIÇÃO (de 0 a 1) entre as ofertas das últimas 48 h,
// e a nota é a média ponderada das posições. "8,2" quer dizer "acima de cerca de 82% das ofertas de hoje"; o valor absoluto
// aparece nos selos (veredito da IA, desconto real, Alvo atingido).
//
// Pesos: o algoritmo pesa o quanto dos seus sinais era conhecido (`base`, 0,45 a 1); a IA pesa pela confiança dela.
// O único veto: "evitar" da IA, com confiança média ou alta, limita a nota em 4,0 (ela vê o que o algoritmo não vê).

export type Confianca = "alta" | "media" | "baixa";
export type Veredito = "excelente" | "boa" | "ok" | "fraca" | "evitar";

/** Peso da IA pela confiança dela. Valores iniciais: a calibração (pnpm notas:calibrar) só os sugere, nada muda sozinho. */
export const PESO_IA: Record<Confianca, number> = { alta: 1, media: 0.75, baixa: 0.5 };
/** Nota máxima de uma oferta que a IA mandou evitar. */
export const TETO_EVITAR = 4;
/** Posições que diferem tanto assim (de 0 a 1) são sinalizadas como "divergente". */
export const LIMITE_DIVERGENTE = 0.35;
/** Menos notas que isto na régua e a posição vira a própria nota (0 a 100): poucas notas não dizem em que lugar se está. */
export const MIN_REGUA = 30;

export type EntradaNota = {
  /** Posição (0 a 1) da nota do algoritmo; null = o algoritmo não opinou (sem preço contra uma referência). */
  algoPos: number | null;
  /** Fração do peso dos sinais do algoritmo que era conhecida (0 a 1). */
  base: number;
  /** Posição (0 a 1) da nota da IA; null = sem análise, ou quem pede não pode ver a IA. */
  iaPos: number | null;
  confianca: Confianca | null;
  veredito: Veredito | null;
};

export type NotaDetalheDTO = {
  fonte: "mistura" | "algoritmo" | "ia";
  /** Nota do algoritmo (0 a 100), a posição dela (0 a 1) e quanto do peso era conhecido; null = não opinou. */
  algoritmo: { valor: number; pos: number; base: number } | null;
  /** Posição da IA (0 a 1); null = sem análise ou sem permissão. */
  iaPos: number | null;
  /** Pesos usados na mistura (0 = a peça não entrou). */
  pesos: { algoritmo: number; ia: number };
  /** O algoritmo e a IA discordam muito: a nota merece um olhar a mais. */
  divergente: boolean;
  /** A IA mandou evitar e a nota foi limitada. */
  vetoIa: boolean;
};

export type NotaFinal = { nota: number | null; detalhe: Omit<NotaDetalheDTO, "algoritmo"> | null };

const um = (n: number) => Math.round(n * 10) / 10;

/** Posição (0 a 1) de um valor numa lista ordenada: ofertas abaixo + metade dos empates, sobre o total. */
export function posicaoEm(valor: number, ordenada: readonly number[]): number {
  const n = ordenada.length;
  if (n === 0) return 0.5;
  let lo = 0;
  let hi = n;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (ordenada[mid] < valor) lo = mid + 1;
    else hi = mid;
  }
  const abaixo = lo;
  hi = n;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (ordenada[mid] <= valor) lo = mid + 1;
    else hi = mid;
  }
  return (abaixo + (lo - abaixo) / 2) / n;
}

export function notaFinal(e: EntradaNota): NotaFinal {
  const temAlgo = e.algoPos != null && e.base > 0;
  const temIa = e.iaPos != null;
  if (!temAlgo && !temIa) return { nota: null, detalhe: null };
  const wAlgo = temAlgo ? e.base : 0;
  const wIa = temIa ? PESO_IA[e.confianca ?? "media"] : 0;
  const pos = ((temAlgo ? wAlgo * e.algoPos! : 0) + (temIa ? wIa * e.iaPos! : 0)) / (wAlgo + wIa);
  const veto = temIa && e.veredito === "evitar" && (e.confianca === "alta" || e.confianca === "media") && pos > TETO_EVITAR / 10;
  const final = veto ? TETO_EVITAR / 10 : pos;
  return {
    nota: um(final * 10),
    detalhe: {
      fonte: temAlgo && temIa ? "mistura" : temAlgo ? "algoritmo" : "ia",
      iaPos: temIa ? e.iaPos : null,
      pesos: { algoritmo: wAlgo, ia: wIa },
      divergente: temAlgo && temIa && Math.abs(e.algoPos! - e.iaPos!) >= LIMITE_DIVERGENTE,
      vetoIa: veto,
    },
  };
}

export type IaNota = { score: number; confidence: Confianca; verdict: Veredito };
export type Regua = { algoritmo: readonly number[]; ia: readonly number[] };

function combinar(algo: { valor: number; pos: number; base: number } | null, iaPos: number | null, ia: Pick<IaNota, "confidence" | "verdict"> | null) {
  const f = notaFinal({ algoPos: algo?.pos ?? null, base: algo?.base ?? 0, iaPos, confianca: ia?.confidence ?? null, veredito: ia?.verdict ?? null });
  if (f.nota == null || !f.detalhe) return { nota: null, detalhe: null };
  return { nota: f.nota, detalhe: { ...f.detalhe, algoritmo: algo } satisfies NotaDetalheDTO };
}

/**
 * A nota de uma oferta a partir da nota do algoritmo (0 a 100, null = não opinou) e da análise da IA, com as posições
 * tiradas da régua das ofertas de 48 h. O resultado leva as posições, para a camada de permissão refazer a nota sem a IA.
 */
export function montarNota(algoritmo: { valor: number | null; base: number }, ia: IaNota | null, regua: Regua) {
  // Régua com poucas notas (menos de 30) não dá posição que se sustente: vale a própria nota (0 a 100) como posição.
  const algo =
    algoritmo.valor == null
      ? null
      : { valor: algoritmo.valor, pos: regua.algoritmo.length >= MIN_REGUA ? posicaoEm(algoritmo.valor, regua.algoritmo) : algoritmo.valor / 100, base: algoritmo.base };
  return combinar(algo, ia ? posicaoEm(ia.score, regua.ia) : null, ia);
}

/**
 * Refaz a nota que o site entrega a quem pede. Sem a permissão de ver a IA, a nota sai só do algoritmo e a posição da IA
 * nem sai do servidor. `ia` traz só a confiança e o veredito (que a IA dona da análise guarda).
 */
export function notaParaQuem(d: NotaDetalheDTO | null, ia: Pick<IaNota, "confidence" | "verdict"> | null, podeVerIa: boolean) {
  if (!d) return { nota: null, detalhe: null };
  return combinar(d.algoritmo, podeVerIa ? d.iaPos : null, podeVerIa ? ia : null);
}

/** A frase curta (dica ao passar o mouse) de onde a nota veio. */
export function notaDica(nota: number | null, d: NotaDetalheDTO | null): string {
  if (nota == null || !d) return "Sem nota ainda: o algoritmo não tem preço de referência para esta oferta e a IA ainda não analisou.";
  const de =
    d.fonte === "mistura"
      ? "Mistura do algoritmo com a IA"
      : d.fonte === "algoritmo"
        ? "Só do algoritmo (a IA ainda não analisou, ou não está liberada para você)"
        : "Só da IA (sem preço de referência para o algoritmo opinar)";
  return `${de}. Quer dizer: acima de cerca de ${Math.round(nota * 10)}% das ofertas das últimas 48 h.${d.divergente ? " O algoritmo e a IA discordam." : ""}${d.vetoIa ? " Limitada em 4,0 porque a IA mandou evitar." : ""}`;
}

/** "8,2" (vírgula, como o resto do app); sem nota, o traço. */
export const fmtNota = (n: number | null | undefined) => (n == null ? "—" : n.toFixed(1).replace(".", ","));
