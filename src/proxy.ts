import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { COOKIE, authEnabled, hasAccess } from "@/lib/auth";

// Senha do site no deploy. Sem SITE_PASSWORD (seu PC) não faz nada.
// Páginas sem acesso vão para /entrar; rotas /api respondem 401 (o worker não passa por aqui: fala direto com o banco).
export async function proxy(request: NextRequest) {
  if (!authEnabled()) return NextResponse.next();
  const { pathname } = request.nextUrl;
  if (pathname === "/entrar" || pathname === "/api/entrar") return NextResponse.next();
  if (await hasAccess(request.cookies.get(COOKIE)?.value)) return NextResponse.next();
  if (pathname.startsWith("/api/")) return NextResponse.json({ erro: "acesso negado" }, { status: 401 });
  const url = new URL("/entrar", request.url);
  if (pathname !== "/") url.searchParams.set("de", pathname + request.nextUrl.search);
  return NextResponse.redirect(url);
}

export const config = {
  // Tudo, menos os arquivos estáticos do Next e o ícone.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
