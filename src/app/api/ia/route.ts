import { z } from "zod";
import { AI_CHOICES, AI_CHOICE_KEY, AI_CMD_CHANNEL, AI_STATE_KEY } from "@/lib/ai-usage";
import { NOTIFY_CHANNEL, pool } from "@/lib/db";
import { setSetting } from "@/lib/settings";

// Botões da IA no cabeçalho. O site nunca chama a IA: "rodar" só avisa o worker por pg_notify.
// "provedor" escolhe quem trabalha (Claude, agy ou os dois); o worker lê a escolha a cada rodada.
const Body = z.discriminatedUnion("acao", [
  z.object({ acao: z.enum(["pausar", "continuar", "rodar"]) }),
  z.object({ acao: z.literal("provedor"), modo: z.enum(AI_CHOICES) }),
]);

export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ erro: "pedido inválido" }, { status: 400 });
  const b = parsed.data;
  if (b.acao === "provedor") {
    await setSetting(AI_CHOICE_KEY, { modo: b.modo });
  } else if (b.acao === "rodar") {
    await pool.query("select pg_notify($1, $2)", [AI_CMD_CHANNEL, JSON.stringify({ acao: "rodar" })]);
  } else {
    await setSetting(AI_STATE_KEY, { paused: b.acao === "pausar" });
    // Continuar já dispara uma rodada, para o que ficou parado andar.
    if (b.acao === "continuar") await pool.query("select pg_notify($1, $2)", [AI_CMD_CHANNEL, JSON.stringify({ acao: "rodar" })]);
  }
  await pool.query("select pg_notify($1, $2)", [NOTIFY_CHANNEL, JSON.stringify({ type: "ai" })]);
  return Response.json({ ok: true });
}
