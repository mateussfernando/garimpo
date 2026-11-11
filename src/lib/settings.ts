import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";

/** Lê um ajuste pequeno do app (tabela app_settings). */
export async function getSetting<T>(key: string): Promise<{ value: T; updatedAt: Date } | null> {
  const [row] = await db.select().from(schema.appSettings).where(eq(schema.appSettings.key, key));
  return row ? { value: row.value as T, updatedAt: row.updatedAt } : null;
}

export async function setSetting(key: string, value: unknown): Promise<void> {
  const updatedAt = new Date();
  await db
    .insert(schema.appSettings)
    .values({ key, value, updatedAt })
    .onConflictDoUpdate({ target: schema.appSettings.key, set: { value, updatedAt } });
}

/** Pausas pedidas pelos sites: domínio -> fim da pausa (ms). */
export type Pauses = Record<string, number>;
export const PAUSES_KEY = "pausas";
