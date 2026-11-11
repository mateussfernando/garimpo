import { and, eq, gte, sql } from "drizzle-orm";
import { AI_LIMIT_USD } from "@/config/pricing";
import { db, schema } from "@/lib/db";

export type AiStatus = {
  provider: string;
  spentUsd: number;
  limitUsd: number;
  callsToday: number;
  maxCallsDay: number | null;
  /** true quando a próxima chamada seria recusada. */
  blocked: boolean;
};

export function aiProviderName(): string {
  return process.env.AI_PROVIDER ?? "claude-cli";
}

/** Gasto acumulado e chamadas de hoje. Só leitura: serve ao worker e ao cabeçalho do site. */
export async function getAiStatus(): Promise<AiStatus> {
  const { aiUsage } = schema;
  const [{ spent }] = await db
    .select({ spent: sql<number>`coalesce(sum(${aiUsage.costUsd}), 0)::float` })
    .from(aiUsage)
    .where(eq(aiUsage.ok, true));
  const [{ calls }] = await db
    .select({ calls: sql<number>`count(*)::int` })
    .from(aiUsage)
    .where(and(eq(aiUsage.ok, true), gte(aiUsage.createdAt, sql`date_trunc('day', now())`)));
  const provider = aiProviderName();
  const maxCallsDay = provider === "claude-cli" ? Number(process.env.AI_MAX_CHAMADAS_DIA ?? 300) : null;
  const blocked = maxCallsDay != null ? calls >= maxCallsDay : spent >= AI_LIMIT_USD;
  return { provider, spentUsd: Math.round(spent * 10000) / 10000, limitUsd: AI_LIMIT_USD, callsToday: calls, maxCallsDay, blocked };
}
