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
};

export const STORES: Store[] = [
  {
    slug: "kabum",
    name: "KaBuM!",
    domains: ["kabum.com.br"],
    trust: 1,
    productId: (u) => u.pathname.match(/\/produto\/(\d+)/)?.[1] ?? null,
  },
  {
    slug: "pichau",
    name: "Pichau",
    domains: ["pichau.com.br"],
    trust: 1,
    productId: (u) => u.pathname.split("/").filter(Boolean).pop() ?? null,
  },
  {
    slug: "terabyte",
    name: "Terabyte",
    domains: ["terabyteshop.com.br"],
    trust: 1,
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

const SHORTENERS = ["amzn.to", "a.co", "bit.ly", "tinyurl.com", "s.click.aliexpress.com", "mercadolivre.com/sec", "compre.vc", "oferta.vc", "is.gd", "t.co"];

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

/** Tira parâmetros de rastreio/afiliado e o fragmento. */
export function cleanUrl(url: string): string {
  try {
    const u = new URL(url);
    u.hash = "";
    const drop = [/^utm_/i, /^tag$/i, /^ref/i, /^aff/i, /^gclid$/i, /^fbclid$/i, /^matt_/i, /^partner/i, /^pdp_/i, /^sc_/i, /^spm$/i, /^ascsub/i, /^linkCode$/i, /^camp$/i, /^creative/i];
    for (const key of [...u.searchParams.keys()]) {
      if (drop.some((re) => re.test(key))) u.searchParams.delete(key);
    }
    return u.toString();
  } catch {
    return url;
  }
}
