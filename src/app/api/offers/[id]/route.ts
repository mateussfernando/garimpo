import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/lib/db";

const Body = z.object({ watched: z.boolean().optional(), dismissed: z.boolean().optional() });

export async function PATCH(request: Request, ctx: RouteContext<"/api/offers/[id]">) {
  const { id } = await ctx.params;
  const parsed = Body.safeParse(await request.json().catch(() => null));
  const offerId = Number(id);
  if (!parsed.success || !Number.isInteger(offerId)) return Response.json({ erro: "pedido inválido" }, { status: 400 });
  await db.update(schema.offers).set(parsed.data).where(eq(schema.offers.id, offerId));
  return Response.json({ ok: true });
}
