import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PERMISSOES, PERMISSOES_DO_USUARIO } from "./permissoes";

// A lista do código e a semente da migração precisam andar juntas: permissão nova entra nas duas.
const semente = readFileSync("prisma/migrations/20261122233257_cargos/migration.sql", "utf8");

describe("permissões", () => {
  it("toda permissão do código está na semente do banco", () => {
    for (const slug of Object.keys(PERMISSOES)) expect(semente).toContain(`('${slug}',`);
  });
  it("o cargo de quem se cadastra recebe só o básico", () => {
    expect(PERMISSOES_DO_USUARIO).toEqual(["ofertas.ver", "ia.analises.ver", "alvos.proprios"]);
    for (const p of PERMISSOES_DO_USUARIO) expect(semente).toContain(`'${p}'`);
    expect(PERMISSOES_DO_USUARIO).not.toContain("usuarios.gerenciar");
  });
});
