import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseOfferText, trechoDaOferta, type ParsedOffer } from "./parser";

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

describe("post com vários produtos", () => {
  const lista = [
    "🦫 Fontes · menor preço por modelo (15% OFF) 🔥",
    "🎟 Cupom: POTENTEDEMAIS (toque para copiar)",
    "",
    "🎮 650W — 🔥 R$ 203",
    "➡️ Fonte Montech Beta 2, 650W, 80 PLUS, Preto - BETA2650W",
    "🛒 https://ofertou.ai/5gDn-Kabum",
    "",
    "🎮 850W — 🔥 R$ 271",
    "➡️ Fonte Montech Beta 2, 850W, Preto - BETA2850W",
    "🛒 https://ofertou.ai/yoKG-Kabum",
    "",
    "🎮 1600W — 🔥 R$ 2.549",
    "➡️ Fonte MSI MPG Ai1600TS PCIE5, 1600W, 80 Plus Titanium, Modular,…",
    "🛒 https://ofertou.ai/U44f-Kabum",
  ].join("\n");

  it("o preço sai do bloco do produto do título, não do último da lista", () => {
    const t = trechoDaOferta(lista, "Fonte Montech Beta 2, 650W, 80 PLUS, Preto - BETA2650W");
    expect(t).not.toBeNull();
    expect(parseOfferText(t!).priceCardCents).toBe(20300);
    expect(parseOfferText(trechoDaOferta(lista, "Fonte Montech Beta 2, 850W, Preto - BETA2850W")!).priceCardCents).toBe(27100);
  });

  it("post de um produto só fica como está", () => {
    expect(trechoDaOferta("Fonte Montech Beta 2 650W\n\nR$ 203\n\nhttps://ofertou.ai/5gDn-Kabum", "Fonte Montech Beta 2 650W")).toBeNull();
  });
});
