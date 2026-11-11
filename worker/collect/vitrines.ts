// Vitrines de ofertas das lojas: páginas de categoria que a própria loja publica e o robots.txt permite.
// Hoje só o KaBuM! tem os produtos dentro do HTML (dados da página, em __NEXT_DATA__). Pichau, Terabyte, Magalu,
// Casas Bahia e Mercado Livre respondem 403 ou pedem verificação de conta a robôs; a Amazon monta tudo por JavaScript.
// Bloqueio não se contorna: essas lojas continuam sendo conferidas só quando uma oferta chega por outra fonte.
//
// Conferido em 10/11/2026 contra páginas de produto: na listagem do KaBuM!, os campos de preço são os de ANTES da
// campanha, e só o texto de parcelas ("10x de R$ 111,76") reflete o preço do dia. Por isso o preço vivo vem das parcelas.
import { eq } from "drizzle-orm";
import { parseBRL } from "@/lib/money";
import { db, schema } from "@/lib/db";
import { nextData } from "../http/html";
import { PausedError, RobotsError, politeFetch } from "../http/polite";
import { activeAlvos, classify, ingestRaw, refreshRef, setSourceStatus } from "../pipeline";
import { VITRINES } from "./vitrines-config";

export type VitrineProduct = {
  code: string;
  name: string;
  url: string;
  imageUrl: string | null;
  /** Preço à vista (pix) da listagem, em centavos. Pode ser o de antes da campanha. */
  cashCents: number | null;
  /** Preço cheio da listagem, em centavos. Pode ser o de antes da campanha. */
  priceCents: number | null;
  /** Preço antigo ("de"), em centavos. */
  oldCents: number | null;
  installmentText: string | null;
  /** Total no cartão hoje, tirado do texto de parcelas (N x valor). */
  liveCardCents?: number | null;
};

const cents = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) && v > 0 ? Math.round(v * 100) : null);

/** "10x de R$ 111,76" -> 111760. */
export function totalFromInstallments(text: string | null): number | null {
  const m = text?.match(/(\d{1,2})\s*x\s*(?:de\s*)?R\$\s*([\d.]+,\d{2})/i);
  if (!m) return null;
  const each = parseBRL(m[2]);
  return each ? Number(m[1]) * each : null;
}

/** Lê os produtos que o KaBuM! manda dentro do HTML da página de categoria. */
export function parseKabum(html: string): VitrineProduct[] {
  const data = nextData(html) as { props?: { pageProps?: { data?: unknown } } } | null;
  const raw = data?.props?.pageProps?.data;
  let catalog: { catalogServer?: { data?: unknown } } | null = null;
  try {
    catalog = typeof raw === "string" ? JSON.parse(raw) : (raw as typeof catalog);
  } catch {
    return [];
  }
  const list = catalog?.catalogServer?.data;
  if (!Array.isArray(list)) return [];
  const out: VitrineProduct[] = [];
  for (const p of list as Record<string, unknown>[]) {
    if (!p || typeof p.name !== "string" || p.code == null || typeof p.friendlyName !== "string") continue;
    // Marketplace de terceiros fica de fora: a confiança da loja própria é o ponto.
    if (typeof p.sellerName === "string" && p.sellerName && !/kabum/i.test(p.sellerName)) continue;
    const installmentText = typeof p.maxInstallment === "string" ? p.maxInstallment : null;
    out.push({
      code: String(p.code),
      name: p.name,
      url: `https://www.kabum.com.br/produto/${p.code}/${p.friendlyName}`,
      imageUrl: typeof p.image === "string" ? p.image : null,
      cashCents: cents(p.priceWithDiscount),
      priceCents: cents(p.price),
      oldCents: cents(p.oldPrice),
      installmentText,
      liveCardCents: totalFromInstallments(installmentText),
    });
  }
  return out;
}

const brl = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** Preço no cartão de hoje: o das parcelas quando existe; senão, o cheio da listagem. */
export const cardNow = (p: VitrineProduct): number | null => p.liveCardCents ?? p.priceCents ?? p.cashCents;

