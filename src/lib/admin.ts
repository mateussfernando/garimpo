// Usuários e cargos, para a tela de admin. Só as rotas com a permissão usuarios.gerenciar chamam isto.
import { z } from "zod";
import { PERMISSOES, type Permissao } from "@/config/permissoes";
import { prisma } from "@/lib/db/prisma";
import { normalize } from "@/lib/money";

export type AdminUsuarioDTO = { id: number; name: string; email: string; cargoId: number | null; isActive: boolean; metodos: string[]; createdAt: string };
export type AdminCargoDTO = {
  id: number;
  slug: string;
  nome: string;
  descricao: string | null;
  todas: boolean;
  padrao: boolean;
  sistema: boolean;
  isActive: boolean;
  permissoes: Permissao[];
  usuarios: number;
};
export type AdminDTO = { usuarios: AdminUsuarioDTO[]; cargos: AdminCargoDTO[]; permissoes: { slug: Permissao; descricao: string }[]; padraoId: number | null };

export async function getAdmin(): Promise<AdminDTO> {
  const [users, cargos] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, email: true, cargoId: true, isActive: true, createdAt: true, accounts: { select: { providerId: true } } },
    }),
    prisma.cargo.findMany({ orderBy: { id: "asc" }, include: { permissoes: true } }),
  ]);
  const padrao = cargos.find((c) => c.padrao) ?? null;
  const contagem = new Map<number, number>();
  for (const u of users) {
    const c = u.cargoId ?? padrao?.id;
    if (c != null) contagem.set(c, (contagem.get(c) ?? 0) + 1);
  }
  return {
    usuarios: users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      cargoId: u.cargoId,
      isActive: u.isActive,
      metodos: [...new Set(u.accounts.map((a) => (a.providerId === "credential" ? "senha" : a.providerId)))],
      createdAt: u.createdAt.toISOString(),
    })),
    cargos: cargos.map((c) => ({
      id: c.id,
      slug: c.slug,
      nome: c.nome,
      descricao: c.descricao,
      todas: c.todas,
      padrao: c.padrao,
      sistema: c.sistema,
      isActive: c.isActive,
      permissoes: c.todas ? (Object.keys(PERMISSOES) as Permissao[]) : (c.permissoes.map((p) => p.permissaoSlug) as Permissao[]),
      usuarios: contagem.get(c.id) ?? 0,
    })),
    permissoes: (Object.entries(PERMISSOES) as [Permissao, string][]).map(([slug, descricao]) => ({ slug, descricao })),
    padraoId: padrao?.id ?? null,
  };
}

const permissaoSchema = z.enum(Object.keys(PERMISSOES) as [Permissao, ...Permissao[]]);

export const CargoInput = z.object({
  nome: z.string().trim().min(2, "o nome precisa ter de 2 a 40 letras").max(40, "o nome precisa ter de 2 a 40 letras"),
  descricao: z.string().trim().max(200).nullable().optional(),
  permissoes: z.array(permissaoSchema).max(Object.keys(PERMISSOES).length),
});

export async function slugCargo(nome: string): Promise<string> {
  const base = normalize(nome).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 30) || "cargo";
  const taken = new Set((await prisma.cargo.findMany({ select: { slug: true } })).map((c) => c.slug));
  let slug = base;
  for (let i = 2; taken.has(slug); i++) slug = `${base}-${i}`;
  return slug;
}

/** Quantos usuários ativos têm um cargo com todas as permissões (os administradores que conseguem entrar). */
export async function contarAdmins(): Promise<number> {
  return prisma.user.count({ where: { isActive: true, cargo: { todas: true } } });
}
