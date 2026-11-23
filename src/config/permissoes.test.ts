import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PERMISSOES, PERMISSOES_DO_USUARIO } from "./permissoes";

// A lista do código e a semente das migrações precisam andar juntas: permissão nova entra no código e numa migração.
const semente = readdirSync("prisma/migrations", { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => readFileSync(`prisma/migrations/${d.name}/migration.sql`, "utf8"))
  .join("\n");

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