/** Desconto de hoje contra o preço "de" (0 a 1). */
export function discountOf(p: VitrineProduct): number {
  const now = cardNow(p);
  return now && p.oldCents && now < p.oldCents ? 1 - now / p.oldCents : 0;
}

/** Oferta de verdade: o preço no cartão de hoje está pelo menos 10% abaixo do "de". */
export function isDeal(p: VitrineProduct, minDiscount = 0.1): boolean {
  return discountOf(p) >= minDiscount - 1e-9;
}

export function textFor(p: VitrineProduct): string {
  const now = cardNow(p);
  const priceLine = p.liveCardCents && p.installmentText ? `${p.installmentText} sem juros` : now ? `por ${brl(now)}` : "";
  return [p.name, priceLine, p.oldCents ? `de ${brl(p.oldCents)}` : ""].filter(Boolean).join("\n");
}

async function sourceOf(slug: string) {
  const [s] = await db.select().from(schema.sources).where(eq(schema.sources.slug, slug));
  return s?.enabled ? s : null;
}

export async function collectVitrines(): Promise<void> {
  for (const v of VITRINES) {
    const src = await sourceOf(v.slug);
    if (!src) continue;
    let found = 0;
    let relevant = 0;
    let added = 0;
    let market = 0;
    try {
      const alvos = await activeAlvos();
      const storeSlug = v.slug.replace(/-vitrine$/, "");
      const touchedBands = new Map<string, { alvoId: number; key: string; label: string }>();
      for (const page of v.pages) {
        const res = await politeFetch(page.url, { ttlMs: 30 * 60 * 1000 });
        if (res.status >= 400) {
          await setSourceStatus(v.slug, "erro", `${page.label} respondeu ${res.status}`);
          continue;
        }
        const products = v.parse(res.body);
        found += products.length;

        // Todo produto da categoria que cai num Alvo vira um preço de mercado: é a base da mediana da faixa.
        const classified = products.map((p) => ({ p, c: classify(p.name, alvos) })).filter((x) => x.c.alvo);
        for (const { p, c } of classified) {
          const price = cardNow(p);
          if (!c.band || !price) continue;
          await db
            .insert(schema.marketObs)
            .values({ store: storeSlug, code: p.code, alvoId: c.alvo!.id, bandKey: c.band.key, title: p.name.slice(0, 200), priceCardCents: price })
            .onConflictDoUpdate({
              target: [schema.marketObs.store, schema.marketObs.code],
              set: { alvoId: c.alvo!.id, bandKey: c.band.key, priceCardCents: price, seenAt: new Date() },
            });
          touchedBands.set(`${c.alvo!.id}:${c.band.key}`, { alvoId: c.alvo!.id, key: c.band.key, label: c.band.label });
          market++;
        }

        // Viram oferta só as de verdade (10% ou mais abaixo do "de"), as maiores quedas primeiro.
        const picks = classified
          .map((x) => x.p)
          .filter((p) => isDeal(p))
          .sort((a, b) => discountOf(b) - discountOf(a))
          .slice(0, 15);
        relevant += picks.length;
        for (const p of picks) {
          const id = await ingestRaw({
            sourceId: src.id,
            externalId: p.url,
            title: p.name,
            text: textFor(p),
            url: p.url,
            outboundUrl: p.url,
            imageUrl: p.imageUrl,
            storeName: v.storeName,
          });
          if (id) added++;
        }
      }
      for (const b of touchedBands.values()) await refreshRef(b.alvoId, b.key, b.label);
      await setSourceStatus(v.slug, "ok", `${found} produtos nas categorias, ${market} viraram preço de mercado, ${relevant} em oferta nos seus Alvos, ${added} novos`);
      console.log(`[vitrine] ${v.slug}: ${found} produtos, ${market} preços de mercado, ${relevant} em oferta nos Alvos, ${added} novos`);
    } catch (err) {
      if (err instanceof RobotsError) await setSourceStatus(v.slug, "bloqueada", "o robots.txt do site não permite");
      else if (err instanceof PausedError) await setSourceStatus(v.slug, "pausada", err.message);
      else await setSourceStatus(v.slug, "erro", (err as Error).message.slice(0, 200));
    }
  }
}
