import { describe, expect, it } from "vitest";
import { referenciasDoPromobit } from "./communities";

const pagina = (data: unknown) => `<html><script id="__NEXT_DATA__" type="application/json">${JSON.stringify(data)}</script></html>`;

describe("referenciasDoPromobit", () => {
  it("lê mínimo, máximo (em reais) e curtidas da oferta", () => {
    const html = pagina({ props: { pageProps: { offer: { offerLikes: 3, referencePrices: { price: 32, maxPrice: 35.97, minPrice: 29.05, zonePrice: 2 } } } } });
    expect(referenciasDoPromobit(html)).toEqual({ refMinCents: 2905, refMaxCents: 3597, curtidas: 3 });
  });
  it("campo que sumiu ou mudou vira null, sem quebrar", () => {
    expect(referenciasDoPromobit(pagina({ props: {} }))).toEqual({ refMinCents: null, refMaxCents: null, curtidas: null });
    expect(referenciasDoPromobit("<html>sem json</html>")).toEqual({ refMinCents: null, refMaxCents: null, curtidas: null });
    // intervalo sem sentido (máximo <= mínimo) não vale
    expect(referenciasDoPromobit(pagina({ referencePrices: { minPrice: 50, maxPrice: 40 }, offerLikes: "x" }))).toEqual({ refMinCents: null, refMaxCents: null, curtidas: null });
  });
});
