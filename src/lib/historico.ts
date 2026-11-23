// Estatísticas do histórico de preço de um produto: sem banco e sem rede (testável). Só lê o que o próprio app registrou
// (price_points) e a referência que a página do Promobit já traz. Nunca de site que proíbe leitura por código (JáCotei).
//
// A série vira um ponto por dia (o menor do dia) e perde os valores fora de lugar (IQR): um dia a R$ 1.712 num produto de
// R$ 750 não pode puxar a mediana. O desconto real é contra a mediana; a posição do preço atual (quanto do tempo ele foi
// mais caro) alimenta o D da nota.

export type PontoPreco = { t: number; cents: number };

export type HistoricoDTO = {
  /** Dias com preço registrado e o tempo que a série cobre. */
  dias: number;
  periodoDias: number;
  medianaCents: number;
  minimoCents: number;
  maximoCents: number;
  /** Quanto do tempo o preço foi MAIOR que o de agora (0 a 1). */
  maisBaratoQue: number;
  /** (mediana − preço) ÷ mediana, em %; negativo = está acima do normal. */
  descontoRealPct: number;
  /** (preço "de" − preço) ÷ preço "de", em %; null = a loja não anunciou "de". */
  anunciadoPct: number | null;
  /** O preço de agora é o menor da série. */
  menorDaSerie: boolean;
  /** Só com 14+ dias e 5+ pontos: "black-fraude" (subiu 15%+ e o desconto só o devolve) ou "referencia-inflada". */
  selo: "black-fraude" | "referencia-inflada" | null;
};

const DIA_MS = 86_400_000;
export const MIN_DIAS_D = 4;
export const MIN_DIAS_SELO = 5;
export const MIN_PERIODO_SELO = 14;

const mediana = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const quartil = (s: number[], q: number) => s[Math.min(s.length - 1, Math.floor(q * s.length))];

/** O menor preço de cada dia (UTC), em ordem de data. */
export function menorPorDia(pontos: PontoPreco[]): PontoPreco[] {
  const por = new Map<number, PontoPreco>();
  for (const p of pontos) {
    if (!(p.cents > 0)) continue;
    const dia = Math.floor(p.t / DIA_MS);
    const cur = por.get(dia);
    if (!cur || p.cents < cur.cents) por.set(dia, { t: p.t, cents: p.cents });
  }
  return [...por.values()].sort((a, b) => a.t - b.t);
}

/** Tira o que passa de 1,5 intervalos interquartis (precisa de 4+ dias). */
export function semForaDeLugar(serie: PontoPreco[]): PontoPreco[] {
  if (serie.length < 4) return serie;
  const s = serie.map((p) => p.cents).sort((a, b) => a - b);
  const q1 = quartil(s, 0.25);
  const q3 = quartil(s, 0.75);
  const folga = 1.5 * (q3 - q1);
  const ok = serie.filter((p) => p.cents >= q1 - folga && p.cents <= q3 + folga);
  return ok.length >= 3 ? ok : serie;
}

/** null = pouca história para dizer algo (menos de 4 dias com preço). */
export function estatisticas(pontos: PontoPreco[], atualCents: number | null, listaCents: number | null, agora: number): HistoricoDTO | null {
  if (atualCents == null || atualCents <= 0) return null;
  const diaria = menorPorDia(pontos.filter((p) => p.t <= agora));
  if (diaria.length < MIN_DIAS_D) return null;
  const serie = semForaDeLugar(diaria);
  const valores = serie.map((p) => p.cents);
  const med = mediana(valores);
  const periodo = Math.max(1, Math.round((serie[serie.length - 1].t - serie[0].t) / DIA_MS));
  const acima = valores.filter((v) => v > atualCents).length + valores.filter((v) => v === atualCents).length / 2;
  const min = Math.min(...valores);
  const max = Math.max(...valores);
  const anunciado = listaCents != null && listaCents > atualCents ? ((listaCents - atualCents) / listaCents) * 100 : null;

  let selo: HistoricoDTO["selo"] = null;
  if (serie.length >= MIN_DIAS_SELO && periodo >= MIN_PERIODO_SELO && anunciado != null) {
    const corte = agora - 7 * DIA_MS;
    const antigos = serie.filter((p) => p.t < corte).map((p) => p.cents);
    const recentes = serie.filter((p) => p.t >= corte).map((p) => p.cents);
    if (antigos.length >= 3 && recentes.length >= 1) {
      const antes = mediana(antigos);
      // O preço subiu 15%+ na semana de antes e o "desconto" só o devolve ao patamar de antes.
      if (anunciado >= 10 && mediana(recentes) >= antes * 1.15 && atualCents <= antes * 1.05) selo = "black-fraude";
    }
    // O preço "de" nunca apareceu na série: referência inflada.
    // (Compara com a série inteira, não a filtrada: um "de" que já apareceu num dia isolado não é inventado.)
    const maxBruto = Math.max(...diaria.map((p) => p.cents));
    if (!selo && anunciado >= 15 && listaCents! > maxBruto * 1.05) selo = "referencia-inflada";
  }

  return {
    dias: serie.length,
    periodoDias: periodo,
    medianaCents: Math.round(med),
    minimoCents: min,
    maximoCents: max,
    maisBaratoQue: acima / valores.length,
    descontoRealPct: Math.round(((med - atualCents) / med) * 1000) / 10,
    anunciadoPct: anunciado == null ? null : Math.round(anunciado * 10) / 10,
    menorDaSerie: atualCents <= min,
    selo,
  };
}

/**
 * D (desconto real) de 0 a 1 para a nota. Com série própria vale a posição do preço nela. Só com o mínimo e o máximo do
 * Promobit (sem série), a posição entre os dois, puxada para o meio: são dois números, não uma série.
 */
export function pontoD(h: HistoricoDTO | null, ref: { minCents: number | null; maxCents: number | null } | null, atualCents: number | null): number | null {
  if (h) return h.maisBaratoQue;
  if (atualCents == null || !ref || ref.minCents == null || ref.maxCents == null || ref.maxCents <= ref.minCents) return null;
  const cru = Math.max(0, Math.min(1, (ref.maxCents - atualCents) / (ref.maxCents - ref.minCents)));
  return 0.5 + (cru - 0.5) * 0.5;
}
