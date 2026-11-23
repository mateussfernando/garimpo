// Análise da IA de cada oferta: "está muito bom ou não?". As métricas saem do código; a IA julga e explica.
// Cobre todas as ofertas da Vitrine (48 h), não só as de nota alta:
// - o mesmo produto postado em vários grupos (mesmo título e preço) é analisado uma vez e vale para todas as cópias;
// - lotes de 12, até 3 indo à IA ao mesmo tempo por provedor (AI_PARALLEL no Claude, AGY_PARALLEL no agy; com os dois
//   ligados na Fila da IA, as pistas dos dois andam juntas), até a fila zerar; as que nunca foram analisadas vêm primeiro;
// - refaz só quando os números da oferta mudam (hash);
// - as pistas do Claude param nas rodadas automáticas quando a janela de 5 h da assinatura passa de 85% (o botão
//   "Chamar IA agora" não para); as do agy seguem, porque ele não tem essa janela.
// O site só lê offer_analyses.
import { createHash } from "node:crypto";
import { z } from "zod";
import { categoryName } from "@/config/categories";
import { STORES } from "@/config/stores";
import { AGY_PARALLEL, AI_PARALLEL } from "@/config/pricing";
import { AI_AUTO_STOP_PCT } from "@/lib/ai-usage";
import { prisma } from "@/lib/db/prisma";
import { DIA, HORA, atras } from "@/lib/tempo";
import { normalize } from "@/lib/money";
import { median, mercadoDe } from "../match/alvos";
import { notify } from "../pipeline";
import { aiPaused, guardedCall } from "./budget";
import { activeProviders, claudeBraked, claudeFiveHourPct } from "./index";
import { AiBudgetError, type AiProvider } from "./types";
const BATCH = 12;
/** Acima disto (% da janela de 5 h), as rodadas automáticas esperam. */
export const AUTO_STOP_PCT = AI_AUTO_STOP_PCT;

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
  "Sem preço, o veredito é 'ok' com confiança baixa, e o resumo diz para conferir o preço na loja.",
  "Não invente histórico, loja, prazo nem especificação. O preço 'de' pode estar inflado: não é prova de desconto.",
  "Com juros, preço não conferido na loja ou esgotado, seja mais cauteloso. Produto de marca desconhecida em marketplace pede cautela.",
  "Seja breve. resumo: uma frase de no máximo 90 caracteres (ex.: 'Menor preço que vimos; 20% abaixo do normal para OLED 55\"'). pros e contras: até 2 cada, com até 45 caracteres.",
  "Português do Brasil. Devolva uma análise para cada id recebido.",
].join(" ");

type Metrics = Record<string, unknown> & { id: number };
type Candidate = { m: Metrics; hash: string; key: string; createdAt: Date; nota: number | null };

const pct = (a: number | null, b: number | null) => (a && b ? Math.round(((a - b) / b) * 1000) / 10 : null);

