// pnpm db:backup [rótulo]  ->  dump completo do banco (pg_dump -Fc) em ~/garimpo-backups (fora do projeto).
// Regra do diário (22/11): dump antes de cada fase que mexe no banco, e nenhum dump é apagado.
import "dotenv/config";
import { spawnSync } from "node:child_process";
import { mkdirSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("Falta DATABASE_URL no .env");
const bin = process.env.PG_BIN ? join(process.env.PG_BIN, process.platform === "win32" ? "pg_dump.exe" : "pg_dump") : "pg_dump";
const dir = process.env.BACKUP_DIR ?? join(homedir(), "garimpo-backups");
mkdirSync(dir, { recursive: true });
const db = new URL(url).pathname.slice(1);
const d = new Date();
const two = (n) => String(n).padStart(2, "0");
const stamp = `${d.getFullYear()}${two(d.getMonth() + 1)}${two(d.getDate())}-${two(d.getHours())}${two(d.getMinutes())}`; // hora local
const label = (process.argv[2] ?? "manual").replace(/[^a-z0-9-]+/gi, "-");
const file = join(dir, `${db}-${stamp}-${label}.dump`);
// A URL vai por variável de ambiente, nunca na linha de comando (não aparece na lista de processos).
const u = new URL(url);
const env = { ...process.env, PGHOST: u.hostname, PGPORT: u.port || "5432", PGUSER: decodeURIComponent(u.username), PGPASSWORD: decodeURIComponent(u.password), PGDATABASE: db };
const r = spawnSync(bin, ["-Fc", "--no-owner", "-f", file], { env, stdio: "inherit" });
if (r.status !== 0) process.exit(r.status ?? 1);
writeFileSync(join(dir, "ULTIMO.txt"), file);
console.log(`dump ok: ${file} (${(statSync(file).size / 1e6).toFixed(1)} MB)`);
