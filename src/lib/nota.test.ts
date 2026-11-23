import { describe, expect, it } from "vitest";
import { PESO_IA, faixaDeCerteza, fmtNota, montarNota, notaFinal, notaParaQuem, posicaoEm, type EntradaNota } from "./nota";

const e = (p: Partial<EntradaNota>): EntradaNota => ({ algoPos: null, base: 1, iaPos: null, confianca: null, veredito: null, ...p });

describe("posicaoEm", () => {
  it("é o lugar do valor na lista: abaixo + metade dos empates, sobre o total", () => {
    const lista = [1, 2, 3, 4, 5];
    expect(posicaoEm(0, lista)).toBe(0);
    expect(posicaoEm(1, lista)).toBeCloseTo(0.1);
    expect(posicaoEm(3, lista)).toBeCloseTo(0.5);
    expect(posicaoEm(5, lista)).toBeCloseTo(0.9);
    expect(posicaoEm(6, lista)).toBe(1);
  });
  it("empates dividem a posição ao meio, e lista vazia fica no meio", () => {
    expect(posicaoEm(2, [2, 2, 2, 2])).toBeCloseTo(0.5);
    expect(posicaoEm(7, [])).toBe(0.5);
  });
});

describe("notaFinal", () => {
  it("sem nenhuma das duas, não há nota", () => {
    expect(notaFinal(e({}))).toEqual({ nota: null, detalhe: null });
  });

  it("só o algoritmo ou só a IA: a nota é a posição daquela peça", () => {
    const a = notaFinal(e({ algoPos: 0.82 }));
    expect(a.nota).toBe(8.2);
    expect(a.detalhe?.fonte).toBe("algoritmo");
    expect(a.detalhe?.pesos).toEqual({ algoritmo: 1, ia: 0 });
    const i = notaFinal(e({ iaPos: 0.3, confianca: "alta" }));
    expect(i.nota).toBe(3);
    expect(i.detalhe?.fonte).toBe("ia");
  });

  it("com confiança alta é exatamente a média das duas posições", () => {
    const m = notaFinal(e({ algoPos: 0.9, iaPos: 0.5, confianca: "alta" }));
    expect(m.nota).toBe(7);
    expect(m.detalhe?.fonte).toBe("mistura");
  });

  it("a IA pesa menos com confiança baixa, e o algoritmo pesa pelo quanto dos sinais conhecia", () => {
    const baixa = notaFinal(e({ algoPos: 0.9, iaPos: 0.5, confianca: "baixa" }));
    const alta = notaFinal(e({ algoPos: 0.9, iaPos: 0.5, confianca: "alta" }));
    expect(baixa.nota!).toBeGreaterThan(alta.nota!);
    expect(PESO_IA.baixa).toBeLessThan(PESO_IA.media);
    // base 0,45 (só o A conhecido) pesa menos que base 1 contra a mesma IA
    const pouco = notaFinal(e({ algoPos: 0.9, base: 0.45, iaPos: 0.5, confianca: "alta" }));
    expect(pouco.nota!).toBeLessThan(alta.nota!);
  });

  it("'evitar' com confiança média ou alta limita em 4,0; com confiança baixa não", () => {
    const veto = notaFinal(e({ algoPos: 0.95, iaPos: 0.9, confianca: "media", veredito: "evitar" }));
    expect(veto.nota).toBe(4);
    expect(veto.detalhe?.vetoIa).toBe(true);
    const semVeto = notaFinal(e({ algoPos: 0.95, iaPos: 0.9, confianca: "baixa", veredito: "evitar" }));
    expect(semVeto.nota!).toBeGreaterThan(4);
    expect(semVeto.detalhe?.vetoIa).toBe(false);
    // Já abaixo de 4,0: o veto não mexe (e não puxa a nota para cima).
    expect(notaFinal(e({ algoPos: 0.1, iaPos: 0.1, confianca: "alta", veredito: "evitar" })).nota).toBe(1);
  });

  it("marca como divergente quando as posições diferem em 0,35 ou mais", () => {
    expect(notaFinal(e({ algoPos: 0.9, iaPos: 0.5, confianca: "alta" })).detalhe?.divergente).toBe(true);
    expect(notaFinal(e({ algoPos: 0.7, iaPos: 0.5, confianca: "alta" })).detalhe?.divergente).toBe(false);
    // Uma peça só não tem com quem divergir.
    expect(notaFinal(e({ algoPos: 0.9 })).detalhe?.divergente).toBe(false);
  });

  it("sempre de 0,0 a 10,0, com uma casa", () => {
    for (const a of [0, 0.01, 0.333, 0.5, 0.999, 1]) {
      for (const i of [0, 0.25, 0.777, 1]) {
        const n = notaFinal(e({ algoPos: a, iaPos: i, confianca: "media" })).nota!;
        expect(n).toBeGreaterThanOrEqual(0);
        expect(n).toBeLessThanOrEqual(10);
        expect(Math.round(n * 10)).toBeCloseTo(n * 10, 9);
      }
    }
  });
});