/** Todas as ofertas de produto das últimas 48 h, com as métricas que a IA recebe. */
async function candidates(): Promise<Candidate[]> {
  const found = await prisma.offer.findMany({
    where: { kind: "produto", dismissed: false, createdAt: { gte: atras(48 * HORA) } },
    select: {
      id: true, title: true, category: true, store: true, priceCardCents: true, installments: true, interest: true, cashCents: true,
      listPriceCents: true, freeShipping: true, coupon: true, verifyStatus: true, available: true, productId: true, alvoId: true,
      bandKey: true, nota: true, createdAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: 3000,
  });
  // A referência da faixa (alvo + faixa) vem numa consulta só e é ligada aqui (não é relação do Prisma).
  const alvoIds = [...new Set(found.map((o) => o.alvoId).filter((x): x is number => x != null))];
  const refRows = alvoIds.length ? await prisma.alvoRef.findMany({ where: { alvoId: { in: alvoIds } } }) : [];
  const refBy = new Map(refRows.map((r) => [`${r.alvoId}:${r.bandKey}`, r]));
  // A análise é a mesma para todo mundo: entra o mercado da faixa (dos Alvos do sistema), nunca o nome do Alvo nem o
  // preço-alvo de alguém, e nunca o nome do grupo que postou.
  const rows = found.map((o) => ({ o, ref: o.alvoId != null && o.bandKey ? refBy.get(`${o.alvoId}:${o.bandKey}`) : undefined }));
  const productIds = [...new Set(rows.map((r) => r.o.productId).filter((x): x is number => x != null))];
  const hist = new Map<number, number[]>();
  if (productIds.length) {
    const pts = await prisma.pricePoint.findMany({
      where: { productId: { in: productIds }, observedAt: { gte: atras(30 * DIA) } },
      select: { productId: true, priceCardCents: true },
    });
    for (const x of pts) if (x.priceCardCents != null) hist.set(x.productId, [...(hist.get(x.productId) ?? []), x.priceCardCents]);
  }
  return rows.map(({ o, ref }) => {
    const h = o.productId ? (hist.get(o.productId) ?? []) : [];
    const med = median(h);
    // O que muda o julgamento. A nota Garimpo e a fonte ficam de fora do hash: mudam toda hora sem mudar a oferta.
    const core = {
      produto: o.title.slice(0, 160),
      categoria: categoryName(o.category),
      loja: STORES.find((s) => s.slug === o.store)?.name ?? "desconhecida",
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
      // Fica no hash, sempre vazio: o nome do Alvo é de cada pessoa. (Tirar a chave mudaria o hash e refaria todas.)
      alvo: null,
      faixa: ref?.label ?? null,
      medianaDaFaixaCents: ref?.medianCents ?? null,
      precoAlvoCents: mercadoDe(ref ?? null).targetCents,
      diferencaVsMedianaFaixaPct: pct(o.priceCardCents, ref?.medianCents ?? null),
      historico30d: h.length ? { pontos: h.length, minimoCents: Math.min(...h), medianaCents: med } : null,
    };
    return {
      m: { id: o.id, ...core, notaGarimpo: o.nota },
      hash: createHash("sha1").update(JSON.stringify(core)).digest("hex").slice(0, 16),
      // Mesmo produto em vários grupos: mesmo título (sem acento e pontuação) e mesmo preço.
      key: `${normalize(o.title).replace(/[^a-z0-9]+/g, "")}|${o.priceCardCents ?? "?"}`,
      createdAt: o.createdAt,
      nota: o.nota,
    };
  });
}

/** O que falta analisar, agrupado por produto: cada grupo vai à IA uma vez. Nunca analisadas primeiro, depois as que mudaram. */
async function pendingGroups(): Promise<{ list: Candidate[][]; total: number; done: number }> {
  const all = await candidates();
  const known = new Map<number, string>();
  for (let i = 0; i < all.length; i += 1000) {
    const ids = all.slice(i, i + 1000).map((c) => c.m.id);
    const rows = await prisma.offerAnalysis.findMany({ where: { offerId: { in: ids } }, select: { offerId: true, hash: true } });
    for (const r of rows) known.set(r.offerId, r.hash);
  }
  const groups = new Map<string, Candidate[]>();
  for (const c of all) if (known.get(c.m.id) !== c.hash) groups.set(c.key, [...(groups.get(c.key) ?? []), c]);
  const list = [...groups.values()].sort((a, b) => {
    const na = a.some((c) => !known.has(c.m.id)) ? 0 : 1;
    const nb = b.some((c) => !known.has(c.m.id)) ? 0 : 1;
    return na - nb || (b[0].nota ?? -1) - (a[0].nota ?? -1) || b[0].createdAt.getTime() - a[0].createdAt.getTime();
  });
  return { list, total: all.length, done: all.filter((c) => known.get(c.m.id) === c.hash).length };
}

let running = false;
let drain = false;
let lastSkipLog = 0;

/** Manda um lote à IA e grava a análise em todas as cópias de cada produto. Devolve quantas ofertas ganharam análise. */
async function analyzeChunk(provider: AiProvider, chunk: Candidate[][]): Promise<number> {
  const { data } = await guardedCall(provider, {
    purpose: "analise",
    system: SYSTEM,
    prompt: `Ofertas (preços em centavos de real):\n${JSON.stringify(chunk.map((g) => g[0].m))}`,
    schema: AnalysisSchema,
  });
  let n = 0;
  const byId = new Map(chunk.map((g) => [g[0].m.id, g]));
  for (const a of data.analises) {
    const group = byId.get(a.id);
    if (!group) continue;
    const base = {
      verdict: a.veredito,
      score: a.nota,
      confidence: a.confianca,
      summary: a.resumo.slice(0, 140),
      pros: a.pros.slice(0, 3).map((x) => x.slice(0, 70)),
      cons: a.contras.slice(0, 3).map((x) => x.slice(0, 70)),
      createdAt: new Date(),
    };
    // Vale para todas as cópias do mesmo produto, cada uma com o seu hash.
    for (const c of group) {
      const values = { ...base, hash: c.hash };
      await prisma.offerAnalysis.upsert({ where: { offerId: c.m.id }, create: { offerId: c.m.id, ...values }, update: values });
      n++;
    }
  }
  await notify({ type: "offer" });
  return n;
}

/**
 * Analisa até `maxBatches` lotes, com até AI_PARALLEL lotes indo à IA ao mesmo tempo.
 * Cada "pista" pega os próximos produtos que ninguém pegou (conjunto `claimed`), então nenhum produto vai duas vezes.
 * Com `manual` (botão "Chamar IA agora"), ignora o freio da janela de 5 h e, se já houver uma rodada andando,
 * pede para ela seguir até zerar a fila em vez de parar no limite dela.
 * Um erro numa pista (recusa, timeout, limite da assinatura) para só aquela pista; pausa para todas.
 */
export async function runAnalises(opts: { maxBatches?: number; manual?: boolean } = {}): Promise<{ analisadas: number; lotes: number; faltam: number }> {
  if (running) {
    if (opts.manual) drain = true;
    return { analisadas: 0, lotes: 0, faltam: -1 };
  }
  running = true;
  drain = !!opts.manual;
  let analisadas = 0;
  let lotes = 0;
  let faltam = 0;
  let stop = false;
  const claimed = new Set<string>();
  const providers = await activeProviders();
  // Com os dois ligados, cada provedor tem as suas pistas; o limite de lotes da rodada cresce junto.
  const lanes = providers.flatMap((p) => Array.from({ length: p.name === "agy" ? AGY_PARALLEL : AI_PARALLEL }, () => p));

  const lane = async (provider: AiProvider) => {
    while (!stop) {
      if (await aiPaused()) return void (stop = true);
      if (lotes >= (drain ? 150 : (opts.maxBatches ?? 6)) * providers.length) return;
      // O freio da janela de 5 h vale só para as pistas do Claude: as do agy continuam.
      if (!drain && provider.name !== "agy" && (await claudeBraked())) {
        if (Date.now() - lastSkipLog > 15 * 60 * 1000) {
          const others = providers.some((p) => p.name === "agy") ? ' O agy continua.' : ' "Chamar IA agora" continua funcionando.';
          console.warn(`[ia] análises automáticas do Claude esperando: janela de 5 h em ${await claudeFiveHourPct()}% (freio em ${AUTO_STOP_PCT}%).${others}`);
          lastSkipLog = Date.now();
        }
        return;
      }
      const { list } = await pendingGroups();
      const free = list.filter((g) => !claimed.has(g[0].key));
      faltam = free.length;
      if (!free.length) return;
      const chunk = free.slice(0, BATCH);
      for (const g of chunk) claimed.add(g[0].key);
      lotes++;
      try {
        // Lê o resultado antes de somar: `analisadas += await ...` perde a conta com as pistas rodando juntas.
        const n = await analyzeChunk(provider, chunk);
        analisadas += n;
      } catch (err) {
        if (err instanceof AiBudgetError) {
          console.warn(`[ia] análises paradas: ${err.message}`);
          stop = true;
        } else console.error(`[ia] erro nas análises (${provider.name}):`, (err as Error).message.slice(0, 200));
        return;
      } finally {
        for (const g of chunk) claimed.delete(g[0].key);
      }
    }
  };

  try {
    // As pistas começam com 1,5 s de diferença para não abrirem vários processos de IA no mesmo instante.
    await Promise.all(lanes.map((p, i) => new Promise((r) => setTimeout(r, i * 1500)).then(() => lane(p))));
  } finally {
    running = false;
    drain = false;
  }
  if (lotes) faltam = (await pendingGroups()).list.length;
  return { analisadas, lotes, faltam };
}

/** Para a aba "Fila da IA": quantas ofertas já têm análise em dia e quantas esperam. */
export async function analysisQueueStats() {
  const { list, total, done } = await pendingGroups();
  return { total, done, waitingGroups: list.length, waitingOffers: list.reduce((n, g) => n + g.length, 0) };
}
