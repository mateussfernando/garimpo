import { connection } from "next/server";
import { getLojas } from "@/lib/lojas";

export async function GET() {
  await connection();
  return Response.json(await getLojas(), { headers: { "Cache-Control": "no-store" } });
}
