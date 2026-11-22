import { readFileSync } from "node:fs";
import { Pool, type ClientConfig } from "pg";

const LOCAL = /@(localhost|127\.0\.0\.1|\[::1\])(:\d+)?\//i;

/** O banco está fora deste PC (ex.: Supabase)? Então a conexão vai com SSL. */
export function isRemoteDb(url = process.env.DATABASE_URL ?? ""): boolean {
  return !!url && !LOCAL.test(url);
}

/**
 * Configuração de conexão para Pool e Client (worker, site e os LISTEN do tempo real).
 * Banco local: igual a antes. Banco remoto: SSL. Com DATABASE_CA (caminho do .crt do painel do Supabase) o certificado
 * é conferido; sem ele, a conexão é criptografada mas o certificado não é conferido (sslmode=no-verify).
 */
export function pgConfig(url = process.env.DATABASE_URL ?? ""): ClientConfig {
  // Sessão em UTC já na abertura da conexão. O adaptador do Prisma manda datas sem fuso: num banco em
  // America/Sao_Paulo (o local) elas eram lidas como hora de São Paulo e gravadas 3 h adiantadas (achado em 22/11).
  // O Supabase já é UTC (e o pooler dele pode recusar `options`). "Hoje" em São Paulo sai de src/lib/tempo.ts.
  if (!isRemoteDb(url)) return { connectionString: url, options: "-c TimeZone=UTC" };
  const u = new URL(url);
  u.searchParams.delete("sslmode"); // o sslmode da URL passaria por cima do ssl abaixo
  const ca = process.env.DATABASE_CA;
  return { connectionString: u.toString(), ssl: ca ? { ca: readFileSync(ca, "utf8"), rejectUnauthorized: true } : { rejectUnauthorized: false } };
}

// Um pool só por processo (o hot reload do Next recriaria a cada edição).
const globalForDb = globalThis as unknown as { garimpoPool?: Pool };

export const pool =
  globalForDb.garimpoPool ??
  new Pool({
    ...pgConfig(),
    // Na Vercel cada instância abre poucas conexões: o pooler grátis do Supabase tem limite.
    max: Number(process.env.PG_POOL_MAX) || (process.env.VERCEL ? 2 : 5),
  });

if (process.env.NODE_ENV !== "production") globalForDb.garimpoPool = pool;


export const NOTIFY_CHANNEL = "garimpo";
/** A Vitrine e as telas mandam comandos ao worker por aqui (ex.: procurar grupos de novo). */
export const CMD_CHANNEL = "garimpo_cmd";
