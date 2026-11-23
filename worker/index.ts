import "dotenv/config";
import { STORES, storeForUrl } from "@/config/stores";
import { PAUSES_KEY, getSetting, setSetting, type Pauses } from "@/lib/settings";
import { pgConfig, pool } from "@/lib/db";
import { prisma } from "@/lib/db/prisma";
import { collectAll } from "./collect/communities";
import { pausedHosts, restorePauses, setPauseListener } from "./http/polite";
import { Client } from "pg";
import { AI_CMD_CHANNEL, AI_RUN_KEY } from "@/lib/ai-usage";
import { runAnalises } from "./ai/analises";
import { runCategorias } from "./ai/categorias";
import { runRadar } from "./ai/radar";
import { runInsights } from "./ai/insights";
import { collectVitrines } from "./collect/vitrines";
import { collectConfiguradas, testFonte } from "./collect/genericas";
import { FONTES_CMD_CHANNEL, FONTE_TESTE_KEY, type FontesCmd } from "@/lib/fontes";
import { startTelegram } from "./ingest/telegram";
import { ALVOS_CMD_CHANNEL, AlvosCmdSchema } from "@/lib/alvos";
import { ehDoSistema, ensureSeed, notify, rematchOffers, rematchPessoal, rescoreBand } from "./pipeline";
import { verifyTick } from "./verify/verify";

// Plano acelerado: nada de agendamento. A coleta roda só enquanto o worker
// está ligado (pnpm dev), a cada 10 min, e a verificação a cada 10 s.

const roles = (process.env.WORKER_ROLES ?? "collect,verify")
  .split(",")
  .map((r) => r.trim())
  .filter(Boolean);
