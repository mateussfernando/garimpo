import { describe, expect, it } from "vitest";
import { SCRIPT_TEMA, ehTema, temaEfetivo } from "./tema";

describe("tema", () => {
  it("só aceita os três valores; o resto vale sistema na leitura", () => {
    expect(ehTema("claro")).toBe(true);
    expect(ehTema("escuro")).toBe(true);
    expect(ehTema("sistema")).toBe(true);
    expect(ehTema("dark")).toBe(false);
    expect(ehTema(null)).toBe(false);
  });
  it("sistema segue o aparelho; claro e escuro ignoram", () => {
    expect(temaEfetivo("sistema", true)).toBe("escuro");
    expect(temaEfetivo("sistema", false)).toBe("claro");
    expect(temaEfetivo("claro", true)).toBe("claro");
    expect(temaEfetivo("escuro", false)).toBe("escuro");
  });
  it("o script do <head> põe data-theme e não quebra sem armazenamento", () => {
    const d = { dataset: {} as Record<string, string>, style: {} as Record<string, string> };
    const rodar = (getItem: () => string | null, escuro: boolean) => {
      d.dataset = {};
      new Function("document", "localStorage", "window", SCRIPT_TEMA)({ documentElement: d }, { getItem }, { matchMedia: () => ({ matches: escuro }) });
      return d.dataset.theme;
    };
    expect(rodar(() => "claro", true)).toBe("light");
    expect(rodar(() => "escuro", false)).toBe("dark");
    expect(rodar(() => null, true)).toBe("dark");
    expect(rodar(() => "lixo", false)).toBe("light");
    expect(rodar(() => { throw new Error("bloqueado"); }, true)).toBe("dark");
  });
});
