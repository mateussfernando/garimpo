import { describe, expect, it } from "vitest";
import { compensa, ehPrecoPref, precoDe, valorDe } from "./preco";

describe("preço em destaque", () => {
  const completa = { priceCardCents: 129900, cashCents: 119900 };

  it("cartão em destaque (o padrão): Pix só aparece embaixo quando é mais barato", () => {
    const p = precoDe(completa, "cartao");
    expect(p).toMatchObject({ cents: 129900, rotulo: "no cartão", efetivo: "cartao", outro: { cents: 119900, rotulo: "no Pix" } });
    expect(precoDe({ priceCardCents: 129900, cashCents: 129900 }, "cartao").outro).toBeNull();
    expect(precoDe({ priceCardCents: 129900, cashCents: null }, "cartao").outro).toBeNull();
  });

  it("Pix em destaque: o Pix vai para cima e o cartão para baixo", () => {
    expect(precoDe(completa, "pix")).toMatchObject({ cents: 119900, rotulo: "no Pix", efetivo: "pix", outro: { cents: 129900, rotulo: "no cartão" } });
  });

  it("Pix preferido, mas a oferta não tem Pix: cai no cartão, sem preço vazio", () => {
    for (const cash of [null, 0]) {
      const p = precoDe({ priceCardCents: 50000, cashCents: cash }, "pix");
      expect(p).toMatchObject({ cents: 50000, rotulo: "no cartão", efetivo: "cartao", outro: null });
    }
  });

  it("oferta sem nenhum preço não quebra", () => {
    expect(precoDe({ priceCardCents: null, cashCents: null }, "pix")).toMatchObject({ cents: null, efetivo: "cartao", outro: null });
    expect(precoDe({ priceCardCents: null, cashCents: 9000 }, "pix")).toMatchObject({ cents: 9000, efetivo: "pix", outro: null });
  });

  it("Pix preferido sem Pix na oferta: avisa que o Pix não foi informado", () => {
    expect(precoDe({ priceCardCents: 50000, cashCents: null }, "pix").aviso).toBe("Pix não informado");
    expect(precoDe(completa, "pix").aviso).toBeNull();
    expect(precoDe({ priceCardCents: 50000, cashCents: null }, "cartao").aviso).toBeNull();
  });

  describe("a forma de pagamento vem de como o preço foi lido (priceBasis)", () => {
    it("post só com Pix (avista): é Pix nos dois modos, nunca 'no cartão'", () => {
      const o = { priceCardCents: 54900, cashCents: 54900, priceBasis: "avista", verifyStatus: "nao_verificado", verifyNote: null };
      expect(precoDe(o, "cartao")).toMatchObject({ cents: 54900, rotulo: "no Pix", efetivo: "pix", outro: null });
      expect(precoDe(o, "pix")).toMatchObject({ cents: 54900, rotulo: "no Pix", efetivo: "pix", outro: null, aviso: null });
    });

    it("um preço sem forma (unico): 'anunciado', com a dica de onde veio", () => {
      const o = { priceCardCents: 9990, cashCents: null, priceBasis: "unico", verifyStatus: "nao_verificado", verifyNote: null };
      expect(precoDe(o, "cartao")).toMatchObject({ cents: 9990, rotulo: "anunciado", efetivo: "anunciado", dica: "O post não disse se é no Pix ou no cartão" });
      expect(precoDe(o, "pix")).toMatchObject({ cents: 9990, rotulo: "anunciado", aviso: "Pix não informado" });
      const generica = { ...o, verifyStatus: "verificado", verifyNote: "leitura genérica da página" };
      expect(precoDe(generica, "cartao").dica).toMatch(/página da loja/);
    });

    it("unico com Pix informado: o Pix aparece, e o outro preço fica como anunciado", () => {
      const o = { priceCardCents: 10000, cashCents: 9000, priceBasis: "unico", verifyStatus: "nao_verificado", verifyNote: null };
      expect(precoDe(o, "pix")).toMatchObject({ cents: 9000, rotulo: "no Pix", outro: { cents: 10000, rotulo: "anunciado" } });
      expect(precoDe(o, "cartao")).toMatchObject({ cents: 9000, rotulo: "no Pix" });
    });

    it("parcelado ou cartão no post: cartão conhecido, troca para o Pix quando há Pix", () => {
      for (const priceBasis of ["parcelado", "cartao", "loja"]) {
        const o = { ...completa, priceBasis, verifyStatus: "nao_verificado", verifyNote: null };
        expect(precoDe(o, "cartao")).toMatchObject({ cents: 129900, rotulo: "no cartão" });
        expect(precoDe(o, "pix")).toMatchObject({ cents: 119900, rotulo: "no Pix", outro: { cents: 129900, rotulo: "no cartão" } });
      }
    });

    it("conferido pelo leitor exato da loja (sem nota): cartão conhecido mesmo que o post fosse 'unico'", () => {
      const o = { ...completa, priceBasis: "unico", verifyStatus: "verificado", verifyNote: null };
      expect(precoDe(o, "cartao")).toMatchObject({ cents: 129900, rotulo: "no cartão" });
      expect(precoDe(o, "pix")).toMatchObject({ cents: 119900, rotulo: "no Pix" });
    });
  });

  it("filtro e ordenação usam o mesmo valor do destaque", () => {
    expect(valorDe(completa, "cartao")).toBe(129900);
    expect(valorDe(completa, "pix")).toBe(119900);
  });

  it("só aceita as duas escolhas", () => {
    expect(ehPrecoPref("cartao")).toBe(true);
    expect(ehPrecoPref("pix")).toBe(true);
    for (const v of ["boleto", "", null, undefined, 1]) expect(ehPrecoPref(v)).toBe(false);
  });
});

describe("compensa (Pix × parcelar)", () => {
  // 10x de R$ 100 = R$ 1.000 no cartão; o Pix decide.
  const base = { installments: 10, installmentCents: 10000 };
  it("sem desconto no Pix, parcelar compensa (o dinheiro rende enquanto as parcelas não vencem)", () => {
    const c = compensa({ ...base, cashCents: 100000 }, 1)!;
    expect(c.melhor).toBe("parcelar");
    expect(c.valorPresenteCents).toBeLessThan(100000);
  });
  it("com Pix 8% mais barato, o Pix compensa", () => {
    const c = compensa({ ...base, cashCents: 92000 }, 1)!;
    expect(c.melhor).toBe("pix");
    expect(c.economiaCents).toBeGreaterThan(0);
  });
  it("rendimento zero: o Pix só ganha se for mais barato que a soma das parcelas", () => {
    expect(compensa({ ...base, cashCents: 100000 }, 0)).toBeNull(); // empate
    expect(compensa({ ...base, cashCents: 95000 }, 0)!.melhor).toBe("pix");
  });
  it("sem Pix ou sem parcelas, não opina", () => {
    expect(compensa({ ...base, cashCents: null })).toBeNull();
    expect(compensa({ installments: 1, installmentCents: 100000, cashCents: 90000 })).toBeNull();
    expect(compensa({ installments: null, installmentCents: null, cashCents: 90000 })).toBeNull();
  });
});
