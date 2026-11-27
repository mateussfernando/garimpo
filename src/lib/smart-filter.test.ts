import { describe, expect, it } from "vitest";
import { parseQuery, titleHas } from "./smart-filter";

describe("busca inteligente da Vitrine", () => {
  it("entende categoria, teto de preço e frete", () => {
    expect(parseQuery("tv até 2000 frete grátis")).toMatchObject({ category: "tv-video", maxCents: 200000, free: true, terms: [] });
  });

  it("entende loja e deixa o resto como palavra do título", () => {
    expect(parseQuery("air fryer shopee")).toMatchObject({ store: "shopee", terms: ["air", "fryer"] });
    expect(parseQuery("monitor lg no ml")).toMatchObject({ store: "mercadolivre", terms: ["monitor", "lg"] });
  });

  it("entende faixa de preço com mil, k e R$", () => {
    expect(parseQuery("notebook entre 3 mil e 5 mil sem juros")).toMatchObject({ category: "notebooks", minCents: 300000, maxCents: 500000, noInterest: true });
    expect(parseQuery("celular acima de R$ 1.500")).toMatchObject({ category: "celulares", minCents: 150000 });
    expect(parseQuery("fone até 2k")).toMatchObject({ category: "audio", maxCents: 200000 });
  });

  it("entende cupom, conferidas e ordem", () => {
    expect(parseQuery("games com cupom mais barato")).toMatchObject({ category: "games", coupon: true, sort: "preco" });
    expect(parseQuery("verificados recentes")).toMatchObject({ verified: true, sort: "novos" });
  });

  it("palavra procura começo de palavra no título, sem acento", () => {
    expect(titleHas("Smart TV LG OLED 55\"", ["lg", "ole"])).toBe(true);
    expect(titleHas("Fritadeira Elétrica Air Fryer", ["eletrica"])).toBe(true);
    expect(titleHas("Monitor Samsung", ["lg"])).toBe(false);
  });
});
