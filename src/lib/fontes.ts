import type { Prisma } from "@/generated/prisma/client";
import { CANAIS_SUGERIDOS, CONFIG_SCHEMA, DEFAULT_INTERVAL_MIN, KIND_LABEL, MIN_INTERVAL_MIN, SUGESTOES, type FonteKind } from "@/config/fontes";
import { storeForUrl } from "@/config/stores";
import { groupReason } from "@/config/telegram-filter";
import { prisma } from "@/lib/db/prisma";
import { asJson, type SourceStats } from "@/lib/db/types";
import { DIA, atras } from "@/lib/tempo";

/** A tela Fontes pede ao worker para testar uma fonte; o resultado volta em app_settings. */
export const FONTES_CMD_CHANNEL = "garimpo_fontes";
export const FONTE_TESTE_KEY = "fonte_teste";
export type FontesCmd = { acao: "testar"; token: string; kind: FonteKind; config: unknown };


export type FonteState = "confirmada" | "sugerida" | "pausada" | "ignorada";

export type FonteDTO = {
  id: number;
  name: string;
  kind: "telegram" | "comunidade" | "loja" | FonteKind;
  /** Criada ou adicionada na tela Fontes: dá para editar, testar e apagar. */
  editable: boolean;
  config: Record<string, unknown> | null;
  intervalMin: number | null;
  defaultIntervalMin: number | null;
  lastRunAt: string | null;
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
  /** Fontes da pesquisa (docs/fontes-novas.md) ainda não adicionadas. */
  sugestoes: { slug: string; name: string; kind: FonteKind; kindLabel: string; config: unknown; why: string; rotulo: string }[];
  /** Canais do Telegram conferidos que você ainda não segue. */
  canais: { handle: string; name: string; why: string }[];
};

const WHERE: Record<FonteKind, string> = { feed: "Feed RSS", pagina: "Página de ofertas", vtex: "Busca na loja (VTEX)" };

function statsOf(raw: Prisma.JsonValue | null) {
  const s = asJson<SourceStats | null>(raw);
  return s ? { read: s.read, withLink: s.withLink, touched: s.touched, offers: s.offers } : null;
}

export function stateOf(s: { isActive: boolean; decision: string | null }): FonteState {
  if (s.isActive) return "confirmada";
  if (s.decision === "pausada") return "pausada";
  if (s.decision === "ignorada") return "ignorada";
  return "sugerida";
}

