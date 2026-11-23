import { connection } from "next/server";
import { getStatus } from "@/lib/offers";
import { exigir } from "@/lib/sessao";
import { statusVisivel } from "@/lib/visao";

export async function GET() {
  await connection();
  const eu = await exigir("ofertas.ver");
  if (eu instanceof Response) return eu;
  return Response.json(statusVisivel(await getStatus(eu.id), eu), { headers: { "Cache-Control": "no-store" } });
}
