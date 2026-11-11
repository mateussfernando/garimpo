import { z } from "zod";

export type AiRequest<T> = {
  /** Para o registro de uso: "insight", "alvo", "triagem"... */
  purpose: string;
  system: string;
  prompt: string;
  schema: z.ZodType<T>;
};

export type AiResult<T> = { data: T; inputTokens: number; outputTokens: number };

export interface AiProvider {
  readonly name: "claude-cli" | "anthropic-api" | "ollama";
  generate<T>(req: AiRequest<T>): Promise<AiResult<T>>;
}

/** JSON Schema do Zod, sem a chave "$schema" (o claude -p recusa essa chave). */
export function jsonSchemaOf(schema: z.ZodType): Record<string, unknown> {
  const { $schema: _ignored, ...rest } = z.toJSONSchema(schema) as Record<string, unknown>;
  void _ignored;
  return rest;
}

export class AiRefusal extends Error {}
export class AiBudgetError extends Error {}
