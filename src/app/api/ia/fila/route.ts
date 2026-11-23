import { connection } from "next/server";
import { getFila } from "@/lib/fila-ia";
import { exigir } from "@/lib/sessao";

export async function GET() {
  await connection();
  const eu = await exigir("ia.gerenciar");
  if (eu instanceof Response) return eu;
  return Response.json(await getFila(), { headers: { "Cache-Control": "no-store" } });
}
