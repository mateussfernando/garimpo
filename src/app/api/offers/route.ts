import { connection } from "next/server";
import { listOffers } from "@/lib/offers";

export async function GET() {
  await connection(); // sempre na hora do pedido, nunca pré-renderizado
  return Response.json(await listOffers(), { headers: { "Cache-Control": "no-store" } });
}
