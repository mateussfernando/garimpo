"use client";

import { useCallback, useEffect, useState } from "react";
import { ATALHOS_JANELA, JANELA_MAX, JANELA_MIN, rotuloJanela } from "@/config/janela";
import type { AcessosDTO, Contagem } from "@/lib/acessos";
import type { Barra, PainelDTO } from "@/lib/painel";
import { AiControls, ColetaControl, PageTitle, podeVer, statusDot, useLive, useMe, useStatus } from "./shell";

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
  if (!dados.length) return <p className="text-sm text-muted">Nada nesta janela.</p>;
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

/**
 * Janela da Vitrine (pedido do usuário, 26/11): de quantas horas para trás as ofertas aparecem para todos. Atalho salva na
 * hora; o campo aceita de 1 a 168 horas. Quem barra de verdade é a rota (/api/admin/vitrine, "ofertas.moderar").
 */
function JanelaVitrine({ onSalvo }: { onSalvo: () => void }) {
  const [horas, setHoras] = useState<number | null>(null);
  const [contagem, setContagem] = useState<Record<string, number>>({});
  const [campo, setCampo] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    void (async () => {
      const r = await fetch("/api/admin/vitrine", { cache: "no-store" });
      if (!r.ok) return;
      const { horas: h, contagem: c } = (await r.json()) as { horas: number; contagem: Record<string, number> };
      setHoras(h);
      setContagem(c);
      setCampo(String(h));
    })();
  }, []);

  const salvar = async (h: number) => {
    if (!Number.isInteger(h) || h < JANELA_MIN || h > JANELA_MAX) return setMsg({ ok: false, texto: `Escolha de ${JANELA_MIN} a ${JANELA_MAX} horas.` });
    setSalvando(true);
    const r = await fetch("/api/admin/vitrine", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ horas: h }) });
    setSalvando(false);
    if (!r.ok) return setMsg({ ok: false, texto: ((await r.json().catch(() => null)) as { erro?: string } | null)?.erro ?? "Não deu para salvar." });
    setHoras(h);
    setCampo(String(h));
    setMsg({ ok: true, texto: `Salvo: a Vitrine mostra as ofertas das últimas ${rotuloJanela(h)}.` });
    onSalvo();
  };

  return (
    <Bloco titulo="Janela da Vitrine" sub="De quantas horas para trás as ofertas aparecem, para todo mundo. Também vale para o “Ao vivo” e os números deste Painel.">
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Atalhos de janela">
        {ATALHOS_JANELA.map((h) => (
          <button
            key={h}
            type="button"
            disabled={salvando}
            aria-pressed={horas === h}
            title={contagem[h] != null ? `${contagem[h].toLocaleString("pt-BR")} ofertas nas últimas ${rotuloJanela(h)}` : undefined}
            onClick={() => {
              if (contagem[h] === 0 && !confirm(`Nenhuma oferta entrou nas últimas ${rotuloJanela(h)} (o worker está ligado?). A Vitrine vai ficar vazia. Salvar assim mesmo?`)) return;
              void salvar(h);
            }}
            className={`h-9 rounded-[10px] border px-3 text-[13px] font-medium tnum disabled:opacity-60 ${horas === h ? "border-ink bg-ink text-bg" : "border-control text-ink-2 hover:text-ink"}`}
          >
            {rotuloJanela(h)}
            {contagem[h] != null && <span className={`ml-1.5 text-[11px] font-normal ${horas === h ? "opacity-70" : "text-muted"}`}>{fmt(contagem[h])}</span>}
          </button>
        ))}
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void salvar(Number(campo));
          }}
        >
          <label className="flex h-9 items-center gap-1.5 rounded-[10px] border border-control bg-bg pl-3 pr-2 text-[13px] text-muted focus-within:border-ink-3">
            <span className="sr-only">Horas</span>
            <input
              type="number"
              inputMode="numeric"
              min={JANELA_MIN}
              max={JANELA_MAX}
              step={1}
              value={campo}
              onChange={(e) => setCampo(e.target.value)}
              className="w-14 bg-transparent font-mono tnum text-ink outline-none"
            />
            horas
          </label>
          <button type="submit" disabled={salvando || campo === String(horas)} className="h-9 rounded-[10px] border border-control px-3 text-[13px] font-medium text-ink-2 hover:text-ink disabled:opacity-50">
            Salvar
          </button>
        </form>
      </div>
      {msg && (
        <p role="status" className={`text-xs ${msg.ok ? "text-good" : "text-bad"}`}>
          {msg.texto}
        </p>
      )}
    </Bloco>
  );
}

