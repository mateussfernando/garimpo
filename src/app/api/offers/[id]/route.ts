import { connection } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { getOfferDetail } from "@/lib/detail";
import { exigir, pode } from "@/lib/sessao";
import { contextoDe, detalheVisivel } from "@/lib/visao";

export async function GET(_request: Request, ctx: RouteContext<"/api/offers/[id]">) {
  await connection();
  const eu = await exigir("ofertas.ver");
  if (eu instanceof Response) return eu;
  const { id } = await ctx.params;
  const offerId = Number(id);
  if (!Number.isInteger(offerId)) return Response.json({ erro: "id inválido" }, { status: 400 });
  const detail = await getOfferDetail(offerId, eu.id);
  if (!detail) return Response.json({ erro: "oferta não encontrada" }, { status: 404 });
  // Tirada da Vitrine: só quem modera ainda abre (para devolver).
  const fora = !detail.offer.isActive || detail.offer.productActive === false;
  if (fora && !pode(eu, "ofertas.moderar")) return Response.json({ erro: "oferta não encontrada" }, { status: 404 });
  return Response.json(detalheVisivel(detail, await contextoDe(eu)), { headers: { "Cache-Control": "no-store" } });
}

// Marcações da conta na oferta (só dela): vigiar, descartar e soneca da War Room (snoozeMinutes; 0 limpa a soneca).
const Body = z.object({
  watched: z.boolean().optional(),
  dismissed: z.boolean().optional(),
  snoozeMinutes: z.number().int().min(0).max(24 * 60).optional(),
});

export async function PATCH(request: Request, ctx: RouteContext<"/api/offers/[id]">) {
  const eu = await exigir("ofertas.ver", request);
  if (eu instanceof Response) return eu;
  const { id } = await ctx.params;
  const parsed = Body.safeParse(await request.json().catch(() => null));
  const offerId = Number(id);
  if (!parsed.success || !Number.isInteger(offerId)) return Response.json({ erro: "pedido inválido" }, { status: 400 });
  const { snoozeMinutes, ...rest } = parsed.data;
  const set: { watched?: boolean; dismissed?: boolean; snoozedUntil?: Date | null } = { ...rest };
  if (snoozeMinutes !== undefined) set.snoozedUntil = snoozeMinutes === 0 ? null : new Date(Date.now() + snoozeMinutes * 60_000);
  if (!(await prisma.offer.findUnique({ where: { id: offerId }, select: { id: true } }))) return Response.json({ erro: "oferta não encontrada" }, { status: 404 });
  await prisma.ofertaUsuario.upsert({
    where: { userId_offerId: { userId: eu.id, offerId } },
    create: { userId: eu.id, offerId, ...set },
    update: set,
  });
  return Response.json({ ok: true });
}
