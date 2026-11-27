import { connection } from "next/server";
import { getAcessos } from "@/lib/acessos";
import { exigir } from "@/lib/sessao";

// Acessos ao site para o Painel: quantas pessoas agora, hoje e na semana, por hora e por dia. Os nomes de quem está
// online só vão para quem tem "usuarios.gerenciar" (getAcessos decide).
export async function GET() {
  await connection();
  const eu = await exigir("sistema.ver");
  if (eu instanceof Response) return eu;
  return Response.json(await getAcessos(eu), { headers: { "Cache-Control": "no-store" } });
}
