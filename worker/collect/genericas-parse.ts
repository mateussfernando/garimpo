// Leitores das fontes da tela Fontes, sem rede e sem banco: feed RSS/Atom, página com dados de oferta e busca VTEX.
import type { FeedConfig, VtexConfig } from "@/config/fontes";
import { isShortener, storeForUrl } from "@/config/stores";
import { parseBRL } from "@/lib/money";
import { decodeEntities, jsonLd, nextData, stripTags } from "../http/html";
import type { VitrineProduct } from "./vitrines";

export const brl = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** Uma oferta lida de um feed ou de uma página, antes de virar mensagem crua. */
export type DealItem = {
  key: string;
  title: string;
  /** Link do post (ou da loja, se a fonte só tiver esse). */
  url: string;
  /** Link da loja (direto ou encurtador conhecido), se houver. */
  outboundUrl: string | null;
  priceCents: number | null;
  oldCents: number | null;
  imageUrl: string | null;
  storeName: string | null;
  /** Texto para o parser: título, preço, frete, cupom. */
  text: string;
};

const storeLink = (u: string | null | undefined): string | null => {
  if (!u) return null;
  try {
    new URL(u);
  } catch {
    return null;
  }
  return storeForUrl(u) || isShortener(u) ? u : null;
};

// ---------- Feed RSS / Atom ----------

const tag = (xml: string, name: string): string | null => {
  const m = xml.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, "i"));
  if (!m) return null;
  return m[1].replace(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/, "$1").trim();
};

/** Itens de um feed RSS ou Atom. O corpo do post vira texto, e o primeiro link de loja vira o link de compra. */
export function parseFeed(xml: string, cfg: Pick<FeedConfig, "pathFilter">): DealItem[] {
  const blocks = [...xml.matchAll(/<item\b[\s\S]*?<\/item>/gi), ...xml.matchAll(/<entry\b[\s\S]*?<\/entry>/gi)].map((m) => m[0]);
  const out: DealItem[] = [];
  for (const b of blocks) {
    const title = decodeEntities(stripTags(tag(b, "title") ?? "")).trim();
    const link = decodeEntities(tag(b, "link") || b.match(/<link[^>]+href=["']([^"']+)["']/i)?.[1] || "").trim();
    if (!title || !/^https?:\/\//.test(link)) continue;
    if (cfg.pathFilter && !link.includes(cfg.pathFilter)) continue;
    // O corpo pode vir escapado (&lt;p&gt;) ou em CDATA.
    const raw = tag(b, "content:encoded") ?? tag(b, "content") ?? tag(b, "description") ?? tag(b, "summary") ?? "";
    const html = /&lt;/.test(raw) ? decodeEntities(raw) : raw;
    const hrefs = [...html.matchAll(/href=["']([^"']+)["']/gi)].map((m) => decodeEntities(m[1]));
    const outboundUrl = hrefs.map(storeLink).find(Boolean) ?? null;
    const imageUrl =
      b.match(/<(?:media:content|media:thumbnail|enclosure)[^>]+url=["']([^"']+)["']/i)?.[1] ?? html.match(/<img[^>]+src=["']([^"']+)["']/i)?.[1] ?? null;
    const body = stripTags(html).replace(/\s+/g, " ").trim().slice(0, 900);
    const guid = tag(b, "guid") ?? tag(b, "id") ?? link;
    out.push({ key: decodeEntities(guid), title, url: link, outboundUrl, priceCents: null, oldCents: null, imageUrl, storeName: null, text: [title, body].filter(Boolean).join("\n") });
  }
  return out;
}

// ---------- Página de ofertas (dados na própria página) ----------

const TITLE_KEYS = ["title", "name", "productName", "nome", "titulo"];
const PRICE_KEYS = ["price", "Price", "lowPrice", "preco", "salePrice", "bestPrice", "currentPrice"];
const OLD_KEYS = ["old_price", "oldPrice", "listPrice", "ListPrice", "highPrice", "priceFrom", "price_old", "originalPrice"];
const URL_KEYS = ["long_url", "short_url", "url", "link", "href", "offerUrl", "deeplink", "permalink"];
const IMAGE_KEYS = ["image", "imageUrl", "image_url", "thumbnail", "thumb", "picture"];

/** Preço em reais (número ou texto "R$ 1.299,90" / "51.03") -> centavos. */
export function reais(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) && v > 0 ? Math.round(v * 100) : null;
  if (typeof v !== "string") return null;
  const s = v.replace(/R\$|\s/g, "");
  return s ? parseBRL(s) : null;
}

