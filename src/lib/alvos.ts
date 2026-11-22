import { z } from "zod";
import { ALVOS_V0 } from "@/config/alvos";
import { NOTIFY_CHANNEL, pool } from "@/lib/db";
import { prisma } from "@/lib/db/prisma";
import { alvoFromDb } from "@/lib/db/types";
import { DIA, atras } from "@/lib/tempo";
import { cleanTitle } from "@/lib/offers";
import { matchAlvo, plain, type AlvoLite } from "../../worker/match/alvos";

/** A tela Alvos avisa o worker por aqui: "rematch" refaz a classificação das ofertas; "faixa" refaz as notas de uma faixa. */
export const ALVOS_CMD_CHANNEL = "garimpo_alvos";
export type AlvosCmd = { acao: "rematch" } | { acao: "faixa"; alvoId: number; bandKey: string };

export type FaixaDTO = {
  bandKey: string;
  label: string;
  n: number;
  medianCents: number | null;
  /** Os 85% e 115% da mediana (com 5 preços ou mais). */
  autoTargetCents: number | null;
  autoCeilingCents: number | null;
  manualTargetCents: number | null;
  manualCeilingCents: number | null;
  /** O que vale agora para a nota e o "Alvo atingido". */
  targetCents: number | null;
  ceilingCents: number | null;
};

export type AlvoDTO = {
  id: number;
  slug: string;
  name: string;
  terms: string[];
  exclusions: string[];
  active: boolean;
  origin: "seed" | "usuario";
  edited: boolean;
  /** Alvo do código com termos diferentes do padrão: dá para voltar ao padrão. */
  canReset: boolean;
  offers7d: number;
  hits7d: number;
  faixas: FaixaDTO[];
};

export type AlvosDTO = { alvos: AlvoDTO[] };

/** Termo limpo: minúsculas, sem acento, sem pontuação de separação. Vazio ou repetido sai. */
function cleanTerms(list: string[]): string[] {
  const out: string[] = [];
  for (const t of list) {
    const p = plain(t).slice(0, 40);
    if (p.length >= 2 && !out.includes(p)) out.push(p);
  }
  return out.slice(0, 30);
}

export const AlvoInput = z.object({
  name: z.string().trim().min(2, "o nome precisa ter de 2 a 40 letras").max(40, "o nome precisa ter de 2 a 40 letras"),
  terms: z
    .array(z.string())
    .max(30, "no máximo 30 termos")
    .transform(cleanTerms)
    .pipe(z.array(z.string()).min(1, "ponha pelo menos um termo")),
  exclusions: z.array(z.string()).max(30, "no máximo 30 exclusões").transform(cleanTerms),
});

export const FaixaInput = z.object({
  bandKey: z.string().min(1).max(40),
  manualTargetCents: z.number().int().positive().max(100_000_000).nullable(),
  manualCeilingCents: z.number().int().positive().max(100_000_000).nullable(),
});

export async function tellWorker(cmd: AlvosCmd) {
  await pool.query("select pg_notify($1, $2)", [ALVOS_CMD_CHANNEL, JSON.stringify(cmd)]);
  await pool.query("select pg_notify($1, $2)", [NOTIFY_CHANNEL, JSON.stringify({ type: "alvos" })]);
}

const auto = (median: number | null, n: number, f: number) => (median != null && n >= 5 ? Math.round(median * f) : null);

