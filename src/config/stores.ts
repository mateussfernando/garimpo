// Lojas conhecidas. Domínio fora desta lista = suspeito.
// trust = C da Nota: 1 loja própria, 0,6 marketplace (0,8 quando a loja
// vende direto e também tem marketplace). Desconhecida = 0,2.

export type Store = {
  slug: string;
  name: string;
  domains: string[];
  trust: number;
  /** Extrai o ID canônico do produto a partir da URL. */
  productId?: (url: URL) => string | null;
  /** O produto é identificado só pelo caminho: tudo depois do "?" é rastreio e sai do link. */
  pathOnly?: boolean;
};

export const STORES: Store[] = [
  {
    slug: "kabum",
    name: "KaBuM!",
    domains: ["kabum.com.br"],
    trust: 1,
    pathOnly: true,
    productId: (u) => u.pathname.match(/\/produto\/(\d+)/)?.[1] ?? null,
  },
  {
    slug: "pichau",
    name: "Pichau",
    domains: ["pichau.com.br"],
    trust: 1,
    pathOnly: true,
    productId: (u) => u.pathname.split("/").filter(Boolean).pop() ?? null,
  },
  {
    slug: "terabyte",
    name: "Terabyte",
    domains: ["terabyteshop.com.br"],
    trust: 1,
    pathOnly: true,
    productId: (u) => u.pathname.match(/\/produto\/(\d+)/)?.[1] ?? null,
  },
  {
    slug: "amazon",
    name: "Amazon",
    // amzlink.to e link.amazon são os encurtadores da própria Amazon: o domínio já diz a loja, sem abrir o link.
    domains: ["amazon.com.br", "amzn.to", "a.co", "amzlink.to", "link.amazon"],
    trust: 0.8,
    productId: (u) => u.pathname.match(/\/(?:dp|gp\/product|gp\/aw\/d)\/([A-Z0-9]{10})/i)?.[1]?.toUpperCase() ?? null,
  },
  {
    slug: "mercadolivre",
    name: "Mercado Livre",
    // meli.la é o encurtador do Mercado Livre (444 das 893 ofertas sem loja em 23/11): o domínio já diz a loja.
    domains: ["mercadolivre.com.br", "mercadolivre.com", "mercadolibre.com", "meli.la"],
    trust: 0.6,
    productId: (u) => (u.pathname + u.search).match(/MLB-?(\d{6,})/i)?.[1] ? `MLB${(u.pathname + u.search).match(/MLB-?(\d{6,})/i)![1]}` : null,
  },
  {
    slug: "magalu",
    name: "Magalu",
    // influenciadormagalu.com.br: link de parceiro do Magalu (é por onde a Pechinchou manda as ofertas da loja).
    domains: ["magazineluiza.com.br", "magalu.com", "influenciadormagalu.com.br", "magazineluiza.onelink.me"],
    trust: 0.8,
    productId: (u) => u.pathname.match(/\/p\/([a-z0-9]+)\//i)?.[1] ?? null,
  },
  {
    slug: "shopee",
    name: "Shopee",
    domains: ["shopee.com.br"],
    trust: 0.6,
    // Mesmo item em três formatos de link: nome-i.LOJA.ITEM, /product/LOJA/ITEM e /opaanlp/LOJA/ITEM (link do app).
    productId: (u) => {
      const m = u.pathname.match(/i\.(\d+)\.(\d+)/) ?? u.pathname.match(/\/(?:product|opaanlp)\/(\d+)\/(\d+)/);
      return m ? `${m[1]}.${m[2]}` : null;
    },
  },
  {
    slug: "aliexpress",
    name: "AliExpress",
    domains: ["aliexpress.com", "pt.aliexpress.com", "s.click.aliexpress.com"],
    trust: 0.6,
    productId: (u) => u.pathname.match(/\/item\/(\d+)/)?.[1] ?? null,
  },
  {
    slug: "casasbahia",
    name: "Casas Bahia",
    domains: ["casasbahia.com.br"],
    trust: 0.8,
    productId: (u) => u.pathname.match(/\/p\/(\d+)/)?.[1] ?? null,
  },
  {
    slug: "carrefour",
    name: "Carrefour",
    domains: ["carrefour.com.br"],
    trust: 0.8,
  },
  {
    slug: "americanas",
    name: "Americanas",
    domains: ["americanas.com.br"],
    trust: 0.6,
    // Link antigo /produto/ID e o novo /nome-do-produto-ID/p.
    productId: (u) => u.pathname.match(/\/produto\/(\d+)/)?.[1] ?? u.pathname.match(/-(\d{5,})\/p\/?$/)?.[1] ?? null,
  },
  {
    // Loja VTEX: a busca pública traz parcelas e juros por cartão (docs/fontes-novas.md). Produto = /nome-do-produto/p.
    slug: "waz",
    name: "Waz",
    domains: ["waz.com.br"],
    trust: 1,
    pathOnly: true,
  },
  {
    slug: "fastshop",
    name: "Fast Shop",
    domains: ["fastshop.com.br"],
    trust: 0.8,
    pathOnly: true,
  },
];

const SHORTENERS = [
  "amzn.to", "amzlink.to", "link.amazon", "a.co", "s.shopee.com.br", "shope.ee", "s.click.aliexpress.com", "mercadolivre.com/sec",
  "divulgador.magalu.com", "magazineluiza.onelink.me", "tidd.ly", "bit.ly", "cutt.ly", "tinyurl.com", "is.gd", "t.co", "abre.ai",
  "encurtador.com.br", "compre.vc", "oferta.vc",
  // Vistos nos grupos em 11/11 ("links sem loja conhecida" no log da Escuta). O link curto é seguido até a loja;
  // se não chegar numa loja da lista, a oferta fica "não verificada", como qualquer outra.
  "meli.la", "a.aliexpress.com", "promoby.me", "ofertou.ai", "adrena.click", "linkmc.click", "curt.link", "i.promotop.net",
  "aoferta.net", "boletando.com", "nerdofertas.com",
  // Vistos nas fontes novas da pesquisa de 11/11 (docs/fontes-novas.md). tecno.click proíbe robôs no robots.txt:
  // a oferta fica "não verificada" com o motivo certo, em vez de perder o link.
  "pechin.co", "cupom.cc", "mcmgz.in", "tiny.cc", "canalte.ch", "tecno.click",
];

export function hostOf(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

export function storeForUrl(url: string): Store | null {
  const host = hostOf(url);
  if (!host) return null;
  return STORES.find((s) => s.domains.some((d) => host === d || host.endsWith("." + d))) ?? null;
}

/**
 * ID do produto na loja a partir do link. null = o link não é de um produto (erro, moedas, live, promoção, busca, home):
 * nada disso pode virar um "produto", senão ofertas sem nada a ver dividem o mesmo histórico de preço.
 */
export function productIdFor(store: Store, url: string): string | null {
  const u = new URL(url);
  if (store.productId) return store.productId(u);
  // Loja sem leitor de ID: o caminho serve, menos a home e páginas que claramente não são de produto.
  const path = u.pathname.replace(/\/+$/, "");
  if (!path || /(^|\/)(error|erro|404|busca|search|s|promocao|promotion|carrinho|cart|login|categoria|category)(\/|$)/i.test(path)) return null;
  return path;
}

export function storeByName(name: string): Store | null {
  const n = name.toLowerCase();
  return (
    STORES.find((s) => n.includes(s.name.toLowerCase().replace("!", "")) || n.includes(s.slug)) ??
    null
  );
}

/**
 * Sites de promoção cuja página da oferta tem o link para a loja (o robots.txt deles libera essas páginas).
 * O worker abre a página uma vez, acha o link e segue até a loja. Achado de 25/11: ofertas.canaltech.com.br
 * (140 ofertas por semana sem loja) manda para canalte.ch, que redireciona direto para a loja.
 */
const LINK_NA_PAGINA: { host: string; link: RegExp }[] = [
  { host: "ofertas.canaltech.com.br", link: /https:\/\/canalte\.ch\/op2\/[A-Za-z0-9]+/ },
  { host: "boletando.com", link: /https:\/\/boletando\.com\/ir\/\d+\/?/ },
];

/** O link para a loja dentro da página de um site de promoção conhecido; null se não for um deles ou não achar. */
export function linkDaLojaNaPagina(url: string, html: string): string | null {
  const host = hostOf(url);
  const site = LINK_NA_PAGINA.find((s) => s.host === host);
  return site ? (html.match(site.link)?.[0] ?? null) : null;
}

/** Encurtador, rede de afiliados ou site de promoção: o link é seguido até a loja, não é uma loja. */
export function isLinkDeOutroSite(url: string): boolean {
  const host = hostOf(url);
  return isShortener(url) || (host != null && LINK_NA_PAGINA.some((s) => s.host === host));
}

export function isShortener(url: string): boolean {
  const host = hostOf(url);
  if (!host) return false;
  return SHORTENERS.some((s) => (url.includes(s) && s.includes("/")) || host === s);
}

/**
 * O Pelando manda o link da loja dentro de um redirecionador (dpl.pelando.com.br/r/<JWT>), que o robots.txt
 * e a Cloudflare não deixam robô abrir. A URL real vem no corpo do token: lemos aqui, sem pedir nada à rede.
 */
export function decodeTrackingUrl(url: string): string {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    // Awin (rede de afiliados, por onde o tidd.ly passa): a loja vem no parâmetro "ued". O robots.txt da Awin não
    // deixa abrir o cread.php, e nem precisa: a URL da loja já está no link (achado de 25/11, 108 ofertas por semana).
    if (/(^|\.)awin1\.com$/.test(host) && u.pathname.startsWith("/cread.php")) {
      const ued = u.searchParams.get("ued");
      return ued && /^https?:\/\//i.test(ued) ? ued : url;
    }
    // Boletando: a página da oferta (…/?oferta=274687) tem o botão "ir para a loja" em /ir/274687/, que o robots.txt
    // libera e redireciona para a loja. O número já está no link: vai direto, sem abrir a página.
    if (host === "boletando.com" && !u.pathname.startsWith("/ir/")) {
      const n = u.searchParams.get("oferta");
      return n && /^\d+$/.test(n) ? `https://boletando.com/ir/${n}/` : url;
    }
    if (u.hostname !== "dpl.pelando.com.br" || !u.pathname.startsWith("/r/")) return url;
    const payload = u.pathname.slice(3).split(".")[1];
    if (!payload) return url;
    const real = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"))?.url;
    return typeof real === "string" && /^https?:\/\//i.test(real) ? real : url;
  } catch {
    return url;
  }
}

/** Tira parâmetros de rastreio/afiliado e o fragmento. Em loja de caminho único (KaBuM!, Pichau, Terabyte), tira todos. */
export function cleanUrl(url: string): string {
  try {
    const u = new URL(url);
    u.hash = "";
    if (storeForUrl(url)?.pathOnly) {
      u.search = "";
      return u.toString();
    }
    const drop = [/^utm_/i, /^tag$/i, /^ref/i, /^aff/i, /^gclid$/i, /^fbclid$/i, /^matt_/i, /^partner/i, /^pdp_/i, /^sc_/i, /^spm$/i, /^ascsub/i, /^linkCode$/i, /^camp$/i, /^creative/i];
    for (const key of [...u.searchParams.keys()]) {
      if (drop.some((re) => re.test(key))) u.searchParams.delete(key);
    }
    return u.toString();
  } catch {
    return url;
  }
}
