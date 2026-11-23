import { describe, expect, it } from "vitest";
import { ehPrecoPref, precoDe, valorDe } from "./preco";

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
