import { z } from "zod";
import { NOTIFY_CHANNEL, pool } from "@/lib/db";
import { COLETA_KEY, setSetting } from "@/lib/settings";
import { exigir } from "@/lib/sessao";

// Botão "Pausar coleta" (Painel e Fontes). O site só grava a escolha; o worker confere a cada poucos segundos e para
// de abrir sites (comunidades, vitrines, fontes configuráveis e conferência nas lojas). O Telegram continua escutando.
const Body = z.object({ acao: z.enum(["pausar", "continuar"]) });

export async function POST(request: Request) {
  const eu = await exigir("fontes.gerenciar", request);
  if (eu instanceof Response) return eu;
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ erro: "pedido inválido" }, { status: 400 });
  await setSetting(COLETA_KEY, { paused: parsed.data.acao === "pausar", at: Date.now() });
  await pool.query("select pg_notify($1, $2)", [NOTIFY_CHANNEL, JSON.stringify({ type: "coleta" })]);
  return Response.json({ ok: true });
}
