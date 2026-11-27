// Acessos ao site para o Painel do admin (pedido do usuário, 26/11): quantas pessoas, quando, e quem está agora.
// Lê a tabela acessos (uma linha por pessoa por hora, gravada por /api/acesso). Só leitura.
import { prisma } from "@/lib/db/prisma";
import { pode, type Quem } from "@/lib/sessao";
import { DIA, HORA, MIN, atras, hojeSP, inicioDoDia } from "@/lib/tempo";

/** "No site agora" = a aba avisou nos últimos 2,5 min (o aviso é a cada minuto, só com a aba visível). */
export const AGORA_MS = 150_000;
const DIAS = 14;

export type Contagem = { total: number; contas: number; visitantes: number };

export type AcessosDTO = {
  agora: Contagem;
  hoje: Contagem;
  semana: Contagem;
  paginasHoje: number;
  /** Pessoas em cada hora das últimas 24 h, da mais antiga para a atual (hora = início, ISO). */
  porHora: { hora: string; n: number }[];
  /** Pessoas em cada dia dos últimos 14 (dia de São Paulo, AAAA-MM-DD), do mais antigo para hoje. */
  porDia: { dia: string; n: number; contas: number }[];
  /** As contas com o site aberto agora; null = quem pede não pode ver nomes (usuarios.gerenciar). */
  online: { nome: string; desde: string; paginas: number }[] | null;
};

export async function getAcessos(eu: Quem): Promise<AcessosDTO> {
  const agora = atras(AGORA_MS);
  const hoje = inicioDoDia();
  const semana = atras(7 * DIA);
  const horaAtual = Math.floor(Date.now() / HORA) * HORA;
  const desdeHora = new Date(horaAtual - 23 * HORA);
  const desdeDia = atras(DIAS * DIA);

  const [[c], horas, dias] = await Promise.all([
    prisma.$queryRaw<
      { ag: number; agc: number; hj: number; hjc: number; sm: number; smc: number; pg: number }[]
    >`select
        count(distinct quem) filter (where ultima_em >= ${agora})::int as ag,
        count(distinct quem) filter (where ultima_em >= ${agora} and user_id is not null)::int as agc,
        count(distinct quem) filter (where hora >= ${hoje})::int as hj,
        count(distinct quem) filter (where hora >= ${hoje} and user_id is not null)::int as hjc,
        count(distinct quem)::int as sm,
        count(distinct quem) filter (where user_id is not null)::int as smc,
        coalesce(sum(paginas) filter (where hora >= ${hoje}), 0)::int as pg
      from acessos where hora >= ${semana} or ultima_em >= ${agora}`,
    prisma.$queryRaw<{ hora: Date; n: number }[]>`select hora, count(*)::int as n from acessos where hora >= ${desdeHora} group by hora`,
    prisma.$queryRaw<{ dia: string; n: number; contas: number }[]>`
      select to_char(hora at time zone 'America/Sao_Paulo', 'YYYY-MM-DD') as dia,
        count(distinct quem)::int as n, count(distinct quem) filter (where user_id is not null)::int as contas
      from acessos where hora >= ${desdeDia} group by 1`,
  ]);

  const nHora = new Map(horas.map((h) => [h.hora.getTime(), h.n]));
  const porHora = Array.from({ length: 24 }, (_, i) => {
    const t = desdeHora.getTime() + i * HORA;
    return { hora: new Date(t).toISOString(), n: nHora.get(t) ?? 0 };
  });
  const nDia = new Map(dias.map((d) => [d.dia, d]));
  const porDia = Array.from({ length: DIAS }, (_, i) => {
    const dia = hojeSP(new Date(Date.now() - (DIAS - 1 - i) * DIA));
    return { dia, n: nDia.get(dia)?.n ?? 0, contas: nDia.get(dia)?.contas ?? 0 };
  });

  let online: AcessosDTO["online"] = null;
  if (pode(eu, "usuarios.gerenciar")) {
    const linhas = await prisma.acesso.findMany({
      where: { userId: { not: null }, hora: { gte: atras(DIA) } },
      select: { userId: true, primeiraEm: true, ultimaEm: true, paginas: true },
    });
    const agoraIds = new Set(linhas.filter((l) => l.ultimaEm >= agora).map((l) => l.userId!));
    const nomes = new Map((await prisma.user.findMany({ where: { id: { in: [...agoraIds] } }, select: { id: true, name: true } })).map((u) => [u.id, u.name]));
    online = [...agoraIds]
      .map((id) => {
        // "Desde": o começo da visita de agora (horas seguidas com o site aberto, sem buraco de mais de 30 min).
        const minhas = linhas.filter((l) => l.userId === id).sort((a, b) => b.primeiraEm.getTime() - a.primeiraEm.getTime());
        let desde = minhas[0].primeiraEm;
        for (let i = 1; i < minhas.length && desde.getTime() - minhas[i].ultimaEm.getTime() < 30 * MIN; i++) desde = minhas[i].primeiraEm;
        const paginas = minhas.filter((l) => l.primeiraEm >= desde).reduce((s, l) => s + l.paginas, 0);
        return { nome: nomes.get(id) ?? `Conta ${id}`, desde: desde.toISOString(), paginas };
      })
      .sort((a, b) => a.desde.localeCompare(b.desde));
  }

  return {
    agora: { total: c.ag, contas: c.agc, visitantes: c.ag - c.agc },
    hoje: { total: c.hj, contas: c.hjc, visitantes: c.hj - c.hjc },
    semana: { total: c.sm, contas: c.smc, visitantes: c.sm - c.smc },
    paginasHoje: c.pg,
    porHora,
    porDia,
    online,
  };
}
