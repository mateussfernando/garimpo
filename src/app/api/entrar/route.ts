import { NextResponse } from "next/server";
import { COOKIE, COOKIE_MAX_AGE, accessToken, authEnabled, safeEqual } from "@/lib/auth";

// Entrar no site do deploy. Errar a senha demora 1,5 s, para não dar para testar senhas em sequência.
export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  const senha = String(form?.get("senha") ?? "");
  const de = String(form?.get("de") ?? "/");
  // Só volta para um caminho do próprio site (nada de //outro-site.com).
  const destino = de.startsWith("/") && !de.startsWith("//") ? de : "/";
  if (!authEnabled()) return NextResponse.redirect(new URL(destino, request.url), 303);
  if (!safeEqual(senha, process.env.SITE_PASSWORD ?? "")) {
    await new Promise((r) => setTimeout(r, 1500));
    const back = new URL("/entrar", request.url);
    back.searchParams.set("erro", "1");
    if (destino !== "/") back.searchParams.set("de", destino);
    return NextResponse.redirect(back, 303);
  }
  const res = NextResponse.redirect(new URL(destino, request.url), 303);
  res.cookies.set(COOKIE, await accessToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: new URL(request.url).protocol === "https:",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });
  return res;
}
