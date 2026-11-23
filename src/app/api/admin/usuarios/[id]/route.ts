import { z } from "zod";
import { contarAdmins } from "@/lib/admin";
import { tellWorker } from "@/lib/alvos";
import { prisma } from "@/lib/db/prisma";
import { exigir } from "@/lib/sessao";

// Trocar o cargo de um usuário ou ativar/desativar a conta. Nunca deixa o app sem nenhum administrador ativo.
const Body = z.union([z.object({ cargoId: z.number().int().positive() }).strict(), z.object({ isActive: z.boolean() }).strict()]);

export async function PATCH(request: Request, ctx: RouteContext<"/api/admin/usuarios/[id]">) {
  const eu = await exigir("usuarios.gerenciar", request);
  if (eu instanceof Response) return eu;
  const { id } = await ctx.params;
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ erro: "pedido inválido" }, { status: 400 });
  const alvo = await prisma.user.findUnique({ where: { id }, select: { id: true, isActive: true, cargo: { select: { todas: true } } } });
  if (!alvo) return Response.json({ erro: "usuário não encontrado" }, { status: 404 });

  if ("isActive" in parsed.data) {
    const isActive = parsed.data.isActive;
    if (!isActive && id === eu.id) return Response.json({ erro: "você não pode desativar a sua própria conta" }, { status: 400 });
    if (!isActive && alvo.isActive && alvo.cargo?.todas && (await contarAdmins()) <= 1) {
      return Response.json({ erro: "é o único administrador ativo: ative ou crie outro antes" }, { status: 400 });
    }
    await prisma.user.update({ where: { id }, data: { isActive } });
    // Os Alvos da conta param (ou voltam) de ser classificados; se for admin, o sistema também muda.
    await tellWorker({ acao: "rematch", userId: id });
    return Response.json({ ok: true });
  }

  const cargo = await prisma.cargo.findUnique({ where: { id: parsed.data.cargoId } });
  if (cargo && !cargo.isActive) return Response.json({ erro: "este cargo está desativado: ative antes de usar" }, { status: 400 });
  if (!cargo) return Response.json({ erro: "cargo não encontrado" }, { status: 404 });
  if (alvo.isActive && alvo.cargo?.todas && !cargo.todas && (await contarAdmins()) <= 1) {
    return Response.json({ erro: "é o único administrador: dê o cargo de admin a outra pessoa antes" }, { status: 400 });
  }
  await prisma.user.update({ where: { id }, data: { cargoId: cargo.id } });
  return Response.json({ ok: true });
}