const COLLECT_EVERY = 10 * 60 * 1000;
const VERIFY_EVERY = 10 * 1000;

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("Falta DATABASE_URL no .env");
    process.exit(1);
  }
  await ensureSeed();
  const rm = await rematchOffers();
  console.log(
    `[alvos] ${rm.total} ofertas reclassificadas (${rm.changed} mudaram de Alvo ou faixa no sistema, ${rm.pessoais} nos Alvos das contas), ${rm.bands} faixas com referência recalculada`,
  );
  await listenAlvos();
  await listenFontes();
  // Pausas pedidas pelos sites antes deste reinício continuam valendo.
  const saved = (await getSetting<Pauses>(PAUSES_KEY))?.value ?? {};
  const fromStores = await prisma.storeState.findMany();
  restorePauses([
    ...Object.entries(saved).map(([host, until]) => ({ host, until })),
    ...fromStores.flatMap((s) => {
      const domain = STORES.find((x) => x.slug === s.slug)?.domains[0];
      return domain && s.pauseUntil ? [{ host: domain, until: s.pauseUntil.getTime() }] : [];
    }),
  ]);
  const active = pausedHosts();
  if (active.length) console.log(`[pausa] continuam pausados: ${active.map((p) => `${p.host} até ${new Date(p.until).toLocaleTimeString("pt-BR")}`).join(", ")}`);

  setPauseListener((host, until) => {
    console.warn(`[pausa] ${host} pediu para parar (429/403/503). Nenhum pedido a ele até ${new Date(until).toLocaleString("pt-BR")}.`);
    void notify({ type: "pause", host, until });
    void (async () => {
      const cur = (await getSetting<Pauses>(PAUSES_KEY))?.value ?? {};
      const now = Date.now();
      const next = Object.fromEntries(Object.entries({ ...cur, [host]: until }).filter(([, u]) => u > now));
      await setSetting(PAUSES_KEY, next);
    })().catch(() => undefined);
    // A tela Lojas mostra a pausa pedida pela loja (o site pode estar em outro processo).
    const store = storeForUrl(`https://${host}`);
    if (store) {
      const set = { pauseUntil: new Date(until), pauseNote: "pediu para parar (429, 403 ou 503)", updatedAt: new Date() };
      void prisma.storeState.upsert({ where: { slug: store.slug }, create: { slug: store.slug, ...set }, update: set }).catch(() => undefined);
    }
  });

  if (roles.includes("collect")) {
    const run = () => collectAll().catch((e) => console.error("[coleta] erro:", e));
    void run();
    setInterval(run, COLLECT_EVERY);
    // Vitrines das lojas: categorias dos seus Alvos, a cada 30 min (a coleta educada espaça os pedidos).
    const vitrines = () => collectVitrines().catch((e) => console.error("[vitrine] erro:", e));
    setTimeout(vitrines, 90 * 1000);
    setInterval(vitrines, 30 * 60 * 1000);
    // Fontes da tela Fontes (feed, página de ofertas, busca VTEX): cada uma no seu intervalo, conferido a cada minuto.
    const configuradas = () => collectConfiguradas().catch((e) => console.error("[fontes] erro:", e));
    setTimeout(configuradas, 30 * 1000);
    setInterval(configuradas, 60 * 1000);
  }
  if (roles.includes("listen")) {
    startTelegram().catch((e) => console.error("[telegram] erro:", e));
  }
  if (roles.includes("verify")) {
    setInterval(() => verifyTick().catch((e) => console.error("[verificação] erro:", e)), VERIFY_EVERY);
  }
  if (roles.includes("ai")) {
    // Job de insights: a cada 30 min, só chama a IA para produto cujas métricas mudaram (hash).
    const insightsPass = () => runInsights().then((r) => r.gerados && console.log(`[ia] ${r.gerados} insight(s) novo(s)`)).catch((e) => console.error("[ia] erro:", e));
    setTimeout(insightsPass, 60 * 1000);
    setInterval(insightsPass, 30 * 60 * 1000);
    // Categorias: o que as regras não classificaram vai para a IA em lote, a cada 3 min (só se houver pendentes).
    const categorias = () =>
      runCategorias()
        .then((r) => r.lotes && console.log(`[ia] categorias: ${r.classificadas} ofertas classificadas em ${r.lotes} lote(s)`))
        .catch((e) => console.error("[ia] erro nas categorias:", e));
    setTimeout(categorias, 20 * 1000);
    setInterval(categorias, 3 * 60 * 1000);
    // Análise de cada oferta (vale a pena?): a cada 2 min, até 6 lotes de 12 por rodada (3 ao mesmo tempo), até a fila zerar.
    // O radar geral a cada 15 min. Nada roda se a IA estiver pausada.
    const analises = () =>
      runAnalises({ maxBatches: 6 })
        .then((r) => r.analisadas && console.log(`[ia] análises: ${r.analisadas} ofertas em ${r.lotes} lote(s), faltam ${r.faltam} produtos`))
        .catch((e) => console.error("[ia] erro nas análises:", e));
    setTimeout(analises, 45 * 1000);
    setInterval(analises, 2 * 60 * 1000);
    const radar = () => runRadar().catch((e) => console.error("[ia] erro no radar:", e));
    setTimeout(radar, 3 * 60 * 1000);
    setInterval(radar, 15 * 60 * 1000);

    // Botão "Chamar IA agora" do site: o site avisa por pg_notify e a rodada acontece aqui, no worker.
    let rodando = false;
    const rodarAgora = async () => {
      if (rodando) return;
      rodando = true;
      const startedAt = Date.now();
      await setSetting(AI_RUN_KEY, { running: true, startedAt, finishedAt: null, note: null });
      await notify({ type: "ai" });
      let note = "";
      try {
        const c = await runCategorias(4);
        // Vai até zerar a fila (ou 150 lotes), 3 lotes ao mesmo tempo. Se uma rodada automática já estiver andando, ela segue até o fim.
        let a = await runAnalises({ manual: true });
        while (a.faltam === -1) {
          await new Promise((r) => setTimeout(r, 5000));
          a = await runAnalises({ manual: true });
        }
        const r = await runRadar(true);
        const i = await runInsights(3);
        note = `${c.classificadas} categorias, ${a.analisadas} análises, radar ${r}, ${i.gerados} insights`;
        console.log(`[ia] rodada pedida pelo site: ${note}`);
      } catch (e) {
        note = `erro: ${(e as Error).message.slice(0, 120)}`;
        console.error("[ia] erro na rodada pedida:", e);
      } finally {
        rodando = false;
        await setSetting(AI_RUN_KEY, { running: false, startedAt, finishedAt: Date.now(), note });
        await notify({ type: "ai" });
      }
    };
    await setSetting(AI_RUN_KEY, { running: false, startedAt: null, finishedAt: null, note: null });
    const aiCmd = new Client(pgConfig());
    await aiCmd.connect();
    await aiCmd.query(`LISTEN ${AI_CMD_CHANNEL}`);
    aiCmd.on("notification", () => void rodarAgora());
    aiCmd.on("error", (e) => console.error("[ia] canal de comandos caiu:", e.message));
    console.log(`[ia] insights ligados (${process.env.AI_PROVIDER ?? "claude-cli"}, modelo único claude-haiku-5-5)`);
  }
  console.log(`worker ok · papéis: ${roles.join(", ")}`);
}

