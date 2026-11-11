import "dotenv/config";
import { STORES, storeForUrl } from "@/config/stores";
import { PAUSES_KEY, getSetting, setSetting, type Pauses } from "@/lib/settings";
import { db, pool, schema } from "@/lib/db";
import { collectAll } from "./collect/communities";
import { pausedHosts, restorePauses, setPauseListener } from "./http/polite";
import { Client } from "pg";
import { AI_CMD_CHANNEL, AI_RUN_KEY } from "@/lib/ai-usage";
import { runAnalises } from "./ai/analises";
import { runCategorias } from "./ai/categorias";
import { runRadar } from "./ai/radar";
import { runInsights } from "./ai/insights";
import { collectVitrines } from "./collect/vitrines";
import { startTelegram } from "./ingest/telegram";
import { ensureSeed, notify, rematchOffers } from "./pipeline";
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
  console.log(`[alvos] ${rm.total} ofertas reclassificadas (${rm.changed} mudaram de Alvo ou faixa), ${rm.bands} faixas com referência recalculada`);
  // Pausas pedidas pelos sites antes deste reinício continuam valendo.
  const saved = (await getSetting<Pauses>(PAUSES_KEY))?.value ?? {};
  const fromStores = await db.select().from(schema.storeState);
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
      void db.insert(schema.storeState).values({ slug: store.slug, ...set }).onConflictDoUpdate({ target: schema.storeState.slug, set }).catch(() => undefined);
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
    // Análise de cada oferta (vale a pena?): a cada 2 min, até 5 lotes de 12 por rodada, até a fila zerar.
    // O radar geral a cada 15 min. Nada roda se a IA estiver pausada.
    const analises = () =>
      runAnalises({ maxBatches: 5 })
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
        // Vai até zerar a fila (ou 60 lotes). Se uma rodada automática já estiver andando, ela segue até o fim.
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
    const aiCmd = new Client({ connectionString: process.env.DATABASE_URL });
    await aiCmd.connect();
    await aiCmd.query(`LISTEN ${AI_CMD_CHANNEL}`);
    aiCmd.on("notification", () => void rodarAgora());
    aiCmd.on("error", (e) => console.error("[ia] canal de comandos caiu:", e.message));
    console.log(`[ia] insights ligados (${process.env.AI_PROVIDER ?? "claude-cli"}, modelo único claude-haiku-5-5)`);
  }
  console.log(`worker ok · papéis: ${roles.join(", ")}`);
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
