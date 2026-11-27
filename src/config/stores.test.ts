import { describe, expect, it } from "vitest";
import { STORES, decodeTrackingUrl, isLinkDeOutroSite, linkDaLojaNaPagina, productIdFor } from "./stores";

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

describe("links de outros sites (encurtadores, afiliados e sites de promoção)", () => {
  it("Awin: lê a loja no parâmetro ued, sem abrir o link (o robots.txt da Awin barra o cread.php)", () => {
    const awin = "https://www.awin1.com/cread.php?awinmid=17729&awinaffid=1458796&ued=https://www.kabum.com.br/produto/993242/monitor-gamer-msi&platform=sl";
    expect(decodeTrackingUrl(awin)).toBe("https://www.kabum.com.br/produto/993242/monitor-gamer-msi");
    expect(decodeTrackingUrl("https://www.awin1.com/cread.php?awinmid=1")).toContain("awin1.com");
  });

  it("Boletando: a página da oferta vira o botão /ir/<número>/ direto", () => {
    expect(decodeTrackingUrl("https://boletando.com/notebook-gamer-acer/?oferta=274687")).toBe("https://boletando.com/ir/274687/");
    expect(decodeTrackingUrl("https://boletando.com/ir/274687/")).toBe("https://boletando.com/ir/274687/");
    expect(decodeTrackingUrl("https://boletando.com/lojas/amazon/")).toBe("https://boletando.com/lojas/amazon/");
  });

  it("Canaltech Ofertas: acha o link canalte.ch dentro da página", () => {
    const html = '<a class="cta" href="https://canalte.ch/op2/6cez" rel="sponsored">Ir para a loja</a>';
    expect(linkDaLojaNaPagina("https://ofertas.canaltech.com.br/smart-tv-semp-32/", html)).toBe("https://canalte.ch/op2/6cez");
    expect(linkDaLojaNaPagina("https://ofertas.canaltech.com.br/smart-tv-semp-32/", "<p>sem link</p>")).toBeNull();
    expect(linkDaLojaNaPagina("https://exemplo.com/", html)).toBeNull();
  });

  it("encurtadores e sites de promoção não são lojas", () => {
    for (const u of ["https://cupom.cc/u4iHMaxl", "https://aoferta.net/003ZnUl1-Amazon", "https://ofertou.ai/frc4-Amazon", "https://tidd.ly/48GIzOe", "https://ofertas.canaltech.com.br/x/"]) {
      expect(isLinkDeOutroSite(u)).toBe(true);
    }
    expect(isLinkDeOutroSite("https://www.amazon.com.br/dp/B0CX8MT2M2")).toBe(false);
  });
});
