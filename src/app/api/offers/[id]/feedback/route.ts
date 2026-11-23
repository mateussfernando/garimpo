import { connection } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { exigir } from "@/lib/sessao";

// "Essa nota fez sentido?": o 👍 (1) ou 👎 (-1) de uma conta numa oferta. É o gabarito mais direto da nota (src/lib/nota.ts):
// guarda o voto com a nota e o preço que estavam na tela. Só conta (nunca visitante); um voto por conta e oferta, trocável.

const Body = z
  .object({
    voto: z.union([z.literal(1), z.literal(-1)]),
    notaMostrada: z.number().min(0).max(10).nullable().optional(),
    preco: z.enum(["cartao", "pix"]),
  })
  .strict();

const idDe = async (ctx: RouteContext<"/api/offers/[id]/feedback">) => {
  const n = Number((await ctx.params).id);
  return Number.isInteger(n) && n > 0 ? n : null;
};

/** O voto desta conta nesta oferta (null = ainda não votou). */
export async function GET(request: Request, ctx: RouteContext<"/api/offers/[id]/feedback">) {
  await connection();
  const eu = await exigir("ofertas.ver", request);
  if (eu instanceof Response) return eu;
  const offerId = await idDe(ctx);
  if (offerId == null) return Response.json({ erro: "id inválido" }, { status: 400 });
  const v = await prisma.notaFeedback.findUnique({ where: { userId_offerId: { userId: eu.id, offerId } }, select: { voto: true } });
  return Response.json({ voto: v?.voto ?? null }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request, ctx: RouteContext<"/api/offers/[id]/feedback">) {
  const eu = await exigir("ofertas.ver", request);
  if (eu instanceof Response) return eu;
  const offerId = await idDe(ctx);
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (offerId == null || !parsed.success) return Response.json({ erro: "pedido inválido" }, { status: 400 });
  if (!(await prisma.offer.findUnique({ where: { id: offerId }, select: { id: true } }))) return Response.json({ erro: "oferta não encontrada" }, { status: 404 });
  const { voto, notaMostrada, preco } = parsed.data;
  const dados = { voto, notaMostrada: notaMostrada ?? null, preco };
  await prisma.notaFeedback.upsert({ where: { userId_offerId: { userId: eu.id, offerId } }, create: { userId: eu.id, offerId, ...dados }, update: dados });
  return Response.json({ ok: true, voto });
}

/** Tira o voto (clicar de novo no mesmo botão). */
export async function DELETE(request: Request, ctx: RouteContext<"/api/offers/[id]/feedback">) {
  const eu = await exigir("ofertas.ver", request);
  if (eu instanceof Response) return eu;
  const offerId = await idDe(ctx);
  if (offerId == null) return Response.json({ erro: "id inválido" }, { status: 400 });
  await prisma.notaFeedback.deleteMany({ where: { userId: eu.id, offerId } });
  return Response.json({ ok: true, voto: null });
}
