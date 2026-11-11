import { eq } from "drizzle-orm";
import { z } from "zod";
import { NOTIFY_CHANNEL, db, pool, schema } from "@/lib/db";

// Esconder um cupom que não vale (ou desfazer).
const Body = z.object({ hidden: z.boolean() });

export async function PATCH(request: Request, ctx: RouteContext<"/api/cupons/[id]">) {
  const { id } = await ctx.params;
  const parsed = Body.safeParse(await request.json().catch(() => null));
  const n = Number(id);
  if (!parsed.success || !Number.isInteger(n)) return Response.json({ erro: "pedido inválido" }, { status: 400 });
  await db.update(schema.coupons).set({ hidden: parsed.data.hidden }).where(eq(schema.coupons.id, n));
  await pool.query("select pg_notify($1, $2)", [NOTIFY_CHANNEL, JSON.stringify({ type: "coupon" })]);
  return Response.json({ ok: true });
}
