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
/** Qual IA trabalha, escolhida pelo usuário na Fila da IA: só o Claude, só o agy (Antigravity) ou os dois juntos. */
export const AI_CHOICE_KEY = "ia_provedor";
export const AI_CHOICES = ["claude", "agy", "ambos"] as const;
export type AiChoice = (typeof AI_CHOICES)[number];
export type AiChoiceValue = { modo: AiChoice };
/** Canal do pg_notify para o botão "Chamar IA agora": o site só avisa, quem chama a IA é o worker. */
export const AI_CMD_CHANNEL = "garimpo_ia";

export type AiStatus = {
  /** Provedor do lado "Claude" (AI_PROVIDER do .env, normalmente claude-cli). */
  provider: string;
  /** O que o usuário escolheu: Claude, agy ou os dois. */
  choice: AiChoice;
  /** Chamadas que deram certo hoje, por provedor (claude-cli, agy...). */
  callsTodayBy: Record<string, number>;
  paused: boolean;
  /** Custo total e de hoje, em US$ (no claude-cli, o valor que o próprio claude -p informa). */
  spentUsd: number;
  spentTodayUsd: number;
  callsToday: number;
  /** Uso da assinatura (só claude-cli): % da janela de 5 h e da semanal. null = ainda sem chamada. */
  limits: AiLimitsValue | null;
  run: AiRun | null;
};

/** O provedor do lado "Claude": claude-cli (padrão), anthropic-api ou ollama. AI_PROVIDER=agy no .env só muda a escolha inicial. */
export function aiProviderName(): string {
  const p = process.env.AI_PROVIDER ?? "claude-cli";
  return p === "agy" ? "claude-cli" : p;
}

/** A escolha do usuário. Sem escolha salva, vale AI_PROVIDER=agy do .env ou, por padrão, o Claude. */
export async function getAiChoice(): Promise<AiChoice> {
  const saved = (await getSetting<AiChoiceValue>(AI_CHOICE_KEY))?.value.modo;
  if (saved && (AI_CHOICES as readonly string[]).includes(saved)) return saved;
  return process.env.AI_PROVIDER === "agy" ? "agy" : "claude";
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
  const byProvider = await db
    .select({ provider: aiUsage.provider, n: sql<number>`count(*)::int` })
    .from(aiUsage)
    .where(and(eq(aiUsage.ok, true), gte(aiUsage.createdAt, sql`date_trunc('day', now())`)))
    .groupBy(aiUsage.provider);
  const [state, limits, run] = await Promise.all([
    getSetting<AiState>(AI_STATE_KEY),
    getSetting<AiLimitsValue>(AI_LIMITS_KEY),
    getSetting<AiRun>(AI_RUN_KEY),
  ]);
  return {
    provider: aiProviderName(),
    choice: await getAiChoice(),
    callsTodayBy: Object.fromEntries(byProvider.map((r) => [r.provider, r.n])),
    paused: state?.value.paused === true,
    spentUsd: Math.round(spent * 10000) / 10000,
    spentTodayUsd: Math.round(today * 10000) / 10000,
    callsToday: calls,
    limits: limits?.value ?? null,
    run: run?.value ?? null,
  };
}

export { AI_AUTO_STOP_PCT } from "@/config/pricing";
