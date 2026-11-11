"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { AI_AUTO_STOP_PCT, AI_PARALLEL } from "@/config/pricing";
import type { FilaDTO, FilaItem } from "@/lib/fila-ia";
import { VERDICT } from "./ia";
import { AppHeader, Badge, PageTitle, ago, brl, useLive, useNow, useStatus } from "./shell";

function Thumb({ src }: { src: string | null }) {
  return (
    <span className="dots relative flex h-14 w-14 flex-none items-center justify-center overflow-hidden rounded-[10px]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {src && <img src={src} alt="" className="absolute inset-0 h-full w-full object-contain p-1" loading="lazy" referrerPolicy="no-referrer" />}
    </span>
  );
}

function Row({ it, now, children }: { it: FilaItem; now: number | null; children?: React.ReactNode }) {
  return (
    <li>
      <Link href={`/oferta/${it.id}`} className="flex min-w-0 items-center gap-3.5 rounded-xl border border-card-line bg-surface p-3 hover:border-ink-3">
        <Thumb src={it.imageUrl} />
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="truncate text-[14px] font-medium text-ink" title={it.title}>
            {it.title}
          </span>
          <span className="truncate text-xs text-muted">
            {it.store ?? "loja não identificada"} · chegou {ago(it.createdAt, now)}
            {it.copies > 1 ? ` · ${it.copies} posts iguais (uma análise vale para todos)` : ""}
            {` · ${it.sources.slice(0, 2).join(", ")}${it.sources.length > 2 ? ` +${it.sources.length - 2}` : ""}`}
          </span>
          {children}
        </span>
        <span className="flex-none font-mono tnum text-[15px] font-semibold text-num">{brl(it.priceCardCents)}</span>
      </Link>
    </li>
  );
}

export function FilaIa() {
  const [data, setData] = useState<FilaDTO | null>(null);
  const [busy, setBusy] = useState(false);
  const { status, live } = useStatus();
  const now = useNow(30_000);
  const load = useCallback(async () => {
    setData(await fetch("/api/ia/fila", { cache: "no-store" }).then((r) => r.json()));
  }, []);
  useLive(load);

  const ai = status?.ai;
  const running = ai?.run?.running === true;
  const five = ai?.limits?.fiveHour?.pct ?? null;
  const braked = five != null && five >= AI_AUTO_STOP_PCT;
  const pct = data && data.total ? Math.round((data.analyzed / data.total) * 100) : 0;
  const call = async () => {
    setBusy(true);
    try {
      await fetch("/api/ia", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ acao: ai?.paused ? "continuar" : "rodar" }) });
    } finally {
      setTimeout(() => setBusy(false), 1500);
    }
  };

  // Estado da fila em uma frase, sempre dizendo o que está segurando.
  const state = ai?.paused
    ? "A IA está pausada. Continue para a fila andar."
    : running
      ? `A IA está trabalhando agora: ${AI_PARALLEL} lotes de 12 produtos ao mesmo tempo, até a fila zerar.`
      : braked
        ? `A janela de 5 h da sua assinatura está em ${five}%: as análises automáticas esperam abaixo de ${AI_AUTO_STOP_PCT}%. “Chamar IA agora” passa por cima do freio.`
        : `As análises automáticas rodam a cada 2 minutos, até 6 lotes de 12 (${AI_PARALLEL} ao mesmo tempo).`;

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader active="ia" status={status} live={live} />
      <main className="mx-auto flex w-full max-w-[1440px] flex-col gap-6 px-8 pb-10 pt-7">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <PageTitle title="Fila da IA">
            As ofertas das últimas 48 h que ainda esperam a análise da IA. O mesmo produto postado em vários grupos vai uma vez só; a análise vale para todos os posts iguais.
          </PageTitle>
          <button
            type="button"
            onClick={() => void call()}
            disabled={!ai || running || busy}
            className="flex h-11 items-center gap-2 rounded-[10px] bg-ink px-5 text-sm font-semibold text-bg disabled:opacity-50"
          >
            {running || busy ? "IA trabalhando…" : ai?.paused ? "▶ Continuar e analisar tudo" : "✦ Analisar tudo agora"}
          </button>
        </div>

        <section className="flex flex-col gap-3 rounded-2xl border border-card-line bg-surface p-5">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ["Ofertas em 48 h", data?.total],
              ["Com análise", data?.analyzed],
              ["Esperando", data?.waitingOffers],
              ["Produtos distintos na fila", data?.waitingProducts],
            ].map(([l, v]) => (
              <div key={l as string} className="flex flex-col gap-1">
                <span className="text-[11px] uppercase tracking-[0.06em] text-label">{l}</span>
                <span className="font-mono tnum text-[26px] font-semibold text-num">{v ?? "—"}</span>
              </div>
            ))}
          </div>
          <span className="block h-2 w-full overflow-hidden rounded-full bg-active" aria-label={`${pct}% analisadas`}>
            <span className="block h-full bg-good-dot transition-[width] duration-500" style={{ width: `${pct}%` }} />
          </span>
          <p className={`text-[13px] ${ai?.paused || braked ? "text-pause" : "text-muted"}`}>
            {pct}% analisadas. {state}
          </p>
        </section>

        <div className="grid gap-6 xl:grid-cols-[3fr_2fr]">
          <section className="flex flex-col gap-3" aria-labelledby="esperando">
            <h2 id="esperando" className="text-[15px] font-semibold">
              Esperando, na ordem em que a IA vai pegar
            </h2>
            {data == null ? (
              <p className="text-sm text-muted">Carregando…</p>
            ) : data.waiting.length === 0 ? (
              <div className="rounded-[14px] border border-dashed border-control px-6 py-10 text-center text-[13px] text-muted">Nada esperando: todas as ofertas têm análise.</div>
            ) : (
              <ol className="flex flex-col gap-2">
                {data.waiting.map((it) => (
                  <Row key={it.id} it={it} now={now} />
                ))}
                {data.waitingProducts > data.waiting.length && <li className="px-1 text-xs text-label">e mais {data.waitingProducts - data.waiting.length} produtos</li>}
              </ol>
            )}
          </section>

          <section className="flex flex-col gap-3" aria-labelledby="recentes">
            <h2 id="recentes" className="text-[15px] font-semibold">
              Analisadas há pouco
            </h2>
            {data?.recent.length ? (
              <ol className="flex flex-col gap-2">
                {data.recent.map((it) => (
                  <Row key={it.id} it={it} now={now}>
                    <span className="flex min-w-0 items-center gap-2 text-xs">
                      <span className="font-mono tnum font-semibold text-num">{it.score}</span>
                      <Badge tone={VERDICT[it.verdict].tone}>{VERDICT[it.verdict].label}</Badge>
                      <span className="truncate text-ink-3" title={it.summary}>
                        {it.summary}
                      </span>
                    </span>
                  </Row>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-muted">{data ? "Nenhuma análise ainda." : "Carregando…"}</p>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
