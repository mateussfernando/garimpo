import { randomUUID } from "node:crypto";
import { connection } from "next/server";
import { z } from "zod";
import { pool } from "@/lib/db";
import { FONTES_CMD_CHANNEL, FONTE_TESTE_KEY, type FontesCmd } from "@/lib/fontes";
import { getSetting } from "@/lib/settings";

// "Testar" na tela Fontes. O site nunca abre o site da fonte: quem lê é o worker, com a coleta educada,
// e o resultado volta em app_settings. Aqui só se pede e se consulta.
const Body = z.object({ kind: z.enum(["feed", "pagina", "vtex"]), config: z.unknown() });

export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ erro: "pedido inválido" }, { status: 400 });
  const token = randomUUID();
  const cmd: FontesCmd = { acao: "testar", token, kind: parsed.data.kind, config: parsed.data.config };
  await pool.query("select pg_notify($1, $2)", [FONTES_CMD_CHANNEL, JSON.stringify(cmd)]);
  return Response.json({ token });
}

export async function GET(request: Request) {
  await connection();
  const token = new URL(request.url).searchParams.get("token");
  const saved = await getSetting<{ token: string; at: number; result: unknown }>(FONTE_TESTE_KEY);
  if (!token || saved?.value.token !== token) return Response.json({ pronto: false }, { headers: { "Cache-Control": "no-store" } });
  return Response.json({ pronto: true, result: saved.value.result }, { headers: { "Cache-Control": "no-store" } });
}
