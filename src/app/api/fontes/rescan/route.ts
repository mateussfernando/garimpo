import { CMD_CHANNEL, pool } from "@/lib/db";

// "Procurar de novo": o worker lê de novo a lista de grupos e canais do Telegram (só leitura).
export async function POST() {
  await pool.query("select pg_notify($1, '{}')", [CMD_CHANNEL]);
  return Response.json({ ok: true });
}
