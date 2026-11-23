// O que cada usuário pode ver dos dados. As rotas montam o DTO completo e passam por aqui antes de responder:
// sem a permissão, o campo nem sai do servidor (esconder só na tela não basta).
import type { CupomDTO } from "@/lib/cupons";
import { prisma } from "@/lib/db/prisma";
import type { OfferDetailDTO } from "@/lib/detail";
import type { OfferDTO, StatusDTO } from "@/lib/offers";
import { pode, type Quem } from "@/lib/sessao";

const GRUPO = "Grupo do Telegram";
const SEM_CONFERIR = "não deu para conferir o preço na loja";

/**
 * Os nomes dos seus grupos do Telegram são privados. Pelando, Promobit, Hardmob e as lojas são públicos e ficam.
 * Uma consulta por pedido (são dezenas de grupos).
 */
async function nomesPrivados(): Promise<Set<string>> {
  const rows = await prisma.source.findMany({ where: { kind: "telegram" }, select: { name: true } });
  return new Set(rows.map((r) => r.name));
}

type Contexto = { internos: boolean; ia: boolean; privados: Set<string> };

export async function contextoDe(u: Quem): Promise<Contexto> {
  const internos = pode(u, "ofertas.detalhes_internos");
  return { internos, ia: pode(u, "ia.analises.ver"), privados: internos ? new Set() : await nomesPrivados() };
}

const nomeVisivel = (c: Contexto, nome: string) => (c.internos || !c.privados.has(nome) ? nome : GRUPO);

export function ofertaVisivel<T extends OfferDTO>(o: T, c: Contexto): T {
  const out = { ...o };
  if (!c.ia) out.ia = null;
  if (!c.internos) {
    out.source = nomeVisivel(c, o.source);
    out.sources = o.sources.map((s) => nomeVisivel(c, s));
    out.lojas = o.lojas.map((l) => ({ ...l, sources: l.sources.map((s) => nomeVisivel(c, s)) }));
    if (o.verifyStatus === "nao_verificado" && o.verifyNote) out.verifyNote = SEM_CONFERIR;
  }
  return out;
}

export function detalheVisivel(d: OfferDetailDTO, c: Contexto): OfferDetailDTO {
  return {
    ...d,
    offer: ofertaVisivel(d.offer, c),
    insight: c.ia ? d.insight : null,
    heat: c.internos ? d.heat : d.heat.map((h) => ({ ...h, source: nomeVisivel(c, h.source) })),
  };
}

export function cupomVisivel(x: CupomDTO, c: Contexto): CupomDTO {
  if (c.internos) return x;
  // O link do post aponta para a mensagem no grupo: só para quem vê os detalhes internos.
  return { ...x, sources: x.sources.map((s) => nomeVisivel(c, s)), postUrl: null };
}

/** Cabeçalho: IA (custo, uso, botões) só para quem gerencia a IA; fontes, fila e máquina só para quem vê o sistema. */
export function statusVisivel(s: StatusDTO, u: Quem): StatusDTO {
  const sistema = pode(u, "sistema.ver");
  return {
    ...s,
    ai: pode(u, "ia.gerenciar") ? s.ai : null,
    sources: sistema ? s.sources : [],
    telegram: sistema ? s.telegram : null,
    pending: sistema ? s.pending : null,
    radar: pode(u, "ia.analises.ver") ? s.radar : null,
  };
}
