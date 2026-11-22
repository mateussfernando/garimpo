import { connection } from "next/server";
import { getAdmin } from "@/lib/admin";
import { exigir } from "@/lib/sessao";

export async function GET() {
  await connection();
  const u = await exigir("usuarios.gerenciar");
  if (u instanceof Response) return u;
  return Response.json(await getAdmin(), { headers: { "Cache-Control": "no-store" } });
}