export async function getFontes(): Promise<FontesDTO> {
  const all = await prisma.source.findMany({ where: { deletedAt: null }, orderBy: { id: "asc" } });
  const stats = await prisma.$queryRaw<{ sourceId: number; perDay: number; ok: number; tried: number }[]>`
    select source_id as "sourceId",
      count(*) filter (where created_at >= ${atras(DIA)})::int as "perDay",
      count(*) filter (where verify_status = 'verificado')::int as ok,
      count(*) filter (where verify_status in ('verificado','nao_verificado'))::int as tried
    from offers group by source_id`;
  const byId = new Map(stats.map((s) => [s.sourceId, s]));

  const fontes: FonteDTO[] = all
    .filter((s) => ["telegram", "comunidade", "loja", "feed", "pagina", "vtex"].includes(s.kind))
    .map((s) => {
      const st = byId.get(s.id);
      const generic = s.kind === "feed" || s.kind === "pagina" || s.kind === "vtex";
      if (generic) {
        const kind = s.kind as FonteKind;
        return {
          id: s.id,
          name: s.name,
          kind,
          editable: true,
          config: asJson<Record<string, unknown> | null>(s.config),
          intervalMin: s.intervalMin,
          defaultIntervalMin: DEFAULT_INTERVAL_MIN[kind],
          lastRunAt: s.lastRunAt?.toISOString() ?? null,
          where: WHERE[kind],
          perDay: st?.perDay ?? 0,
          hitPct: st && st.tried >= 3 ? Math.round((st.ok / st.tried) * 100) : null,
          state: stateOf(s),
          why: SUGESTOES.find((x) => x.slug === s.slug)?.why ?? `Fonte adicionada por você (${KIND_LABEL[kind]})`,
          status: s.status,
          statusNote: s.statusNote,
          stats: null,
          lastMessageAt: null,
        };
      }
      return {
        editable: false,
        config: null,
        intervalMin: null,
        defaultIntervalMin: null,
        lastRunAt: s.lastRunAt?.toISOString() ?? null,
        id: s.id,
        name: s.name,
        kind: s.kind as "telegram" | "comunidade" | "loja",
        where: s.kind === "telegram" ? (s.url.startsWith("https://t.me/") ? "Telegram · canal" : "Telegram · grupo") : s.kind === "loja" ? "Vitrine da loja" : "Comunidade na web",
        perDay: st?.perDay ?? 0,
        hitPct: st && st.tried >= 3 ? Math.round((st.ok / st.tried) * 100) : null,
        state: stateOf(s),
        why: s.kind === "telegram" ? groupReason(s.name) : s.kind === "loja" ? "Categorias dos seus Alvos, só produtos com 10% ou mais de desconto" : "Página pública de ofertas, lida com coleta educada",
        status: s.status,
        statusNote: s.statusNote,
        stats: statsOf(s.stats),
        lastMessageAt: s.lastMessageAt?.toISOString() ?? null,
      };
    });

  const tg = all.filter((s) => s.kind === "telegram");
  const lastScan = tg.map((s) => s.lastRunAt?.getTime() ?? 0).reduce((a, b) => Math.max(a, b), 0);
  const web = all.filter((s) => (s.kind === "comunidade" || s.kind === "feed" || s.kind === "pagina") && s.isActive);

  const inv = await prisma.invite.findMany({
    where: { dismissed: false, lastSeenAt: { gte: atras(14 * DIA) } },
    orderBy: [{ mentions: "desc" }, { lastSeenAt: "desc" }],
    take: 8,
  });

  return {
    fontes,
    telegram: {
      hasSession: !!process.env.TELEGRAM_SESSION,
      connected: lastScan > Date.now() - 3 * 60 * 1000,
      on: tg.filter((s) => s.isActive).length,
      total: tg.length,
      lastScan: lastScan ? new Date(lastScan).toISOString() : null,
    },
    web: { active: web.length, names: web.map((s) => s.name.replace("Fórum de Promoções do ", "")) },
    invites: inv.map((i) => ({ link: i.link, kind: i.kind, mentions: i.mentions, lastSeenAt: i.lastSeenAt.toISOString(), fromSource: i.fromSource })),
    sugestoes: await sugestoesPendentes(),
    canais: CANAIS_SUGERIDOS.filter((c) => !tg.some((s) => s.url.toLowerCase() === `https://t.me/${c.handle.toLowerCase()}`)),
  };
}

/** Sugestões da pesquisa que ainda não viraram fonte (uma apagada não volta a ser sugerida). */
async function sugestoesPendentes(): Promise<FontesDTO["sugestoes"]> {
  const slugs = new Set((await prisma.source.findMany({ select: { slug: true } })).map((r) => r.slug));
  return SUGESTOES.filter((x) => !slugs.has(x.slug)).map((x) => ({ slug: x.slug, name: x.name, kind: x.kind, kindLabel: KIND_LABEL[x.kind], config: x.config, why: x.why, rotulo: x.rotulo }));
}

/** Slug de uma fonte nova: "u-" + nome; único. */
export async function newSourceSlug(name: string): Promise<string> {
  const base = `u-${name.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 30) || "fonte"}`;
  const taken = new Set((await prisma.source.findMany({ select: { slug: true } })).map((r) => r.slug));
  let slug = base;
  for (let i = 2; taken.has(slug); i++) slug = `${base}-${i}`;
  return slug;
}

/** Valida a configuração e o intervalo de uma fonte da tela. Devolve a mensagem de erro ou a configuração limpa. */
export function checkFonte(kind: FonteKind, config: unknown, intervalMin: number | null): { erro: string } | { config: Record<string, unknown> } {
  const parsed = CONFIG_SCHEMA[kind].safeParse(config);
  if (!parsed.success) return { erro: parsed.error.issues[0]?.message ?? "configuração inválida" };
  if (intervalMin != null && intervalMin < MIN_INTERVAL_MIN[kind]) return { erro: `o mínimo para este tipo é ${MIN_INTERVAL_MIN[kind]} min (coleta educada)` };
  if (kind === "vtex" && !storeForUrl((parsed.data as { url: string }).url)) {
    return { erro: "essa loja não está em config/stores.ts: sem ela, as ofertas seriam marcadas como suspeitas" };
  }
  return { config: parsed.data as Record<string, unknown> };
}

/** Endereço que a tela mostra como link da fonte. */
export function urlOfFonte(kind: FonteKind, config: unknown): string {
  const c = config as { url?: string; urls?: string[] };
  return kind === "pagina" ? (c.urls?.[0] ?? "") : (c.url ?? "");
}
