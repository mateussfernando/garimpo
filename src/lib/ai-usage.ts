import { and, eq, gte, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { getSetting } from "@/lib/settings";

/** Pausa da IA, escolhida pelo usuário no cabeçalho. */
export type AiState = { paused: boolean };
/** Pedido de "Chamar IA agora" em andamento (o worker escreve). */
export type AiRun = { running: boolean; startedAt: number | null; finishedAt: number | null; note: string | null };
export type AiLimitsValue = {
  fiveHour: { pct: number; resetsAt: number | null; status: string | null } | null;
  sevenDay: { pct: number; resetsAt: number | null; status: string | null } | null;
  at: number;
};

export const AI_STATE_KEY = "ia";
export const AI_LIMITS_KEY = "ia_limites";
export const AI_RUN_KEY = "ia_rodada";
/** Canal do pg_notify para o botão "Chamar IA agora": o site só avisa, quem chama a IA é o worker. */
export const AI_CMD_CHANNEL = "garimpo_ia";

export type AiStatus = {
  provider: string;
  paused: boolean;
  /** Custo total e de hoje, em US$ (no claude-cli, o valor que o próprio claude -p informa). */
  spentUsd: number;
  spentTodayUsd: number;
  callsToday: number;
  /** Uso da assinatura (só claude-cli): % da janela de 5 h e da semanal. null = ainda sem chamada. */
  limits: AiLimitsValue | null;
  run: AiRun | null;
};

export function aiProviderName(): string {
  return process.env.AI_PROVIDER ?? "claude-cli";
}

/** Gasto, chamadas de hoje, pausa e uso da assinatura. Só leitura: serve ao worker e ao cabeçalho do site. */
export async function getAiStatus(): Promise<AiStatus> {
  const { aiUsage } = schema;
  const [{ spent }] = await db
    .select({ spent: sql<number>`coalesce(sum(${aiUsage.costUsd}), 0)::float` })
    .from(aiUsage)
    .where(eq(aiUsage.ok, true));
  const [{ calls, today }] = await db
    .select({ calls: sql<number>`count(*)::int`, today: sql<number>`coalesce(sum(${aiUsage.costUsd}), 0)::float` })
    .from(aiUsage)
    .where(and(eq(aiUsage.ok, true), gte(aiUsage.createdAt, sql`date_trunc('day', now())`)));
  const [state, limits, run] = await Promise.all([
    getSetting<AiState>(AI_STATE_KEY),
    getSetting<AiLimitsValue>(AI_LIMITS_KEY),
    getSetting<AiRun>(AI_RUN_KEY),
  ]);
  return {
    provider: aiProviderName(),
    paused: state?.value.paused === true,
    spentUsd: Math.round(spent * 10000) / 10000,
    spentTodayUsd: Math.round(today * 10000) / 10000,
    callsToday: calls,
    limits: limits?.value ?? null,
    run: run?.value ?? null,
  };
}
