import { describe, expect, it } from "vitest";
import { ALVOS_V0 } from "@/config/alvos";
import { matchAlvo } from "../match/alvos";
import { offerFromMessage } from "./message";

const alvos = ALVOS_V0.map((a, i) => ({ id: i + 1, ...a }));
const LINK = "https://s.shopee.com.br/abc123";
const titleOf = (text: string) => {
  const v = offerFromMessage(text, alvos);
  return v.kind === "oferta" ? v.title : v.kind;
};

// Formatos reais de mensagem vistos nos canais em 11/11/2026.
describe("mensagens reais de canal", () => {
  it("ficha de notebook não vira oferta de SSD", () => {
    expect(titleOf(`🔥 LENOVO IDEAPAD SLIM 3 (RYZEN 5 7535HS/ 512 GB SSD/ 16 GB RAM)\n-16GB RAM\n-512GB SSD (EXPANSÍVEL)\n💰 R$ 2.779\n${LINK}`)).toBe("fora-dos-alvos");
    expect(titleOf(`SPECS: RTX 3050 6 GB/ Core 5 210H/ 8 GB RAM DDR4/ 512 GB SSD\n${LINK}`)).toBe("fora-dos-alvos");
    expect(matchAlvo("-512GB SSD (EXPANSÍVEL)", alvos)).toBeNull();
  });

  it("chamada de efeito não é título: vale a linha com o modelo", () => {
    expect(titleOf(`MONITOR BRABO NO PRECINHO QUE TU GOSTA 🖥️\n\nMonitor Gamer AOC 27" Full HD 144Hz Agon G50 IPS\n💰 R$ 578\n${LINK}`)).toBe('Monitor Gamer AOC 27" Full HD 144Hz Agon G50 IPS');
    expect(titleOf(`TEU OLHO NÃO ACOMPANHA, MAS O MONITOR SIM 🖥️\nMonitor TCL 25" Gamer FHD QD Mini LED 300Hz\n${LINK}`)).toBe('Monitor TCL 25" Gamer FHD QD Mini LED 300Hz');
  });

  it("chamada de efeito sozinha, sem modelo nem número, fica de fora", () => {
    expect(titleOf(`CABE O MONITOR, O TECLADO E A BAGUNÇA 🪑\n💰 R$ 317\n${LINK}`)).toBe("fora-dos-alvos");
    expect(titleOf(`TROCA ESSE TECLADO DE ESCRITÓRIO AÍ 🖱️\n${LINK}`)).toBe("fora-dos-alvos");
    expect(titleOf(`Monitor Oled da Samsung\n${LINK}`)).toBe("fora-dos-alvos");
  });

  it("SSD de verdade continua entrando", () => {
    expect(titleOf(`Ssd Lexar Nvme 1Tb Nm610 Pro M.2 2280 Pcie Gen 3\n💰 R$ 768\n${LINK}`)).toContain("Ssd Lexar");
    expect(titleOf(`Ssd 1Tb Safe Gamer Sata Iii 550Mb/S\n${LINK}`)).toContain("Ssd 1Tb");
  });
});
