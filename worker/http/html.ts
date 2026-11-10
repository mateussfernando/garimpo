// Extração leve de HTML, sem dependências: metatags, JSON-LD, links e texto.

export function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));
}

export function stripTags(html: string): string {
  return decodeEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/[ \t]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .trim();
}

export function meta(html: string, name: string): string | null {
  const re1 = new RegExp(`<meta[^>]+(?:property|name)=["']${name}["'][^>]*content=["']([^"']*)["']`, "i");
  const re2 = new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${name}["']`, "i");
  const m = html.match(re1) ?? html.match(re2);
  return m ? decodeEntities(m[1]).trim() : null;
}

export function jsonLd(html: string): unknown[] {
  const out: unknown[] = [];
  for (const m of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const data = JSON.parse(m[1].trim());
      const items = Array.isArray(data) ? data : data?.["@graph"] ? data["@graph"] : [data];
      out.push(...items);
    } catch {
      /* JSON-LD quebrado: ignora */
    }
  }
  return out;
}

export function nextData(html: string): unknown | null {
  const m = html.match(/<script[^>]+id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i);
  if (!m) return null;
  try {
    return JSON.parse(m[1]);
  } catch {
    return null;
  }
}

export type LdProduct = {
  name: string | null;
  image: string | null;
  priceCents: number | null;
  availability: string | null;
  seller: string | null;
};

function toCents(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v) && v > 0) return Math.round(v * 100);
  if (typeof v === "string") {
    const n = Number(v.replace(/[^\d.,]/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", "."));
    return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : null;
  }
  return null;
}

/** Primeiro Product com Offer de preço no JSON-LD. */
export function ldProduct(html: string): LdProduct | null {
  for (const item of jsonLd(html) as Record<string, unknown>[]) {
    const type = item?.["@type"];
    const isProduct = type === "Product" || (Array.isArray(type) && type.includes("Product"));
    if (!isProduct) continue;
    const offersRaw = item.offers as unknown;
    const offers = (Array.isArray(offersRaw) ? offersRaw : [offersRaw]).filter(Boolean) as Record<string, unknown>[];
    let priceCents: number | null = null;
    let availability: string | null = null;
    let seller: string | null = null;
    for (const o of offers) {
      priceCents = toCents(o.price ?? o.lowPrice ?? (o.priceSpecification as Record<string, unknown>)?.price);
      availability = typeof o.availability === "string" ? o.availability : null;
      seller = typeof (o.seller as Record<string, unknown>)?.name === "string" ? ((o.seller as Record<string, unknown>).name as string) : null;
      if (priceCents) break;
    }
    const img = item.image;
    const image = typeof img === "string" ? img : Array.isArray(img) ? (typeof img[0] === "string" ? img[0] : (img[0] as Record<string, string>)?.url ?? null) : (img as Record<string, string>)?.url ?? null;
    return { name: typeof item.name === "string" ? item.name : null, image, priceCents, availability, seller };
  }
  return null;
}

export type Anchor = { href: string; text: string };

export function anchors(html: string, base: string): Anchor[] {
  const out: Anchor[] = [];
  for (const m of html.matchAll(/<a\b[^>]*href=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    try {
      const href = new URL(decodeEntities(m[1]), base).toString();
      const inner = m[2];
      const alt = inner.match(/alt=["']([^"']+)["']/i)?.[1] ?? "";
      const text = (stripTags(inner) || decodeEntities(alt)).replace(/\s+/g, " ").trim();
      out.push({ href, text });
    } catch {
      /* href inválido */
    }
  }
  return out;
}
