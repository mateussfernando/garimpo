import { connection } from "next/server";
import { getFontes } from "@/lib/fontes";

export async function GET() {
  await connection();
  return Response.json(await getFontes(), { headers: { "Cache-Control": "no-store" } });
}
