// pnpm insights  ->  controla a IA pelo terminal, com as mesmas opções do cabeçalho e da Fila da IA.
// Sem nada: abre o menu. Com uma opção, faz só ela e sai:
//   pnpm insights situacao | pausar | continuar | usar claude|agy|ambos | gerar [n] | ultimos [n] | fila | rodar | radar | ajuda
// Roda no seu PC (como o worker). "gerar" e "radar" chamam a IA aqui mesmo; "rodar" pede a rodada completa ao worker.
import "dotenv/config";
import { createInterface } from "node:readline";
import { AI_CHOICES, AI_CHOICE_KEY, AI_CMD_CHANNEL, AI_STATE_KEY, getAiStatus, type AiChoice } from "@/lib/ai-usage";
import { NOTIFY_CHANNEL, pool } from "@/lib/db";
import { prisma } from "@/lib/db/prisma";
import { asJson } from "@/lib/db/types";
import { getFila } from "@/lib/fila-ia";
import { cleanTitle } from "@/lib/offers";
import { setSetting } from "@/lib/settings";
import { runInsights, type Insight } from "./insights";
import { runRadar } from "./radar";

const NOMES: Record<AiChoice, string> = { claude: "só o Claude", agy: "só o agy", ambos: "Claude e agy juntos" };
const usd = (n: number) => `US$ ${n.toFixed(4)}`;
const hora = (ms: number | null | undefined) => (ms ? new Date(ms).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "-");

async function avisarTelas() {
  await pool.query("select pg_notify($1, $2)", [NOTIFY_CHANNEL, JSON.stringify({ type: "ai" })]);
}

/** O worker está de pé (com a IA ligada)? Ele fica escutando o canal da IA numa conexão do banco. */
async function workerLigado(): Promise<boolean> {
  const [r] = await prisma.$queryRaw<{ n: number }[]>`
    select count(*)::int as n from pg_stat_activity where datname = current_database() and query ilike ${"LISTEN " + AI_CMD_CHANNEL}`;
  return (r?.n ?? 0) > 0;
}

async function situacao() {
  const s = await getAiStatus();
  const por = Object.entries(s.callsTodayBy).map(([p, n]) => `${p} ${n}`).join(", ") || "nenhuma";
  console.log(`\nIA: ${s.paused ? "PAUSADA" : "ligada"} · trabalhando: ${NOMES[s.choice]}`);
  console.log(`Hoje: ${s.callsToday} chamadas (${por}) · ${usd(s.spentTodayUsd)} · total ${usd(s.spentUsd)}`);
  if (s.limits?.fiveHour) {
    // O número vem da última resposta do claude -p: com o Claude parado, fica velho (por isso a data da medida).
    const velho = s.limits.fiveHour.resetsAt != null && s.limits.fiveHour.resetsAt < Date.now();
    console.log(
      `Assinatura do Claude (medida em ${hora(s.limits.at)}): janela de 5 h em ${velho ? "0% (já virou)" : `${Math.round(s.limits.fiveHour.pct)}%`}${s.limits.sevenDay ? `, semana em ${s.limits.sevenDay.resetsAt != null && s.limits.sevenDay.resetsAt < Date.now() ? "0% (já virou)" : `${Math.round(s.limits.sevenDay.pct)}%`}` : ""}`,
    );
  }
  if (s.run?.running) console.log(`Rodada completa em andamento desde ${hora(s.run.startedAt)}`);
  else if (s.run?.finishedAt) console.log(`Última rodada completa: ${hora(s.run.finishedAt)} (${s.run.note ?? ""})`);
  console.log(`Worker: ${(await workerLigado()) ? "rodando" : "parado (rode pnpm dev)"}`);
}

async function pausar(paused: boolean) {
  await setSetting(AI_STATE_KEY, { paused });
  // Como no cabeçalho: continuar já pede uma rodada, para o que ficou parado andar.
  if (!paused) await pool.query("select pg_notify($1, $2)", [AI_CMD_CHANNEL, JSON.stringify({ acao: "rodar" })]);
  await avisarTelas();
  console.log(paused ? "IA pausada: nenhuma chamada nova (nem automática) até você continuar." : "IA ligada de novo, e o worker foi avisado para andar com a fila.");
}

async function usar(modo: string | undefined) {
  if (!modo || !(AI_CHOICES as readonly string[]).includes(modo)) {
    console.log(`Escolha: ${AI_CHOICES.join(", ")}`);
    return;
  }
  await setSetting(AI_CHOICE_KEY, { modo });
  await avisarTelas();
  console.log(`Agora trabalha: ${NOMES[modo as AiChoice]}. Vale a partir da próxima rodada.`);
}

async function gerar(n: number) {
  if ((await getAiStatus()).paused) return console.log("A IA está pausada: use 'continuar' antes de gerar.");
  console.log(`Gerando insights ${n === 1 ? "do produto conferido" : `dos ${n} produtos conferidos`} de nota mais alta (só os que mudaram desde o último)...`);
  const r = await runInsights(n);
  console.log(`Pronto: ${r.gerados} novo(s), ${r.iguais} já em dia.`);
}

