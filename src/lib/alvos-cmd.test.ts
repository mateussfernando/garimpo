import { describe, expect, it, vi } from "vitest";

// Só o formato do comando importa aqui: o banco não é tocado.
vi.mock("@/lib/db/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/db", () => ({ pool: { query: vi.fn() }, NOTIFY_CHANNEL: "garimpo" }));
const { AlvosCmdSchema } = await import("./alvos");

describe("comando da tela Alvos para o worker", () => {
  it("aceita reclassificar os Alvos de uma conta e refazer uma faixa", () => {
    expect(AlvosCmdSchema.safeParse({ acao: "rematch", userId: "u1" }).success).toBe(true);
    expect(AlvosCmdSchema.safeParse({ acao: "faixa", alvoId: 3, bandKey: "geral" }).success).toBe(true);
  });
  it("recusa o resto: sem conta, ação desconhecida, tipos errados", () => {
    expect(AlvosCmdSchema.safeParse({ acao: "rematch" }).success).toBe(false);
    expect(AlvosCmdSchema.safeParse({ acao: "apagar-tudo", userId: "u1" }).success).toBe(false);
    expect(AlvosCmdSchema.safeParse({ acao: "faixa", alvoId: "3; drop", bandKey: "x" }).success).toBe(false);
    expect(AlvosCmdSchema.safeParse(null).success).toBe(false);
  });
});
