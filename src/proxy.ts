import { getSessionCookie } from "better-auth/cookies";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Checagem rápida (otimista) em toda página e rota: sem o cookie de sessão, página vai para /entrar e /api responde 401.
// A checagem de verdade (sessão válida no banco, cargo e permissões) fica em src/lib/sessao.ts, perto dos dados.
// O worker não passa por aqui: fala direto com o banco.
const PUBLICAS = ["/entrar", "/api/auth/"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (PUBLICAS.some((p) => pathname === p || pathname.startsWith(p))) return NextResponse.next();
  if (getSessionCookie(request)) return NextResponse.next();
  if (pathname.startsWith("/api/")) return NextResponse.json({ erro: "entre para continuar" }, { status: 401 });
  const url = new URL("/entrar", request.url);
  if (pathname !== "/") url.searchParams.set("de", pathname + request.nextUrl.search);
  return NextResponse.redirect(url);
}

export const config = {
  // Tudo, menos os arquivos estáticos do Next e o ícone.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