async function ultimos(n: number) {
  const rows = await prisma.insight.findMany({
    orderBy: { geradoEm: "desc" },
    take: n,
    include: { product: { select: { title: true, offers: { orderBy: { createdAt: "desc" }, take: 1, select: { title: true } } } } },
  });
  if (!rows.length) return console.log("Nenhum insight ainda.");
  for (const r of rows) {
    const i = asJson<Insight>(r.insight);
    console.log(`\n${hora(r.geradoEm.getTime())} · ${r.provedor} · ${cleanTitle(r.product.title ?? r.product.offers[0]?.title ?? `produto ${r.produtoId}`).slice(0, 70)}`);
    console.log(`  ${i.veredito.toUpperCase()} (confiança ${i.confianca}): ${i.resumo}`);
    for (const m of i.motivos) console.log(`  - ${m}`);
  }
}

async function fila() {
  const f = await getFila();
  console.log(`\nOfertas de 48 h: ${f.total}, ${f.analyzed} já analisadas. Esperando: ${f.waitingOffers} ofertas (${f.waitingProducts} produtos).`);
  for (const w of f.waiting.slice(0, 5)) console.log(`  - ${w.title.slice(0, 70)}`);
}

async function rodar() {
  if (!(await workerLigado())) return console.log("O worker está parado: rode pnpm dev e peça de novo.");
  await pool.query("select pg_notify($1, $2)", [AI_CMD_CHANNEL, JSON.stringify({ acao: "rodar" })]);
  console.log("Pedido enviado: o worker faz categorias, análises, radar e insights até a fila zerar (acompanhe com 'situacao').");
}

async function radar() {
  if ((await getAiStatus()).paused) return console.log("A IA está pausada: use 'continuar' antes.");
  console.log(`Radar: ${await runRadar(true)}`);
}

const AJUDA = `
Opções (no menu, digite o número; direto: pnpm insights <opção>):
  1  situacao          pausada ou não, quem trabalha, chamadas e custo de hoje, uso da assinatura
  2  pausar            para toda chamada de IA (automática e manual)
  3  continuar         liga de novo e pede ao worker para andar com a fila
  4  usar <modo>       quem trabalha: claude, agy ou ambos
  5  gerar [n]         gera agora os insights dos n produtos de nota mais alta (padrão 3)
  6  ultimos [n]       mostra os últimos n insights (padrão 5)
  7  fila              a fila de análises das ofertas
  8  rodar             pede ao worker a rodada completa (o "Chamar IA agora")
  9  radar             refaz o comentário geral (radar) agora
  0  sair`;

const POR_NUMERO = ["sair", "situacao", "pausar", "continuar", "usar", "gerar", "ultimos", "fila", "rodar", "radar"];

/** Faz uma opção. Devolve false para sair. */
async function fazer(entrada: string): Promise<boolean> {
  const [cmd0, arg] = entrada.trim().toLowerCase().split(/\s+/);
  const cmd = /^\d$/.test(cmd0 ?? "") ? POR_NUMERO[Number(cmd0)] : cmd0;
  const n = (padrao: number) => Math.max(1, Math.min(50, Number(arg) || padrao));
  switch (cmd) {
    case "sair":
    case "q":
      return false;
    case "situacao":
    case "status":
      await situacao();
      break;
    case "pausar":
      await pausar(true);
      break;
    case "continuar":
      await pausar(false);
      break;
    case "usar":
      await usar(arg ?? (await perguntar(`Quem trabalha? (${AI_CHOICES.join(", ")}) `)).trim().toLowerCase());
      break;
    case "gerar":
      await gerar(n(3));
      break;
    case "ultimos":
      await ultimos(n(5));
      break;
    case "fila":
      await fila();
      break;
    case "rodar":
      await rodar();
      break;
    case "radar":
      await radar();
      break;
    default:
      console.log(AJUDA);
  }
  return true;
}

// Um leitor só, com fila de linhas (funciona digitando e com a entrada vinda de um pipe).
let rl: ReturnType<typeof createInterface> | null = null;
const linhas: string[] = [];
const esperando: ((l: string | null) => void)[] = [];
let fechado = false;
function leitor() {
  if (rl) return;
  rl = createInterface({ input: process.stdin, output: process.stdout, terminal: process.stdin.isTTY ?? false });
  rl.on("line", (l) => (esperando.length ? esperando.shift()!(l) : linhas.push(l)));
  rl.on("close", () => {
    fechado = true;
    while (esperando.length) esperando.shift()!(null);
  });
}
async function perguntar(texto: string): Promise<string> {
  leitor();
  process.stdout.write(texto);
  const l = linhas.length ? linhas.shift()! : fechado ? null : await new Promise<string | null>((ok) => esperando.push(ok));
  return l ?? "sair";
}

async function main() {
  const args = process.argv.slice(2).join(" ").trim();
  if (args) {
    await fazer(args);
    return;
  }
  await situacao();
  console.log(AJUDA);
  for (;;) {
    const entrada = await perguntar("\nOpção: ");
    if (!entrada.trim()) continue;
    try {
      if (!(await fazer(entrada))) break;
    } catch (e) {
      console.error(`Erro: ${(e as Error).message.slice(0, 200)}`);
    }
  }
}

main()
  .catch((e) => {
    console.error(`Erro: ${(e as Error).message.slice(0, 300)}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    rl?.close();
    await prisma.$disconnect().catch(() => undefined);
    await pool.end().catch(() => undefined);
    process.exit();
  });
