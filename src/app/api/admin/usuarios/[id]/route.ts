import { z } from "zod";
import { contarAdmins } from "@/lib/admin";
import { prisma } from "@/lib/db/prisma";
import { exigir } from "@/lib/sessao";

// Trocar o cargo de um usuário. Nunca deixa o app sem nenhum administrador.
const Body = z.object({ cargoId: z.number().int().positive() });

export async function PATCH(request: Request, ctx: RouteContext<"/api/admin/usuarios/[id]">) {
  const eu = await exigir("usuarios.gerenciar", request);
  if (eu instanceof Response) return eu;
  const { id } = await ctx.params;
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ erro: "pedido inválido" }, { status: 400 });
  const [alvo, cargo] = await Promise.all([
    prisma.user.findUnique({ where: { id }, select: { id: true, cargo: { select: { todas: true } } } }),
    prisma.cargo.findUnique({ where: { id: parsed.data.cargoId } }),
  ]);
  if (!alvo) return Response.json({ erro: "usuário não encontrado" }, { status: 404 });
  if (!cargo) return Response.json({ erro: "cargo não encontrado" }, { status: 404 });
  if (alvo.cargo?.todas && !cargo.todas && (await contarAdmins()) <= 1) {
    return Response.json({ erro: "é o único administrador: dê o cargo de admin a outra pessoa antes" }, { status: 400 });
  }
  await prisma.user.update({ where: { id }, data: { cargoId: cargo.id } });
  return Response.json({ ok: true });
}
