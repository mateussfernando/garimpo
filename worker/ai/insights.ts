// Job de insights: as métricas saem do código (histórico de preços e nota). A IA só é chamada
// quando o hash das métricas mudou, e o resultado vai para a tabela `insights`.
// O site só lê dessa tabela; nenhuma chamada de IA acontece dentro de uma requisição.
import { createHash } from "node:crypto";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { z } from "zod";
import { AI_MODEL } from "@/config/pricing";
import { db, schema } from "@/lib/db";
import { median } from "../match/alvos";
import { notify } from "../pipeline";
import { getProvider } from "./index";
import { guardedCall } from "./budget";
import { AiBudgetError, type AiProvider } from "./types";

const { offers, products, pricePoints, alvos, alvoRefs, insights } = schema;

export const InsightSchema = z.object({
  veredito: z.enum(["comprar", "esperar", "evitar"]),
  confianca: z.enum(["alta", "media", "baixa"]),
  resumo: z.string(),
  motivos: z.array(z.string()),
});
export type Insight = z.infer<typeof InsightSchema>;

export type Metrics = {
  produto: string;
  loja: string | null;
  precoAtualCents: number | null;
  pontosHistorico30d: number;
  medianaCents: number | null;
  minimoCents: number | null;
  diferencaVsMedianaPct: number | null;
  nota: number | null;
  alvo: string | null;
  /** Faixa do Alvo usada na comparação (ex.: Monitor 27" QHD) e quantos preços formam a mediana dela. */
  faixa: string | null;
  medianaDaFaixaCents: number | null;
  precosNaFaixa: number;
  precoAlvoCents: number | null;
  tetoCents: number | null;
  alvoAtingido: boolean;
  precoPixCents: number | null;
  precoDeLojaCents: number | null;
  esgotado: boolean;
  cupom: string | null;
  unidadesRestantes: number | null;
  ofertaTerminaEm: string | null;
  freteGratis: boolean | null;
  comJuros: boolean | null;
  parcelas: number | null;
  fontesDistintas48h: number;
};

const SYSTEM = [
  "Você é o analista do Garimpo, um app pessoal que ajuda a decidir compras no cartão parcelado durante o 11.11 e a Black Friday.",
  "Receberá métricas de UM produto, já calculadas. Use só esses números: não invente preço, histórico, loja ou prazo.",
  "O preço principal é o total no cartão. A mediana da faixa é o preço típico, hoje, de produtos do mesmo tipo e especificação; o preço-alvo é 85% dela.",
  "O preço 'de' da loja pode estar inflado: não o trate como prova de desconto. Sem histórico próprio (menos de 5 pontos), apoie-se na mediana da faixa e diga isso; se também não houver faixa, a confiança é baixa.",
  "Responda em português do Brasil. O resumo tem no máximo 200 caracteres e há no máximo 3 motivos curtos.",
  "Veredito: comprar (preço bom e confiável), esperar (dá para esperar um preço melhor) ou evitar (preço ruim, juros ou sinal de armadilha).",
].join(" ");

