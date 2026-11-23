import { CMD_CHANNEL, pool } from "@/lib/db";
import { exigir } from "@/lib/sessao";

// "Procurar de novo": o worker lê de novo a lista de grupos e canais do Telegram (só leitura).
export async function POST(request: Request) {
  const eu = await exigir("fontes.gerenciar", request);
  if (eu instanceof Response) return eu;
  await pool.query("select pg_notify($1, '{}')", [CMD_CHANNEL]);
  return Response.json({ ok: true });
}
