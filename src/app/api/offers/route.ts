import { connection } from "next/server";
import { listOffers, porNota } from "@/lib/offers";
import { precoDoPedido } from "@/lib/preco";
import { exigirOuVisitante } from "@/lib/sessao";
import { contextoDe, ofertaVisivel } from "@/lib/visao";

export async function GET(request: Request) {
  await connection(); // sempre na hora do pedido, nunca pré-renderizado
  const eu = await exigirOuVisitante("ofertas.ver");
  if (eu instanceof Response) return eu;
  const c = await contextoDe(eu);
  // `?preco=pix|cartao`: o preço em destaque de quem pede (visitante: do navegador; conta: do banco, via o cliente).
  const ofertas = (await listOffers({ userId: eu.id, pref: precoDoPedido(request) })).map((o) => ofertaVisivel(o, c));
  // A nota final depende da permissão de ver a IA, que só é aplicada na linha acima: a ordem sai depois dela.
  return Response.json(ofertas.sort(porNota), { headers: { "Cache-Control": "no-store" } });
}
