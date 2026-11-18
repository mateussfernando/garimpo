import { AI_AUTO_STOP_PCT, AI_LIMITS_KEY, aiProviderName, getAiChoice, type AiLimitsValue } from "@/lib/ai-usage";
import { getSetting } from "@/lib/settings";
import { agy } from "./providers/agy";
import { anthropicApi } from "./providers/anthropic-api";
import { claudeCli } from "./providers/claude-cli";
import { ollama } from "./providers/ollama";
import type { AiProvider } from "./types";

/** O provedor do lado "Claude" (AI_PROVIDER do .env). */
export function claudeSide(): AiProvider {
  const name = aiProviderName();
  if (name === "anthropic-api") return anthropicApi;
  if (name === "ollama") return ollama;
  if (name === "claude-cli") return claudeCli;
  throw new Error(`AI_PROVIDER desconhecido: ${name} (use claude-cli, anthropic-api, ollama ou agy)`);
}

/** Os provedores ligados pela escolha da tela: só o Claude, só o agy ou os dois. */
export async function activeProviders(): Promise<AiProvider[]> {
  const choice = await getAiChoice();
  if (choice === "agy") return [agy];
  if (choice === "ambos") return [claudeSide(), agy];
  return [claudeSide()];
}

/** % da janela de 5 h da assinatura do Claude (só o claude-cli informa). */
export async function claudeFiveHourPct(): Promise<number | null> {
  return (await getSetting<AiLimitsValue>(AI_LIMITS_KEY))?.value.fiveHour?.pct ?? null;
}

/** Com o freio de 85% da janela de 5 h, o Claude espera nas rodadas automáticas (o agy não tem essa janela). */
export async function claudeBraked(): Promise<boolean> {
  if (claudeSide().name !== "claude-cli") return false;
  const p = await claudeFiveHourPct();
  return p != null && p >= AI_AUTO_STOP_PCT;
}

let turn = 0;
/**
 * Para os trabalhos de uma chamada só (categorias, radar, insights). Com os dois ligados, eles se revezam;
 * com o Claude no freio, vai o agy. `force` (botão "Chamar IA agora") passa por cima do freio.
 */
export async function pickProvider(opts: { force?: boolean } = {}): Promise<AiProvider> {
  const list = await activeProviders();
  if (list.length === 1) return list[0];
  const usable = !opts.force && (await claudeBraked()) ? list.filter((p) => p.name === "agy") : list;
  return usable[turn++ % usable.length];
}
