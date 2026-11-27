// pnpm db:copiar-supabase  ->  copia os dados do banco deste PC para o Supabase (uma vez, no deploy; docs/deploy.md).
//
// Origem: DATABASE_URL do .env (tem que ser o banco local). Destino: SUPABASE_URL do .env (pooler em modo SESSÃO,
// porta 5432), com as tabelas já criadas por `pnpm db:deploy`. Nada da origem é mudado.
//
// 1. Confere que o destino está vazio (sem ofertas e sem usuários). Se não estiver, para sem mexer em nada.
// 2. Dump só dos dados (pg_dump -Fc --data-only) em ~/garimpo-backups, sem as sessões de login, códigos de verificação,
//    limites de tentativa e o controle de migrações do Prisma (o destino tem o dele).
// 3. No destino, esvazia cargos e permissões (as migrações criam os de fábrica; vale o que está no seu banco, com as
//    suas mudanças) e restaura tudo numa transação só: ou entra tudo, ou nada.
// 4. Compara a contagem de linhas de cada tabela nos dois bancos.
import "dotenv/config";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import pg from "pg";

const origem = process.env.DATABASE_URL;
const destino = process.env.SUPABASE_URL;
if (!origem || !destino) throw new Error("Faltam DATABASE_URL (banco local) e SUPABASE_URL (Supabase, modo sessão) no .env");
if (!/@(localhost|127\.0\.0\.1)[:/]/.test(origem)) throw new Error("DATABASE_URL não é o banco deste PC: rode a cópia antes de trocar o .env para o Supabase");
if (/:6543\//.test(destino)) throw new Error("SUPABASE_URL está na porta 6543 (modo transação). Use a do modo sessão (porta 5432)");

const bin = (n) => (process.env.PG_BIN ? join(process.env.PG_BIN, process.platform === "win32" ? `${n}.exe` : n) : n);
const comSsl = (url) => {
  const u = new URL(url);
  u.searchParams.set("sslmode", "require");
  return u.toString();
};
const conectar = async (url, remoto) => {
  const c = new pg.Client({ connectionString: url, ssl: remoto ? { rejectUnauthorized: false } : undefined });
  await c.connect();
  return c;
};
const FORA = ["_prisma_migrations", "sessoes", "verificacoes", "limites_de_acesso"];
const contar = async (c) => {
  const tabelas = (await c.query("select tablename from pg_tables where schemaname = 'public' order by 1")).rows.map((r) => r.tablename);
  const n = {};
  for (const t of tabelas) if (!FORA.includes(t)) n[t] = (await c.query(`select count(*)::int as n from public."${t}"`)).rows[0].n;
  return n;
};

// 1. Destino vazio?
const dst = await conectar(destino, true);
const migracoes = (await dst.query("select count(*)::int as n from _prisma_migrations where finished_at is not null").catch(() => ({ rows: [{ n: 0 }] }))).rows[0].n;
if (!migracoes) throw new Error("O Supabase ainda não tem as tabelas. Rode antes: pnpm db:deploy com DATABASE_URL apontando para o Supabase (docs/deploy.md)");
const ja = (await dst.query("select (select count(*) from offers)::int as ofertas, (select count(*) from usuarios)::int as usuarios")).rows[0];
if (ja.ofertas || ja.usuarios) throw new Error(`O Supabase já tem dados (${ja.ofertas} ofertas, ${ja.usuarios} usuários). Nada foi copiado.`);

// 2. Dump dos dados deste PC.
const dir = process.env.BACKUP_DIR || join(homedir(), "garimpo-backups");
if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
const p2 = (n) => String(n).padStart(2, "0");
const d = new Date();
const arquivo = join(dir, `garimpo-dados-${d.getFullYear()}${p2(d.getMonth() + 1)}${p2(d.getDate())}-${p2(d.getHours())}${p2(d.getMinutes())}-para-supabase.dump`);
console.log(`[copiar] dump dos dados deste PC em ${arquivo}`);
const dump = spawnSync(bin("pg_dump"), ["-Fc", "--data-only", "-n", "public", ...FORA.flatMap((t) => ["--exclude-table-data", `public.${t}`]), "-f", arquivo, `--dbname=${origem}`], { stdio: "inherit" });
if (dump.status !== 0) throw new Error("pg_dump falhou: nada foi copiado");

// 3. Cargos e permissões de fábrica saem; o restore entra numa transação só.
await dst.query('TRUNCATE public."cargo_permissoes", public."cargos", public."permissoes" RESTART IDENTITY CASCADE');
console.log("[copiar] restaurando no Supabase (pode levar alguns minutos)...");
const restore = spawnSync(bin("pg_restore"), ["--data-only", "--no-owner", "--no-acl", "--single-transaction", "--exit-on-error", `--dbname=${comSsl(destino)}`, arquivo], { stdio: "inherit" });
if (restore.status !== 0) throw new Error("pg_restore falhou: nada entrou (a transação foi desfeita). Corrija o erro acima e rode de novo");

// 4. Conferência.
const src = await conectar(origem, false);
const [a, b] = [await contar(src), await contar(dst)];
await src.end();
await dst.end();
const diferentes = Object.keys(a).filter((t) => a[t] !== b[t]);
console.table(Object.keys(a).map((t) => ({ tabela: t, "neste PC": a[t], supabase: b[t] ?? "-", ok: a[t] === b[t] ? "sim" : "NÃO" })));
if (diferentes.length) {
  console.error(`[copiar] contagens diferentes em: ${diferentes.join(", ")}. O worker estava parado?`);
  process.exit(1);
}
console.log("[copiar] pronto: o Supabase tem os mesmos dados deste PC.");
