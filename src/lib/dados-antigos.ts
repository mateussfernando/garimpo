// Alvos, marcações e eventos de antes das contas (quando o Garimpo era de uma pessoa só) passam para o admin que rodar
// `pnpm admin:criar`. Uma vez só, e tudo é cópia: as linhas de antes ficam como estavam (nada é apagado).
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";
import { alvoFromDb } from "@/lib/db/types";

/** app_settings: quem assumiu os dados de antes das contas, e quando. Enquanto não existe, os Alvos sem dono contam como do sistema. */
export const DADOS_ANTIGOS_KEY = "dados_antigos";

export type Assumidos = { alvos: number; faixas: number; marcacoes: number; ofertasNoAlvo: number; eventos: number };

export async function quemAssumiu(): Promise<string | null> {
  const s = await prisma.appSetting.findUnique({ where: { key: DADOS_ANTIGOS_KEY } });
  return (s?.value as { userId?: string } | null)?.userId ?? null;
}

/** Há algo de antes das contas para assumir? */
export async function temDadosAntigos(): Promise<boolean> {
  if (await quemAssumiu()) return false;
  const [alvos, marcadas, eventos] = await Promise.all([
    prisma.alvo.count({ where: { ownerId: null } }),
    prisma.offer.count({ where: { OR: [{ watched: true }, { dismissed: true }, { snoozedUntil: { not: null } }] } }),
    prisma.event.count({ where: { userId: null, type: { not: "canal" } } }),
  ]);
  return alvos + marcadas + eventos > 0;
}

/**
 * Copia para a conta os Alvos sem dono (com o preço-alvo e o teto de cada faixa), as marcações (vigiar, descartar,
 * soneca), as ofertas que estavam nesses Alvos (com o "Alvo atingido") e os eventos da faixa "Ao vivo".
 * Um Alvo inicial que a conta já tem com o mesmo nome recebe o estado de antes (inclusive apagado ou desligado).
 * Devolve null se alguém já assumiu.
 */
export async function assumirDadosAntigos(userId: string): Promise<Assumidos | null> {
  return prisma.$transaction(
    async (tx) => {
      if (await tx.appSetting.findUnique({ where: { key: DADOS_ANTIGOS_KEY } })) return null;
      const antigos = (await tx.alvo.findMany({ where: { ownerId: null }, orderBy: { id: "asc" } })).map(alvoFromDb);
      const meus = new Map((await tx.alvo.findMany({ where: { ownerId: userId }, select: { id: true, slug: true } })).map((a) => [a.slug, a.id]));
      const mapa = new Map<number, number>();
      for (const a of antigos) {
        const data = {
          name: a.name,
          terms: a.terms,
          exclusions: a.exclusions,
          targetCents: a.targetCents,
          ceilingCents: a.ceilingCents,
          isActive: a.isActive,
          origin: a.origin,
          editedAt: a.editedAt,
          deletedAt: a.deletedAt,
        };
        const mine = meus.get(a.slug);
        const row = mine
          ? await tx.alvo.update({ where: { id: mine }, data, select: { id: true } })
          : await tx.alvo.create({ data: { ...data, ownerId: userId, slug: a.slug }, select: { id: true } });
        mapa.set(a.id, row.id);
      }
      // As faixas de cada Alvo, com o preço-alvo e o teto que o usuário tinha posto. O resto o worker recalcula.
      const refs = await tx.alvoRef.findMany({ where: { alvoId: { in: [...mapa.keys()] } } });
      for (const r of refs) {
        const alvoId = mapa.get(r.alvoId)!;
        const manual = { manualTargetCents: r.manualTargetCents, manualCeilingCents: r.manualCeilingCents };
        const create: Prisma.AlvoRefUncheckedCreateInput = {
          alvoId,
          bandKey: r.bandKey,
          label: r.label,
          medianCents: r.medianCents,
          targetCents: r.targetCents,
          ceilingCents: r.ceilingCents,
          n: r.n,
          ...manual,
        };
        await tx.alvoRef.upsert({ where: { alvoId_bandKey: { alvoId, bandKey: r.bandKey } }, create, update: { label: r.label, ...manual } });
      }
      // Vigiar, descartar e soneca.
      const marcacoes = await tx.$executeRaw`
        insert into oferta_usuario (user_id, offer_id, watched, dismissed, snoozed_until)
        select ${userId}, id, watched, dismissed, snoozed_until from offers
        where watched or dismissed or snoozed_until is not null
        on conflict do nothing`;
      // Ofertas que estavam num desses Alvos, com a faixa, a nota e o "Alvo atingido".
      let ofertasNoAlvo = 0;
      for (const [antigo, novo] of mapa) {
        ofertasNoAlvo += await tx.$executeRaw`
          insert into oferta_alvo (offer_id, user_id, alvo_id, band_key, nota, nota_parts, hit_at)
          select id, ${userId}, ${novo}, band_key, nota, nota_parts, hit_at from offers where alvo_id = ${antigo}
          on conflict do nothing`;
      }
      // Os acontecimentos da faixa "Ao vivo" de antes (oferta nova, preço, esgotou, Alvo atingido) eram dele.
      // "Canal novo" é do sistema e fica sem dono.
      const eventos = await tx.$executeRaw`update events set user_id = ${userId} where user_id is null and type <> 'canal'`;
      await tx.appSetting.create({ data: { key: DADOS_ANTIGOS_KEY, value: { userId, at: Date.now() } } });
      return { alvos: mapa.size, faixas: refs.length, marcacoes, ofertasNoAlvo, eventos };
    },
    { timeout: 60_000 },
  );
}
