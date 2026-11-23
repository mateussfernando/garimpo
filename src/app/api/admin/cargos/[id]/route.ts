import { z } from "zod";
import { CargoInput } from "@/lib/admin";
import { prisma } from "@/lib/db/prisma";
import { exigir } from "@/lib/sessao";

const Body = z.discriminatedUnion("acao", [
  CargoInput.extend({ acao: z.literal("editar") }),
  z.object({ acao: z.literal("padrao") }),
  z.object({ acao: z.literal("ativo"), isActive: z.boolean() }),
]);

async function find(idText: string) {
  const id = Number(idText);
  return Number.isInteger(id) ? prisma.cargo.findUnique({ where: { id } }) : null;
}

// Editar nome, descrição e permissões, tornar este o cargo de quem se cadastra, ou ativar/desativar.
export async function PATCH(request: Request, ctx: RouteContext<"/api/admin/cargos/[id]">) {
  const eu = await exigir("usuarios.gerenciar", request);
  if (eu instanceof Response) return eu;
  const cargo = await find((await ctx.params).id);
  if (!cargo) return Response.json({ erro: "cargo não encontrado" }, { status: 404 });
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ erro: parsed.error.issues[0]?.message ?? "pedido inválido" }, { status: 400 });
  const b = parsed.data;
  if (b.acao === "ativo") {
    // Desativado: some da lista para escolher e quem está nele fica com as permissões do padrão. Nada é apagado.
    if (!b.isActive && cargo.todas) return Response.json({ erro: "o cargo de administrador não se desativa" }, { status: 400 });
    if (!b.isActive && cargo.padrao) return Response.json({ erro: "é o cargo de quem se cadastra: escolha outro padrão antes" }, { status: 400 });
    await prisma.cargo.update({ where: { id: cargo.id }, data: { isActive: b.isActive } });
    return Response.json({ ok: true });
  }
  if (b.acao === "padrao") {
    if (cargo.todas) return Response.json({ erro: "quem se cadastra nunca vira administrador" }, { status: 400 });
    if (!cargo.isActive) return Response.json({ erro: "ative o cargo antes de usá-lo para quem se cadastra" }, { status: 400 });
    await prisma.$transaction([
      prisma.cargo.updateMany({ where: { padrao: true }, data: { padrao: false } }),
      prisma.cargo.update({ where: { id: cargo.id }, data: { padrao: true } }),
    ]);
    return Response.json({ ok: true });
  }
  // O administrador tem todas as permissões sempre: só o nome e a descrição mudam.
  await prisma.$transaction([
    prisma.cargo.update({ where: { id: cargo.id }, data: { nome: b.nome, descricao: b.descricao ?? null } }),
    ...(cargo.todas
      ? []
      : [
          prisma.cargoPermissao.deleteMany({ where: { cargoId: cargo.id } }),
          prisma.cargoPermissao.createMany({ data: [...new Set(b.permissoes)].map((permissaoSlug) => ({ cargoId: cargo.id, permissaoSlug })) }),
        ]),
  ]);
  return Response.json({ ok: true });
}

// Apagar só cargo criado na tela e sem ninguém nele (os do sistema, admin e usuário, ficam).
export async function DELETE(request: Request, ctx: RouteContext<"/api/admin/cargos/[id]">) {
  const eu = await exigir("usuarios.gerenciar", request);
  if (eu instanceof Response) return eu;
  const cargo = await find((await ctx.params).id);
  if (!cargo) return Response.json({ erro: "cargo não encontrado" }, { status: 404 });
  if (cargo.sistema) return Response.json({ erro: "os cargos do sistema não se apagam" }, { status: 400 });
  if (cargo.padrao) return Response.json({ erro: "é o cargo de quem se cadastra: escolha outro padrão antes" }, { status: 400 });
  const n = await prisma.user.count({ where: { cargoId: cargo.id } });
  if (n) return Response.json({ erro: `${n} ${n === 1 ? "pessoa tem" : "pessoas têm"} este cargo: mude o cargo delas antes` }, { status: 400 });
  await prisma.cargo.delete({ where: { id: cargo.id } });
  return Response.json({ ok: true });
}
