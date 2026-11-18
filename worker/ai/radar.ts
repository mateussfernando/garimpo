// Radar da IA: um comentário geral sobre o que está chegando agora (melhores compras, alertas e dicas),
// a partir das ofertas com análise e dos cupons. Uma chamada só, refeita quando o quadro muda (hash).
import { createHash } from "node:crypto";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { z } from "zod";
import { categoryName } from "@/config/categories";
import { STORES } from "@/config/stores";
import { db, schema } from "@/lib/db";
import { getSetting, setSetting } from "@/lib/settings";
import { notify } from "../pipeline";
import { guardedCall } from "./budget";
import { pickProvider } from "./index";
import { AiBudgetError } from "./types";

const { offers, offerAnalyses, coupons } = schema;
export const RADAR_KEY = "ia_radar";

export const RadarSchema = z.object({
  manchete: z.string(),
  destaques: z.array(z.object({ id: z.number().int(), porque: z.string() })),
  alertas: z.array(z.string()),
  dicas: z.array(z.string()),
});
export type Radar = z.infer<typeof RadarSchema>;

const SYSTEM = [
  "Você é o analista do Garimpo, um app pessoal de ofertas do 11.11 e da Black Friday no Brasil. O usuário compra no cartão parcelado.",
  "Receberá as melhores ofertas de agora (com a análise que você já fez de cada uma) e os cupons vistos.",
  "Escreva um radar curto em português do Brasil:",
  "manchete: uma frase (até 120 caracteres) sobre o momento (ex.: 'TVs OLED no menor preço do dia; cupons da Shopee renovados').",
  "destaques: de 3 a 5 ofertas que mais valem a pena agora, pelo id, com o porquê em até 100 caracteres.",
  "alertas: até 3 cuidados concretos (juros, preço 'de' inflado, loja duvidosa, cupom com mínimo alto). Lista vazia se não houver.",
  "dicas: até 3 dicas práticas (combinar cupom com oferta, esperar, comprar já). Lista vazia se não houver.",
  "Use só o que foi dado; não invente preços nem ofertas.",
].join(" ");

/** Uma passada. Com `force`, refaz mesmo que nada tenha mudado. */
export async function runRadar(force = false): Promise<"gerado" | "igual" | "vazio"> {
  const rows = await db
    .select({ o: offers, a: offerAnalyses })
    .from(offers)
    .innerJoin(offerAnalyses, eq(offerAnalyses.offerId, offers.id))
    .where(and(eq(offers.kind, "produto"), eq(offers.dismissed, false), gte(offers.createdAt, sql`now() - interval '24 hours'`)))
    .orderBy(desc(offerAnalyses.score))
    .limit(30);
  if (!rows.length) return "vazio";
  const cps = await db
    .select()
    .from(coupons)
    .where(and(eq(coupons.hidden, false), gte(coupons.lastSeenAt, sql`now() - interval '24 hours'`)))
    .orderBy(desc(coupons.lastSeenAt))
    .limit(15);
  const input = {
    ofertas: rows.map(({ o, a }) => ({
      id: o.id,
      produto: o.title.slice(0, 120),
      categoria: categoryName(o.category),
      loja: STORES.find((s) => s.slug === o.store)?.name ?? null,
      precoCartaoCents: o.priceCardCents,
      comJuros: o.interest,
      freteGratis: o.freeShipping,
      cupom: o.coupon,
      conferido: o.verifyStatus === "verificado",
      veredito: a.verdict,
      notaIA: a.score,
      resumo: a.summary,
    })),
    cupons: cps.map((c) => ({
      loja: STORES.find((s) => s.slug === c.store)?.name ?? null,
      codigo: c.code,
      tipo: c.discountKind,
      valor: c.discountValue,
      minimoCents: c.minCents,
      condicoes: c.conditions,
    })),
  };
  const hash = createHash("sha1").update(JSON.stringify(input)).digest("hex").slice(0, 16);
  const prev = await getSetting<{ hash: string }>(RADAR_KEY);
  if (!force && prev?.value.hash === hash) return "igual";
  let data: Radar;
  try {
    ({ data } = await guardedCall(await pickProvider({ force }), {
      purpose: "radar",
      system: SYSTEM,
      prompt: `Quadro de agora (preços em centavos de real):\n${JSON.stringify(input)}`,
      schema: RadarSchema,
    }));
  } catch (err) {
    if (err instanceof AiBudgetError) console.warn(`[ia] radar parado: ${err.message}`);
    else console.error("[ia] erro no radar:", (err as Error).message.slice(0, 200));
    return "igual";
  }
  const ids = new Set(input.ofertas.map((o) => o.id));
  data.destaques = data.destaques.filter((d) => ids.has(d.id)).slice(0, 5);
  data.alertas = data.alertas.slice(0, 3);
  data.dicas = data.dicas.slice(0, 3);
  await setSetting(RADAR_KEY, { hash, radar: data, at: Date.now() });
  await notify({ type: "radar" });
  return "gerado";
}
