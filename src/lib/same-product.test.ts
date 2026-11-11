import { describe, expect, it } from "vitest";
import { clusterSameProduct, type SameProductInput } from "./same-product";

let id = 0;
const o = (title: string, priceCardCents: number | null = null, extra: Partial<SameProductInput> = {}): SameProductInput => ({ id: ++id, title, productId: null, category: null, priceCardCents, ...extra });
const together = (a: SameProductInput, b: SameProductInput) => clusterSameProduct([a, b]).length === 1;

describe("clusterSameProduct", () => {
  it("junta o mesmo modelo em lojas diferentes", () => {
    expect(together(o("Monitor Gamer LG UltraGear 27GS60F 27\" 180Hz", 89900), o("Monitor LG 27GS60F-B 27 Pol Full HD 180hz IPS", 94900))).toBe(true);
    expect(together(o("Processador AMD Ryzen 7 5700X3D AM4", 129900), o("AMD Ryzen 7 5700X3D, 3.0GHz, Cache 96MB, AM4", 124990))).toBe(true);
    expect(together(o("Smart TV LG 55\" 4K UHD 55UT8050PSA ThinQ AI", 219900), o("Smart TV 55 LG UHD 4K 55UT8050PSA", 229900))).toBe(true);
  });

  it("junta o mesmo título e o mesmo produto na loja", () => {
    expect(together(o("Fone de Ouvido Bluetooth TWS"), o("fone de ouvido bluetooth tws"))).toBe(true);
    expect(together(o("Mouse Logitech G203", 100, { productId: 7 }), o("Mouse Gamer Logitech G203 Lightsync", 200, { productId: 7 }))).toBe(true);
    // Mesmo título com um preço errado no post não entra no grupo.
    expect(together(o("Console PlayStation 5 Slim Digital 825GB", 10000), o("Console PlayStation 5 Slim Digital 825GB", 367100))).toBe(false);
  });

  it("um post sem preço não liga ofertas de preços muito diferentes", () => {
    const g = clusterSameProduct([o("Extensão Hub Régua USB 2.0 4 Portas", 499), o("Extensão Hub Régua USB 2.0 4 Portas"), o("Extensão Hub Régua USB 2.0 4 Portas", 372500)]);
    expect(g.length).toBe(2);
  });

  it("o mesmo product_id com títulos sem nada a ver não junta (página de erro da loja)", () => {
    expect(together(o("Extensão Hub Régua USB 2.0 7 Portas", 4990, { productId: 9 }), o("Monitor Gamer Acer Nitro 27 Full HD", 47300, { productId: 9 }))).toBe(false);
  });

  it("não junta modelos, tamanhos ou capacidades diferentes", () => {
    expect(together(o("Apple iPhone 15 128GB Preto", 499900), o("Apple iPhone 16 128GB Preto", 549900))).toBe(false);
    expect(together(o("Apple iPhone 15 128GB Preto", 499900), o("Apple iPhone 15 256GB Preto", 579900))).toBe(false);
    expect(together(o("Smart TV LG 50\" 4K UHD ThinQ AI", 199900), o("Smart TV LG 55\" 4K UHD ThinQ AI", 229900))).toBe(false);
  });

  it("não junta pelo código curto de chipset com marcas diferentes", () => {
    expect(together(o("Placa Mãe Gigabyte B550M Aorus Elite AM4", 79900), o("Placa Mãe MSI B550M Pro-VDH WiFi AM4", 74900))).toBe(false);
  });

  it("não junta títulos genéricos diferentes, acessório com produto ou preço muito longe", () => {
    expect(together(o("Fone de Ouvido Bluetooth TWS Lenovo"), o("Fone de Ouvido Bluetooth TWS QCY"))).toBe(false);
    expect(together(o("Capa para iPhone 15 Silicone", 4990), o("Apple iPhone 15 128GB", 499900))).toBe(false);
    expect(together(o("Mouse Logitech G203 Lightsync", 9990, { category: "informatica" }), o("Mouse Logitech G203 Lightsync", 9990, { category: "games" }))).toBe(true);
    expect(together(o("Mouse Gamer Logitech G203 RGB", 9990, { category: "informatica" }), o("Mouse Logitech G203 Lightsync RGB", 10990, { category: "games" }))).toBe(false);
  });
});
