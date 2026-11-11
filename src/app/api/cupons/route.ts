import { connection } from "next/server";
import { getCupons } from "@/lib/cupons";

export async function GET() {
  await connection();
  return Response.json(await getCupons(), { headers: { "Cache-Control": "no-store" } });
}
