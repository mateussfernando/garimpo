import { connection } from "next/server";
import { getStatus } from "@/lib/offers";

export async function GET() {
  await connection();
  return Response.json(await getStatus(), { headers: { "Cache-Control": "no-store" } });
}
