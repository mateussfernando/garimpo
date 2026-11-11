import { z } from "zod";
import { AI_CMD_CHANNEL, AI_STATE_KEY } from "@/lib/ai-usage";
import { NOTIFY_CHANNEL, pool } from "@/lib/db";
import { setSetting } from "@/lib/settings";

// Botões da IA no cabeçalho. O site nunca chama a IA: "rodar" só avisa o worker por pg_notify.
const Body = z.object({ acao: z.enum(["pausar", "continuar", "rodar"]) });

export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ erro: "pedido inválido" }, { status: 400 });
  const { acao } = parsed.data;
  if (acao === "rodar") {
    await pool.query("select pg_notify($1, $2)", [AI_CMD_CHANNEL, JSON.stringify({ acao: "rodar" })]);
  } else {
    await setSetting(AI_STATE_KEY, { paused: acao === "pausar" });
    // Continuar já dispara uma rodada, para o que ficou parado andar.
    if (acao === "continuar") await pool.query("select pg_notify($1, $2)", [AI_CMD_CHANNEL, JSON.stringify({ acao: "rodar" })]);
  }
  await pool.query("select pg_notify($1, $2)", [NOTIFY_CHANNEL, JSON.stringify({ type: "ai" })]);
  return Response.json({ ok: true });
}
