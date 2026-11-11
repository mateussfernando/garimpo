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
  it("ficha de notebook entra como notebook, não como SSD", () => {
    const t = titleOf(`🔥 LENOVO IDEAPAD SLIM 3 (RYZEN 5 7535HS/ 512 GB SSD/ 16 GB RAM)\n-16GB RAM\n-512GB SSD (EXPANSÍVEL)\n💰 R$ 2.779\n${LINK}`);
    expect(t).toBe("LENOVO IDEAPAD SLIM 3 (RYZEN 5 7535HS/ 512 GB SSD/ 16 GB RAM)");
    expect(matchAlvo(t, alvos)).toBeNull();
    expect(titleOf(`SPECS: RTX 3050 6 GB/ Core 5 210H/ 8 GB RAM DDR4/ 512 GB SSD\n${LINK}`)).toBe("sem-produto");
    expect(matchAlvo("-512GB SSD (EXPANSÍVEL)", alvos)).toBeNull();
  });

  it("chamada de efeito não é título: vale a linha com o modelo", () => {
    expect(titleOf(`MONITOR BRABO NO PRECINHO QUE TU GOSTA 🖥️\n\nMonitor Gamer AOC 27" Full HD 144Hz Agon G50 IPS\n💰 R$ 578\n${LINK}`)).toBe('Monitor Gamer AOC 27" Full HD 144Hz Agon G50 IPS');
    expect(titleOf(`TEU OLHO NÃO ACOMPANHA, MAS O MONITOR SIM 🖥️\nMonitor TCL 25" Gamer FHD QD Mini LED 300Hz\n${LINK}`)).toBe('Monitor TCL 25" Gamer FHD QD Mini LED 300Hz');
  });

  it("chamada de efeito sozinha, sem produto, não é oferta; a linha do produto vence a chamada", () => {
    expect(titleOf(`CABE O MONITOR, O TECLADO E A BAGUNÇA 🪑\n💰 R$ 317\n${LINK}`)).toBe("sem-produto");
    expect(matchAlvo(titleOf(`TROCA ESSE TECLADO DE ESCRITÓRIO AÍ 🖱️\n${LINK}`), alvos)).toBeNull();
    expect(titleOf(`Monitor Oled da Samsung\n${LINK}`)).toBe("Monitor Oled da Samsung");
    expect(titleOf(`SUA COLUNA PEDIU ESSA AQUI 🪑\n\nCadeira de Escritório Diretor Giratória Otello\n\n💵 De R$ 349 por R$ 94,91 (-73%) no Pix\n\n👉 ${LINK}`)).toBe(
      "Cadeira de Escritório Diretor Giratória Otello",
    );
  });

  it("emoji, negrito e propaganda do canal não escondem o produto", () => {
    expect(titleOf(`✔️ Placa-Mãe Msi X870e Gaming Plus Wifi, Amd, Am5, Atx, Ddr5\n\n💰 Por: R$ 1.642\n\n✅ LINK: ${LINK}\n\nTelegram de Ofertas:\nhttps://t.me/ofertasbenevides`)).toBe(
      "Placa-Mãe Msi X870e Gaming Plus Wifi, Amd, Am5, Atx, Ddr5",
    );
    expect(titleOf(`5700x Processador Ryzen 7 5700x 3.4ghz (4.6ghz Max) - Novo S/Box\n\n💵 R$ 790 no PIX\n\n✅ Link do produto:\n${LINK}\n\n🔔 BOT DE ALERTAS: https://t.me/alertadaspromobot`)).toContain("Processador Ryzen 7");
    expect(titleOf(`R$ 100 OFF!!\n\n** SSD Kingston 1TB Nv3 M.2 Nvme PCIe 4 **\n\nDe: R$ 993,00\n🔥 Por: R$ 893,00\n\n🎟 CUPOM: SSD100\n\nCONFIRA AQUI\n${LINK}`)).toBe("SSD Kingston 1TB Nv3 M.2 Nvme PCIe 4");
    expect(titleOf(`🔥 2x Mouse SMAILWOLF RS7 Bluetooth PAW3311 20000dpi\n\nAdicione 2 unidades\n\n💵 R$ 66,00 com cupom: TJGAMING1\n✅ Link APP: ${LINK}`)).toContain("Mouse SMAILWOLF");
    expect(titleOf(`➡️ Gabinete Gamer Pichau Osiris PRO, Mid-Tower, Lateral de Vidro\n\n✅ R$ 250\n\n🛒 ${LINK}\n\n🎁 Sorteio Play 5 Slim Disco 1TB com 2 Jogos: https://ofertou.ai/s/x`)).toContain("Gabinete Gamer");
  });

  it("conversa não é oferta; post só de cupom continua entrando (vai para Cupons)", () => {
    expect(titleOf(`E a live da asus? kkkkkkkkkkkkkkkkkkkk ${LINK}`)).toBe("sem-produto");
    expect(titleOf(`Usem o Cupom: C0M3C0U35\n\nR$ 35 OFF em R$ 170\n${LINK}`)).not.toBe("sem-produto");
  });

  it("SSD de verdade continua entrando", () => {
    expect(titleOf(`Ssd Lexar Nvme 1Tb Nm610 Pro M.2 2280 Pcie Gen 3\n💰 R$ 768\n${LINK}`)).toContain("Ssd Lexar");
    expect(titleOf(`Ssd 1Tb Safe Gamer Sata Iii 550Mb/S\n${LINK}`)).toContain("Ssd 1Tb");
  });
});
