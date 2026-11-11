import { aiProviderName } from "@/lib/ai-usage";
import { anthropicApi } from "./providers/anthropic-api";
import { claudeCli } from "./providers/claude-cli";
import { ollama } from "./providers/ollama";
import type { AiProvider } from "./types";

export function getProvider(): AiProvider {
  const name = aiProviderName();
  if (name === "anthropic-api") return anthropicApi;
  if (name === "ollama") return ollama;
  if (name === "claude-cli") return claudeCli;
  throw new Error(`AI_PROVIDER desconhecido: ${name} (use claude-cli, anthropic-api ou ollama)`);
}
