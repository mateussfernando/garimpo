import { and, eq, gte, sql } from "drizzle-orm";
import { STORES, hostOf } from "@/config/stores";
import { db, schema } from "@/lib/db";

const { offers, pricePoints, products, storeState } = schema;

const FOCUS: Record<string, string> = {
  kabum: "periféricos e monitores",
  pichau: "periféricos e hardware",
  terabyte: "periféricos e hardware",
  amazon: "de tudo",
  mercadolivre: "de tudo",
  magalu: "eletrônicos",
  shopee: "acessórios",
  aliexpress: "acessórios",
  casasbahia: "eletrônicos",
  carrefour: "de tudo",
  americanas: "de tudo",
};

export type LojaDTO = {
  slug: string;
  name: string;
  site: string;
  focus: string;
  how: string;
  lastAt: string | null;
  health: "ok" | "pausada_loja" | "pausada_usuario";
  healthNote: string;
  verified: number;
};

export type LojasDTO = {
  stores: LojaDTO[];
  queue: number;
  readToday: number;
  pausesActive: number;
  suggested: { host: string; seen: number; example: string | null }[];
};

export async function getLojas(): Promise<LojasDTO> {
  const states = await db.select().from(storeState);
  const stateBy = new Map(states.map((s) => [s.slug, s]));
  const last = await db
    .select({ store: products.store, at: sql<string>`max(${pricePoints.observedAt})`, n: sql<number>`count(*)::int` })
    .from(pricePoints)
    .innerJoin(products, eq(pricePoints.productId, products.id))
    .groupBy(products.store);
  const lastBy = new Map(last.map((l) => [l.store, l]));

  const now = Date.now();
  const stores: LojaDTO[] = STORES.map((s) => {
    const st = stateBy.get(s.slug);
    const l = lastBy.get(s.slug);
    let health: LojaDTO["health"] = "ok";
    let healthNote = "respondendo normal";
    if (st?.pauseUntil && st.pauseUntil.getTime() > now) {
      health = "pausada_loja";
      healthNote = `${st.pauseNote ?? "pediu pausa"} · volta às ${st.pauseUntil.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
    } else if (st?.pausedByUser) {
      health = "pausada_usuario";
      healthNote = "fora da verificação, por você";
    }
    return {
      slug: s.slug,
      name: s.name,
      site: `https://${s.domains[0]}`,
      focus: FOCUS[s.slug] ?? "de tudo",
      how: "dados da página (JSON-LD e textos)",
      lastAt: l?.at ? new Date(l.at).toISOString() : null,
      health,
      healthNote,
      verified: l?.n ?? 0,
    };
  });

  const [{ queue }] = await db.select({ queue: sql<number>`count(*)::int` }).from(offers).where(eq(offers.verifyStatus, "pendente"));
  const [{ today }] = await db
    .select({ today: sql<number>`count(*)::int` })
    .from(pricePoints)
    .where(gte(pricePoints.observedAt, sql`date_trunc('day', now())`));

  // Lojas que aparecem nas ofertas e ainda não estão em config/stores.ts.
  const urls = await db
    .select({ url: offers.url })
    .from(offers)
    .where(and(gte(offers.createdAt, sql`now() - interval '7 days'`), sql`${offers.url} is not null`))
    .limit(1000);
  const known = new Set(STORES.flatMap((s) => s.domains));
  const count = new Map<string, { n: number; example: string | null }>();
  for (const { url } of urls) {
    const host = url ? hostOf(url) : null;
    if (!host || [...known].some((d) => host === d || host.endsWith("." + d))) continue;
    if (/pelando|promobit|gatry|hardmob|t\.me|telegram/.test(host)) continue;
    const c = count.get(host) ?? { n: 0, example: url };
    c.n++;
    count.set(host, c);
  }
  const suggested = [...count.entries()]
    .map(([host, c]) => ({ host, seen: c.n, example: c.example }))
    .sort((a, b) => b.seen - a.seen)
    .slice(0, 6);

  return {
    stores,
    queue,
    readToday: today,
    pausesActive: stores.filter((s) => s.health === "pausada_loja").length,
    suggested,
  };
}