/** Entre duas reclassificações da mesma conta: muitas mudanças seguidas na tela Alvos viram uma rodada a cada 10 s. */
const REMATCH_GAP = 10_000;

/**
 * A tela Alvos avisa quando uma conta cria, edita, liga, desliga ou apaga um Alvo (reclassifica as ofertas de 7 dias
 * nos Alvos dela) ou muda o preço-alvo de uma faixa (refaz as notas dela). Um pedido por vez; vários seguidos da mesma
 * conta viram uma rodada só. Se a conta é das que decidem a coleta (admin), o sistema também é refeito.
 */
async function listenAlvos() {
  let busy = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const contas = new Set<string>();
  const ultima = new Map<string, number>();
  const bands = new Map<string, { alvoId: number; bandKey: string }>();
  const later = (ms: number) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => void drain(), ms);
  };
  const drain = async () => {
    if (busy) return later(1500);
    busy = true;
    try {
      let wait = 0;
      for (const uid of [...contas]) {
        const falta = (ultima.get(uid) ?? 0) + REMATCH_GAP - Date.now();
        if (falta > 0) {
          wait = Math.max(wait, falta);
          continue;
        }
        contas.delete(uid);
        ultima.set(uid, Date.now());
        if (await ehDoSistema(uid)) {
          const r = await rematchOffers();
          console.log(`[alvos] Alvos de um admin mudaram: ${r.total} ofertas reclassificadas (${r.changed} no sistema, ${r.pessoais} nas contas)`);
        } else {
          const r = await rematchPessoal(uid);
          console.log(`[alvos] Alvos de uma conta mudaram: ${r.changed} ofertas mudaram de Alvo ou faixa para ela`);
        }
      }
      for (const [k, b] of [...bands]) {
        bands.delete(k);
        await rescoreBand(b.alvoId, b.bandKey);
        console.log(`[alvos] preço-alvo da faixa ${b.bandKey} mudou: notas refeitas`);
      }
      if (contas.size) later(Math.max(wait, 500));
    } catch (e) {
      console.error("[alvos] erro ao aplicar mudança da tela Alvos:", e);
    } finally {
      busy = false;
      await notify({ type: "alvos" });
    }
  };
  const cmd = new Client(pgConfig());
  await cmd.connect();
  await cmd.query(`LISTEN ${ALVOS_CMD_CHANNEL}`);
  cmd.on("notification", (n) => {
    let raw: unknown;
    try {
      raw = JSON.parse(n.payload ?? "");
    } catch {
      raw = null;
    }
    // Só o formato que a tela Alvos manda; o resto é ignorado (e registrado).
    const c = AlvosCmdSchema.safeParse(raw);
    if (!c.success) return console.warn("[alvos] comando ignorado: formato inválido");
    if (c.data.acao === "rematch") contas.add(c.data.userId);
    else bands.set(`${c.data.alvoId}:${c.data.bandKey}`, { alvoId: c.data.alvoId, bandKey: c.data.bandKey });
    later(1500);
  });
  cmd.on("error", (e) => console.error("[alvos] canal de comandos caiu:", e.message));
}

/** Botão "Testar" da tela Fontes: o worker lê a fonte uma vez (coleta educada), sem gravar, e devolve o resultado. */
async function listenFontes() {
  const cmd = new Client(pgConfig());
  await cmd.connect();
  await cmd.query(`LISTEN ${FONTES_CMD_CHANNEL}`);
  cmd.on("notification", (n) => {
    void (async () => {
      const c = JSON.parse(n.payload ?? "{}") as FontesCmd;
      if (c.acao !== "testar") return;
      const result = await testFonte(c.kind, c.config);
      await setSetting(FONTE_TESTE_KEY, { token: c.token, at: Date.now(), result });
      await notify({ type: "fonte_teste", token: c.token });
      console.log(`[fontes] teste de ${c.kind}: ${result.note}`);
    })().catch((e) => console.error("[fontes] erro no teste:", e));
  });
  cmd.on("error", (e) => console.error("[fontes] canal de comandos caiu:", e.message));
}

for (const sig of ["SIGINT", "SIGTERM"] as const) {
  process.on(sig, async () => {
    await pool.end().catch(() => undefined);
    process.exit(0);
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
