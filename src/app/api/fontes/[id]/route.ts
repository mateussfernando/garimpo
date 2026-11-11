import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, CMD_CHANNEL, NOTIFY_CHANNEL, pool, schema } from "@/lib/db";

// Confirmar liga a fonte; pausar e ignorar desligam; retomar e desfazer voltam ao estado de sugestão ou confirmada.
const Body = z.object({ acao: z.enum(["confirmar", "ignorar", "pausar", "retomar", "desfazer"]) });

export async function PATCH(request: Request, ctx: RouteContext<"/api/fontes/[id]">) {
  const { id } = await ctx.params;
  const parsed = Body.safeParse(await request.json().catch(() => null));
  const sourceId = Number(id);
  if (!parsed.success || !Number.isInteger(sourceId)) return Response.json({ erro: "pedido inválido" }, { status: 400 });
  const set = {
    confirmar: { enabled: true, decision: "confirmada" },
    retomar: { enabled: true, decision: "confirmada" },
    pausar: { enabled: false, decision: "pausada" },
    ignorar: { enabled: false, decision: "ignorada" },
    desfazer: { enabled: false, decision: null },
  }[parsed.data.acao];
  await db.update(schema.sources).set(set).where(eq(schema.sources.id, sourceId));
  // O worker relê a lista de grupos e a Vitrine atualiza o cabeçalho.
  await pool.query("select pg_notify($1, '{}')", [CMD_CHANNEL]);
  await pool.query("select pg_notify($1, $2)", [NOTIFY_CHANNEL, JSON.stringify({ type: "source" })]);
  return Response.json({ ok: true });
}
