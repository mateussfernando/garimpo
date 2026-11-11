import { describe, expect, it } from "vitest";
import { ALVOS_V0 } from "@/config/alvos";
import { cleanUrl, decodeTrackingUrl, storeForUrl } from "@/config/stores";
import { listItems, readDealPage } from "./collect/communities";
import { COMMUNITIES } from "./collect/communities-config";
import { ldProduct } from "./http/html";
import { __test } from "./http/polite";
import { matchAlvo, targetsFrom } from "./match/alvos";
import { notaRapida } from "./score/nota";

const alvos = ALVOS_V0.map((a, i) => ({ id: i + 1, ...a }));
const promobit = COMMUNITIES.find((c) => c.slug === "promobit")!;

describe("Alvos", () => {
  it("acha o Alvo mais específico e respeita exclusões", () => {
    expect(matchAlvo("Mouse Gamer Logitech G305 sem fio", alvos)?.slug).toBe("mouse");
    expect(matchAlvo("Mousepad Gamer Grande 90x40", alvos)?.slug).toBe("acessorios");
    expect(matchAlvo("Braço Articulado para Monitor 17 a 32", alvos)?.slug).toBe("braco-articulado");
    expect(matchAlvo("Monitor LG 27 IPS 180Hz", alvos)?.slug).toBe("monitor");
    expect(matchAlvo("Monitor de pressão arterial digital", alvos)).toBeNull();
    expect(matchAlvo("SSD Kingston NV3 1TB NVMe", alvos)?.slug).toBe("ssd");
    expect(matchAlvo("Air fryer 4L", alvos)).toBeNull();
  });

  it("preço-alvo só a partir de 5 ofertas", () => {
    expect(targetsFrom([100, 200, 300])).toEqual({ targetCents: null, ceilingCents: null });
    expect(targetsFrom([100, 100, 100, 100, 100])).toEqual({ targetCents: 85, ceilingCents: 115 });
  });
});

describe("Nota rápida", () => {
  it("dá nota cheia no preço-alvo, loja própria, frete grátis e 4 fontes", () => {
    const n = notaRapida({ priceCardCents: 8500, targetCents: 8500, ceilingCents: 11500, storeTrust: 1, freeShipping: true, shippingCents: 0, sources15: 4 });
    expect(n.nota).toBe(100);
    expect(n.alvoAtingido).toBe(true);
  });
  it("sem referência usa A = 0,5 e loja desconhecida C = 0,2", () => {
    const n = notaRapida({ priceCardCents: 10000, targetCents: null, ceilingCents: null, storeTrust: null, freeShipping: null, shippingCents: null, sources15: 1 });
    expect(n.parts).toEqual({ A: 0.5, C: 0.2, F: 0.3, S: 0.25 });
    expect(n.nota).toBe(36);
  });
});

describe("Lojas", () => {
  it("reconhece a loja e tira rastreio", () => {
    expect(storeForUrl("https://www.kabum.com.br/produto/123456/mouse")?.slug).toBe("kabum");
    expect(storeForUrl("https://site-desconhecido.com/x")).toBeNull();
    expect(cleanUrl("https://www.amazon.com.br/dp/B0ABCDEFGH?tag=afiliado-20&utm_source=x&th=1")).toBe("https://www.amazon.com.br/dp/B0ABCDEFGH?th=1");
    const amz = storeForUrl("https://www.amazon.com.br/dp/B0ABCDEFGH")!;
    expect(amz.productId!(new URL("https://www.amazon.com.br/Mouse/dp/b0abcdefgh/ref=x"))).toBe("B0ABCDEFGH");
  });
});

describe("robots.txt", () => {
  it("segue o grupo * com Allow mais específico", () => {
    const r = __test.parseRobots("User-agent: *\nDisallow: /redirect\nDisallow: /busca\nAllow: /busca/ofertas\n");
    if (r.mode !== "rules") throw new Error("esperava regras");
    const allowed = (path: string) => {
      let best: (typeof r.rules)[number] | null = null;
      for (const rule of r.rules) if (rule.re.test(path) && (!best || rule.len > best.len)) best = rule;
      return best ? best.allow : true;
    };
    expect(allowed("/oferta/mouse-123/")).toBe(true);
    expect(allowed("/redirect/abc")).toBe(false);
    expect(allowed("/busca/ofertas")).toBe(true);
  });
});

