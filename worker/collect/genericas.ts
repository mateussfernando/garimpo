// Fontes da tela Fontes: feed RSS, página de ofertas (dados na própria página) e busca em loja VTEX.
// Tudo com coleta educada (politeFetch: robots.txt, fila por domínio, pausa em 429/403/503). Sem navegador.
import { CONFIG_SCHEMA, DEFAULT_INTERVAL_MIN, type FeedConfig, type FonteKind, type PaginaConfig, type VtexConfig } from "@/config/fontes";
import { storeForUrl } from "@/config/stores";
import type { Source } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";
import { PausedError, RobotsError, politeFetch } from "../http/polite";
import { parseDataPage, parseFeed, parseVtex, type DealItem } from "./genericas-parse";
import { alvosDoSistema, ingestRaw, setSourceStatus } from "../pipeline";
import { ingestStoreProducts, refreshTouched, type TouchedBands } from "./vitrines";

const vtexSearch = (cfg: VtexConfig, term: string) => `${cfg.url.replace(/\/+$/, "")}/api/catalog_system/pub/products/search?ft=${encodeURIComponent(term)}&_from=0&_to=23`;

/** Termos da busca: os da fonte; se vazio, o primeiro termo de cada Alvo ligado. */
async function vtexTerms(cfg: VtexConfig): Promise<string[]> {
  if (cfg.terms.length) return cfg.terms;
  return (await alvosDoSistema()).map((a) => a.terms[0]).filter(Boolean);
}

// ---------- Coleta ----------

const KINDS: FonteKind[] = ["feed", "pagina", "vtex"];

function configOf(s: Source) {
  const kind = s.kind as FonteKind;
  return CONFIG_SCHEMA[kind].parse(s.config ?? {});
}

async function ingestDeals(src: Source, items: DealItem[], limit: number): Promise<number> {
  let added = 0;
  for (const d of items.slice(0, limit)) {
    const id = await ingestRaw({
      sourceId: src.id,
      externalId: d.key,
      title: d.title,
      text: d.text,
      url: d.url,
      outboundUrl: d.outboundUrl,
      imageUrl: d.imageUrl,
      storeName: d.storeName,
    });
    if (id) added++;
  }
  return added;
}

/** Lê uma fonte da tela Fontes e grava o que for novo. */
export async function collectOne(src: Source): Promise<void> {
  try {
    const kind = src.kind as FonteKind;
    if (kind === "feed") {
      const cfg = configOf(src) as FeedConfig;
      const res = await politeFetch(cfg.url, { ttlMs: 5 * 60 * 1000 });
      if (res.status >= 400) return void (await setSourceStatus(src.slug, "erro", `o feed respondeu ${res.status}`));
      const items = parseFeed(res.body, cfg);
      const added = await ingestDeals(src, items, 30);
      await setSourceStatus(src.slug, "ok", `${items.length} itens no feed, ${added} novos`);
    } else if (kind === "pagina") {
      const cfg = configOf(src) as PaginaConfig;
      let found = 0;
      let added = 0;
      for (const u of cfg.urls) {
        const res = await politeFetch(u, { ttlMs: 2 * 60 * 1000 });
        if (res.status >= 400) {
          await setSourceStatus(src.slug, "erro", `${new URL(u).pathname} respondeu ${res.status}`);
          continue;
        }
        const items = parseDataPage(res.body, u);
        found += items.length;
        added += await ingestDeals(src, items, 30);
      }
      await setSourceStatus(src.slug, found ? "ok" : "erro", found ? `${found} ofertas nas páginas, ${added} novas` : "nenhuma oferta nos dados da página (o site pode ter mudado)");
    } else if (kind === "vtex") {
      const cfg = configOf(src) as VtexConfig;
      const store = storeForUrl(cfg.url);
      if (!store) return void (await setSourceStatus(src.slug, "erro", "loja fora de config/stores.ts: as ofertas seriam suspeitas"));
      const alvos = await alvosDoSistema();
      const touched: TouchedBands = new Map();
      let found = 0;
      let market = 0;
      let relevant = 0;
      let added = 0;
      for (const term of await vtexTerms(cfg)) {
        const res = await politeFetch(vtexSearch(cfg, term), { ttlMs: 60 * 60 * 1000 });
        if (res.status >= 400) continue;
        const products = parseVtex(res.body, cfg);
        found += products.length;
        const r = await ingestStoreProducts({ sourceId: src.id, storeSlug: store.slug, storeName: cfg.storeName, products, alvos, touched });
        market += r.market;
        relevant += r.relevant;
        added += r.added;
      }
      await refreshTouched(touched);
      await setSourceStatus(src.slug, "ok", `${found} produtos na busca, ${market} nos seus Alvos (preço guardado), ${relevant} com 10% ou mais de desconto, ${added} novos`);
    }
  } catch (err) {
    if (err instanceof RobotsError) await setSourceStatus(src.slug, "bloqueada", "o robots.txt do site não permite");
    else if (err instanceof PausedError) await setSourceStatus(src.slug, "pausada", err.message);
    else await setSourceStatus(src.slug, "erro", (err as Error).message.slice(0, 200));
  }
}

