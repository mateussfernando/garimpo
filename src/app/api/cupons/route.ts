import { connection } from "next/server";
import { getCupons } from "@/lib/cupons";
import { exigirOuVisitante } from "@/lib/sessao";
import { contextoDe, cupomVisivel } from "@/lib/visao";

export async function GET() {
  await connection();
  const eu = await exigirOuVisitante("ofertas.ver");
  if (eu instanceof Response) return eu;
  const c = await contextoDe(eu);
  return Response.json((await getCupons()).map((x) => cupomVisivel(x, c)), { headers: { "Cache-Control": "no-store" } });
}
