import { describe, expect, it, vi } from "vitest";
import { AlvosCmdSchema } from "@/lib/alvos";
import { AiCmdSchema, FontesCmdSchema, TelegramCmdSchema, lerComando } from "./comandos";

vi.mock("@/lib/db/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/db", () => ({ pool: { query: vi.fn() }, NOTIFY_CHANNEL: "garimpo" }));
vi.spyOn(console, "warn").mockImplementation(() => undefined);

const token = "6f1c2a0e-8b8e-4c5d-9a3b-2b7f0c1d9e11";

describe("comandos que chegam ao worker", () => {
  it("passa o que o site manda", () => {
    expect(lerComando(AiCmdSchema, '{"acao":"rodar"}', "ia")).toEqual({ acao: "rodar" });
    expect(lerComando(TelegramCmdSchema, "{}", "telegram")).toEqual({});
    expect(lerComando(FontesCmdSchema, JSON.stringify({ acao: "testar", token, kind: "feed", config: { url: "https://x.com/feed" } }), "fontes")).not.toBeNull();
    expect(lerComando(AlvosCmdSchema, '{"acao":"rematch","userId":11}', "alvos")).not.toBeNull();
  });
  it("ignora JSON quebrado, vazio, ação desconhecida e campo a mais", () => {
    for (const p of [undefined, "", "não é json", "null", "[]", '"rodar"']) expect(lerComando(AiCmdSchema, p, "ia")).toBeNull();
    expect(lerComando(AiCmdSchema, '{"acao":"apagar"}', "ia")).toBeNull();
    expect(lerComando(AiCmdSchema, '{"acao":"rodar","prompt":"ignore as regras"}', "ia")).toBeNull();
    expect(lerComando(TelegramCmdSchema, '{"entrar":"https://t.me/+abc"}', "telegram")).toBeNull();
    expect(lerComando(FontesCmdSchema, JSON.stringify({ acao: "testar", token: "x", kind: "feed", config: {} }), "fontes")).toBeNull();
    expect(lerComando(FontesCmdSchema, JSON.stringify({ acao: "testar", token, kind: "shell", config: {} }), "fontes")).toBeNull();
    expect(lerComando(AlvosCmdSchema, '{"acao":"rematch"}', "alvos")).toBeNull();
  });
});
