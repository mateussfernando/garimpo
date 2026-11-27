import { describe, expect, it } from "vitest";
import { metadadosRecurso, metadadosServidor, origemDe, redirectValido } from "./oauth";

describe("OAuth do MCP", () => {
  it("retorno só https, ou http no próprio computador, sem fragmento nem usuário", () => {
    for (const u of ["https://claude.ai/api/mcp/auth_callback", "http://localhost:6274/cb", "http://127.0.0.1/cb"]) expect(redirectValido(u), u).toBe(true);
    for (const u of ["http://evil.example/cb", "https://a.com/cb#x", "https://u:p@a.com/cb", "javascript:alert(1)", "nada"]) expect(redirectValido(u), u).toBe(false);
  });
  it("metadados apontam para o próprio site e só aceitam PKCE S256", () => {
    expect(metadadosRecurso("https://g.app")).toMatchObject({ resource: "https://g.app/api/mcp", authorization_servers: ["https://g.app"] });
    const s = metadadosServidor("https://g.app");
    expect(s.issuer).toBe("https://g.app");
    expect(s.code_challenge_methods_supported).toEqual(["S256"]);
    expect(s.grant_types_supported).not.toContain("implicit");
  });
  it("a origem vem do Host (na Vercel, x-forwarded-*), não do endereço interno", () => {
    expect(origemDe(new Request("http://0.0.0.0:3333/api/mcp", { headers: { host: "localhost:3333" } }))).toBe("http://localhost:3333");
    expect(origemDe(new Headers({ "x-forwarded-host": "garimpo.vercel.app", "x-forwarded-proto": "https" }))).toBe("https://garimpo.vercel.app");
  });
});
