import { describe, expect, it } from "vitest";
import { parseDataPage, parseFeed, parseVtex, reais } from "./genericas-parse";

// Formatos reais vistos em 11/11/2026 (Pechinchou, Waz, Fast Shop e feeds WordPress), reduzidos ao essencial.

describe("reais", () => {
  it("lê número e texto em reais", () => {
    expect(reais(2477.64)).toBe(247764);
    expect(reais("51.03")).toBe(5103);
    expect(reais("R$ 1.299,90")).toBe(129990);
    expect(reais("")).toBeNull();
    expect(reais(0)).toBeNull();
  });
});

describe("página de ofertas (__NEXT_DATA__ e JSON-LD)", () => {
  it("lê as ofertas do __NEXT_DATA__ da Pechinchou, com o link direto da loja", () => {
    const data = {
      props: {
        pageProps: {
          promos: {
            results: [
              {
                id: 76348,
                store: { name: "Amazon", slug_url: "amazon.com.br" },
                freight: "Frete Grátis Amazon Prime",
                coupons: ["BLACK30"],
                title: "Mouse Gamer Logitech G203 Lightsync RGB",
                slug: "mouse-gamer-logitech-g203",
                old_price: "199.90",
                price: "99.90",
                image: "https://assets.pechinchou.com.br/media/img/products/g203.jpg",
                long_url: "https://www.amazon.com.br/dp/B07QGHK6Q8?tag=parceiropechi-20",
                short_url: "https://www.amazon.com.br/dp/B07QGHK6Q8?tag=parceiropechi-20",
              },
              // Sem preço: não é oferta.
              { id: 1, title: "Grupo de promoções no WhatsApp", long_url: "https://pechinchou.net/x" },
            ],
          },
          mainStores: [{ id: 2, name: "Amazon", url: "https://www.amazon.com.br" }],
        },
      },
    };
    const html = `<html><script id="__NEXT_DATA__" type="application/json">${JSON.stringify(data)}</script></html>`;
    const list = parseDataPage(html, "https://www.pechinchou.com.br/recentes");
    expect(list).toHaveLength(1);
    const d = list[0];
    expect(d.key).toBe("www.pechinchou.com.br:76348");
    expect(d.priceCents).toBe(9990);
    expect(d.oldCents).toBe(19990);
    expect(d.outboundUrl).toBe("https://www.amazon.com.br/dp/B07QGHK6Q8?tag=parceiropechi-20");
    expect(d.storeName).toBe("Amazon");
    expect(d.text).toContain("por R$");
    expect(d.text).toContain("cupom: BLACK30");
  });

  it("lê Product do JSON-LD, com o preço em offers", () => {
    const ld = {
      "@context": "https://schema.org",
      "@type": "ItemList",
      itemListElement: [
        { "@type": "ListItem", position: 1, item: { "@type": "Product", name: "SSD Kingston NV3 1TB M.2 NVMe", image: "https://x.example/ssd.jpg", offers: { "@type": "Offer", price: 389.9, url: "https://www.kabum.com.br/produto/621162/ssd" } } },
        { "@type": "ListItem", position: 2, url: "https://x.example/sem-preco", name: "Item sem preço nenhum" },
      ],
    };
    const html = `<script type="application/ld+json">${JSON.stringify(ld)}</script>`;
    const list = parseDataPage(html, "https://www.hardwarebarato.com/produtos/promocoes");
    expect(list).toHaveLength(1);
    expect(list[0].priceCents).toBe(38990);
    expect(list[0].outboundUrl).toBe("https://www.kabum.com.br/produto/621162/ssd");
  });

  it("página sem dados de oferta não inventa nada", () => {
    expect(parseDataPage("<html><body><h1>Ofertas</h1></body></html>", "https://x.example/")).toEqual([]);
  });
});

