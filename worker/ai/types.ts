import { z } from "zod";

export type AiRequest<T> = {
  /** Para o registro de uso: "insight", "alvo", "triagem"... */
  purpose: string;
  system: string;
  prompt: string;
  schema: z.ZodType<T>;
};

/** Uso da assinatura (claude-cli): % da janela de 5 h e da semanal, e quando cada uma zera. */
export type AiLimits = {
  fiveHour: { pct: number; resetsAt: number | null; status: string | null } | null;
  sevenDay: { pct: number; resetsAt: number | null; status: string | null } | null;
  at: number;
};

export type AiResult<T> = {
  data: T;
  inputTokens: number;
  outputTokens: number;
  /** Custo informado pelo provedor (o claude -p manda o valor exato); sem ele, a tabela de preços. */
  costUsd?: number;
  limits?: AiLimits | null;
};

export type ProviderName = "claude-cli" | "anthropic-api" | "ollama" | "agy";

export interface AiProvider {
  readonly name: ProviderName;
  /** Modelo que vai no registro de uso (ai_usage.model). */
  readonly model: string;
  generate<T>(req: AiRequest<T>): Promise<AiResult<T>>;
}

/** JSON Schema do Zod, sem a chave "$schema" (o claude -p recusa essa chave). */
export function jsonSchemaOf(schema: z.ZodType): Record<string, unknown> {
  const { $schema: _ignored, ...rest } = z.toJSONSchema(schema) as Record<string, unknown>;
  void _ignored;
  return rest;
}

export class AiRefusal extends Error {}
/** A IA está pausada pelo usuário (botão no cabeçalho). */
export class AiBudgetError extends Error {}
