// Números do Painel do admin (/admin). Só leitura, consultas agregadas; a rota exige "sistema.ver".
import { STORES } from "@/config/stores";
import { prisma } from "@/lib/db/prisma";
import { NA_VITRINE } from "@/lib/db/types";
import { listOffers } from "@/lib/offers";
import { pode, type Quem } from "@/lib/sessao";
import { DIA, HORA, atras, inicioDoDia } from "@/lib/tempo";
import { contextoDe, ofertaVisivel } from "@/lib/visao";

export type Barra = { rotulo: string; n: number };

export type PainelDTO = {
  ofertas: { em48h: number; hoje: number; conferindo: number; conferidasPct: number; semLoja: number };
  ia: { analisadas24h: number; esperando: number };
  nota: { faixas: Barra[]; mistura: number; soIa: number; soAlgoritmo: number; semNota: number; comHistorico: number; cards: number };
  gente: { contas: number; ativas: number; novas7d: number; votosSim7d: number; votosNao7d: number; cliques7d: number; alvosAtingidos7d: number };
  porFonte: Barra[];
  porLoja: Barra[];
};

const NOMES_LOJA: Record<string, string> = Object.fromEntries(STORES.map((s) => [s.slug, s.name]));

export async function getPainel(eu: Quem): Promise<PainelDTO> {
  const desde = atras(48 * HORA);
  const semana = atras(7 * DIA);
  const na48h = { kind: "produto", createdAt: { gte: desde }, ...NA_VITRINE };
  const internos = pode(eu, "ofertas.detalhes_internos");

  const [em48h, hoje, conferindo, conferidas, semLoja, analisadas24h, esperando, contas, ativas, novas7d, votos, cliques7d, atingidos7d, fontes, lojas] = await Promise.all([
    prisma.offer.count({ where: na48h }),
    prisma.offer.count({ where: { ...na48h, createdAt: { gte: inicioDoDia() } } }),
    prisma.offer.count({ where: { ...na48h, verifyStatus: "pendente" } }),
    prisma.offer.count({ where: { ...na48h, verifyStatus: "verificado" } }),
    prisma.offer.count({ where: { ...na48h, store: null } }),
    prisma.offerAnalysis.count({ where: { createdAt: { gte: atras(DIA) } } }),
    prisma.offer.count({ where: { ...na48h, analysis: null } }),
    prisma.user.count(),
    prisma.user.count({ where: { isActive: true } }),
    prisma.user.count({ where: { createdAt: { gte: semana } } }),
    prisma.notaFeedback.groupBy({ by: ["voto"], where: { atualizadoEm: { gte: semana } }, _count: { _all: true } }),
    prisma.cliqueComprar.count({ where: { criadoEm: { gte: semana } } }),
    prisma.event.count({ where: { type: "alvo", at: { gte: semana } } }),
    prisma.offer.groupBy({ by: ["sourceId"], where: na48h, _count: { _all: true }, orderBy: { _count: { sourceId: "desc" } }, take: 10 }),
    prisma.offer.groupBy({ by: ["store"], where: na48h, _count: { _all: true }, orderBy: { _count: { store: "desc" } }, take: 10 }),
  ]);

  const fontesInfo = await prisma.source.findMany({ where: { id: { in: fontes.map((f) => f.sourceId) } }, select: { id: true, name: true, kind: true } });
  const nomeFonte = new Map(fontesInfo.map((f) => [f.id, !internos && f.kind === "telegram" ? "Grupo do Telegram" : f.name]));

  // A nota como a Vitrine mostra (com a permissão de quem pede), para a distribuição de 0 a 10.
  const c = await contextoDe(eu);
  const cards = (await listOffers({ userId: eu.id })).map((o) => ofertaVisivel(o, c));
  const faixas: Barra[] = Array.from({ length: 10 }, (_, i) => ({ rotulo: `${i}–${i + 1}`, n: 0 }));
  let mistura = 0;
  let soIa = 0;
  let soAlgoritmo = 0;
  let semNota = 0;
  for (const o of cards) {
    if (o.nota == null) semNota++;
    else faixas[Math.min(9, Math.floor(o.nota))].n++;
    if (o.notaDetalhe?.fonte === "mistura") mistura++;
    else if (o.notaDetalhe?.fonte === "ia") soIa++;
    else if (o.notaDetalhe?.fonte === "algoritmo") soAlgoritmo++;
  }

  return {
    ofertas: { em48h, hoje, conferindo, conferidasPct: em48h ? Math.round((conferidas / em48h) * 100) : 0, semLoja },
    ia: { analisadas24h, esperando },
    nota: { faixas, mistura, soIa, soAlgoritmo, semNota, comHistorico: cards.filter((o) => o.historico).length, cards: cards.length },
    gente: {
      contas,
      ativas,
      novas7d,
      votosSim7d: votos.find((v) => v.voto === 1)?._count._all ?? 0,
      votosNao7d: votos.find((v) => v.voto === -1)?._count._all ?? 0,
      cliques7d,
      alvosAtingidos7d: atingidos7d,
    },
    porFonte: fontes.map((f) => ({ rotulo: nomeFonte.get(f.sourceId) ?? "?", n: f._count._all })),
    porLoja: lojas.map((l) => ({ rotulo: l.store ? (NOMES_LOJA[l.store] ?? l.store) : "Loja não identificada", n: l._count._all })),
  };
}
