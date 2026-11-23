import { describe, expect, it } from "vitest";
import { estatisticas, menorPorDia, pontoD, semForaDeLugar, type PontoPreco } from "./historico";

const DIA = 86_400_000;
const AGORA = Date.UTC(2026, 10, 27, 12);
const serie = (valores: number[]): PontoPreco[] => valores.map((cents, i) => ({ t: AGORA - (valores.length - 1 - i) * DIA, cents }));

describe("menorPorDia e valores fora de lugar", () => {
  it("fica com o menor preço de cada dia", () => {
    const d = menorPorDia([{ t: AGORA, cents: 900 }, { t: AGORA + 1000, cents: 800 }, { t: AGORA - DIA, cents: 1000 }]);
    expect(d.map((p) => p.cents)).toEqual([1000, 800]);
  });
  it("tira o dia a R$ 1.712 num produto de R$ 750", () => {
    const s = serie([74000, 75700, 73990, 171205, 76990, 74500, 75000]);
    expect(semForaDeLugar(menorPorDia(s)).map((p) => p.cents)).not.toContain(171205);
  });
});

describe("estatisticas", () => {
  it("com menos de 4 dias não diz nada", () => {
    expect(estatisticas(serie([100, 100, 100]), 90, null, AGORA)).toBeNull();
    expect(estatisticas(serie([100, 100, 100, 100]), null, null, AGORA)).toBeNull();
  });

  it("desconto real contra a mediana e posição do preço na série", () => {
    const h = estatisticas(serie([1000, 1000, 1000, 1000, 1000]), 800, null, AGORA)!;
    expect(h.medianaCents).toBe(1000);
    expect(h.descontoRealPct).toBe(20);
    expect(h.maisBaratoQue).toBe(1); // sempre foi mais caro que isso
    expect(h.menorDaSerie).toBe(true);
    expect(estatisticas(serie([1000, 1000, 1000, 1000, 1000]), 1200, null, AGORA)!.maisBaratoQue).toBe(0);
  });

  it("sem 14 dias e 5 pontos nunca marca Black Fraude", () => {
    const curta = estatisticas(serie([1000, 1000, 1000, 1500, 1500, 1500]), 1000, 2000, AGORA)!;
    expect(curta.selo).toBeNull();
  });

  it("Black Fraude: subiu 15%+ na última semana e o desconto só devolve o preço de antes", () => {
    const valores = [...Array(12).fill(1000), 1300, 1300, 1300, 1300];
    const h = estatisticas(serie(valores), 1000, 1800, AGORA)!;
    expect(h.periodoDias).toBeGreaterThanOrEqual(14);
    expect(h.selo).toBe("black-fraude");
    expect(h.anunciadoPct).toBeCloseTo(44.4, 1);
  });

  it("referência inflada: o preço 'de' nunca apareceu na série", () => {
    const h = estatisticas(serie(Array(16).fill(1000)), 900, 2000, AGORA)!;
    expect(h.selo).toBe("referencia-inflada");
    // 'de' que já existiu não é inflado
    const ok = estatisticas(serie([...Array(15).fill(1000), 2000]), 900, 2000, AGORA)!;
    expect(ok.selo).toBeNull();
  });

  it("sem preço 'de' anunciado, sem selo", () => {
    expect(estatisticas(serie([...Array(12).fill(1000), 1300, 1300, 1300, 1300]), 1000, null, AGORA)!.selo).toBeNull();
  });
});

describe("pontoD", () => {
  it("com série vale a posição do preço nela", () => {
    const h = estatisticas(serie([1000, 1000, 1000, 1000, 1000]), 800, null, AGORA);
    expect(pontoD(h, null, 800)).toBe(1);
  });
  it("só com mínimo e máximo do Promobit, a posição entre os dois puxada para o meio", () => {
    expect(pontoD(null, { minCents: 2900, maxCents: 3600 }, 2900)).toBe(0.75); // no mínimo: 1 -> 0,75
    expect(pontoD(null, { minCents: 2900, maxCents: 3600 }, 3600)).toBe(0.25);
  });
  it("sem nada, não opina", () => {
    expect(pontoD(null, null, 100)).toBeNull();
    expect(pontoD(null, { minCents: 100, maxCents: 100 }, 100)).toBeNull();
  });
});