describe("Comunidade (HTML de exemplo)", () => {
  const list = `
    <a href="/oferta/mouse-gamer-logitech-g305-3190001/"><img alt="Mouse Gamer Logitech G305"></a>
    <a href="/oferta/mouse-gamer-logitech-g305-3190001/">Mouse Gamer Logitech G305 Lightspeed R$ 299,00 R$199,90</a>
    <a href="/oferta/air-fryer-4l-3190002/">Air Fryer 4L R$ 399,00 R$ 279,00</a>
    <a href="/sobre">Sobre</a>`;
  it("lista os posts com o título mais completo", () => {
    const items = listItems(list, promobit);
    expect(items).toHaveLength(2);
    expect(items[0]).toEqual({ url: "https://www.promobit.com.br/oferta/mouse-gamer-logitech-g305-3190001/", title: "Mouse Gamer Logitech G305 Lightspeed R$ 299,00 R$199,90" });
  });

  const deal = `
    <meta property="og:title" content="Mouse Gamer Logitech G305 Lightspeed | Promobit">
    <meta property="og:description" content="Na Amazon por R$ 199,90 em 10x de R$ 19,99 sem juros. Frete grátis">
    <meta property="og:image" content="https://img.example/mouse.jpg">
    <a href="https://www.promobit.com.br/redirect/abc">Pegar promoção</a>`;
  it("lê o post: título, preço, botão da loja e foto", () => {
    const d = readDealPage(deal, "https://www.promobit.com.br/oferta/mouse-gamer-logitech-g305-3190001/", promobit, "x");
    expect(d.title).toBe("Mouse Gamer Logitech G305 Lightspeed");
    expect(d.outboundUrl).toBe("https://www.promobit.com.br/redirect/abc");
    expect(d.imageUrl).toBe("https://img.example/mouse.jpg");
    expect(d.storeName).toBe("Amazon");
    expect(d.text).toContain("10x de R$ 19,99 sem juros");
  });

  it("lê o preço do JSON-LD da loja", () => {
    const html = `<script type="application/ld+json">{"@context":"https://schema.org","@type":"Product","name":"Mouse G305","image":["https://img/1.jpg"],"offers":{"@type":"Offer","price":"199.90","priceCurrency":"BRL"}}</script>`;
    expect(ldProduct(html)).toMatchObject({ name: "Mouse G305", image: "https://img/1.jpg", priceCents: 19990 });
  });
});

describe("links relativos com <base href> (Hardmob/vBulletin)", () => {
  it("resolve os links pelo base e acha os tópicos", () => {
    const hardmob = COMMUNITIES.find((c) => c.slug === "hardmob")!;
    const html = `<html><head><base href="https://www.hardmob.com.br/" /></head><body>
      <a href="threads/842496-Netshoes-Pasta-de-Amendoim-R990?s=abc">Netshoes - Pasta de Amendoim 250g - R$9,90</a></body></html>`;
    const items = listItems(html, hardmob);
    expect(items).toHaveLength(1);
    expect(items[0].url).toBe("https://www.hardmob.com.br/threads/842496-Netshoes-Pasta-de-Amendoim-R990");
  });
});

describe("redirecionador do Pelando", () => {
  it("lê a URL da loja dentro do token, sem rede", () => {
    const payload = Buffer.from(JSON.stringify({ url: "https://www.kabum.com.br/produto/1/x" })).toString("base64url");
    expect(decodeTrackingUrl(`https://dpl.pelando.com.br/r/aaa.${payload}.sig?x=1`)).toBe("https://www.kabum.com.br/produto/1/x");
    expect(decodeTrackingUrl("https://www.kabum.com.br/produto/1")).toBe("https://www.kabum.com.br/produto/1");
    expect(decodeTrackingUrl("https://dpl.pelando.com.br/r/lixo")).toBe("https://dpl.pelando.com.br/r/lixo");
  });
});
