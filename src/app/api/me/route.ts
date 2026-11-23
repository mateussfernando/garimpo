import { connection } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { exigir, exigirOuVisitante } from "@/lib/sessao";

// Quem sou eu: nome, cargo e permissões. O menu e o cabeçalho escondem o que a pessoa não pode usar
// (quem decide de verdade são as rotas, com exigir()).
// Quem não entrou também recebe resposta: o visitante, com as permissões do cargo "Visitante" (id null). Se o cargo não
// deixa ver nada, 401 (o site pede para entrar).
export async function GET() {
  await connection();
  const u = await exigirOuVisitante("ofertas.ver");
  if (u instanceof Response) return u;
  const visitante = "visitante" in u;
  const precoPreferido = visitante ? null : (await prisma.user.findUnique({ where: { id: u.id }, select: { precoPreferido: true } }))?.precoPreferido ?? null;
  return Response.json(
    { id: u.id, visitante, name: u.name, email: u.email, image: u.image, cargo: u.cargo, permissoes: u.permissoes, precoPreferido },
    { headers: { "Cache-Control": "no-store" } },
  );
}

// O preço em destaque que a pessoa escolheu (cartão ou Pix). Só quem tem conta guarda no banco; o visitante guarda no navegador.
const Body = z.object({ precoPreferido: z.enum(["cartao", "pix"]) }).strict();

export async function PATCH(request: Request) {
  const u = await exigir(undefined, request);
  if (u instanceof Response) return u;
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ erro: "pedido inválido" }, { status: 400 });
  await prisma.user.update({ where: { id: u.id }, data: { precoPreferido: parsed.data.precoPreferido } });
  return Response.json({ ok: true });
}
