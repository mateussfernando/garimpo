import { describe, expect, it } from "vitest";
import { STORES, productIdFor } from "./stores";

const id = (slug: string, url: string) => productIdFor(STORES.find((s) => s.slug === slug)!, url);

describe("productIdFor", () => {
  it("lê o ID dos links de produto", () => {
    expect(id("amazon", "https://www.amazon.com.br/dp/B0CX8MT2M2?btn_type=ss")).toBe("B0CX8MT2M2");
    expect(id("aliexpress", "https://pt.aliexpress.com/item/1005006.html")).toBe("1005006");
    expect(id("kabum", "https://www.kabum.com.br/produto/123456/monitor")).toBe("123456");
    expect(id("americanas", "https://www.americanas.com.br/google-play-online-pod-variable30-300-8763233/p")).toBe("8763233");
  });

  it("os três formatos de link da Shopee dão o mesmo ID", () => {
    expect(id("shopee", "https://shopee.com.br/Fone-i.1248266601.58250692708")).toBe("1248266601.58250692708");
    expect(id("shopee", "https://shopee.com.br/product/1248266601/58250692708?c=1")).toBe("1248266601.58250692708");
    expect(id("shopee", "https://shopee.com.br/opaanlp/1248266601/58250692708?__mobile__=1")).toBe("1248266601.58250692708");
  });

  it("página que não é de produto não tem ID", () => {
    expect(id("aliexpress", "https://m.aliexpress.com/p/coin-index/index.html?utm=x")).toBeNull();
    expect(id("aliexpress", "https://www.aliexpress.com/s/error/404")).toBeNull();
    expect(id("shopee", "https://live.shopee.com.br/universal-link/share?from=live")).toBeNull();
    expect(id("amazon", "https://www.amazon.com.br/promotion/psp/A2NCD1UWMH34OW")).toBeNull();
    expect(id("amazon", "https://www.amazon.com.br/")).toBeNull();
    expect(id("kabum", "https://www.kabum.com.br/promocao/CP115NAMB")).toBeNull();
    expect(id("carrefour", "https://www.carrefour.com.br/")).toBeNull();
    expect(id("carrefour", "https://www.carrefour.com.br/busca/monitor")).toBeNull();
  });
});
