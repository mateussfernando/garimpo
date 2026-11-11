import { describe, expect, it } from "vitest";
import { categorize } from "../match/category";
import { couponsFromPost, extractCouponCode, isCouponPost } from "./coupons";
import { parseOfferText } from "./parser";

// Formatos reais vistos nos grupos e comunidades em 11/11/2026.
describe("cupons", () => {
  it("reconhece post que é só cupom, e não post de produto", () => {
    expect(isCouponPost("Cupom Amazon 25% OFF")).toBe(true);
    expect(isCouponPost("R$ 780 de desconto em compras a partir de R$ 4.350")).toBe(true);
    expect(isCouponPost("15% OFF em R$ 79, Limitado a R$ 80 OFF: SEMPREAQUI")).toBe(true);
    expect(isCouponPost("RENOVOU ) CUPOM EXCLUSIVO NUBANK NA SHOPEE")).toBe(true);
    expect(isCouponPost("Por R$ 1.226: Smart TV 43 AOC Full HD DLED Roku 2025", { hasProduct: true })).toBe(false);
    expect(isCouponPost("Fritadeira Elétrica Sem Óleo Air Fryer 5.5L Gaabor", { hasProduct: true })).toBe(false);
  });

  it("lê vários cupons listados numa mensagem", () => {
    const text = "NOVOS CUPONS DE DESCONTO NO MERCADO LIVRE🔥🔥\n\n🎟️ R$15 OFF EM R$ 99:  TODO1111SITE\n\n🎟️ R$40 OFF EM R$ 299:  SITE1111TODO\n\nSALVE SEU CUPOM AQUI✅ : https://mercadolivre.com/sec/2YgfcPA";
    const list = couponsFromPost("NOVOS CUPONS DE DESCONTO NO MERCADO LIVRE", text);
    expect(list).toHaveLength(2);
    expect(list[0]).toMatchObject({ code: "TODO1111SITE", discountKind: "reais", discountValue: 1500, minCents: 9900, storeFromText: "mercadolivre" });
    expect(list[1]).toMatchObject({ code: "SITE1111TODO", discountValue: 4000, minCents: 29900 });
  });

  it("lê código, % e condições de um cupom só", () => {
    const text = "( PELO APP ) NOVO CUPOM DE DESCONTO MAGALU 🔥🔥🔥\n\n🟣 VÁLIDO PARA CONTAS SELECIONADAS\n\n15% OFF em compras ATE 1000\n\nCUPOM: CUPOMINFLU15";
    const [c] = couponsFromPost("( PELO APP ) NOVO CUPOM DE DESCONTO MAGALU", text);
    expect(c).toMatchObject({ code: "CUPOMINFLU15", discountKind: "pct", discountValue: 15, storeFromText: "magalu" });
    expect(c.conditions).toEqual(expect.arrayContaining(["Só no app", "Itens selecionados"]));
  });

  it("palavra comum não vira código", () => {
    expect(extractCouponCode("ASSINE O VIP AQUI PELO APP: cupom AQUI")).toBeNull();
    expect(extractCouponCode("RENOVOU ) CUPOM EXCLUSIVO NUBANK NA SHOPEE")).toBeNull();
    expect(extractCouponCode("Cupom: Cupons shopee disponíveis")).toBeNull();
    expect(parseOfferText("Mac Mini M4 R$ 3.999\nuse o cupom 300DATADUPLAAF").coupon).toBe("300DATADUPLAAF");
  });
});

describe("categorias", () => {
  it("vale o primeiro nome de produto do título", () => {
    expect(categorize("Por R$ 1.226: Smart TV 43 AOC Full HD DLED Roku 2025")).toBe("tv-video");
    expect(categorize("Fritadeira Elétrica Sem Óleo Air Fryer 5.5L Gaabor")).toBe("cozinha");
    expect(categorize("Por R$ 39,90: [Vip] Panettone Lindt Trufado ao Leite 410g")).toBe("mercado");
    expect(categorize("LENOVO IDEAPAD SLIM 3 (RYZEN 5 7535HS/ 512 GB SSD)")).toBe("informatica");
    expect(categorize("APPLE WATCH SE 3 (GPS) (44 mm)")).toBe("relogios");
    expect(categorize("Por R$ 3.725: PlayStation 5 Digital 825GB 1 Controle Branco")).toBe("games");
    expect(categorize("Suporte para TV articulado 32 a 75")).toBe("tv-video");
    expect(categorize("MONITOR DE ÁUDIO MOONDROP MM3A")).toBe("audio");
  });

  it("sem nome de produto conhecido fica para a IA", () => {
    expect(categorize('M5 (16 GB / 512 GB) (13") - R$ 8.589,99')).toBeNull();
    expect(categorize("CHEGA DE LIMPAR O CHÃO DE JOELHO 🧹")).toBeNull();
  });
});
