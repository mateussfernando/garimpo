// O que muda algo e vale igual pelo site (rotas de /api) e pelo MCP (src/lib/mcp): marcar oferta, Alvos, IA e a
// janela da Vitrine. Quem chama já conferiu a permissão; aqui ficam só a regra e a gravação.
import type { z } from "zod";
import { JANELA_KEY } from "@/config/janela";
import { AI_CMD_CHANNEL, AI_STATE_KEY } from "@/lib/ai-usage";
import { type AlvoInput, alvoDaConta, newSlug, tellWorker } from "@/lib/alvos";
import { NOTIFY_CHANNEL, pool } from "@/lib/db";
import { prisma } from "@/lib/db/prisma";
import { setSetting } from "@/lib/settings";

export type Marcacao = { watched?: boolean; dismissed?: boolean; snoozeMinutes?: number };

/** Vigiar, descartar e soneca (0 limpa) de uma oferta, só para a conta. false = a oferta não existe. */
export async function marcarOferta(userId: number, offerId: number, m: Marcacao): Promise<boolean> {
  const { snoozeMinutes, ...rest } = m;
  const set: { watched?: boolean; dismissed?: boolean; snoozedUntil?: Date | null } = { ...rest };
  if (snoozeMinutes !== undefined) set.snoozedUntil = snoozeMinutes === 0 ? null : new Date(Date.now() + snoozeMinutes * 60_000);
  if (!(await prisma.offer.findUnique({ where: { id: offerId }, select: { id: true } }))) return false;
  await prisma.ofertaUsuario.upsert({
    where: { userId_offerId: { userId, offerId } },
    create: { userId, offerId, ...set },
    update: set,
  });
  return true;
}

type AlvoDados = z.output<typeof AlvoInput>;

/** Alvo novo da conta. O worker reclassifica as ofertas dos últimos 7 dias nos Alvos dela. */
export async function criarAlvo(userId: number, d: AlvoDados): Promise<number> {
  const row = await prisma.alvo.create({
    data: { ownerId: userId, slug: await newSlug(d.name, userId), name: d.name, terms: d.terms, exclusions: d.exclusions, origin: "usuario", editedAt: new Date() },
    select: { id: true },
  });
  await tellWorker({ acao: "rematch", userId });
  return row.id;
}

/** Editar (nome, termos, exclusões), ligar ou desligar um Alvo da própria conta. false = não é dela ou não existe. */
export async function mudarAlvo(userId: number, alvoId: number, mudanca: { acao: "editar"; dados: AlvoDados } | { acao: "ligar" | "desligar" }): Promise<boolean> {
  const alvo = await alvoDaConta(String(alvoId), userId);
  if (!alvo) return false;
  if (mudanca.acao === "editar") {
    const { name, terms, exclusions } = mudanca.dados;
    await prisma.alvo.update({ where: { id: alvo.id }, data: { name, terms, exclusions, editedAt: new Date() } });
  } else {
    await prisma.alvo.update({ where: { id: alvo.id }, data: { isActive: mudanca.acao === "ligar" } });
  }
  await tellWorker({ acao: "rematch", userId });
  return true;
}

/** Pausar, continuar ou "Chamar IA agora". O site nunca chama a IA: só avisa o worker por pg_notify. */
export async function controlarIa(acao: "pausar" | "continuar" | "rodar") {
  if (acao === "rodar") {
    await pool.query("select pg_notify($1, $2)", [AI_CMD_CHANNEL, JSON.stringify({ acao: "rodar" })]);
  } else {
    await setSetting(AI_STATE_KEY, { paused: acao === "pausar" });
    // Continuar já dispara uma rodada, para o que ficou parado andar.
    if (acao === "continuar") await pool.query("select pg_notify($1, $2)", [AI_CMD_CHANNEL, JSON.stringify({ acao: "rodar" })]);
  }
  await pool.query("select pg_notify($1, $2)", [NOTIFY_CHANNEL, JSON.stringify({ type: "ai" })]);
}

/** De quantas horas para trás a Vitrine mostra ofertas (para todos). O limite (1 a 168) é conferido por quem chama. */
export const mudarJanela = (horas: number) => setSetting(JANELA_KEY, horas);
