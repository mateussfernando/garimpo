import { eq } from "drizzle-orm";
import { STORES, storeForUrl } from "@/config/stores";
import { db, schema } from "@/lib/db";
import { anchors, ldProduct, meta, nextData, stripTags } from "../http/html";
import { PausedError, RobotsError, politeFetch } from "../http/polite";
import { touchesAnyAlvo } from "../match/alvos";
import { activeAlvos, ingestRaw, setSourceStatus } from "../pipeline";
import { COMMUNITIES, type Community } from "./communities-config";

export type ListItem = { url: string; title: string };

/** Links de posts de oferta na página da lista, com o título mais completo de cada um. */
export function listItems(html: string, c: Community): ListItem[] {
  const byUrl = new Map<string, string>();
  for (const a of anchors(html, c.url)) {
    let u: URL;
    try {
      u = new URL(a.href);
    } catch {
      continue;
    }
    if (u.hostname !== new URL(c.url).hostname || !c.dealPath.test(u.pathname)) continue;
    const key = u.origin + u.pathname;
    const prev = byUrl.get(key) ?? "";
    if (a.text.length > prev.length) byUrl.set(key, a.text);
  }
  // Sites em Next.js: títulos também podem vir no __NEXT_DATA__.
  const data = nextData(html);
  if (data) {
    for (const { title, path } of walkDeals(data)) {
      try {
        const u = new URL(path, c.url);
        if (!c.dealPath.test(u.pathname)) continue;
        const key = u.origin + u.pathname;
        if (!byUrl.get(key) || byUrl.get(key)!.length < title.length) byUrl.set(key, title);
      } catch {
        /* caminho inválido */
      }
    }
  }
  return [...byUrl.entries()].map(([url, title]) => ({ url, title })).filter((i) => i.title.length >= 6);
}

/** Procura objetos com título e caminho/slug de oferta dentro de um JSON qualquer. */
function* walkDeals(node: unknown, depth = 0): Generator<{ title: string; path: string }> {
  if (!node || typeof node !== "object" || depth > 12) return;
  if (Array.isArray(node)) {
    for (const n of node) yield* walkDeals(n, depth + 1);
    return;
  }
  const o = node as Record<string, unknown>;
  const title = [o.title, o.name, o.offerTitle].find((v) => typeof v === "string") as string | undefined;
  const path = [o.url, o.path, o.href, o.link, o.offerUrl].find((v) => typeof v === "string" && v.includes("/")) as string | undefined;
  if (title && path) yield { title, path };
  for (const v of Object.values(o)) yield* walkDeals(v, depth + 1);
}

export type DealPage = { title: string; text: string; outboundUrl: string | null; imageUrl: string | null; storeName: string | null };

/** Lê o post: título, texto com preço, link para a loja e foto. */
export function readDealPage(html: string, pageUrl: string, c: Community, fallbackTitle: string): DealPage {
  const ogTitle = meta(html, "og:title");
  const ogDesc = meta(html, "og:description") ?? meta(html, "description") ?? "";
  const image = meta(html, "og:image");
  const ld = ldProduct(html);
  const title = (ogTitle ?? ld?.name ?? fallbackTitle).replace(/\s*[|–-]\s*(Promobit|Pelando|Hardmob).*$/i, "").trim();

  // Botão para a loja: link direto para loja conhecida, ou o redirecionador da comunidade.
  let outboundUrl: string | null = null;
  const all = anchors(html, pageUrl);
  const direct = all.find((a) => storeForUrl(a.href));
  const ob = c.outbound;
  const viaButton = ob ? all.find((a) => ob.text.test(a.text) || ob.path.test(new URL(a.href).pathname)) : undefined;
  outboundUrl = (viaButton ?? direct)?.href ?? null;

  const body = stripTags(html);
  const priceBits = body.match(/[^\n]{0,80}R\$\s?[\d.,]+[^\n]{0,80}/g)?.slice(0, 6).join("\n") ?? "";
  const storeName = STORES.find((s) => new RegExp(`\\b${s.name.replace(/[!.]/g, "")}\\b`, "i").test(ogDesc + " " + priceBits))?.name ?? ld?.seller ?? null;
  const text = [title, ogDesc, priceBits].filter(Boolean).join("\n");
  return { title, text, outboundUrl, imageUrl: image ?? ld?.image ?? null, storeName };
}

async function sourceId(slug: string): Promise<number | null> {
  const [s] = await db.select({ id: schema.sources.id, enabled: schema.sources.enabled }).from(schema.sources).where(eq(schema.sources.slug, slug));
  return s?.enabled ? s.id : null;
}

export async function collectCommunity(c: Community): Promise<{ found: number; relevant: number; added: number }> {
  const id = await sourceId(c.slug);
  if (!id) return { found: 0, relevant: 0, added: 0 };
  try {
    const list = await politeFetch(c.url);
    if (list.status >= 400) {
      await setSourceStatus(c.slug, "erro", `a página respondeu ${list.status}`);
      return { found: 0, relevant: 0, added: 0 };
    }
    const alvos = await activeAlvos();
    const items = listItems(list.body, c);
    // Pré-filtro sem IA: só abre o post se o título toca um Alvo.
    const relevant = items.filter((i) => touchesAnyAlvo(i.title, alvos));
    let added = 0;
    for (const item of relevant.slice(0, 15)) {
      const seen = await db
        .select({ id: schema.rawMessages.id })
        .from(schema.rawMessages)
        .where(eq(schema.rawMessages.externalId, item.url))
        .limit(1);
      if (seen.length) continue;
      try {
        const page = await politeFetch(item.url);
        const deal = readDealPage(page.body, item.url, c, item.title);
        const offerId = await ingestRaw({
          sourceId: id,
          externalId: item.url,
          title: deal.title || item.title,
          text: deal.text || item.title,
          url: item.url,
          outboundUrl: deal.outboundUrl,
          imageUrl: deal.imageUrl,
          storeName: deal.storeName,
        });
        if (offerId) added++;
      } catch (err) {
        if (err instanceof PausedError) throw err;
        if (!(err instanceof RobotsError)) console.warn(`[${c.slug}] post falhou: ${item.url}: ${(err as Error).message}`);
      }
    }
    await setSourceStatus(c.slug, "ok", `${items.length} posts na lista, ${relevant.length} tocam seus Alvos, ${added} novos`);
    return { found: items.length, relevant: relevant.length, added };
  } catch (err) {
    if (err instanceof RobotsError) await setSourceStatus(c.slug, "bloqueada", "o robots.txt do site não permite");
    else if (err instanceof PausedError) await setSourceStatus(c.slug, "pausada", err.message);
    else await setSourceStatus(c.slug, "erro", (err as Error).message.slice(0, 200));
    return { found: 0, relevant: 0, added: 0 };
  }
}

export async function collectAll() {
  // Comunidades em paralelo: cada uma tem a própria fila de domínio.
  const results = await Promise.all(COMMUNITIES.map(async (c) => [c.slug, await collectCommunity(c)] as const));
  for (const [slug, r] of results) console.log(`[coleta] ${slug}: ${r.found} posts, ${r.relevant} nos Alvos, ${r.added} novos`);
}
