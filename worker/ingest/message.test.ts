import { describe, expect, it } from "vitest";
import { ALVOS_V0 } from "@/config/alvos";
import { matchAlvo } from "../match/alvos";
import { extractOutbound, offerFromMessage } from "./message";

const alvos = ALVOS_V0.map((a, i) => ({ id: i + 1, ...a }));

describe("mensagem do Telegram", () => {
  it("vira oferta quando tem link de loja e nomeia um produto", () => {
    const v = offerFromMessage(
      "🔥 OFERTA RELÂMPAGO 🔥\n\nMouse Gamer Logitech G203 RGB\n💰 R$ 89,90 em 3x sem juros\n\n🛒 https://amzn.to/3abcDEF",
      alvos,
    );
    expect(v).toEqual({ kind: "oferta", title: "Mouse Gamer Logitech G203 RGB", outboundUrl: "https://amzn.to/3abcDEF" });
  });

  it("o título é a linha do produto, não a chamada da primeira linha", () => {
    const v = offerFromMessage("BAIXOU MUITO!!\nMonitor Gamer LG UltraGear 27\" QHD 165Hz por R$ 1.299\nhttps://www.kabum.com.br/produto/123456/monitor", alvos);
    expect(v.kind).toBe("oferta");
    if (v.kind === "oferta") expect(v.title).toContain("Monitor Gamer LG");
  });

  it("papo sem link de loja não é oferta", () => {
    expect(offerFromMessage("alguém sabe se esse mouse é bom?", alvos)).toEqual({ kind: "sem-link" });
    expect(offerFromMessage("olha esse vídeo https://youtube.com/watch?v=abc", alvos)).toEqual({ kind: "sem-link" });
    expect(offerFromMessage("   ", alvos)).toEqual({ kind: "vazia" });
  });

  it("qualquer produto com link de loja entra, mesmo fora dos Alvos", () => {
    const v = offerFromMessage("Air Fryer Mondial 4L por R$ 249\nhttps://www.magazineluiza.com.br/air-fryer/p/abc123/", alvos);
    expect(v).toMatchObject({ kind: "oferta", title: "Air Fryer Mondial 4L por R$ 249" });
  });

  it("notebook com SSD no nome entra como notebook, não como SSD", () => {
    const v = offerFromMessage("Notebook Lenovo IdeaPad 16GB 512GB SSD R$ 2.999\nhttps://amzn.to/xyz1234", alvos);
    expect(v.kind).toBe("oferta");
    if (v.kind === "oferta") expect(matchAlvo(v.title, alvos)).toBeNull();
  });

  it("linha de preço ou cupom não vira título; link sem produto não é oferta", () => {
    expect(offerFromMessage("🔥 Cafeteira Nespresso Essenza Mini\n💰 R$ 399 em 10x\n🎟️ Cupom: BLACK10\nhttps://amzn.to/xyz1234", alvos)).toMatchObject({
      kind: "oferta",
      title: "Cafeteira Nespresso Essenza Mini",
    });
    expect(offerFromMessage("💰 R$ 399\nhttps://amzn.to/xyz1234", alvos)).toMatchObject({ kind: "sem-produto" });
  });

  it("acha o link de loja mesmo com outros links e pontuação no fim", () => {
    expect(extractOutbound("grupo: https://t.me/ofertas\ncompre: https://www.amazon.com.br/dp/B0ABCDEFGH.")).toBe("https://www.amazon.com.br/dp/B0ABCDEFGH");
    expect(extractOutbound("sem loja https://exemplo.com/x")).toBeNull();
  });
});
