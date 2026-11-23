"use client";

import { useCallback, useState } from "react";
import type { Barra, PainelDTO } from "@/lib/painel";
import { AiControls, PageTitle, statusDot, useLive, useStatus } from "./shell";

// Painel do admin: o que estava espalhado no cabeçalho (fila, IA, fontes, máquina) e números de uso. Um gráfico de
// uma série só por bloco (uma cor, sem legenda), barras finas com ponta arredondada e o valor no passar do mouse.

const fmt = (n: number) => n.toLocaleString("pt-BR");

function Bloco({ titulo, children, sub }: { titulo: string; sub?: string; children: React.ReactNode }) {
  return (
    <section className="flex min-w-0 flex-col gap-3 rounded-2xl border border-card-line bg-surface p-4">
      <div className="flex flex-col gap-0.5">
        <h2 className="text-[15px] font-semibold">{titulo}</h2>
        {sub && <p className="text-xs text-muted">{sub}</p>}
      </div>
      {children}
    </section>
  );
}

function Numero({ rotulo, valor, dica }: { rotulo: string; valor: string; dica?: string }) {
  return (
    <div className="flex flex-col gap-0.5" title={dica}>
      <span className="font-mono tnum text-[26px] font-semibold leading-tight text-num">{valor}</span>
      <span className="text-xs text-muted">{rotulo}</span>
    </div>
  );
}

/** Barras deitadas: um rótulo por linha, a barra e o número. */
function Barras({ dados, unidade }: { dados: Barra[]; unidade: string }) {
  const max = Math.max(1, ...dados.map((d) => d.n));
  if (!dados.length) return <p className="text-sm text-muted">Nada nas últimas 48 h.</p>;
  return (
    <ul className="flex flex-col gap-1.5">
      {dados.map((d) => (
        <li key={d.rotulo} className="grid grid-cols-[minmax(0,9rem)_1fr_3rem] items-center gap-3 text-[13px]" title={`${d.rotulo}: ${fmt(d.n)} ${unidade}`}>
          <span className="truncate text-ink-2">{d.rotulo}</span>
          <span className="h-2.5 overflow-hidden rounded-full bg-active" aria-hidden="true">
            <span className="block h-full rounded-full bg-ink-3" style={{ width: `${Math.max(2, (d.n / max) * 100)}%` }} />
          </span>
          <span className="text-right font-mono tnum text-ink-2">{fmt(d.n)}</span>
        </li>
      ))}
    </ul>
  );
}

/** Distribuição das notas de 0 a 10: colunas finas, faixa embaixo, quantidade no mouse. */
function Distribuicao({ faixas }: { faixas: Barra[] }) {
  const max = Math.max(1, ...faixas.map((f) => f.n));
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex h-32 items-end gap-0.5 border-b border-line" role="img" aria-label={`Notas: ${faixas.map((f) => `${f.rotulo}: ${f.n}`).join(", ")}`}>
        {faixas.map((f) => (
          <span key={f.rotulo} className="flex h-full flex-1 items-end" title={`Nota ${f.rotulo}: ${fmt(f.n)} cards`}>
            <span className="block w-full rounded-t-[4px] bg-ink-3" style={{ height: `${f.n ? Math.max(3, (f.n / max) * 100) : 0}%` }} />
          </span>
        ))}
      </div>
      <div className="flex gap-0.5 font-mono tnum text-[10.5px] text-label">
        {faixas.map((f, i) => (
          <span key={f.rotulo} className="flex-1 text-center">
            {i}
          </span>
        ))}
      </div>
    </div>
  );
}

