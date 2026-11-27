import { getSessionCookie } from "better-auth/cookies";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Checagem rápida (otimista) em toda página e rota: sem o cookie de sessão, página vai para a Vitrine com o popup de entrar e /api responde 401.
// A checagem de verdade (sessão válida no banco, cargo e permissões) fica em src/lib/sessao.ts, perto dos dados.
// O worker não passa por aqui: fala direto com o banco.
// /api/acesso: o "estou aqui" de cada aba, também do visitante (a rota confere a origem e tem freio próprio).
// /api/mcp: o MCP do Garimpo, que entra com chave de acesso (Bearer) e não com cookie (a rota confere a chave).
const PUBLICAS = ["/api/auth/", "/api/acesso", "/api/mcp"];
// Abertos a quem não tem conta, só para LER (GET): a Vitrine, o Detalhe, os Cupons e o que as telas leem deles. Quem pode
// ver o quê é o cargo "Visitante" (src/lib/sessao.ts); mudar algo, vigiar, Alvos e o resto continuam pedindo conta.
const ABERTAS_PARA_LER = ["/", "/cupons", "/oferta/", "/api/offers", "/api/cupons", "/api/status", "/api/me"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (PUBLICAS.some((p) => pathname === p || pathname.startsWith(p))) return NextResponse.next();
  if (request.method === "GET" && ABERTAS_PARA_LER.some((p) => pathname === p || (p.endsWith("/") ? p !== "/" && pathname.startsWith(p) : pathname.startsWith(p + "/")))) {
    return NextResponse.next();
  }
  if (getSessionCookie(request)) return NextResponse.next();
  if (pathname.startsWith("/api/")) return NextResponse.json({ erro: "entre para continuar" }, { status: 401 });
  // Página que pede conta: volta para a Vitrine com o popup de entrar aberto (não há página /entrar); depois de entrar, vai para `de`.
  const url = new URL("/", request.url);
  url.searchParams.set("entrar", "1");
  if (pathname !== "/") url.searchParams.set("de", pathname + request.nextUrl.search);
  return NextResponse.redirect(url);
}

export const config = {
  // Tudo, menos os arquivos estáticos do Next e os ícones (favicon de src/app/icon.svg e o do celular, src/app/apple-icon.tsx).
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|apple-icon).*)"],
};
