// Quem está usando o site e o que pode fazer. É a checagem de verdade (o proxy.ts só olha se o cookie existe):
// toda rota de /api passa por `exigir()`, e os dados que dependem de quem pede são montados com o `Usuario` daqui.
import { headers } from "next/headers";
import { cache } from "react";
import { PERMISSOES, ehPermissao, type Permissao } from "@/config/permissoes";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";

export type Usuario = {
  id: number;
  name: string;
  email: string;
  image: string | null;
  cargo: { id: number; slug: string; nome: string };
  permissoes: Permissao[];
};

const TODAS = Object.keys(PERMISSOES) as Permissao[];

/** O cargo de quem não tem cargo marcado: o padrão (o de quem se cadastra). */
async function cargoPadrao() {
  return prisma.cargo.findFirst({ where: { padrao: true }, include: { permissoes: true } });
}

/** O usuário da sessão atual com cargo e permissões, ou null. Uma consulta por pedido (cache do React). */
export const getUser = cache(async (): Promise<Usuario | null> => {
  const s = await auth.api.getSession({ headers: await headers() });
  if (!s) return null;
  const row = await prisma.user.findUnique({ where: { id: Number(s.user.id) }, select: { isActive: true, cargo: { include: { permissoes: true } } } });
  // Conta desativada pelo admin vale como sem sessão, na hora (mesmo com o cookie ainda válido).
  if (!row?.isActive) return null;
  // Cargo desativado vale como sem cargo: a pessoa fica com as permissões do padrão.
  const cargo = (row?.cargo?.isActive ? row.cargo : null) ?? (await cargoPadrao());
  // Sem cargo nenhum (banco sem a semente): nenhuma permissão. Nunca o contrário.
  const permissoes = !cargo ? [] : cargo.todas ? TODAS : cargo.permissoes.map((p) => p.permissaoSlug).filter(ehPermissao);
  return {
    id: Number(s.user.id),
    name: s.user.name,
    email: s.user.email,
    image: s.user.image ?? null,
    cargo: cargo ? { id: cargo.id, slug: cargo.slug, nome: cargo.nome } : { id: 0, slug: "nenhum", nome: "Sem cargo" },
    permissoes,
  };
});

/** Quem ainda não entrou: o cargo "Visitante" do banco (as permissões se mudam na tela Usuários). */
export type Visitante = Omit<Usuario, "id"> & { id: null; visitante: true };
export type Quem = Usuario | Visitante;

export const pode = (u: Pick<Usuario, "permissoes"> | null, p: Permissao) => !!u?.permissoes.includes(p);

/**
 * O visitante: sem conta, com as permissões do cargo "Visitante". Sem o cargo no banco (ou desativado), nenhuma
 * permissão: o site fica fechado para quem não entrou. Nunca o contrário.
 */
const getVisitante = cache(async (): Promise<Visitante> => {
  const cargo = await prisma.cargo.findFirst({ where: { slug: "visitante", isActive: true, todas: false }, include: { permissoes: true } });
  return {
    id: null,
    visitante: true,
    name: "Visitante",
    email: "",
    image: null,
    cargo: cargo ? { id: cargo.id, slug: cargo.slug, nome: cargo.nome } : { id: 0, slug: "visitante", nome: "Visitante" },
    permissoes: cargo ? cargo.permissoes.map((p) => p.permissaoSlug).filter(ehPermissao) : [],
  };
});

/** Resposta padrão para quem não está logado. */
export const semSessao = () => Response.json({ erro: "entre para continuar" }, { status: 401 });
export const proibido = () => Response.json({ erro: "você não tem acesso a isto" }, { status: 403 });

/**
 * Para as rotas de /api: o usuário logado (e com a permissão, se pedida) ou a resposta de erro pronta.
 * Uso: `const u = await exigir("fontes.gerenciar"); if (u instanceof Response) return u;`
 * Com `request` de um pedido que muda algo (POST, PATCH, DELETE), também confere que veio do próprio site (CSRF).
 */
export async function exigir(permissao?: Permissao, request?: Request): Promise<Usuario | Response> {
  if (request && !mesmaOrigem(request)) return Response.json({ erro: "pedido de outro site" }, { status: 403 });
  const u = await getUser();
  if (!u) return semSessao();
  if (permissao && !pode(u, permissao)) return proibido();
  return u;
}

/**
 * Para as poucas rotas de LEITURA abertas a quem não tem conta (Vitrine, Detalhe, Cupons, status e /api/me): a pessoa
 * logada ou o visitante. Falta a permissão = 401 (visitante, para entrar) ou 403 (logado).
 */
export async function exigirOuVisitante(permissao: Permissao): Promise<Quem | Response> {
  const u = (await getUser()) ?? (await getVisitante());
  if (!pode(u, permissao)) return "visitante" in u ? semSessao() : proibido();
  return u;
}

/** O pedido veio de uma página do próprio site? (O navegador manda Origin em todo POST, PATCH e DELETE.) */
export function mesmaOrigem(request: Request): boolean {
  if (["GET", "HEAD", "OPTIONS"].includes(request.method)) return true;
  const origin = request.headers.get("origin");
  if (!origin) return false;
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
