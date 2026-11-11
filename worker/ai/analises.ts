// Análise da IA de cada oferta: "está muito bom ou não?". Em lote (8 ofertas por chamada), só para oferta nova
// ou cujos números mudaram (hash). As métricas saem do código; a IA julga e explica. O site só lê offer_analyses.
import { createHash } from "node:crypto";
import { and, desc, eq, gte, inArray, isNotNull, sql } from "drizzle-orm";
import { z } from "zod";
import { categoryName } from "@/config/categories";
import { STORES } from "@/config/stores";
import { db, schema } from "@/lib/db";
import { median } from "../match/alvos";
import { notify } from "../pipeline";
import { guardedCall } from "./budget";
import { getProvider } from "./index";
import { AiBudgetError } from "./types";

const { offers, offerAnalyses, alvos, alvoRefs, pricePoints, sources } = schema;
const BATCH = 8;

export const AnalysisSchema = z.object({
  analises: z.array(
    z.object({
      id: z.number().int(),
      veredito: z.enum(["excelente", "boa", "ok", "fraca", "evitar"]),
      nota: z.number().int().min(0).max(100),
      confianca: z.enum(["alta", "media", "baixa"]),
      resumo: z.string(),
      pros: z.array(z.string()),
      contras: z.array(z.string()),
    }),
  ),
});

const SYSTEM = [
  "Você é o analista de compras do Garimpo, um app pessoal de ofertas do 11.11 e da Black Friday no Brasil. O usuário compra no cartão parcelado.",
  "Para cada oferta, diga se está muito boa mesmo: veredito (excelente, boa, ok, fraca, evitar) e uma nota de 0 a 100 de quanto vale comprar agora.",
  "Use primeiro os números dados (preço no cartão, histórico, mediana da faixa, preço-alvo, preço 'de', frete, juros, cupom, se foi conferido na loja).",
  "Pode usar seu conhecimento geral de preços típicos desse tipo de produto no Brasil para julgar, mas então a confiança é média ou baixa e o resumo deve dizer que é estimativa.",
  "Não invente histórico, loja, prazo nem especificação. O preço 'de' pode estar inflado: não é prova de desconto.",
  "Com juros, preço não conferido na loja ou esgotado, seja mais cauteloso. Produto de marca desconhecida em marketplace pede cautela.",
  "Português do Brasil. resumo: uma frase de no máximo 110 caracteres, direta (ex.: 'Menor preço que vimos; 20% abaixo do normal para OLED 55\"'). pros e contras: até 3 cada, curtos (até 60 caracteres).",
  "Devolva uma análise para cada id recebido.",
].join(" ");

type Metrics = Record<string, unknown> & { id: number };

const pct = (a: number | null, b: number | null) => (a && b ? Math.round(((a - b) / b) * 1000) / 10 : null);