/** Colunas finas com o rótulo embaixo (só alguns, para não embolar) e o número no passar do mouse. */
function Colunas({ dados, aria }: { dados: { rotulo: string; n: number; dica: string; atual?: boolean }[]; aria: string }) {
  const max = Math.max(1, ...dados.map((d) => d.n));
  const cada = dados.length > 16 ? 3 : 2;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex h-28 items-end gap-0.5 border-b border-line" role="img" aria-label={aria}>
        {dados.map((d) => (
          <span key={d.rotulo + d.dica} className="flex h-full flex-1 items-end" title={d.dica}>
            <span className={`block w-full rounded-t-[4px] ${d.atual ? "bg-ink" : "bg-ink-3"}`} style={{ height: `${d.n ? Math.max(4, (d.n / max) * 100) : 0}%` }} />
          </span>
        ))}
      </div>
      <div className="flex gap-0.5 font-mono tnum text-[10.5px] text-label">
        {dados.map((d, i) => (
          <span key={d.rotulo + d.dica} className="flex-1 text-center">
            {(dados.length - 1 - i) % cada === 0 ? d.rotulo : ""}
          </span>
        ))}
      </div>
    </div>
  );
}

const pessoas = (n: number) => `${fmt(n)} ${n === 1 ? "pessoa" : "pessoas"}`;
const divisao = (c: Contagem) => `${fmt(c.contas)} com conta · ${fmt(c.visitantes)} ${c.visitantes === 1 ? "visitante" : "visitantes"}`;
const hora = (iso: string) => new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

/**
 * Acessos (pedido do usuário, 26/11): quantas pessoas estão com o site aberto agora, hoje e na semana, e em que horas e
 * dias. Cada aba visível avisa a cada minuto (src/components/presenca.tsx); visitante é um código aleatório, sem IP.
 * Atualiza sozinho a cada 30 s. Os nomes de quem está online só aparecem com "usuarios.gerenciar".
 */