export async function getAlvos(): Promise<AlvosDTO> {
  const rows = (await prisma.alvo.findMany({ where: { deletedAt: null }, orderBy: { id: "asc" } })).map(alvoFromDb);
  const refs = await prisma.alvoRef.findMany();
  const counts = await prisma.$queryRaw<{ alvoId: number | null; n: number; hits: number }[]>`
    select alvo_id as "alvoId", count(*)::int as n, count(*) filter (where hit_at is not null)::int as hits
    from offers where created_at >= ${atras(7 * DIA)} and kind = 'produto'
    group by alvo_id`;
  const byAlvo = new Map(counts.map((c) => [c.alvoId, c]));
  const seed = new Map(ALVOS_V0.map((a) => [a.slug, a]));
  return {
    alvos: rows.map((a) => {
      const s = seed.get(a.slug);
      const same = (x: string[], y: string[]) => x.length === y.length && x.every((v, i) => v === y[i]);
      return {
        id: a.id,
        slug: a.slug,
        name: a.name,
        terms: a.terms,
        exclusions: a.exclusions,
        active: a.active,
        origin: a.origin === "usuario" ? "usuario" : "seed",
        edited: a.editedAt != null,
        canReset: !!s && (!same(s.terms, a.terms) || !same(s.exclusions, a.exclusions) || s.name !== a.name),
        offers7d: byAlvo.get(a.id)?.n ?? 0,
        hits7d: byAlvo.get(a.id)?.hits ?? 0,
        faixas: refs
          .filter((r) => r.alvoId === a.id)
          .sort((x, y) => y.n - x.n || x.label.localeCompare(y.label))
          .map((r) => ({
            bandKey: r.bandKey,
            label: r.label,
            n: r.n,
            medianCents: r.medianCents,
            autoTargetCents: auto(r.medianCents, r.n, 0.85),
            autoCeilingCents: auto(r.medianCents, r.n, 1.15),
            manualTargetCents: r.manualTargetCents,
            manualCeilingCents: r.manualCeilingCents,
            targetCents: r.targetCents,
            ceilingCents: r.ceilingCents,
          })),
      };
    }),
  };
}

/** Slug de um Alvo novo: "u-" na frente, para nunca pegar as faixas especiais dos Alvos do código (monitor, ssd...). */
export async function newSlug(name: string): Promise<string> {
  const base = `u-${plain(name).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 30) || "alvo"}`;
  const taken = new Set((await prisma.alvo.findMany({ select: { slug: true } })).map((r) => r.slug));
  let slug = base;
  for (let i = 2; taken.has(slug); i++) slug = `${base}-${i}`;
  return slug;
}

export type TesteDTO = { total: number; pega: number; exemplos: { id: number; title: string }[]; perde: { title: string; alvo: string }[] };

/**
 * O que um Alvo pegaria nas ofertas dos últimos 7 dias, com as regras de hoje e os outros Alvos ligados.
 * Determinístico, sem IA: o mesmo matchAlvo do worker.
 */
export async function testAlvo(input: { id: number | null; terms: string[]; exclusions: string[] }): Promise<TesteDTO> {
  const others = (await prisma.alvo.findMany({ where: { active: true, deletedAt: null } })).map(alvoFromDb).filter((a) => a.id !== input.id);
  const me: AlvoLite = { id: -1, slug: "teste", name: "teste", terms: cleanTerms(input.terms), exclusions: cleanTerms(input.exclusions) };
  if (!me.terms.length) return { total: 0, pega: 0, exemplos: [], perde: [] };
  const list: AlvoLite[] = [...others, me];
  const rows = await prisma.offer.findMany({
    where: { createdAt: { gte: atras(7 * DIA) }, kind: "produto" },
    select: { id: true, title: true, alvoId: true },
    orderBy: { createdAt: "desc" },
    take: 3000,
  });
  const names = new Map(others.map((a) => [a.id, a.name]));
  const exemplos: TesteDTO["exemplos"] = [];
  const perde: TesteDTO["perde"] = [];
  const seen = new Set<string>();
  let pega = 0;
  for (const r of rows) {
    const hit = matchAlvo(r.title, list);
    const key = plain(r.title);
    if (hit?.id === -1) {
      pega++;
      if (exemplos.length < 8 && !seen.has(key)) {
        seen.add(key);
        exemplos.push({ id: r.id, title: cleanTitle(r.title) });
      }
    } else if (input.id != null && r.alvoId === input.id && perde.length < 5) {
      // Ofertas que este Alvo tem hoje e deixaria de ter com os termos novos.
      perde.push({ title: cleanTitle(r.title), alvo: hit ? (names.get(hit.id) ?? hit.name) : "nenhum Alvo" });
    }
  }
  return { total: rows.length, pega, exemplos, perde };
}