export function PainelAdmin() {
  const [p, setP] = useState<PainelDTO | null>(null);
  const [erro, setErro] = useState(false);
  const { status } = useStatus();
  const load = useCallback(async () => {
    const r = await fetch("/api/admin/painel", { cache: "no-store" });
    if (!r.ok) return setErro(true);
    setErro(false);
    setP(await r.json());
  }, []);
  useLive(load);

  return (
    <div className="flex flex-col gap-6">
      <PageTitle title="Painel">Como o Garimpo está agora: ofertas, conferência, IA, nota e uso.</PageTitle>
      {erro && <p className="text-sm text-bad">Não deu para carregar os números.</p>}

      <div className="grid gap-4 lg:grid-cols-2">
        <Bloco titulo="Ofertas" sub="Últimas 48 h, a janela da Vitrine">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Numero rotulo="nas últimas 48 h" valor={p ? fmt(p.ofertas.em48h) : "—"} />
            <Numero rotulo="hoje" valor={p ? fmt(p.ofertas.hoje) : "—"} />
            <Numero rotulo="conferidas na loja" valor={p ? `${p.ofertas.conferidasPct}%` : "—"} />
            <Numero rotulo="conferindo agora" valor={p ? fmt(p.ofertas.conferindo) : "—"} />
            <Numero rotulo="sem loja identificada" valor={p ? fmt(p.ofertas.semLoja) : "—"} />
          </div>
        </Bloco>

        <Bloco titulo="Fontes e máquina">
          <ul className="flex flex-wrap gap-x-4 gap-y-2 text-[13px] text-ink-2">
            {(status?.sources ?? []).map((s) => (
              <li key={s.slug} className="flex items-center gap-1.5" title={s.note ?? s.status}>
                <span className={`h-2 w-2 rounded-full ${statusDot[s.status] ?? "bg-label"}`} />
                {s.name.replace("Fórum de Promoções do ", "")}
                {s.status !== "ok" && <span className="text-label">({s.status})</span>}
              </li>
            ))}
            {status?.telegram && (
              <li className="flex items-center gap-1.5" title={`${status.telegram.on} de ${status.telegram.total} grupos e canais ligados`}>
                <span className={`h-2 w-2 rounded-full ${status.telegram.on ? "bg-good-dot" : "bg-label"}`} />
                Telegram ({status.telegram.on} de {status.telegram.total})
              </li>
            )}
            <li className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-good-dot" />
              Este PC · tudo local
            </li>
          </ul>
        </Bloco>
      </div>

      {status?.ai !== undefined && (
        <Bloco titulo="IA" sub={p ? `${fmt(p.ia.analisadas24h)} análises nas últimas 24 h · ${fmt(p.ia.esperando)} ofertas esperando análise` : undefined}>
          <AiControls ai={status?.ai ?? null} />
        </Bloco>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Bloco titulo="Nota dos cards (0 a 10)" sub={p ? `${fmt(p.nota.cards)} cards na Vitrine` : undefined}>
          {p ? <Distribuicao faixas={p.nota.faixas} /> : <div className="h-32" />}
          {p && (
            <p className="text-xs text-muted">
              Mistura algoritmo + IA: {fmt(p.nota.mistura)} · só IA: {fmt(p.nota.soIa)} · só algoritmo: {fmt(p.nota.soAlgoritmo)} · sem nota: {fmt(p.nota.semNota)} · com histórico de preço: {fmt(p.nota.comHistorico)}
            </p>
          )}
        </Bloco>

        <Bloco titulo="Pessoas e gabarito" sub="Últimos 7 dias">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Numero rotulo="contas ativas" valor={p ? `${fmt(p.gente.ativas)} de ${fmt(p.gente.contas)}` : "—"} />
            <Numero rotulo="contas novas" valor={p ? fmt(p.gente.novas7d) : "—"} />
            <Numero rotulo="Alvos atingidos" valor={p ? fmt(p.gente.alvosAtingidos7d) : "—"} />
            <Numero rotulo="“a nota fez sentido”" valor={p ? `👍 ${fmt(p.gente.votosSim7d)} · 👎 ${fmt(p.gente.votosNao7d)}` : "—"} />
            <Numero rotulo="cliques em Comprar" valor={p ? fmt(p.gente.cliques7d) : "—"} />
          </div>
        </Bloco>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Bloco titulo="Ofertas por fonte" sub="Últimas 48 h, as 10 que mais trouxeram">
          {p ? <Barras dados={p.porFonte} unidade="ofertas" /> : null}
        </Bloco>
        <Bloco titulo="Ofertas por loja" sub="Últimas 48 h">
          {p ? <Barras dados={p.porLoja} unidade="ofertas" /> : null}
        </Bloco>
      </div>
    </div>
  );
}
