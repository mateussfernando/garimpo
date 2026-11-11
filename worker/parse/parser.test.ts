import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseOfferText, type ParsedOffer } from "./parser";

type Fixture = { nome: string; texto: string; espera: Partial<ParsedOffer> };

const dir = join(__dirname, "../../fixtures/messages");
const fixtures: Fixture[] = readdirSync(dir)
  .filter((f) => f.endsWith(".json"))
  .flatMap((f) => JSON.parse(readFileSync(join(dir, f), "utf8")) as Fixture[]);

function failures(fx: Fixture): string[] {
  const got = parseOfferText(fx.texto);
  return Object.entries(fx.espera)
    .filter(([k, v]) => JSON.stringify(got[k as keyof ParsedOffer]) !== JSON.stringify(v))
    .map(([k, v]) => `${k}: esperado ${JSON.stringify(v)}, veio ${JSON.stringify(got[k as keyof ParsedOffer])}`);
}

describe("parser BR", () => {
  it("acerta pelo menos 80% das fixtures", () => {
    const report = fixtures.map((fx) => ({ nome: fx.nome, erros: failures(fx) }));
    const falhas = report.filter((r) => r.erros.length);
    if (falhas.length) console.log("Fixtures que falham:\n" + falhas.map((f) => `- ${f.nome}: ${f.erros.join("; ")}`).join("\n"));
    const acerto = (fixtures.length - falhas.length) / fixtures.length;
    expect(acerto).toBeGreaterThanOrEqual(0.8);
  });

  for (const fx of fixtures) {
    it(`fixture: ${fx.nome}`, () => {
      expect(failures(fx)).toEqual([]);
    });
  }
});
