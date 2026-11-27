import { describe, expect, it } from "vitest";
import { codigoDoConvite, normalizarConvite, porQueNaoAbre } from "./convites";

describe("normalizarConvite", () => {
  it("mantém as maiúsculas do código privado", () => {
    expect(normalizarConvite("https://t.me/+ScNb6VvKuVeWoGmX")).toBe("t.me/+ScNb6VvKuVeWoGmX");
    expect(normalizarConvite("T.me/joinchat/AbC-d_E1234")).toBe("t.me/+AbC-d_E1234");
  });
  it("põe em minúsculas o nome público", () => {
    expect(normalizarConvite("https://t.me/OfertasAdrenaline")).toBe("t.me/ofertasadrenaline");
  });
});

describe("porQueNaoAbre", () => {
  const nada = new Set<string>();
  it("código só em minúsculas não abre", () => {
    expect(porQueNaoAbre("t.me/+scnb6vvkuvewogmx", nada)).toMatch(/maiúsculas/);
    expect(porQueNaoAbre("t.me/+-2ndu-kosikwogix", nada)).toMatch(/maiúsculas/);
  });
  it("código com maiúsculas pode abrir", () => {
    expect(porQueNaoAbre("t.me/+ScNb6VvKuVeWoGmX", nada)).toBeNull();
  });
  it("recusado pelo Telegram", () => {
    expect(porQueNaoAbre("t.me/+ScNb6VvKuVeWoGmX", new Set(["t.me/+ScNb6VvKuVeWoGmX"]))).toMatch(/venceu/);
  });
  it("bot não é grupo; grupo público passa", () => {
    expect(porQueNaoAbre("t.me/promobot", nada)).toMatch(/bot/);
    expect(porQueNaoAbre("t.me/compraemgrupo", nada)).toBeNull();
  });
  it("código só existe em convite privado", () => {
    expect(codigoDoConvite("t.me/+Ab12")).toBe("Ab12");
    expect(codigoDoConvite("t.me/canal")).toBeNull();
  });
});