describe("feed RSS", () => {
  const feed = `<?xml version="1.0"?><rss><channel>
    <item><title><![CDATA[Monitor LG UltraGear 27" 180Hz por R$ 899]]></title>
      <link>https://tecnoblog.net/achados/2026/11/11/monitor-lg/</link><guid>https://tecnoblog.net/?p=1</guid>
      <description><![CDATA[<p>Monitor gamer com 10x de R$ 89,90 sem juros.</p><a href="https://amzn.to/abc123">Comprar</a>]]></description></item>
    <item><title>Review do celular X</title><link>https://tecnoblog.net/noticias/celular-x/</link>
      <description>&lt;p&gt;Notícia sem oferta.&lt;/p&gt;</description></item>
  </channel></rss>`;

  it("tira título, texto e o primeiro link de loja do corpo", () => {
    const list = parseFeed(feed, { pathFilter: "" });
    expect(list).toHaveLength(2);
    expect(list[0].title).toBe('Monitor LG UltraGear 27" 180Hz por R$ 899');
    expect(list[0].outboundUrl).toBe("https://amzn.to/abc123");
    expect(list[0].text).toContain("10x de R$ 89,90 sem juros");
    expect(list[1].outboundUrl).toBeNull();
    expect(list[1].text).toContain("Notícia sem oferta");
  });

  it("filtro de caminho deixa só os posts de ofertas", () => {
    const list = parseFeed(feed, { pathFilter: "/achados/" });
    expect(list.map((i) => i.key)).toEqual(["https://tecnoblog.net/?p=1"]);
  });
});

describe("busca VTEX", () => {
  const inst = (name: string, n: number, value: number, rate: number) => ({ PaymentSystemName: name, NumberOfInstallments: n, Value: value, InterestRate: rate, TotalValuePlusInterestRate: Math.round(value * n * 100) / 100 });
  const product = (id: string, sellers: unknown[]) => ({ productId: id, productName: `Mouse sem fio Logitech MX ${id}`, link: `https://www.waz.com.br/mouse-${id}/p`, items: [{ images: [{ imageUrl: `https://waz.vteximg.com.br/${id}.jpg` }], sellers }] });

  it("total no cartão = maior parcela sem juros; com juros não conta", () => {
    const json = JSON.stringify([
      product("1", [{ sellerName: "waz", sellerDefault: true, commertialOffer: { Price: 500, ListPrice: 650, AvailableQuantity: 3, Installments: [inst("Boleto Bancário", 1, 500, 0), inst("Visa", 1, 500, 0), inst("Visa", 10, 50, 0), inst("Visa", 12, 45.5, 1.49)] } }]),
      // Fast Shop: só 1x sem juros, o resto com juros. O total no cartão é o preço cheio.
      product("2", [{ sellerName: "Fast Shop", sellerDefault: true, commertialOffer: { Price: 188.3, ListPrice: 229, AvailableQuantity: 10, Installments: [inst("Visa", 1, 188.3, 0), inst("Visa", 2, 96.25, 1.49)] } }]),
      // Sem estoque: fica de fora.
      product("3", [{ sellerName: "waz", sellerDefault: true, commertialOffer: { Price: 100, ListPrice: 100, AvailableQuantity: 0, Installments: [] } }]),
    ]);
    const list = parseVtex(json, { seller: "" });
    expect(list.map((p) => p.code)).toEqual(["1", "2"]);
    expect(list[0].liveCardCents).toBe(50000);
    // toLocaleString põe espaço sem quebra depois do "R$"; o parser e totalFromInstallments aceitam.
    expect(list[0].installmentText).toMatch(/^10x de R\$\s50,00$/);
    expect(list[0].oldCents).toBe(65000);
    expect(list[1].liveCardCents).toBe(18830);
    expect(list[1].installmentText).toBeNull();
  });

  it("no marketplace, fica só o vendedor pedido", () => {
    const json = JSON.stringify([
      product("9", [
        { sellerName: "Loja Terceira", sellerDefault: true, commertialOffer: { Price: 90, ListPrice: 90, AvailableQuantity: 5, Installments: [inst("Visa", 1, 90, 0)] } },
        { sellerName: "Americanas", sellerDefault: false, commertialOffer: { Price: 99, ListPrice: 120, AvailableQuantity: 5, Installments: [inst("Visa", 1, 99, 0)] } },
      ]),
    ]);
    expect(parseVtex(json, { seller: "americanas" })[0].priceCents).toBe(9900);
    expect(parseVtex(json, { seller: "" })[0].priceCents).toBe(9000);
    expect(parseVtex("<html>não é JSON</html>", { seller: "" })).toEqual([]);
  });
});
