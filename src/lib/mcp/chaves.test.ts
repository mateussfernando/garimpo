import { describe, expect, it } from "vitest";
import { gerarChave, hashDaChave, pareceChave } from "./chaves";

describe("chaves do MCP", () => {
  it("gera gmp_ + 43 caracteres, com o hash da própria chave e o começo para a lista", () => {
    const k = gerarChave();
    expect(pareceChave(k.chave)).toBe(true);
    expect(k.hash).toBe(hashDaChave(k.chave));
    expect(k.hash).toMatch(/^[0-9a-f]{64}$/);
    expect(k.chave.startsWith(k.prefixo)).toBe(true);
    expect(gerarChave().chave).not.toBe(k.chave);
  });
  it("recusa o que não tem o formato (nem vai ao banco)", () => {
    for (const s of ["", "gmp_", "gmp_curta", "abc_" + "x".repeat(43), "gmp_" + "x".repeat(42) + "!", "gmp_" + "x".repeat(44)]) expect(pareceChave(s), s).toBe(false);
  });
});
