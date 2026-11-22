// Quem está usando o site. É a checagem de verdade (o proxy.ts só olha se o cookie existe):
// toda rota de /api e toda leitura de dados por usuário passam por aqui.
import { headers } from "next/headers";
import { cache } from "react";
import { auth } from "@/lib/auth";

export type Usuario = { id: string; name: string; email: string; image: string | null };

/** O usuário da sessão atual, ou null. Uma consulta por pedido (cache do React). */
export const getUser = cache(async (): Promise<Usuario | null> => {
  const s = await auth.api.getSession({ headers: await headers() });
  if (!s) return null;
  return { id: s.user.id, name: s.user.name, email: s.user.email, image: s.user.image ?? null };
});

/** Resposta padrão para quem não está logado. */
export const semSessao = () => Response.json({ erro: "entre para continuar" }, { status: 401 });
