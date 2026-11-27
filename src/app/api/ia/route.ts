import { z } from "zod";
import { controlarIa } from "@/lib/acoes";
import { AI_CHOICES, AI_CHOICE_KEY } from "@/lib/ai-usage";
import { NOTIFY_CHANNEL, pool } from "@/lib/db";
import { setSetting } from "@/lib/settings";
import { exigir } from "@/lib/sessao";

// Botões da IA no cabeçalho. O site nunca chama a IA: "rodar" só avisa o worker por pg_notify.
// "provedor" escolhe quem trabalha (Claude, agy ou os dois); o worker lê a escolha a cada rodada.
const Body = z.discriminatedUnion("acao", [
  z.object({ acao: z.enum(["pausar", "continuar", "rodar"]) }),
  z.object({ acao: z.literal("provedor"), modo: z.enum(AI_CHOICES) }),
]);

export async function POST(request: Request) {
  const eu = await exigir("ia.gerenciar", request);
  if (eu instanceof Response) return eu;
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ erro: "pedido inválido" }, { status: 400 });
  const b = parsed.data;
  if (b.acao === "provedor") {
    await setSetting(AI_CHOICE_KEY, { modo: b.modo });
    await pool.query("select pg_notify($1, $2)", [NOTIFY_CHANNEL, JSON.stringify({ type: "ai" })]);
  } else {
    await controlarIa(b.acao);
  }
  return Response.json({ ok: true });
}
