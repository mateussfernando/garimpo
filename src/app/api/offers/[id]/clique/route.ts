import { prisma } from "@/lib/db/prisma";
import { exigir } from "@/lib/sessao";
import { atras } from "@/lib/tempo";

// Quando uma conta clica em Comprar: sinal de que a oferta valeu a pena para a pessoa (gabarito da nota, src/lib/nota.ts).
// Só conta (o visitante nunca é registrado). Cliques repetidos na mesma oferta em 1 minuto contam uma vez.

export async function POST(request: Request, ctx: RouteContext<"/api/offers/[id]/clique">) {
  const eu = await exigir("ofertas.ver", request);
  if (eu instanceof Response) return eu;
  const offerId = Number((await ctx.params).id);
  if (!Number.isInteger(offerId) || offerId <= 0) return Response.json({ erro: "id inválido" }, { status: 400 });
  if (!(await prisma.offer.findUnique({ where: { id: offerId }, select: { id: true } }))) return Response.json({ erro: "oferta não encontrada" }, { status: 404 });
  const recente = await prisma.cliqueComprar.findFirst({ where: { userId: eu.id, offerId, criadoEm: { gte: atras(60_000) } }, select: { id: true } });
  if (!recente) await prisma.cliqueComprar.create({ data: { userId: eu.id, offerId } });
  return Response.json({ ok: true });
}