function Acessos() {
  const [a, setA] = useState<AcessosDTO | null>(null);
  const [erro, setErro] = useState(false);
  useEffect(() => {
    let vivo = true;
    const carregar = async () => {
      const r = await fetch("/api/admin/acessos", { cache: "no-store" }).catch(() => null);
      if (!vivo) return;
      if (!r?.ok) return setErro(true);
      setErro(false);
      setA(await r.json());
    };
    void carregar();
    const t = setInterval(() => void carregar(), 30_000);
    return () => {
      vivo = false;
      clearInterval(t);
    };
  }, []);

  const porHora = (a?.porHora ?? []).map((h, i, l) => ({
    rotulo: new Date(h.hora).toLocaleTimeString("pt-BR", { hour: "2-digit" }) + "h",
    n: h.n,
    dica: `${hora(h.hora)}: ${pessoas(h.n)}`,
    atual: i === l.length - 1,
  }));
  const porDia = (a?.porDia ?? []).map((d, i, l) => {
    const [, m, dd] = d.dia.split("-");
    return { rotulo: `${dd}/${m}`, n: d.n, dica: `${dd}/${m}: ${pessoas(d.n)} (${fmt(d.contas)} com conta)`, atual: i === l.length - 1 };
  });

  return (
    <Bloco titulo="Acessos" sub="Pessoas com o site aberto. Visitante sem conta é contado pelo navegador; ninguém é identificado por IP.">
      {erro && <p className="text-sm text-bad">Não deu para carregar os acessos.</p>}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="flex flex-col gap-0.5" title="Com a aba aberta e visível nos últimos 2 minutos">
          <span className="flex items-center gap-2 font-mono tnum text-[26px] font-semibold leading-tight text-num">
            <span className={`h-2.5 w-2.5 rounded-full ${a?.agora.total ? "bg-good-dot" : "bg-label"}`} aria-hidden="true" />
            {a ? fmt(a.agora.total) : "—"}
          </span>
          <span className="text-xs text-muted">no site agora</span>
          {a && <span className="text-[11px] text-label">{divisao(a.agora)}</span>}
        </div>
        <div className="flex flex-col gap-0.5">
          <Numero rotulo="hoje" valor={a ? fmt(a.hoje.total) : "—"} />
          {a && <span className="text-[11px] text-label">{divisao(a.hoje)}</span>}
        </div>
        <div className="flex flex-col gap-0.5">
          <Numero rotulo="últimos 7 dias" valor={a ? fmt(a.semana.total) : "—"} />
          {a && <span className="text-[11px] text-label">{divisao(a.semana)}</span>}
        </div>
        <Numero rotulo="páginas abertas hoje" valor={a ? fmt(a.paginasHoje) : "—"} />
      </div>

      {a?.online && (
        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] uppercase tracking-[0.06em] text-label">Contas com o site aberto agora</span>
          {a.online.length === 0 ? (
            <p className="text-[13px] text-muted">Nenhuma conta agora{a.agora.visitantes ? ` (${pessoas(a.agora.visitantes)} sem conta)` : ""}.</p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {a.online.map((o) => (
                <li key={o.nome + o.desde} className="flex items-center gap-2 rounded-[10px] border border-card-line px-3 py-1.5 text-[13px]">
                  <span className="h-2 w-2 rounded-full bg-good-dot" aria-hidden="true" />
                  <span className="font-medium text-ink">{o.nome}</span>
                  <span className="text-xs text-muted">
                    desde {hora(o.desde)} · {fmt(o.paginas)} {o.paginas === 1 ? "página" : "páginas"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-2">
          <span className="text-[13px] font-medium text-ink-2">Por hora, últimas 24 h</span>
          {a ? <Colunas dados={porHora} aria={`Pessoas por hora: ${porHora.map((h) => `${h.rotulo}: ${h.n}`).join(", ")}`} /> : <div className="h-28" />}
        </div>
        <div className="flex min-w-0 flex-col gap-2">
          <span className="text-[13px] font-medium text-ink-2">Por dia, últimos 14 dias</span>
          {a ? <Colunas dados={porDia} aria={`Pessoas por dia: ${porDia.map((d) => `${d.rotulo}: ${d.n}`).join(", ")}`} /> : <div className="h-28" />}
        </div>
      </div>
    </Bloco>
  );
}

export function PainelAdmin() {
  const [p, setP] = useState<PainelDTO | null>(null);
  const [erro, setErro] = useState(false);
  const { status, reload } = useStatus();
  const me = useMe();
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

      <Acessos />

      {podeVer(me, "ofertas.moderar") && <JanelaVitrine onSalvo={() => void load()} />}

      <div className="grid gap-4 lg:grid-cols-2">
        <Bloco titulo="Ofertas" sub={p ? `Últimas ${rotuloJanela(p.janelaHoras)}, a janela da Vitrine` : "A janela da Vitrine"}>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Numero rotulo={p ? `nas últimas ${rotuloJanela(p.janelaHoras)}` : "na janela"} valor={p ? fmt(p.ofertas.naJanela) : "—"} />
            <Numero rotulo="hoje" valor={p ? fmt(p.ofertas.hoje) : "—"} />
            <Numero rotulo="conferidas na loja" valor={p ? `${p.ofertas.conferidasPct}%` : "—"} />
            <Numero rotulo="conferindo agora" valor={p ? fmt(p.ofertas.conferindo) : "—"} />
            <Numero rotulo="sem loja identificada" valor={p ? fmt(p.ofertas.semLoja) : "—"} />
          </div>
        </Bloco>

        <Bloco titulo="Fontes e máquina">
          <ColetaControl coleta={status?.coleta} onChange={() => void reload()} />
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
        <Bloco titulo="Ofertas por fonte" sub={`${p ? `Últimas ${rotuloJanela(p.janelaHoras)}` : "Na janela"}, as 10 que mais trouxeram`}>
          {p ? <Barras dados={p.porFonte} unidade="ofertas" /> : null}
        </Bloco>
        <Bloco titulo="Ofertas por loja" sub={p ? `Últimas ${rotuloJanela(p.janelaHoras)}` : "Na janela"}>
          {p ? <Barras dados={p.porLoja} unidade="ofertas" /> : null}
        </Bloco>
      </div>
    </div>
  );
}
