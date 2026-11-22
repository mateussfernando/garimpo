import { prisma } from "@/lib/db/prisma";
import { asJson, json } from "@/lib/db/types";

/** Lê um ajuste pequeno do app (tabela app_settings). */
export async function getSetting<T>(key: string): Promise<{ value: T; updatedAt: Date } | null> {
  const row = await prisma.appSetting.findUnique({ where: { key } });
  return row ? { value: asJson<T>(row.value), updatedAt: row.updatedAt } : null;
}

export async function setSetting(key: string, value: unknown): Promise<void> {
  const updatedAt = new Date();
  await prisma.appSetting.upsert({ where: { key }, create: { key, value: json(value), updatedAt }, update: { value: json(value), updatedAt } });
}

/** Pausas pedidas pelos sites: domínio -> fim da pausa (ms). */
export type Pauses = Record<string, number>;
export const PAUSES_KEY = "pausas";
