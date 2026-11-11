import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { costUsd } from "@/config/pricing";
import { isPromoGroup } from "@/config/telegram-filter";
import { InsightSchema, hashOf } from "./ai/insights";
import { jsonSchemaOf } from "./ai/types";
import { ALVOS_V0 } from "@/config/alvos";
import { cleanUrl, decodeTrackingUrl, storeForUrl } from "@/config/stores";
import { listItems, readDealPage } from "./collect/communities";
import { isDeal, parseKabum, textFor, totalFromInstallments } from "./collect/vitrines";
import { COMMUNITIES } from "./collect/communities-config";
import { ldProduct } from "./http/html";
import { __test } from "./http/polite";
import { matchAlvo, targetsFrom } from "./match/alvos";
import { notaRapida } from "./score/nota";
import { plausibleCardPrice } from "./verify/verify";

const alvos = ALVOS_V0.map((a, i) => ({ id: i + 1, ...a }));
const promobit = COMMUNITIES.find((c) => c.slug === "promobit")!;

describe("Alvos", () => {
  it("acha o Alvo mais específico e respeita exclusões", () => {
    expect(matchAlvo("Mouse Gamer Logitech G305 sem fio", alvos)?.slug).toBe("mouse");
    expect(matchAlvo("Mousepad Gamer Grande 90x40", alvos)?.slug).toBe("mousepad");
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
    // Pichau, KaBuM! e Terabyte identificam o produto só pelo caminho: sai tudo depois do "?".
    expect(cleanUrl("https://www.pichau.com.br/teclado-mecanico-x?rb_clickid=abc&afiliado=9")).toBe("https://www.pichau.com.br/teclado-mecanico-x");
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

describe("IA: preço e esquema", () => {
  it("custa o Haiku 5.5 por milhão de tokens (US$ 0,10 entrada, US$ 0,50 saída)", () => {
    expect(costUsd(100_000, 0)).toBeCloseTo(0.01, 6);
    expect(costUsd(0, 1_000_000)).toBeCloseTo(0.5, 6);
    expect(costUsd(2000, 300)).toBeCloseTo(0.00035, 6);
  });
  it("acima de 100 mil tokens de entrada vale o preço longo", () => {
    expect(costUsd(200_000, 0)).toBeCloseTo(0.1, 6);
  });
  it("o JSON Schema sai sem a chave $schema, que o claude -p recusa", () => {
    const s = jsonSchemaOf(InsightSchema);
    expect(s).not.toHaveProperty("$schema");
    expect(s).toHaveProperty("properties.veredito");
  });
  it("o hash das métricas muda só quando as métricas mudam", () => {
    const base = { produto: "x", loja: null, precoAtualCents: 100, pontosHistorico30d: 1, medianaCents: null, minimoCents: null, diferencaVsMedianaPct: null, nota: 50, alvo: null, faixa: null, medianaDaFaixaCents: null, precosNaFaixa: 0, precoAlvoCents: null, tetoCents: null, alvoAtingido: false, precoPixCents: null, precoDeLojaCents: null, esgotado: false, cupom: null, unidadesRestantes: null, ofertaTerminaEm: null, freteGratis: null, comJuros: null, parcelas: null, fontesDistintas48h: 1 };
    expect(hashOf(base)).toBe(hashOf({ ...base }));
    expect(hashOf(base)).not.toBe(hashOf({ ...base, precoAtualCents: 90 }));
  });
});

describe("vitrine do KaBuM!", () => {
  const html = readFileSync("fixtures/vitrines/kabum-monitores.html", "utf8");
  it("lê os produtos dos dados da página", () => {
    const items = parseKabum(html);
    // A fixture tem 6 produtos; 2 são de vendedores do marketplace e ficam de fora.
    expect(items).toHaveLength(4);
    expect(items[0].url).toMatch(/^https:\/\/www\.kabum\.com\.br\/produto\/\d+\//);
    expect(items[0].priceCents).toBeGreaterThan(0);
  });
  it("só conta como oferta com 10% ou mais abaixo do preço antigo", () => {
    const base = { code: "1", name: "x", url: "u", imageUrl: null, installmentText: null };
    expect(isDeal({ ...base, cashCents: 85_00, priceCents: 90_00, oldCents: 100_00 })).toBe(true);
    expect(isDeal({ ...base, cashCents: 95_00, priceCents: 95_00, oldCents: 100_00 })).toBe(false);
    expect(isDeal({ ...base, cashCents: 50_00, priceCents: 50_00, oldCents: null })).toBe(false);
  });
  it("não quebra com HTML sem dados", () => {
    expect(parseKabum("<html></html>")).toEqual([]);
  });
  it("usa o preço das parcelas, que é o do dia, e não o da listagem, que é o de antes da campanha", () => {
    expect(totalFromInstallments("10x de R$ 111,76")).toBe(1117_60);
    expect(totalFromInstallments("1x de R$ 4,22")).toBe(4_22);
    expect(totalFromInstallments(null)).toBeNull();
    const base = { code: "1", name: "Monitor", url: "u", imageUrl: null, cashCents: 1500_00, priceCents: 1764_71, oldCents: 1764_71 };
    // A listagem diz R$ 1.764,71 (sem desconto), mas as parcelas somam R$ 1.117,60: é oferta de 36%.
    const live = { ...base, installmentText: "10x de R$ 111,76", liveCardCents: 1117_60 };
    expect(isDeal(live)).toBe(true);
    expect(isDeal({ ...base, installmentText: null })).toBe(false);
    expect(textFor(live)).toContain("10x de R$ 111,76 sem juros");
  });
});

describe("filtro de grupos do Telegram", () => {
  it("liga canais de promoção e de lojas grandes", () => {
    for (const n of ["Achados do Tecnoblog | Ofertas de Tecnologia", "Canaltech Ofertas", "Promobit - Promoções e Cupons de Desconto", "KaBuM!"]) expect(isPromoGroup(n)).toBe(true);
  });
  it("não liga grupos de outros assuntos, mesmo com palavra de promoção", () => {
    for (const n of ["Extreme Cursos", "BATE PAPO : NOTEBOOKS NAS HORAS VAGAS", "Grupinho de Putaria", "Cursos em promoção", "Guilda Cloud"]) expect(isPromoGroup(n)).toBe(false);
  });
});

describe("verificação: preço plausível", () => {
  it("recusa a parcela de outro produto e aceita o total do cartão", () => {
    expect(plausibleCardPrice(4_22, 9_99)).toBe(false); // menos da metade da referência: é parcela de outro item
    expect(plausibleCardPrice(11_75, 9_99)).toBe(true); // total no cartão um pouco acima do Pix
    expect(plausibleCardPrice(900_00, 9_99)).toBe(false);
    expect(plausibleCardPrice(50_00, null)).toBe(true);
    expect(plausibleCardPrice(null, 9_99)).toBe(false);
  });
});