export async function metricsFor(productId: number): Promise<Metrics | null> {
  const [prod] = await db.select().from(products).where(eq(products.id, productId));
  if (!prod) return null;
  const [o] = await db
    .select()
    .from(offers)
    .where(eq(offers.productId, productId))
    .orderBy(desc(offers.createdAt))
    .limit(1);
  if (!o) return null;
  const alvo = o.alvoId ? (await db.select().from(alvos).where(eq(alvos.id, o.alvoId)))[0] : null;
  const ref =
    o.alvoId && o.bandKey
      ? (await db.select().from(alvoRefs).where(and(eq(alvoRefs.alvoId, o.alvoId), eq(alvoRefs.bandKey, o.bandKey))))[0]
      : null;
  const pts = await db
    .select({ p: pricePoints.priceCardCents })
    .from(pricePoints)
    .where(and(eq(pricePoints.productId, productId), gte(pricePoints.observedAt, sql`now() - interval '30 days'`)));
  const prices = pts.map((r) => r.p).filter((p): p is number => p != null);
  const med = median(prices);
  const current = o.priceCardCents ?? prices.at(-1) ?? null;
  const [{ n }] = await db
    .select({ n: sql<number>`count(distinct ${offers.sourceId})::int` })
    .from(offers)
    .where(and(eq(offers.productId, productId), gte(offers.createdAt, sql`now() - interval '48 hours'`)));
  return {
    produto: (prod.title ?? o.title).slice(0, 160),
    loja: prod.store,
    precoAtualCents: current,
    pontosHistorico30d: prices.length,
    medianaCents: med,
    minimoCents: prices.length ? Math.min(...prices) : null,
    diferencaVsMedianaPct: med && current ? Math.round(((current - med) / med) * 1000) / 10 : null,
    nota: o.nota,
    alvo: alvo?.name ?? null,
    faixa: ref?.label ?? null,
    medianaDaFaixaCents: ref?.medianCents ?? null,
    precosNaFaixa: ref?.n ?? 0,
    precoAlvoCents: ref?.targetCents ?? null,
    tetoCents: ref?.ceilingCents ?? null,
    alvoAtingido: !!(ref?.targetCents && current && current <= ref.targetCents),
    precoPixCents: o.cashCents,
    precoDeLojaCents: o.listPriceCents,
    esgotado: o.available === false,
    cupom: o.coupon,
    unidadesRestantes: o.extra?.stockLeft ?? null,
    ofertaTerminaEm: o.extra?.endsAt ?? null,
    freteGratis: o.freeShipping,
    comJuros: o.interest,
    parcelas: o.installments,
    fontesDistintas48h: n,
  };
}

export const hashOf = (m: Metrics) => createHash("sha1").update(JSON.stringify(m)).digest("hex").slice(0, 16);

/** Produtos com oferta verificada nas últimas 48 h, da maior nota para a menor. */
async function candidates(limit: number): Promise<number[]> {
  const rows = await db
    .selectDistinctOn([offers.productId], { id: offers.productId, nota: offers.nota })
    .from(offers)
    .where(and(eq(offers.verifyStatus, "verificado"), eq(offers.dismissed, false), gte(offers.createdAt, sql`now() - interval '48 hours'`)))
    .orderBy(offers.productId);
  return rows
    .filter((r): r is { id: number; nota: number | null } => r.id != null)
    .sort((a, b) => (b.nota ?? 0) - (a.nota ?? 0))
    .slice(0, limit)
    .map((r) => r.id);
}

/** Gera o insight de um produto se as métricas mudaram. Devolve "gerado", "igual" ou "sem-dados". */
export async function insightFor(provider: AiProvider, productId: number): Promise<"gerado" | "igual" | "sem-dados"> {
  const m = await metricsFor(productId);
  if (!m) return "sem-dados";
  const hash = hashOf(m);
  const periodo = new Date().toISOString().slice(0, 10);
  const [done] = await db
    .select({ id: insights.id })
    .from(insights)
    .where(and(eq(insights.produtoId, productId), eq(insights.periodo, periodo), eq(insights.hashDados, hash)))
    .limit(1);
  if (done) return "igual";
  const { data } = await guardedCall(provider, {
    purpose: "insight",
    system: SYSTEM,
    prompt: `Métricas do produto (preços em centavos de real):\n${JSON.stringify(m, null, 2)}`,
    schema: InsightSchema,
  });
  await db
    .insert(insights)
    .values({ produtoId: productId, periodo, hashDados: hash, provedor: provider.name, modelo: AI_MODEL, insight: data })
    .onConflictDoNothing();
  await notify({ type: "insight", productId });
  return "gerado";
}

let running = false;
/** Uma passada do job. Para na primeira recusa da trava de orçamento. */
export async function runInsights(limit = 5): Promise<{ gerados: number; iguais: number }> {
  if (running) return { gerados: 0, iguais: 0 };
  running = true;
  const out = { gerados: 0, iguais: 0 };
  try {
    const provider = getProvider();
    for (const id of await candidates(limit)) {
      try {
        const r = await insightFor(provider, id);
        if (r === "gerado") out.gerados++;
        else if (r === "igual") out.iguais++;
      } catch (err) {
        if (err instanceof AiBudgetError) {
          console.warn(`[ia] ${err.message}`);
          break;
        }
        console.warn(`[ia] insight do produto ${id} falhou: ${(err as Error).message.slice(0, 160)}`);
      }
    }
  } finally {
    running = false;
  }
  return out;
}
