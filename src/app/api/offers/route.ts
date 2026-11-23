import { connection } from "next/server";
import { listOffers } from "@/lib/offers";
import { exigirOuVisitante } from "@/lib/sessao";
import { contextoDe, ofertaVisivel } from "@/lib/visao";

export async function GET() {
  await connection(); // sempre na hora do pedido, nunca pré-renderizado
  const eu = await exigirOuVisitante("ofertas.ver");
  if (eu instanceof Response) return eu;
  const c = await contextoDe(eu);
  return Response.json((await listOffers({ userId: eu.id })).map((o) => ofertaVisivel(o, c)), { headers: { "Cache-Control": "no-store" } });
}