/** Ofertas das últimas 48 h com preço, da maior nota para a menor, com as métricas que a IA recebe. */
async function candidates(limit: number): Promise<Metrics[]> {
  const rows = await db
    .select({ o: offers, alvo: alvos.name, ref: alvoRefs, fonte: sources.name })
    .from(offers)
    .innerJoin(sources, eq(sources.id, offers.sourceId))
    .leftJoin(alvos, eq(alvos.id, offers.alvoId))
    .leftJoin(alvoRefs, and(eq(alvoRefs.alvoId, offers.alvoId), eq(alvoRefs.bandKey, offers.bandKey)))
    .where(
      and(
        eq(offers.kind, "produto"),
        eq(offers.dismissed, false),
        isNotNull(offers.priceCardCents),
        gte(offers.createdAt, sql`now() - interval '48 hours'`),
      ),
    )
    .orderBy(sql`${offers.nota} desc nulls last`, desc(offers.createdAt))
    .limit(limit);
  const productIds = [...new Set(rows.map((r) => r.o.productId).filter((x): x is number => x != null))];
  const hist = new Map<number, number[]>();
  if (productIds.length) {
    const pts = await db
      .select({ pid: pricePoints.productId, p: pricePoints.priceCardCents })
      .from(pricePoints)
      .where(and(inArray(pricePoints.productId, productIds), gte(pricePoints.observedAt, sql`now() - interval '30 days'`)));
    for (const x of pts) if (x.p != null) hist.set(x.pid, [...(hist.get(x.pid) ?? []), x.p]);
  }
  return rows.map(({ o, alvo, ref, fonte }) => {
    const h = o.productId ? (hist.get(o.productId) ?? []) : [];
    const med = median(h);
    return {
      id: o.id,
      produto: o.title.slice(0, 160),
      categoria: categoryName(o.category),
      loja: STORES.find((s) => s.slug === o.store)?.name ?? "desconhecida",
      fonte,
      precoCartaoCents: o.priceCardCents,
      parcelas: o.installments,
      comJuros: o.interest,
      precoPixCents: o.cashCents,
      precoDeCents: o.listPriceCents,
      descontoSobreODePct: o.listPriceCents ? -pct(o.priceCardCents, o.listPriceCents)! : null,
      freteGratis: o.freeShipping,
      cupom: o.coupon,
      conferidoNaLoja: o.verifyStatus === "verificado",
      esgotado: o.available === false,
      notaGarimpo: o.nota,
      alvo,
      faixa: ref?.label ?? null,
      medianaDaFaixaCents: ref?.medianCents ?? null,
      precoAlvoCents: ref?.targetCents ?? null,
      diferencaVsMedianaFaixaPct: pct(o.priceCardCents, ref?.medianCents ?? null),
      historico30d: h.length ? { pontos: h.length, minimoCents: Math.min(...h), medianaCents: med } : null,
    };
  });
}

const hashOf = (m: Metrics) => createHash("sha1").update(JSON.stringify(m)).digest("hex").slice(0, 16);

let running = false;
/** Uma passada: até `batches` lotes de ofertas sem análise ou com números novos. */
export async function runAnalises(batches = 2): Promise<{ analisadas: number; lotes: number }> {
  if (running) return { analisadas: 0, lotes: 0 };
  running = true;
  let analisadas = 0;
  let lotes = 0;
  try {
    const list = await candidates(150);
    const done = list.length
      ? await db
          .select({ id: offerAnalyses.offerId, hash: offerAnalyses.hash })
          .from(offerAnalyses)
          .where(inArray(offerAnalyses.offerId, list.map((m) => m.id)))
      : [];
    const known = new Map(done.map((d) => [d.id, d.hash]));
    const todo = list.map((m) => ({ m, hash: hashOf(m) })).filter((x) => known.get(x.m.id) !== x.hash);
    const provider = getProvider();
    for (let b = 0; b < batches && b * BATCH < todo.length; b++) {
      const chunk = todo.slice(b * BATCH, (b + 1) * BATCH);
      lotes++;
      let data: z.infer<typeof AnalysisSchema>;
      try {
        ({ data } = await guardedCall(provider, {
          purpose: "analise",
          system: SYSTEM,
          prompt: `Ofertas (preços em centavos de real):\n${JSON.stringify(chunk.map((x) => x.m))}`,
          schema: AnalysisSchema,
        }));
      } catch (err) {
        if (err instanceof AiBudgetError) console.warn(`[ia] análises paradas: ${err.message}`);
        else console.error("[ia] erro nas análises:", (err as Error).message.slice(0, 200));
        break;
      }
      const byId = new Map(chunk.map((x) => [x.m.id, x.hash]));
      for (const a of data.analises) {
        const hash = byId.get(a.id);
        if (!hash) continue;
        const values = {
          hash,
          verdict: a.veredito,
          score: a.nota,
          confidence: a.confianca,
          summary: a.resumo.slice(0, 160),
          pros: a.pros.slice(0, 3).map((x) => x.slice(0, 80)),
          cons: a.contras.slice(0, 3).map((x) => x.slice(0, 80)),
          createdAt: new Date(),
        };
        await db.insert(offerAnalyses).values({ offerId: a.id, ...values }).onConflictDoUpdate({ target: offerAnalyses.offerId, set: values });
        analisadas++;
      }
      await notify({ type: "offer" });
    }
  } finally {
    running = false;
  }
  return { analisadas, lotes };
}
