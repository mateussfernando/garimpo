// Quem está usando o site e o que pode fazer. É a checagem de verdade (o proxy.ts só olha se o cookie existe):
// toda rota de /api passa por `exigir()`, e os dados que dependem de quem pede são montados com o `Usuario` daqui.
import { headers } from "next/headers";
import { cache } from "react";
import { PERMISSOES, ehPermissao, type Permissao } from "@/config/permissoes";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";

export type Usuario = {
  id: string;
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
  const row = await prisma.user.findUnique({ where: { id: s.user.id }, select: { cargo: { include: { permissoes: true } } } });
  const cargo = row?.cargo ?? (await cargoPadrao());
  // Sem cargo nenhum (banco sem a semente): nenhuma permissão. Nunca o contrário.
  const permissoes = !cargo ? [] : cargo.todas ? TODAS : cargo.permissoes.map((p) => p.permissaoSlug).filter(ehPermissao);
  return {
    id: s.user.id,
    name: s.user.name,
    email: s.user.email,
    image: s.user.image ?? null,
    cargo: cargo ? { id: cargo.id, slug: cargo.slug, nome: cargo.nome } : { id: 0, slug: "nenhum", nome: "Sem cargo" },
    permissoes,
  };
});

export const pode = (u: Pick<Usuario, "permissoes"> | null, p: Permissao) => !!u?.permissoes.includes(p);

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
