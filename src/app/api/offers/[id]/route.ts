import { eq } from "drizzle-orm";
import { connection } from "next/server";
import { z } from "zod";
import { db, schema } from "@/lib/db";
import { getOfferDetail } from "@/lib/detail";

export async function GET(_request: Request, ctx: RouteContext<"/api/offers/[id]">) {
  await connection();
  const { id } = await ctx.params;
  const offerId = Number(id);
  if (!Number.isInteger(offerId)) return Response.json({ erro: "id inválido" }, { status: 400 });
  const detail = await getOfferDetail(offerId);
  if (!detail) return Response.json({ erro: "oferta não encontrada" }, { status: 404 });
  return Response.json(detail, { headers: { "Cache-Control": "no-store" } });
}

// snoozeMinutes: soneca da War Room (volta para a fila depois); 0 limpa a soneca.
const Body = z.object({
  watched: z.boolean().optional(),
  dismissed: z.boolean().optional(),
  snoozeMinutes: z.number().int().min(0).max(24 * 60).optional(),
});

export async function PATCH(request: Request, ctx: RouteContext<"/api/offers/[id]">) {
  const { id } = await ctx.params;
  const parsed = Body.safeParse(await request.json().catch(() => null));
  const offerId = Number(id);
  if (!parsed.success || !Number.isInteger(offerId)) return Response.json({ erro: "pedido inválido" }, { status: 400 });
  const { snoozeMinutes, ...rest } = parsed.data;
  const set: Partial<typeof schema.offers.$inferInsert> = { ...rest };
  if (snoozeMinutes !== undefined) set.snoozedUntil = snoozeMinutes === 0 ? null : new Date(Date.now() + snoozeMinutes * 60_000);
  await db.update(schema.offers).set(set).where(eq(schema.offers.id, offerId));
  return Response.json({ ok: true });
}
