import { and, desc, eq, gte, sql } from "drizzle-orm";
import { groupReason } from "@/config/telegram-filter";
import { db, schema } from "@/lib/db";

const { sources, offers, invites } = schema;

export type FonteState = "confirmada" | "sugerida" | "pausada" | "ignorada";

export type FonteDTO = {
  id: number;
  name: string;
  kind: "telegram" | "comunidade" | "loja";
  where: string;
  perDay: number;
  hitPct: number | null;
  state: FonteState;
  why: string;
  status: string;
  statusNote: string | null;
  /** Só fontes ao vivo (Telegram): o que foi lido hoje e quando chegou a última mensagem. */
  stats: { read: number; withLink: number; touched: number; offers: number } | null;
  lastMessageAt: string | null;
};

export type FontesDTO = {
  fontes: FonteDTO[];
  telegram: { hasSession: boolean; connected: boolean; on: number; total: number; lastScan: string | null };
  web: { active: number; names: string[] };
  invites: { link: string; kind: string; mentions: number; lastSeenAt: string; fromSource: string | null }[];
};

export function stateOf(s: { enabled: boolean; decision: string | null }): FonteState {
  if (s.enabled) return "confirmada";
  if (s.decision === "pausada") return "pausada";
  if (s.decision === "ignorada") return "ignorada";
  return "sugerida";
}

export async function getFontes(): Promise<FontesDTO> {
  const all = await db.select().from(sources).orderBy(sources.id);
  const stats = await db
    .select({
      sourceId: offers.sourceId,
      perDay: sql<number>`count(*) filter (where ${offers.createdAt} >= now() - interval '24 hours')::int`,
      ok: sql<number>`count(*) filter (where ${offers.verifyStatus} = 'verificado')::int`,
      tried: sql<number>`count(*) filter (where ${offers.verifyStatus} in ('verificado','nao_verificado'))::int`,
    })
    .from(offers)
    .groupBy(offers.sourceId);
  const byId = new Map(stats.map((s) => [s.sourceId, s]));

  const fontes: FonteDTO[] = all
    .filter((s) => s.kind === "telegram" || s.kind === "comunidade" || s.kind === "loja")
    .map((s) => {
      const st = byId.get(s.id);
      return {
        id: s.id,
        name: s.name,
        kind: s.kind as FonteDTO["kind"],
        where: s.kind === "telegram" ? (s.url.startsWith("https://t.me/") ? "Telegram · canal" : "Telegram · grupo") : s.kind === "loja" ? "Vitrine da loja" : "Comunidade na web",
        perDay: st?.perDay ?? 0,
        hitPct: st && st.tried >= 3 ? Math.round((st.ok / st.tried) * 100) : null,
        state: stateOf(s),
        why: s.kind === "telegram" ? groupReason(s.name) : s.kind === "loja" ? "Categorias dos seus Alvos, só produtos com 10% ou mais de desconto" : "Página pública de ofertas, lida com coleta educada",
        status: s.status,
        statusNote: s.statusNote,
        stats: s.stats ? { read: s.stats.read, withLink: s.stats.withLink, touched: s.stats.touched, offers: s.stats.offers } : null,
        lastMessageAt: s.lastMessageAt?.toISOString() ?? null,
      };
    });

  const tg = all.filter((s) => s.kind === "telegram");
  const lastScan = tg.map((s) => s.lastRunAt?.getTime() ?? 0).reduce((a, b) => Math.max(a, b), 0);
  const web = all.filter((s) => s.kind === "comunidade" && s.enabled);

  const inv = await db
    .select()
    .from(invites)
    .where(and(eq(invites.dismissed, false), gte(invites.lastSeenAt, sql`now() - interval '14 days'`)))
    .orderBy(desc(invites.mentions), desc(invites.lastSeenAt))
    .limit(8);

  return {
    fontes,
    telegram: {
      hasSession: !!process.env.TELEGRAM_SESSION,
      connected: lastScan > Date.now() - 3 * 60 * 1000,
      on: tg.filter((s) => s.enabled).length,
      total: tg.length,
      lastScan: lastScan ? new Date(lastScan).toISOString() : null,
    },
    web: { active: web.length, names: web.map((s) => s.name.replace("Fórum de Promoções do ", "")) },
    invites: inv.map((i) => ({ link: i.link, kind: i.kind, mentions: i.mentions, lastSeenAt: i.lastSeenAt.toISOString(), fromSource: i.fromSource })),
  };
}
