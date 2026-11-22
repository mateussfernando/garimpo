// Cliente único do Prisma, no mesmo pool de conexões do resto do app (src/lib/db/index.ts):
// banco local igual a antes, banco remoto (Supabase) com SSL, e poucas conexões na Vercel.
// O LISTEN do tempo real continua com pg.Client: o Prisma não escuta pg_notify.
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { pool } from "./index";

const globalForPrisma = globalThis as unknown as { garimpoPrisma?: PrismaClient };

export const prisma = globalForPrisma.garimpoPrisma ?? new PrismaClient({ adapter: new PrismaPg(pool) });

if (process.env.NODE_ENV !== "production") globalForPrisma.garimpoPrisma = prisma;
