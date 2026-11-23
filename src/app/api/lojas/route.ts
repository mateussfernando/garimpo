import { connection } from "next/server";
import { getLojas } from "@/lib/lojas";
import { exigir } from "@/lib/sessao";

export async function GET() {
  await connection();
  const eu = await exigir("lojas.gerenciar");
  if (eu instanceof Response) return eu;
  return Response.json(await getLojas(), { headers: { "Cache-Control": "no-store" } });
}
