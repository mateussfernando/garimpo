import { CargoInput, slugCargo } from "@/lib/admin";
import { prisma } from "@/lib/db/prisma";
import { exigir } from "@/lib/sessao";

// Cargo novo: nome, descrição e as permissões marcadas.
export async function POST(request: Request) {
  const eu = await exigir("usuarios.gerenciar", request);
  if (eu instanceof Response) return eu;
  const parsed = CargoInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ erro: parsed.error.issues[0]?.message ?? "pedido inválido" }, { status: 400 });
  const { nome, descricao, permissoes } = parsed.data;
  const row = await prisma.cargo.create({
    data: {
      slug: await slugCargo(nome),
      nome,
      descricao: descricao ?? null,
      permissoes: { create: [...new Set(permissoes)].map((permissaoSlug) => ({ permissaoSlug })) },
    },
    select: { id: true },
  });
  return Response.json({ ok: true, id: row.id });
}
