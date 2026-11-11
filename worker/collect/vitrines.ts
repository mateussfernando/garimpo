// Vitrines de ofertas das lojas: páginas de categoria que a própria loja publica e o robots.txt permite.
// Hoje só o KaBuM! tem os produtos dentro do HTML (dados da página, em __NEXT_DATA__). Pichau, Terabyte, Magalu,
// Casas Bahia e Mercado Livre respondem 403 ou pedem verificação de conta a robôs; a Amazon monta tudo por JavaScript.
// Bloqueio não se contorna: essas lojas continuam sendo conferidas só quando uma oferta chega por outra fonte.
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { nextData } from "../http/html";
import { PausedError, RobotsError, politeFetch } from "../http/polite";
import { touchesAnyAlvo } from "../match/alvos";
import { activeAlvos, ingestRaw, setSourceStatus } from "../pipeline";
import { VITRINES } from "./vitrines-config";

export type VitrineProduct = {
  code: string;
  name: string;
  url: string;
  imageUrl: string | null;
  /** Preço à vista (pix), em centavos. */
  cashCents: number | null;
  /** Preço cheio atual, em centavos. */
  priceCents: number | null;
  /** Preço antigo ("de"), em centavos. */
  oldCents: number | null;
  installmentText: string | null;
};

const cents = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) && v > 0 ? Math.round(v * 100) : null);

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
    out.push({
      code: String(p.code),
      name: p.name,
      url: `https://www.kabum.com.br/produto/${p.code}/${p.friendlyName}`,
      imageUrl: typeof p.image === "string" ? p.image : null,
      cashCents: cents(p.priceWithDiscount),
      priceCents: cents(p.price),
      oldCents: cents(p.oldPrice),
      installmentText: typeof p.maxInstallment === "string" ? p.maxInstallment : null,
    });
  }
  return out;
}

const brl = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** Oferta de verdade: o preço atual está pelo menos 10% abaixo do "de". */
export function isDeal(p: VitrineProduct, minDiscount = 0.1): boolean {
  const now = p.cashCents ?? p.priceCents;
  return !!(now && p.oldCents && now <= p.oldCents * (1 - minDiscount));
}

export function textFor(p: VitrineProduct): string {
  const now = p.cashCents ?? p.priceCents;
  return [p.name, now ? `por ${brl(now)} à vista` : "", p.oldCents ? `de ${brl(p.oldCents)}` : "", p.installmentText ?? ""].filter(Boolean).join("\n");
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
    try {
      const alvos = await activeAlvos();
      for (const page of v.pages) {
        const res = await politeFetch(page.url, { ttlMs: 30 * 60 * 1000 });
        if (res.status >= 400) {
          await setSourceStatus(v.slug, "erro", `${page.label} respondeu ${res.status}`);
          continue;
        }
        const products = v.parse(res.body);
        found += products.length;
        const picks = products.filter((p) => isDeal(p) && touchesAnyAlvo(p.name, alvos)).slice(0, 12);
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
      await setSourceStatus(v.slug, "ok", `${found} produtos nas categorias, ${relevant} em oferta e nos seus Alvos, ${added} novos`);
      console.log(`[vitrine] ${v.slug}: ${found} produtos, ${relevant} em oferta nos Alvos, ${added} novos`);
    } catch (err) {
      if (err instanceof RobotsError) await setSourceStatus(v.slug, "bloqueada", "o robots.txt do site não permite");
      else if (err instanceof PausedError) await setSourceStatus(v.slug, "pausada", err.message);
      else await setSourceStatus(v.slug, "erro", (err as Error).message.slice(0, 200));
    }
  }
}
