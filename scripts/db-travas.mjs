// pnpm db:travas  ->  confere que toda tabela do banco tem RLS ligado e que os papéis públicos do Supabase (anon e
// authenticated) não têm permissão em nenhuma. Sai com erro se algo estiver aberto. Rode antes de cada deploy.
import "dotenv/config";
import pg from "pg";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("Falta DATABASE_URL no .env");
const local = /@(localhost|127\.0\.0\.1)[:/]/.test(url);
const c = new pg.Client({ connectionString: url, ssl: local ? undefined : { rejectUnauthorized: false } });
await c.connect();
const semRls = (await c.query("select tablename from pg_tables where schemaname = 'public' and not rowsecurity order by 1")).rows.map((r) => r.tablename);
const papeis = (await c.query("select rolname from pg_roles where rolname in ('anon', 'authenticated')")).rows.map((r) => r.rolname);
let abertas = [];
if (papeis.length) {
  abertas = (
    await c.query(
      `select distinct table_name || ' (' || grantee || ': ' || privilege_type || ')' as x from information_schema.role_table_grants
       where table_schema = 'public' and grantee = any($1) order by 1`,
      [papeis],
    )
  ).rows.map((r) => r.x);
}
await c.end();
if (semRls.length) console.error(`Tabelas sem RLS: ${semRls.join(", ")}`);
if (abertas.length) console.error(`Permissões dos papéis públicos do Supabase: ${abertas.join(", ")}`);
if (semRls.length || abertas.length) process.exit(1);
console.log(`Tudo trancado: RLS em todas as tabelas${papeis.length ? " e nenhuma permissão para anon/authenticated" : " (banco sem os papéis do Supabase)"}.`);
