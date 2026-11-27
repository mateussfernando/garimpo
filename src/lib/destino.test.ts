import { describe, expect, it } from "vitest";
import { destinoSeguro } from "./destino";

const O = "https://garimpo.test";

describe("destinoSeguro", () => {
  it("aceita caminho do próprio site", () => {
    expect(destinoSeguro("/alvos", O)).toBe("/alvos");
    expect(destinoSeguro("/admin/fontes?x=1#a", O)).toBe("/admin/fontes?x=1#a");
  });
  it("recusa outro site, em qualquer disfarce", () => {
    for (const ruim of ["//golpe.com", "/\\golpe.com", "/\t/golpe.com", "/\n/golpe.com", "https://golpe.com", "javascript:alert(1)", "golpe.com"]) {
      expect(destinoSeguro(ruim, O)).toBe("/");
    }
  });
  it("sem destino ou no servidor, a Vitrine", () => {
    expect(destinoSeguro(null, O)).toBe("/");
    expect(destinoSeguro("/alvos", null)).toBe("/");
  });
});
