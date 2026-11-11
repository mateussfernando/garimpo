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
    domains: ["amazon.com.br", "amzn.to", "a.co"],
    trust: 0.8,
    productId: (u) => u.pathname.match(/\/(?:dp|gp\/product|gp\/aw\/d)\/([A-Z0-9]{10})/i)?.[1]?.toUpperCase() ?? null,
  },
  {
    slug: "mercadolivre",
    name: "Mercado Livre",
    domains: ["mercadolivre.com.br", "mercadolivre.com", "mercadolibre.com"],
    trust: 0.6,
    productId: (u) => (u.pathname + u.search).match(/MLB-?(\d{6,})/i)?.[1] ? `MLB${(u.pathname + u.search).match(/MLB-?(\d{6,})/i)![1]}` : null,
  },
  {
    slug: "magalu",
    name: "Magalu",
    domains: ["magazineluiza.com.br", "magalu.com"],
    trust: 0.8,
    productId: (u) => u.pathname.match(/\/p\/([a-z0-9]+)\//i)?.[1] ?? null,
  },
  {
    slug: "shopee",
    name: "Shopee",
    domains: ["shopee.com.br"],
    trust: 0.6,
    productId: (u) => u.pathname.match(/i\.(\d+\.\d+)/)?.[1] ?? null,
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
    productId: (u) => u.pathname.match(/\/produto\/(\d+)/)?.[1] ?? null,
  },
];

const SHORTENERS = [
  "amzn.to", "amzlink.to", "link.amazon", "a.co", "s.shopee.com.br", "shope.ee", "s.click.aliexpress.com", "mercadolivre.com/sec",
  "divulgador.magalu.com", "magazineluiza.onelink.me", "tidd.ly", "bit.ly", "cutt.ly", "tinyurl.com", "is.gd", "t.co", "abre.ai",
  "encurtador.com.br", "compre.vc", "oferta.vc",
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

export function storeByName(name: string): Store | null {
  const n = name.toLowerCase();
  return (
    STORES.find((s) => n.includes(s.name.toLowerCase().replace("!", "")) || n.includes(s.slug)) ??
    null
  );
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
