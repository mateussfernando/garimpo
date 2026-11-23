import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { proxy } from "./proxy";

const req = (path: string, opts: { method?: string; logado?: boolean } = {}) =>
  new NextRequest(`http://localhost:3333${path}`, { method: opts.method ?? "GET", headers: opts.logado ? { cookie: "better-auth.session_token=abc" } : {} });
const passa = (path: string, opts?: { method?: string; logado?: boolean }) => proxy(req(path, opts)).headers.get("x-middleware-next") === "1";
const status = (path: string, opts?: { method?: string; logado?: boolean }) => proxy(req(path, opts)).status;

describe("o que abre sem conta (só leitura)", () => {
  it("a Vitrine, o Detalhe, os Cupons e o que eles leem passam sem cookie", () => {
    for (const p of ["/", "/cupons", "/oferta/123", "/api/offers", "/api/offers/123", "/api/cupons", "/api/status", "/api/me", "/api/auth/sign-in/email"]) {
      expect(passa(p), p).toBe(true);
    }
  });

  it("o resto das páginas volta para a Vitrine com o popup de entrar aberto, e a API responde 401", () => {
    for (const p of ["/alvos", "/war-room", "/fontes", "/lojas", "/ia", "/admin"]) expect(status(p), p).toBe(307);
    const loc = new URL(proxy(req("/alvos")).headers.get("location")!);
    expect(loc.pathname).toBe("/");
    expect(loc.searchParams.get("entrar")).toBe("1");
    expect(loc.searchParams.get("de")).toBe("/alvos");
    expect(passa("/entrar")).toBe(false); // a página /entrar não existe mais
    for (const p of ["/api/alvos", "/api/stream", "/api/events", "/api/fontes", "/api/lojas", "/api/ia", "/api/ia/fila", "/api/admin", "/api/alvos/1"]) expect(status(p), p).toBe(401);
  });

  it("mudar algo exige conta, mesmo nas rotas abertas para leitura", () => {
    for (const method of ["POST", "PATCH", "PUT", "DELETE"]) {
      for (const p of ["/api/offers/1", "/api/offers/1/vitrine", "/api/cupons/1", "/api/me", "/api/status"]) expect(status(p, { method }), `${method} ${p}`).toBe(401);
    }
  });

  it("não abre por engano caminhos parecidos", () => {
    for (const p of ["/cuponsx", "/api/offersx", "/api/mebla", "/api/cupons-extra", "/ofertas/1"]) expect(passa(p), p).toBe(false);
  });

  it("com o cookie de sessão tudo passa (quem barra de verdade são as rotas)", () => {
    for (const p of ["/alvos", "/api/alvos", "/api/stream", "/admin"]) expect(passa(p, { logado: true }), p).toBe(true);
    expect(passa("/api/offers/1", { method: "PATCH", logado: true })).toBe(true);
  });
});
