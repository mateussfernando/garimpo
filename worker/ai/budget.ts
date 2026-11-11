// Toda chamada de IA passa por aqui: confere a trava, chama o provedor e registra o uso.
// Trava: total gasto >= US$ 4,50 (no claude-cli, passou de AI_MAX_CHAMADAS_DIA).
import { AI_MODEL, costUsd } from "@/config/pricing";
import { db, schema } from "@/lib/db";
import { getAiStatus } from "@/lib/ai-usage";
import { AiBudgetError, type AiProvider, type AiRequest, type AiResult } from "./types";

export async function guardedCall<T>(provider: AiProvider, req: AiRequest<T>): Promise<AiResult<T>> {
  const st = await getAiStatus();
  if (st.blocked) {
    const why =
      st.maxCallsDay != null
        ? `${st.callsToday} chamadas hoje, o limite é ${st.maxCallsDay}`
        : `US$ ${st.spentUsd.toFixed(2)} gastos, o limite é US$ ${st.limitUsd.toFixed(2)}`;
    throw new AiBudgetError(`IA recusada pela trava: ${why}`);
  }
  try {
    const res = await provider.generate(req);
    await db.insert(schema.aiUsage).values({
      provider: provider.name,
      model: AI_MODEL,
      purpose: req.purpose,
      inputTokens: res.inputTokens,
      outputTokens: res.outputTokens,
      // Ollama roda no seu PC: custo zero. Nos demais, o custo estimado pela tabela de preços.
      costUsd: String(provider.name === "ollama" ? 0 : costUsd(res.inputTokens, res.outputTokens)),
      ok: true,
    });
    return res;
  } catch (err) {
    await db.insert(schema.aiUsage).values({ provider: provider.name, model: AI_MODEL, purpose: req.purpose, ok: false });
    throw err;
  }
}
