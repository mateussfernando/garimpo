"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { OfferDTO } from "@/lib/offers";
import { Badge, Kbd, brl, useLive, useStatus } from "./shell";

type Action = "comprar" | "vigiar" | "soneca" | "descartar";
const LABEL: Record<Action, string> = { comprar: "Comprar", vigiar: "Vigiando", soneca: "Soneca 1 h", descartar: "Descartada" };
const WEIGHTS = [
  ["A", "Encaixe no Alvo", 45],
  ["C", "Confiança na loja", 25],
  ["F", "Frete", 20],
  ["S", "Calor social", 10],
] as const;

/** Entra na fila: toca um Alvo, não está acima do teto do Alvo e não está em soneca. */
function eligible(o: OfferDTO, nowMs: number) {
  if (!o.alvo) return false;
  if (o.alvoTetoCents != null && o.priceCardCents != null && o.priceCardCents > o.alvoTetoCents) return false;
  if (o.snoozedUntil && new Date(o.snoozedUntil).getTime() > nowMs) return false;
  return true;
}

export function WarRoom() {
  const [queue, setQueue] = useState<OfferDTO[]>([]);
  const [decisions, setDecisionsState] = useState<Record<number, Action>>({});
  // O ref segue o estado (atualizado no mesmo lugar) para o load ao vivo saber o que já foi decidido.
  const decisionsRef = useRef<Record<number, Action>>({});
  const setDecisions = (next: Record<number, Action>) => {
    decisionsRef.current = next;
    setDecisionsState(next);
  };
  const [curId, setCurId] = useState<number | null>(null);
  const [toast, setToast] = useState("");
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { status, live } = useStatus();
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    const all: OfferDTO[] = await fetch("/api/offers", { cache: "no-store" }).then((r) => r.json());
    const nowMs = Date.now();
    const fresh = all.filter((o) => eligible(o, nowMs));
    setQueue((prev) => {
      const byId = new Map(fresh.map((o) => [o.id, o]));
      // Mantém na lista as já decididas (para a contagem); troca os dados das que seguem na fila.
      const kept = prev.map((o) => byId.get(o.id) ?? o).filter((o) => byId.has(o.id) || decisionsRef.current[o.id]);
      const known = new Set(kept.map((o) => o.id));
      const added = fresh.filter((o) => !known.has(o.id));
      return [...kept, ...added].sort((a, b) => (b.nota ?? 0) - (a.nota ?? 0));
    });
    setLoaded(true);
  }, []);
  useLive(load);

  const pending = queue.filter((o) => !decisions[o.id]);
  const cur = queue.find((o) => o.id === curId) ?? pending[0] ?? null;
  const idx = cur ? queue.findIndex((o) => o.id === cur.id) : -1;
  const allDone = loaded && queue.length > 0 && pending.length === 0;

  const say = (msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 2600);
  };

  const call = (id: number, body: object) =>
    fetch(`/api/offers/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

  const decide = (action: Action) => {
    if (!cur || decisions[cur.id]) return;
    const short = cur.title.length > 40 ? cur.title.slice(0, 40) + "…" : cur.title;
    if (action === "comprar") {
      if (cur.url) window.open(cur.url, "_blank", "noopener,noreferrer");
      void call(cur.id, { snoozeMinutes: 24 * 60 }); // decidida: some da fila por hoje
      say(`Abrindo a página da ${cur.store ?? "loja"} numa aba nova`);
    } else if (action === "vigiar") {
      void call(cur.id, { watched: true });
      say(`Vigiando: ${short}. A queda aparece na Vitrine.`);
    } else if (action === "soneca") {
      void call(cur.id, { snoozeMinutes: 60 });
      say(`${short} volta para a fila em 1 h`);
    } else {
      void call(cur.id, { dismissed: true });
      say(`${short} saiu da fila`);
    }
    const next = { ...decisions, [cur.id]: action };
    setDecisions(next);
    const nextPending = queue.find((o) => !next[o.id] && o.id !== cur.id);
    setCurId(nextPending?.id ?? null);
  };

  const move = (dir: 1 | -1) => {
    if (!queue.length) return;
    const i = idx < 0 ? 0 : (idx + dir + queue.length) % queue.length;
    setCurId(queue[i].id);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.metaKey || e.ctrlKey || e.altKey || t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
      const k = e.key.toLowerCase();
      if (k === "escape") document.querySelector<HTMLAnchorElement>("a[data-exit]")?.click();
      else if (k === "enter") {
        if (/^(BUTTON|A)$/.test(t.tagName)) return;
        decide("comprar");
      } else if (k === "w") decide("vigiar");
      else if (k === "s") decide("soneca");
      else if (k === "x") decide("descartar");
      else if (k === "j" || k === "arrowdown") move(1);
      else if (k === "k" || k === "arrowup") move(-1);
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const counts = { comprar: 0, vigiar: 0, soneca: 0, descartar: 0 };
  for (const a of Object.values(decisions)) counts[a]++;
  const ai = status?.ai;
  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

  return (
    <div className="flex min-h-screen flex-col" style={{ background: "#08090B" }}>
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-line px-8 py-3">
        <div className="flex items-center gap-3">
          <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 2l8 5v10l-8 5-8-5V7z" className="fill-gold" />
          </svg>
          <h1 className="text-lg font-semibold tracking-tight">War Room</h1>
          <span className="flex items-center gap-2 text-[13px] text-muted">
            <span className={`h-2 w-2 rounded-full ${live ? "bg-good-dot" : "bg-pause"}`} />
            {live ? "Ao vivo" : "Reconectando"}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-x-8 gap-y-2">
          <div className="flex flex-col">
            <span className="text-[11px] uppercase tracking-[0.06em] text-label">Posição</span>
            <span className="font-mono tnum text-[13px]">{allDone ? "fila zerada" : cur ? `${idx + 1} de ${queue.length}` : "—"}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] uppercase tracking-[0.06em] text-label">Decididas</span>
            <span className="font-mono tnum text-[13px]">{Object.keys(decisions).length} de {queue.length}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] uppercase tracking-[0.06em] text-label">Gasto de IA</span>
            <span className="font-mono tnum text-[13px]">{ai ? `US$ ${ai.spentUsd.toFixed(4).replace(".", ",")}` : "—"}</span>
          </div>
          <Link href="/" data-exit="true" className="flex h-11 items-center gap-2 rounded-[10px] border border-control px-4 text-[13px] text-ink-2">
            <Kbd>Esc</Kbd>Sair para a Vitrine
          </Link>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-[1440px] flex-1 gap-6 px-8 py-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex min-w-0 flex-col gap-4">
          {!loaded ? (
            <p className="text-sm text-muted">Carregando…</p>
          ) : queue.length === 0 ? (
            <section aria-label="Fila vazia" className="flex flex-col items-start gap-3 rounded-2xl border border-dashed border-control p-10">
              <span className="text-[11px] uppercase tracking-[0.06em] text-label">Fila vazia</span>
              <h2 className="text-2xl font-semibold tracking-tight">Nenhuma oferta para decidir agora</h2>
              <p className="max-w-xl text-sm text-muted">Entram aqui as ofertas que tocam um dos seus Alvos e não passam do teto dele. Elas chegam sozinhas, enquanto a coleta e a Escuta estão ligadas.</p>
            </section>
          ) : allDone || !cur ? (
            <section aria-label="Fila zerada" className="flex flex-col items-start gap-3 rounded-2xl border border-card-line bg-surface p-10">
              <span className="text-[11px] uppercase tracking-[0.06em] text-label">Fila zerada</span>
              <h2 className="text-2xl font-semibold tracking-tight">Tudo decidido por agora</h2>
              <p className="text-sm text-ink-2">
                {plural(counts.comprar, "compra aberta", "compras abertas")}, {plural(counts.vigiar, "vigiando", "vigiando")}, {plural(counts.soneca, "em soneca", "em soneca")} e {plural(counts.descartar, "descartada", "descartadas")}.
              </p>
              <p className="text-sm text-muted">Novas ofertas que passarem nos filtros entram aqui sozinhas. Nada é comprado sem você.</p>
              <div className="flex gap-2">
                <button type="button" onClick={() => setDecisions({})} className="h-11 rounded-[10px] bg-ink px-5 text-sm font-semibold text-bg">
                  Recomeçar a fila
                </button>
                <Link href="/" className="flex h-11 items-center rounded-[10px] border border-control px-5 text-sm text-ink-2">
                  Voltar à Vitrine
                </Link>
              </div>
            </section>
          ) : (
            <section aria-label="Oferta em foco" className={`flex flex-col gap-6 rounded-2xl border bg-surface p-6 ${cur.alvoAtingido ? "border-gold shadow-[0_0_0_1px_color-mix(in_srgb,var(--color-gold)_30%,transparent),0_0_40px_color-mix(in_srgb,var(--color-gold)_12%,transparent)]" : "border-card-line"}`}>
              <div className="grid gap-6 md:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
                <div className="dots flex aspect-[4/3] items-center justify-center overflow-hidden rounded-xl">
                  {cur.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={cur.imageUrl} alt="" className="h-full w-full object-contain p-5" referrerPolicy="no-referrer" />
                  ) : (
                    <span className="text-xs text-muted">sem foto</span>
                  )}
                </div>
                <div className="flex min-w-0 flex-col gap-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="flex items-baseline gap-1.5 rounded-full border border-control bg-pill px-2.5 py-1.5">
                      <span className="font-mono text-[15px] font-semibold text-num">{cur.nota ?? "—"}</span>
                      <span className="text-[11px] uppercase tracking-[0.06em] text-muted">nota</span>
                    </span>
                    {cur.store && <span className="rounded-full border border-control bg-pill px-2.5 py-1.5 text-xs text-ink-2">{cur.store}</span>}
                    {cur.alvoAtingido && <Badge tone="gold">Alvo atingido</Badge>}
                    {cur.freeShipping && <Badge tone="good">Frete grátis</Badge>}
                    {cur.interest === true && <Badge tone="bad">Com juros</Badge>}
                    {cur.verifyStatus !== "verificado" && <Badge tone="neutral">{cur.verifyStatus === "pendente" ? "Verificando…" : "Não verificado"}</Badge>}
                  </div>
                  <h2 className="text-[22px] font-semibold leading-snug tracking-tight">{cur.title}</h2>
                  <div className="flex flex-col gap-1">
                    <div className="flex flex-wrap items-baseline gap-x-3">
                      <span className="font-mono tnum text-[56px] font-semibold leading-none tracking-tight text-num lg:text-[76px]">{brl(cur.priceCardCents)}</span>
                      <span className="text-sm text-muted">no cartão</span>
                    </div>
                    <span className="font-mono text-sm text-ink-3">
                      {cur.installments && cur.installmentCents ? `${cur.installments}x de ${brl(cur.installmentCents)}${cur.interest === false ? " sem juros" : cur.interest ? " com juros" : ""}` : "parcelas não informadas"}
                    </span>
                  </div>
                  {cur.alvo && (
                    <span className="text-[13px] text-muted">
                      {cur.alvo.targetCents ? (cur.alvoAtingido ? `Alvo ${cur.alvo.name}: no preço-alvo de ${brl(cur.alvo.targetCents)}.` : `Alvo ${cur.alvo.name}: faltam ${brl((cur.priceCardCents ?? 0) - cur.alvo.targetCents)} para o alvo de ${brl(cur.alvo.targetCents)}.`) : `Alvo ${cur.alvo.name}: ainda sem preço de referência.`}
                    </span>
                  )}
                </div>
              </div>

              {cur.notaParts && (
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  {WEIGHTS.map(([k, label, max]) => {
                    const v = Math.round(cur.notaParts![k] * max);
                    return (
                      <div key={k} className="flex flex-col gap-1.5 rounded-xl bg-deep px-3 py-2.5">
                        <span className="text-[11px] uppercase tracking-[0.06em] text-label">{label}</span>
                        <span className="font-mono tnum text-sm">
                          {v}
                          <span className="text-muted"> / {max}</span>
                        </span>
                        <span className="h-1 overflow-hidden rounded-full bg-active" aria-hidden="true">
                          <span className="block h-full bg-ink-3" style={{ width: `${(v / max) * 100}%` }} />
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {(
                  [
                    ["comprar", "Comprar", "Enter"],
                    ["vigiar", "Vigiar", "W"],
                    ["soneca", "Soneca 1 h", "S"],
                    ["descartar", "Descartar", "X"],
                  ] as const
                ).map(([a, label, key]) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => decide(a)}
                    className={`flex h-12 flex-1 items-center justify-center gap-2.5 rounded-xl px-5 text-[15px] font-semibold ${a === "comprar" ? (cur.alvoAtingido ? "bg-gold text-on-gold" : "bg-ink text-bg") : "border border-control text-ink"}`}
                  >
                    {label}
                    <kbd className={`rounded-md border px-1.5 py-0.5 font-mono text-[11px] ${a === "comprar" ? "border-black/25 opacity-70" : "border-control text-muted"}`}>{key}</kbd>
                  </button>
                ))}
              </div>
              <Link href={`/oferta/${cur.id}`} className="text-[13px] text-muted underline-offset-2 hover:text-ink hover:underline">
                Ver o detalhe desta oferta (histórico, escada de preços e análise)
              </Link>
            </section>
          )}
          <p className="text-xs text-muted">Comprar abre a página da loja numa aba nova. Ofertas acima do teto do Alvo não entram na fila. O Black Fraude entra depois do 11.11, com histórico.</p>
        </div>

        <aside aria-labelledby="fila" className="flex min-w-0 flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <h2 id="fila" className="text-base font-semibold">
              Fila de hoje
            </h2>
            <span className="text-xs text-muted">ordenada pela nota</span>
          </div>
          <div className="flex max-h-[70vh] flex-col gap-2 overflow-auto">
            {queue.map((q) => {
              const d = decisions[q.id];
              const isCur = cur?.id === q.id && !allDone;
              return (
                <button
                  key={q.id}
                  type="button"
                  aria-current={isCur}
                  onClick={() => setCurId(q.id)}
                  className={`flex min-h-14 items-center gap-3 rounded-xl border px-3 py-2 text-left ${isCur ? "border-ink bg-active" : "border-line"} ${d ? "opacity-50" : ""}`}
                >
                  <span className="font-mono tnum w-8 text-center text-[15px] font-semibold text-num">{q.nota ?? "—"}</span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-[13px]">{q.title}</span>
                    <span className="truncate font-mono text-xs text-muted">
                      {q.store ?? "loja ?"} · {brl(q.priceCardCents)}
                    </span>
                  </span>
                  <span className={`text-[11px] ${isCur ? "text-num" : "text-label"}`}>{d ? LABEL[d] : isCur ? "Agora" : "Na fila"}</span>
                </button>
              );
            })}
          </div>
        </aside>
      </main>

      <footer className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 px-8 pb-6 pt-2 text-xs text-label">
        {[["J K", "trocar de oferta"], ["Enter", "comprar"], ["W", "vigiar"], ["S", "soneca de 1 h"], ["X", "descartar"]].map(([k, v]) => (
          <span key={k} className="flex items-center gap-1.5">
            <Kbd>{k}</Kbd> {v}
          </span>
        ))}
      </footer>
      <div role="status" aria-live="polite" className={`pointer-events-none fixed bottom-16 left-1/2 -translate-x-1/2 rounded-xl border border-control bg-pill px-4 py-2.5 text-sm transition-opacity ${toast ? "opacity-100" : "opacity-0"}`}>
        {toast}
      </div>
    </div>
  );
}
