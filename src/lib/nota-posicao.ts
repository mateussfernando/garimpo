// A régua das posições: as notas do algoritmo e da IA das ofertas das últimas 48 h, ordenadas. Guardada na memória por
// ~60 s (a Vitrine e o Detalhe leem várias vezes por minuto e a régua quase não muda). Uma régua só para o site inteiro:
// a posição de uma oferta é a mesma na lista e no Detalhe.
import { prisma } from "@/lib/db/prisma";
import { NA_VITRINE } from "@/lib/db/types";
import { HORA, atras } from "@/lib/tempo";

export type Regua = { algoritmo: number[]; ia: number[] };

const VALE_MS = 60_000;
let guardada: { at: number; regua: Regua } | null = null;
let carregando: Promise<Regua> | null = null;

const ordenar = (xs: (number | null)[]) => xs.filter((x): x is number => x != null).sort((a, b) => a - b);

async function carregar(): Promise<Regua> {
  const desde = atras(48 * HORA);
  const where = { kind: "produto", createdAt: { gte: desde }, ...NA_VITRINE };
  // A nota do algoritmo é a geral (mercado da faixa dos Alvos do sistema) e a de cada conta (Alvos dela): a régua junta as
  // duas, porque é a mesma fórmula. Sem nenhum Alvo do sistema ligado só existem as de conta.
  const [gerais, pessoais, analises] = await Promise.all([
    prisma.offer.findMany({ where: { ...where, nota: { not: null } }, select: { nota: true } }),
    prisma.ofertaAlvo.findMany({ where: { nota: { not: null }, offer: where }, select: { nota: true } }),
    prisma.offerAnalysis.findMany({ where: { offer: where }, select: { score: true } }),
  ]);
  return {
    algoritmo: ordenar([...gerais.map((r) => r.nota), ...pessoais.map((r) => r.nota)]),
    ia: ordenar(analises.map((r) => r.score)),
  };
}

export async function reguaDePosicao(): Promise<Regua> {
  if (guardada && Date.now() - guardada.at < VALE_MS) return guardada.regua;
  // Vários pedidos ao mesmo tempo esperam a mesma consulta.
  carregando ??= carregar()
    .then((regua) => {
      guardada = { at: Date.now(), regua };
      return regua;
    })
    .finally(() => {
      carregando = null;
    });
  return carregando;
}

/** Só para os testes e para a conferência com dados reais. */
export function esquecerRegua() {
  guardada = null;
}
