import { connection } from "next/server";
import { exigir } from "@/lib/sessao";

// Quem sou eu: nome, cargo e permissões. O menu e o cabeçalho escondem o que a pessoa não pode usar
// (quem decide de verdade são as rotas, com exigir()).
export async function GET() {
  await connection();
  const u = await exigir();
  if (u instanceof Response) return u;
  return Response.json(
    { id: u.id, name: u.name, email: u.email, image: u.image, cargo: u.cargo, permissoes: u.permissoes },
    { headers: { "Cache-Control": "no-store" } },
  );
}
