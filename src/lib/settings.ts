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

/**
 * Botão "Pausar coleta" (Painel e Fontes): com a coleta pausada o worker não abre site nenhum (comunidades, vitrines,
 * fontes configuráveis e a conferência nas lojas). O Telegram continua escutando; o que chega fica "conferindo" até voltar.
 */
export type ColetaState = { paused: boolean; at: number };
export const COLETA_KEY = "coleta";

/**
 * Convites privados do Telegram (t.me/+…) de grupos em que a conta já está. O worker confere com
 * messages.CheckChatInvite (só consulta, nunca entra) e grava aqui; a tela Fontes não mostra esses convites.
 * Os públicos (t.me/nome) nem precisam: a tela compara com os grupos que o worker já achou na conta.
 */
export const CONVITES_DENTRO_KEY = "convites_dentro";

/** Convites privados que o Telegram recusou no CheckChatInvite (vencidos ou inexistentes): a tela Fontes os põe em "Não abrem". */
export const CONVITES_RECUSADOS_KEY = "convites_recusados";
