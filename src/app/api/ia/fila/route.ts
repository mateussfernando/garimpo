import { connection } from "next/server";
import { getFila } from "@/lib/fila-ia";

export async function GET() {
  await connection();
  return Response.json(await getFila(), { headers: { "Cache-Control": "no-store" } });
}