describe("fmtNota", () => {
  it("usa vírgula e traço para sem nota", () => {
    expect(fmtNota(8.2)).toBe("8,2");
    expect(fmtNota(10)).toBe("10,0");
    expect(fmtNota(null)).toBe("—");
  });
});

describe("montarNota e notaParaQuem (a permissão de ver a IA)", () => {
  const regua = { algoritmo: Array.from({ length: 100 }, (_, i) => i + 1), ia: Array.from({ length: 100 }, (_, i) => i + 1) };
  const ia = { score: 90, confidence: "media" as const, verdict: "boa" as const };

  it("tira as posições da régua das ofertas de 48 h e mistura", () => {
    const { nota, detalhe } = montarNota({ valor: 80, base: 1 }, ia, regua);
    expect(detalhe?.fonte).toBe("mistura");
    expect(detalhe?.algoritmo?.pos).toBeCloseTo(0.795, 2);
    expect(detalhe?.iaPos).toBeCloseTo(0.895, 2);
    expect(nota).toBeGreaterThan(8);
    expect(nota).toBeLessThan(9);
  });

  it("quem não pode ver a IA recebe só a nota do algoritmo, e a posição da IA nem sai", () => {
    const cheia = montarNota({ valor: 80, base: 1 }, ia, regua);
    const cega = notaParaQuem(cheia.detalhe, { confidence: ia.confidence, verdict: ia.verdict }, false);
    expect(cega.detalhe?.fonte).toBe("algoritmo");
    expect(cega.detalhe?.iaPos).toBeNull();
    expect(cega.detalhe?.pesos.ia).toBe(0);
    // só a posição do algoritmo (0,795): 7,9 ou 8,0 conforme o arredondamento, nunca perto dos 8,5 da mistura
    expect(cega.nota).toBeGreaterThanOrEqual(7.9);
    expect(cega.nota).toBeLessThanOrEqual(8);
    expect(JSON.stringify(cega)).not.toContain("0.895");
    // Com a permissão, refazer dá a mesma nota de antes.
    expect(notaParaQuem(cheia.detalhe, { confidence: ia.confidence, verdict: ia.verdict }, true).nota).toBe(cheia.nota);
  });

  it("sem o algoritmo, quem não vê a IA fica sem nota (não ganha nota por padrão)", () => {
    const soIa = montarNota({ valor: null, base: 0 }, ia, regua);
    expect(soIa.detalhe?.fonte).toBe("ia");
    expect(notaParaQuem(soIa.detalhe, { confidence: ia.confidence, verdict: ia.verdict }, false)).toEqual({ nota: null, detalhe: null });
  });

  it("régua com poucas notas (menos de 30) usa a própria nota como posição", () => {
    const pouca = { algoritmo: [50, 60, 70], ia: regua.ia };
    expect(montarNota({ valor: 70, base: 1 }, null, pouca).detalhe?.algoritmo?.pos).toBe(0.7);
  });
});

describe("faixaDeCerteza", () => {
  const todas = { historico: true, ia: true, conferida: true, mercado: true };
  const nada = { historico: false, ia: false, conferida: false, mercado: false };
  it("sem nota, sem faixa", () => {
    expect(faixaDeCerteza(null, todas, null)).toBeNull();
  });
  it("tudo presente: faixa estreita (0,3); nada: larga (1,5); sempre dentro de 0 a 10", () => {
    const f = faixaDeCerteza(8, todas, null)!;
    expect(f.pontos).toBe(4);
    expect(f.ate - f.de).toBeCloseTo(0.6, 1);
    const n = faixaDeCerteza(8, nada, null)!;
    expect(n.pontos).toBe(0);
    expect(n.ate - n.de).toBeCloseTo(3, 1);
    const topo = faixaDeCerteza(9.9, nada, null)!;
    expect(topo.ate).toBe(10);
    expect(faixaDeCerteza(0.2, nada, null)!.de).toBe(0);
  });
  it("quando algoritmo e IA divergem a faixa abre", () => {
    const d = { fonte: "mistura", algoritmo: { valor: 90, pos: 0.9, base: 1 }, iaPos: 0.3, pesos: { algoritmo: 1, ia: 1 }, divergente: true, vetoIa: false } as const;
    const junto = faixaDeCerteza(6, todas, { ...d, iaPos: 0.9 })!;
    const longe = faixaDeCerteza(6, todas, d)!;
    expect(longe.ate - longe.de).toBeGreaterThan(junto.ate - junto.de);
  });
});
