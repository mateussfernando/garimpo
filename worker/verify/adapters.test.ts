import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { adapterFor } from "./adapters";
import { readGeneric } from "./verify";

const fixture = (name: string) => readFileSync(`fixtures/lojas/${name}`, "utf8");

// As fixtures são trechos de páginas reais, colhidas em 10/11/2026.
describe("leitor do KaBuM!", () => {
  const kabum = adapterFor("kabum")!;

  it("item barato: no cartão só dá 1x, com desconto; o Pix é menor ainda", () => {
    const d = kabum(fixture("kabum-produto-1x.html"), "https://www.kabum.com.br/produto/376494/x")!;
    expect(d.cardCents).toBe(4_22);
    expect(d.installments).toBe(1);
    expect(d.interest).toBe(false);
    expect(d.cashCents).toBe(3_99);
    expect(d.listCents).toBe(11_75);
    expect(d.extra.card1xDiscountPct).toBe(10);
  });

  it("item caro: total no cartão em 10x sem juros", () => {
    const d = kabum(fixture("kabum-produto-10x.html"), "https://www.kabum.com.br/produto/1017202/x")!;
    expect(d.cardCents).toBe(1117_64);
    expect(d.installments).toBe(10);
    expect(d.installmentCents).toBe(111_76);
    expect(d.interest).toBe(false);
    expect(d.cashCents).toBe(949_99);
    expect(d.listCents).toBe(1764_71);
    expect(d.available).toBe(true);
  });

  it("não afirma frete grátis quando a loja não afirma, e traz cupom, estoque e fim da oferta", () => {
    const d = kabum(fixture("kabum-produto-10x.html"), "u")!;
    expect(d.freeShipping).toBeNull();
    expect(d.coupon).toBe("11DO11");
    expect(d.extra.stockLeft).toBeGreaterThan(0);
    expect(d.extra.endsAt).toMatch(/^2026-11-1\d/);
    expect(d.extra.images?.length).toBeGreaterThan(0);
    expect(d.title).toContain("ASUS TUF");
  });

  it("devolve null quando a página não tem os dados (cai no caminho genérico)", () => {
    expect(kabum("<html><body>sem dados</body></html>", "u")).toBeNull();
  });
});

describe("leitor da Amazon", () => {
  const amazon = adapterFor("amazon")!;

  it("separa o preço no Pix do total no cartão e reconhece parcelas sem juros", () => {
    const d = amazon(fixture("amazon-produto.html"), "https://www.amazon.com.br/dp/B0FPM2VC6Q")!;
    expect(d.cashCents).toBe(599_99);
    expect(d.cardCents).toBe(625_90);
    expect(d.installments).toBe(10);
    expect(d.installmentCents).toBe(62_59);
    expect(d.interest).toBe(false); // 10 x 62,59 = 625,90
    expect(d.listCents).toBe(799_90);
    expect(d.available).toBe(true);
    expect(d.title).toContain("MX Master 4");
    expect(d.imageUrl).toMatch(/^https:\/\/m\.media-amazon\.com\//);
  });

  it("frete grátis só no primeiro pedido não conta como frete grátis", () => {
    expect(amazon(fixture("amazon-produto.html"), "u")!.freeShipping).toBeNull();
  });
});

describe("leitura genérica (loja sem leitor próprio)", () => {
  const blank = { priceCardCents: null, installments: null, installmentCents: null, interest: null, freeShipping: null, shippingCents: null };
  const ld = (extra = "") =>
    `<html><body><script type="application/ld+json">{"@type":"Product","name":"Mouse X","offers":{"@type":"Offer","price":89.9,"availability":"https://schema.org/InStock"}}</script>${extra}</body></html>`;

  it("usa o JSON-LD e as parcelas do texto", () => {
    const v = readGeneric(ld("<p>ou 3x de R$ 33,30 sem juros</p>"), blank);
    expect(v.priceCard).toBe(99_90);
    expect(v.installments).toBe(3);
    expect(v.cashCents).toBe(89_90);
    expect(v.available).toBe(true);
  });

  it("frete grátis com condição não vira selo de frete grátis", () => {
    expect(readGeneric(ld("<p>Frete grátis acima de R$ 199</p>"), blank).freeShipping).toBeNull();
    expect(readGeneric(ld("<p>Frete grátis para todo o Brasil</p>"), blank).freeShipping).toBe(true);
  });

  it("marca esgotado pelo JSON-LD", () => {
    const html = ld().replace("InStock", "OutOfStock");
    expect(readGeneric(html, blank).available).toBe(false);
  });
});
