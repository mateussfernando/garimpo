import { describe, expect, it, vi } from "vitest";

// offers.ts importa o banco; aqui só se testam as funções puras (a escolha da loja mais barata por preço em destaque).
vi.mock("@/lib/db/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/settings", () => ({ getSetting: async () => null }));
vi.mock("@/lib/ai-usage", () => ({ getAiStatus: async () => null }));

import { storeQuotes, type OfferDTO } from "./offers";

const oferta = (id: number, store: string, priceCardCents: number, cashCents: number | null) =>
  ({
    id,
    store,
    title: "Monitor X",
    url: `https://${store}.com/p`,
    priceCardCents,
    cashCents,
    installments: null,
    installmentCents: null,
    interest: null,
    freeShipping: null,
    shippingCents: null,
    coupon: null,
    verifyStatus: "verificado",
    verifiedAt: null,
    available: true,
    source: "Pelando",
    createdAt: "2026-11-23T10:00:00.000Z",
  }) as unknown as OfferDTO;

describe("storeQuotes: a loja mais barata depende do preço em destaque", () => {
  // A: cartão 1000, Pix 900. B: cartão 950, sem Pix.
  const grupo = [oferta(1, "lojaA", 1000, 900), oferta(2, "lojaB", 950, null)];

  it("no cartão, B (950) vem antes de A (1000)", () => {
    expect(storeQuotes(grupo, "cartao").map((l) => l.id)).toEqual([2, 1]);
    expect(storeQuotes(grupo).map((l) => l.id)).toEqual([2, 1]); // padrão: cartão
  });

  it("no Pix, A (900) passa B, que sem Pix entra pelo cartão (950)", () => {
    expect(storeQuotes(grupo, "pix").map((l) => l.id)).toEqual([1, 2]);
  });

  it("esgotada vai por último em qualquer modo", () => {
    const g = [{ ...oferta(1, "lojaA", 1000, 900), available: false } as OfferDTO, oferta(2, "lojaB", 1500, null)];
    expect(storeQuotes(g, "pix").map((l) => l.id)).toEqual([2, 1]);
  });
});
