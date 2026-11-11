// Toda chamada de IA passa por aqui: confere se o usuário pausou a IA, chama o provedor e registra uso e custo.
// Sem teto de gasto (decisão do usuário em 11/11): quem para é o botão Pausar do cabeçalho.
// No claude-cli, cada resposta traz o uso da assinatura (janela de 5 h e semanal); ele fica salvo para o cabeçalho.
import { AI_MODEL, costUsd } from "@/config/pricing";
import { AI_LIMITS_KEY, AI_STATE_KEY, type AiState } from "@/lib/ai-usage";
import { db, schema } from "@/lib/db";
import { getSetting, setSetting } from "@/lib/settings";
import { notify } from "../pipeline";
import { AiBudgetError, type AiProvider, type AiRequest, type AiResult } from "./types";

export async function aiPaused(): Promise<boolean> {
  return (await getSetting<AiState>(AI_STATE_KEY))?.value.paused === true;
}

export async function guardedCall<T>(provider: AiProvider, req: AiRequest<T>): Promise<AiResult<T>> {
  if (await aiPaused()) throw new AiBudgetError("IA pausada por você (botão Continuar no cabeçalho)");
  try {
    const res = await provider.generate(req);
    const cost = provider.name === "ollama" ? 0 : (res.costUsd ?? costUsd(res.inputTokens, res.outputTokens));
    await db.insert(schema.aiUsage).values({
      provider: provider.name,
      model: AI_MODEL,
      purpose: req.purpose,
      inputTokens: res.inputTokens,
      outputTokens: res.outputTokens,
      costUsd: String(cost),
      ok: true,
    });
    if (res.limits) await setSetting(AI_LIMITS_KEY, res.limits);
    await notify({ type: "ai" });
    return res;
  } catch (err) {
    await db.insert(schema.aiUsage).values({ provider: provider.name, model: AI_MODEL, purpose: req.purpose, ok: false });
    throw err;
  }
}