const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);

function priceOf(o: Record<string, unknown>, keys: string[]): number | null {
  for (const k of keys) {
    const c = reais(o[k]);
    if (c) return c;
  }
  // JSON-LD: o preço fica em offers (objeto ou lista).
  const offers = o.offers;
  const first = Array.isArray(offers) ? offers[0] : offers;
  if (first && typeof first === "object") {
    for (const k of keys) {
      const c = reais((first as Record<string, unknown>)[k]);
      if (c) return c;
    }
  }
  return null;
}

function urlsOf(o: Record<string, unknown>, base: string): string[] {
  const out: string[] = [];
  const push = (v: unknown) => {
    const s = str(v);
    if (!s || s.startsWith("data:")) return;
    try {
      out.push(new URL(s, base).toString());
    } catch {
      /* inválido */
    }
  };
  for (const k of URL_KEYS) push(o[k]);
  const offers = o.offers;
  const first = Array.isArray(offers) ? offers[0] : offers;
  if (first && typeof first === "object") push((first as Record<string, unknown>).url);
  return out;
}

function imageOf(o: Record<string, unknown>): string | null {
  for (const k of IMAGE_KEYS) {
    const v = o[k];
    const s = str(v) ?? (Array.isArray(v) ? str(v[0]) : null) ?? (v && typeof v === "object" ? str((v as Record<string, unknown>).url) : null);
    if (s && /^https?:\/\//.test(s)) return s;
  }
  return null;
}

function storeNameOf(o: Record<string, unknown>): string | null {
  for (const k of ["store", "seller", "loja", "merchant", "brandStore"]) {
    const v = o[k];
    if (typeof v === "string" && v.length < 40) return v;
    if (v && typeof v === "object") {
      const n = str((v as Record<string, unknown>).name);
      if (n) return n;
    }
  }
  const offers = o.offers;
  const first = Array.isArray(offers) ? offers[0] : offers;
  const seller = first && typeof first === "object" ? (first as Record<string, unknown>).seller : null;
  return seller && typeof seller === "object" ? str((seller as Record<string, unknown>).name) : null;
}

/** Objeto com cara de oferta: título, preço e algum link. */
function asDeal(o: Record<string, unknown>, pageUrl: string): DealItem | null {
  const title = TITLE_KEYS.map((k) => str(o[k])).find((t) => t && t.length >= 6) ?? null;
  if (!title) return null;
  const priceCents = priceOf(o, PRICE_KEYS);
  if (!priceCents) return null;
  const urls = urlsOf(o, pageUrl);
  if (!urls.length) return null;
  const outboundUrl = urls.map(storeLink).find(Boolean) ?? null;
  const host = new URL(pageUrl).hostname;
  // Link do post na própria fonte, se houver; senão, o da loja.
  const post = urls.find((u) => new URL(u).hostname === host && u !== pageUrl) ?? outboundUrl ?? urls[0];
  let oldCents = priceOf(o, OLD_KEYS);
  if (oldCents && oldCents <= priceCents) oldCents = null;
  const id = o.id ?? o.productId ?? o.sku ?? o.slug;
  const key = typeof id === "string" || typeof id === "number" ? `${host}:${id}` : post;
  const freight = str(o.freight) ?? str(o.frete) ?? str(o.shipping);
  const coupons = Array.isArray(o.coupons) ? o.coupons.filter((c): c is string => typeof c === "string") : str(o.coupon) ? [str(o.coupon)!] : [];
  const text = [
    title,
    `por ${brl(priceCents)}`,
    oldCents ? `de ${brl(oldCents)}` : "",
    freight && freight.length < 80 ? freight : "",
    coupons.length ? `cupom: ${coupons.slice(0, 3).join(", ")}` : "",
  ]
    .filter(Boolean)
    .join("\n");
  return { key, title, url: post, outboundUrl, priceCents, oldCents, imageUrl: imageOf(o), storeName: storeNameOf(o), text };
}

function* walk(node: unknown, pageUrl: string, depth = 0): Generator<DealItem> {
  if (!node || typeof node !== "object" || depth > 14) return;
  if (Array.isArray(node)) {
    for (const n of node) yield* walk(n, pageUrl, depth + 1);
    return;
  }
  const o = node as Record<string, unknown>;
  const d = asDeal(o, pageUrl);
  if (d) {
    yield d;
    return; // dentro da oferta não há outra
  }
  for (const v of Object.values(o)) {
    // O KaBuM! e outros guardam JSON dentro de texto.
    if (typeof v === "string" && v.length > 50 && (v.startsWith("{") || v.startsWith("["))) {
      try {
        yield* walk(JSON.parse(v), pageUrl, depth + 1);
      } catch {
        /* não era JSON */
      }
    } else yield* walk(v, pageUrl, depth + 1);
  }
}

/** Ofertas que a página traz nos próprios dados: __NEXT_DATA__, JSON-LD e outros blocos de JSON. */
export function parseDataPage(html: string, pageUrl: string): DealItem[] {
  const roots: unknown[] = [nextData(html), ...jsonLd(html)];
  for (const m of html.matchAll(/<script[^>]+type=["']application\/json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    if (/id=["']__NEXT_DATA__["']/i.test(m[0])) continue;
    try {
      roots.push(JSON.parse(m[1]));
    } catch {
      /* ignora */
    }
  }
  const byKey = new Map<string, DealItem>();
  for (const r of roots) for (const d of walk(r, pageUrl)) if (!byKey.has(d.key)) byKey.set(d.key, d);
  return [...byKey.values()];
}

// ---------- Busca em loja VTEX ----------

type VtexInstallment = { PaymentSystemName?: string; NumberOfInstallments?: number; Value?: number; InterestRate?: number; TotalValuePlusInterestRate?: number };
type VtexSeller = { sellerName?: string; sellerDefault?: boolean; commertialOffer?: { Price?: number; ListPrice?: number; AvailableQuantity?: number; Installments?: VtexInstallment[] } };
type VtexProduct = { productId?: string; productName?: string; link?: string; items?: { images?: { imageUrl?: string }[]; sellers?: VtexSeller[] }[] };

/**
 * Produtos da busca pública da VTEX. Total no cartão = o maior número de parcelas SEM juros (cartão, não boleto/pix).
 * Só o vendedor padrão (ou o pedido em `seller`) e só o que tem estoque.
 */
export function parseVtex(json: string, cfg: Pick<VtexConfig, "seller">): VitrineProduct[] {
  let list: VtexProduct[];
  try {
    list = JSON.parse(json);
  } catch {
    return [];
  }
  if (!Array.isArray(list)) return [];
  const out: VitrineProduct[] = [];
  const want = cfg.seller.trim().toLowerCase();
  for (const p of list) {
    if (!p?.productId || !p.productName || !p.link) continue;
    for (const item of p.items ?? []) {
      const seller = (item.sellers ?? []).find((s) => (want ? (s.sellerName ?? "").toLowerCase().includes(want) : s.sellerDefault)) ?? null;
      const co = seller?.commertialOffer;
      if (!co?.Price || !co.AvailableQuantity) continue;
      const card = (co.Installments ?? []).filter((i) => (i.InterestRate ?? 0) === 0 && !/boleto|pix/i.test(i.PaymentSystemName ?? "") && i.NumberOfInstallments && i.Value);
      const best = card.sort((a, b) => b.NumberOfInstallments! - a.NumberOfInstallments!)[0];
      const each = best ? Math.round(best.Value! * 100) : null;
      const installmentText = best && best.NumberOfInstallments! > 1 ? `${best.NumberOfInstallments}x de ${brl(each!)}` : null;
      const priceCents = Math.round(co.Price * 100);
      out.push({
        code: String(p.productId),
        name: p.productName,
        url: p.link,
        imageUrl: item.images?.[0]?.imageUrl ?? null,
        cashCents: priceCents,
        priceCents,
        oldCents: co.ListPrice && co.ListPrice > co.Price ? Math.round(co.ListPrice * 100) : null,
        installmentText,
        liveCardCents: best ? Math.round((best.TotalValuePlusInterestRate ?? best.Value! * best.NumberOfInstallments!) * 100) : priceCents,
      });
      break; // um item (SKU) por produto basta
    }
  }
  return out;
}

