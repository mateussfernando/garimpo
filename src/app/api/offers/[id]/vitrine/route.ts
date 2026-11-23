import { z } from "zod";
import { NOTIFY_CHANNEL, pool } from "@/lib/db";
import { prisma } from "@/lib/db/prisma";
import { exigir } from "@/lib/sessao";

// Tirar da Vitrine de todos (ou devolver): a oferta sozinha, ou o produto inteiro (todas as ofertas dele, de todas as
// lojas e grupos). É o is_active da oferta e do produto; nada é apagado. Só quem tem `ofertas.moderar`.
const Body = z.object({ oferta: z.boolean().optional(), produto: z.boolean().optional() }).strict().refine((b) => b.oferta !== undefined || b.produto !== undefined);

export async function PATCH(request: Request, ctx: RouteContext<"/api/offers/[id]/vitrine">) {
  const eu = await exigir("ofertas.moderar", request);
  if (eu instanceof Response) return eu;
  const offerId = Number((await ctx.params).id);
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success || !Number.isInteger(offerId)) return Response.json({ erro: "pedido inválido" }, { status: 400 });
  const o = await prisma.offer.findUnique({ where: { id: offerId }, select: { id: true, productId: true } });
  if (!o) return Response.json({ erro: "oferta não encontrada" }, { status: 404 });
  const { oferta, produto } = parsed.data;
  if (produto !== undefined && !o.productId) return Response.json({ erro: "esta oferta não tem produto da loja (só dá para tirar a oferta)" }, { status: 400 });
  if (oferta !== undefined) await prisma.offer.update({ where: { id: o.id }, data: { isActive: oferta } });
  if (produto !== undefined) await prisma.product.update({ where: { id: o.productId! }, data: { isActive: produto } });
  await pool.query("select pg_notify($1, $2)", [NOTIFY_CHANNEL, JSON.stringify({ type: "offer", id: o.id })]);
  return Response.json({ ok: true });
}
