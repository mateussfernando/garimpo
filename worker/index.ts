import "dotenv/config";
import { pool } from "@/lib/db";
import { collectAll } from "./collect/communities";
import { setPauseListener } from "./http/polite";
import { startTelegram } from "./ingest/telegram";
import { ensureSeed, notify } from "./pipeline";
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
  setPauseListener((host, until) => {
    console.warn(`[pausa] ${host} respondeu 429/403. Volta às ${new Date(until).toLocaleTimeString("pt-BR")}.`);
    void notify({ type: "pause", host, until });
  });

  if (roles.includes("collect")) {
    const run = () => collectAll().catch((e) => console.error("[coleta] erro:", e));
    void run();
    setInterval(run, COLLECT_EVERY);
  }
  if (roles.includes("listen")) {
    startTelegram().catch((e) => console.error("[telegram] erro:", e));
  }
  if (roles.includes("verify")) {
    setInterval(() => verifyTick().catch((e) => console.error("[verificação] erro:", e)), VERIFY_EVERY);
  }
  if (roles.includes("ai")) {
    console.log("[ia] desligada no plano acelerado (entra depois do 11.11)");
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