const running = new Set<number>();

/** Roda a cada minuto: lê cada fonte ligada cujo intervalo venceu. Fontes de domínios diferentes andam juntas. */
export async function collectConfiguradas(): Promise<void> {
  const list = await prisma.source.findMany({ where: { kind: { in: KINDS }, isActive: true, deletedAt: null } });
  const now = Date.now();
  const due = list.filter((s) => {
    if (running.has(s.id)) return false;
    const every = (s.intervalMin ?? DEFAULT_INTERVAL_MIN[s.kind as FonteKind]) * 60 * 1000;
    return !s.lastRunAt || now - s.lastRunAt.getTime() >= every;
  });
  await Promise.all(
    due.map(async (s) => {
      running.add(s.id);
      try {
        await collectOne(s);
      } finally {
        running.delete(s.id);
      }
    }),
  );
}

/** Resultado de "Testar" na tela Fontes: o que a fonte traria agora, sem gravar nada. */
export type TesteFonte = { ok: boolean; note: string; total: number; items: { title: string; priceCents: number | null; url: string; store: string | null }[] };

export async function testFonte(kind: FonteKind, rawConfig: unknown): Promise<TesteFonte> {
  const parsed = CONFIG_SCHEMA[kind].safeParse(rawConfig);
  if (!parsed.success) return { ok: false, note: parsed.error.issues[0]?.message ?? "configuração inválida", total: 0, items: [] };
  const show = (l: DealItem[]) => l.slice(0, 8).map((d) => ({ title: d.title, priceCents: d.priceCents, url: d.outboundUrl ?? d.url, store: storeForUrl(d.outboundUrl ?? d.url)?.name ?? d.storeName }));
  try {
    if (kind === "feed") {
      const cfg = parsed.data as FeedConfig;
      const res = await politeFetch(cfg.url, { ttlMs: 60 * 1000 });
      if (res.status >= 400) return { ok: false, note: `o feed respondeu ${res.status}`, total: 0, items: [] };
      const items = parseFeed(res.body, cfg);
      const withStore = items.filter((i) => i.outboundUrl).length;
      return { ok: items.length > 0, note: items.length ? `${items.length} itens, ${withStore} com link de loja` : "nenhum item: o endereço é mesmo de um feed RSS?", total: items.length, items: show(items) };
    }
    if (kind === "pagina") {
      const cfg = parsed.data as PaginaConfig;
      const all: DealItem[] = [];
      for (const u of cfg.urls) {
        const res = await politeFetch(u, { ttlMs: 60 * 1000 });
        if (res.status >= 400) return { ok: false, note: `${u} respondeu ${res.status}`, total: 0, items: [] };
        all.push(...parseDataPage(res.body, u));
      }
      const withStore = all.filter((i) => i.outboundUrl).length;
      return {
        ok: all.length > 0,
        note: all.length ? `${all.length} ofertas com preço, ${withStore} com link de loja` : "nenhuma oferta nos dados da página: ela pode ser montada só no navegador",
        total: all.length,
        items: show(all),
      };
    }
    const cfg = parsed.data as VtexConfig;
    if (!storeForUrl(cfg.url)) return { ok: false, note: "loja fora de config/stores.ts: peça para incluir antes (senão as ofertas ficam suspeitas)", total: 0, items: [] };
    const term = (await vtexTerms(cfg))[0] ?? "mouse";
    const res = await politeFetch(vtexSearch(cfg, term), { ttlMs: 60 * 1000 });
    if (res.status >= 400) return { ok: false, note: `a busca respondeu ${res.status}`, total: 0, items: [] };
    const products = parseVtex(res.body, cfg);
    return {
      ok: products.length > 0,
      note: products.length ? `“${term}”: ${products.length} produtos com estoque` : `“${term}”: nenhum produto (a loja é mesmo VTEX?)`,
      total: products.length,
      items: products.slice(0, 8).map((p) => ({ title: p.name, priceCents: p.liveCardCents ?? p.priceCents, url: p.url, store: cfg.storeName })),
    };
  } catch (err) {
    if (err instanceof RobotsError) return { ok: false, note: "o robots.txt do site não permite ler esse endereço", total: 0, items: [] };
    if (err instanceof PausedError) return { ok: false, note: err.message, total: 0, items: [] };
    return { ok: false, note: (err as Error).message.slice(0, 160), total: 0, items: [] };
  }
}
