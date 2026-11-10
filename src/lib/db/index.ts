import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

// Um pool só por processo (o hot reload do Next recriaria a cada edição).
const globalForDb = globalThis as unknown as { garimpoPool?: Pool };

export const pool =
  globalForDb.garimpoPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
  });

if (process.env.NODE_ENV !== "production") globalForDb.garimpoPool = pool;

export const db = drizzle(pool, { schema });
export { schema };

export const NOTIFY_CHANNEL = "garimpo";
