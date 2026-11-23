import { connection } from "next/server";
import { getPainel } from "@/lib/painel";
import { exigir } from "@/lib/sessao";

// Números do Painel do admin. Só leitura.
export async function GET() {
  await connection();
  const eu = await exigir("sistema.ver");
  if (eu instanceof Response) return eu;
  return Response.json(await getPainel(eu), { headers: { "Cache-Control": "no-store" } });
}
