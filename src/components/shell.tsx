"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { StatusDTO } from "@/lib/offers";

export const brl = (cents: number | null | undefined) =>
  cents == null ? "—" : (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const START_11_11 = new Date("2026-11-11T00:00:00-03:00").getTime();

export function useNow(everyMs: number) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const first = setTimeout(() => setNow(Date.now()), 0);
    const t = setInterval(() => setNow(Date.now()), everyMs);
    return () => {
      clearTimeout(first);
      clearInterval(t);
    };
  }, [everyMs]);
  return now;
}

export function Countdown() {
  const now = useNow(1000);
  if (now == null) return <span className="font-mono tnum text-[15px] font-semibold text-gold">--:--:--</span>;
  const left = START_11_11 - now;
  if (left <= 0) return <span className="font-mono text-[15px] font-semibold text-gold">ao vivo</span>;
  const s = Math.floor(left / 1000);
  const p = (n: number) => String(n).padStart(2, "0");
  return (
    <span className="font-mono tnum text-[15px] font-semibold text-gold">
      {p(Math.floor(s / 3600))}:{p(Math.floor((s % 3600) / 60))}:{p(s % 60)}
    </span>
  );
}

export function ago(iso: string | null, now: number | null) {
  if (!iso || now == null) return "";
  const min = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60000));
  return min < 1 ? "agora" : min < 60 ? `há ${min} min` : min < 1440 ? `há ${Math.round(min / 60)} h` : `há ${Math.round(min / 1440)} d`;
}

export type Tone = "gold" | "good" | "bad" | "neutral";
export function Badge({ tone, children, title }: { tone: Tone; children: React.ReactNode; title?: string }) {
  const cls = {
    gold: "bg-gold text-on-gold font-semibold",
    good: "text-good bg-[rgba(61,220,132,0.12)] border border-[rgba(61,220,132,0.35)]",
    bad: "text-bad bg-[rgba(255,107,107,0.12)] border border-[rgba(255,107,107,0.4)]",
    neutral: "text-ink-2 bg-active border border-control",
  }[tone];
  return (
    <span title={title} className={`inline-flex h-6 items-center rounded-full px-2.5 text-xs font-medium ${cls}`}>
      {children}
    </span>
  );
}

export const statusDot: Record<string, string> = { ok: "bg-good-dot", pausada: "bg-pause", bloqueada: "bg-label", erro: "bg-bad" };

/** Carrega dados e recarrega sozinho quando o worker avisa por SSE (pg_notify). */
export function useLive(load: () => Promise<void>) {
  const [live, setLive] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadRef = useRef(load);
  useEffect(() => {
    loadRef.current = load;
  }, [load]);
  useEffect(() => {
    const first = setTimeout(() => void loadRef.current(), 0);
    const es = new EventSource("/api/stream");
    // A cada (re)conexão, recarrega: pode ter perdido avisos enquanto caiu.
    es.addEventListener("ready", () => {
      setLive(true);
      void loadRef.current();
    });
    es.onmessage = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void loadRef.current(), 400);
    };
    es.onerror = () => setLive(false);
    return () => {
      clearTimeout(first);
      if (timer.current) clearTimeout(timer.current);
      es.close();
    };
  }, []);
  return live;
}

/** Status do cabeçalho (fontes, IA, fila), atualizado ao vivo. */
export function useStatus() {
  const [status, setStatus] = useState<StatusDTO | null>(null);
  const load = useCallback(async () => {
    setStatus(await fetch("/api/status", { cache: "no-store" }).then((r) => r.json()));
  }, []);
  const live = useLive(load);
  return { status, live, reload: load };
}

const NAV = [
  { key: "vitrine", href: "/", label: "Vitrine" },
  { key: "fontes", href: "/fontes", label: "Fontes" },
  { key: "cupons", href: "/cupons", label: "Cupons" },
  { key: "ia", href: "/ia", label: "Fila da IA" },
  { key: "lojas", href: "/lojas", label: "Lojas" },
  { key: "war-room", href: "/war-room", label: "War Room" },
] as const;
export type NavKey = (typeof NAV)[number]["key"];

function Metric({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] uppercase tracking-[0.06em] text-label">{label}</span>
      {children}
    </div>
  );
}

const usd = (v: number) => `US$ ${v.toFixed(v < 1 ? 4 : 2).replace(".", ",")}`;
const at = (ms: number | null) =>
  ms ? new Date(ms).toLocaleString("pt-BR", { weekday: "short", hour: "2-digit", minute: "2-digit" }) : "—";

/** Barra de uso da assinatura (janela de 5 h ou semanal). Vermelha a partir de 80%. */
function UsageBar({ label, w }: { label: string; w: { pct: number; resetsAt: number | null } | null }) {
  const pct = w ? Math.min(100, w.pct) : 0;
  return (
    <span className="flex items-center gap-2" title={w ? `${label}: ${w.pct}% usado · zera ${at(w.resetsAt)}` : `${label}: aparece depois da primeira chamada`}>
      <span className="w-12 text-[11px] text-label">{label}</span>
      <span className="block h-1.5 w-24 overflow-hidden rounded-full bg-active" aria-hidden="true">
        <span className={`block h-full ${pct >= 80 ? "bg-bad" : pct >= 50 ? "bg-pause" : "bg-ink-3"}`} style={{ width: `${pct}%` }} />
      </span>
      <span className="w-11 font-mono tnum text-xs text-ink-2">{w ? `${w.pct.toLocaleString("pt-BR")}%` : "—"}</span>
    </span>
  );
}

/** IA no cabeçalho: custo, uso da assinatura (5 h e semana), Pausar/Continuar e Chamar IA agora. */
function AiControls({ ai }: { ai: StatusDTO["ai"] | null }) {
  const [busy, setBusy] = useState<string | null>(null);
  const send = async (acao: "pausar" | "continuar" | "rodar") => {
    setBusy(acao);
    try {
      await fetch("/api/ia", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ acao }) });
    } finally {
      setTimeout(() => setBusy(null), 1200);
    }
  };
  const running = ai?.run?.running === true;
  const btn = "flex h-9 items-center gap-1.5 rounded-[10px] border border-control px-3 text-xs font-medium text-ink-2 hover:text-ink disabled:opacity-50";
  return (
    <div className="flex flex-col gap-1">
      <span className="flex items-center gap-2 text-[11px] uppercase tracking-[0.06em] text-label">
        IA
        {ai?.paused ? (
          <span className="rounded-full bg-[rgba(255,143,90,0.15)] px-2 normal-case tracking-normal text-pause">pausada</span>
        ) : running ? (
          <span className="normal-case tracking-normal text-good">trabalhando…</span>
        ) : null}
      </span>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
        <span className="flex flex-col gap-1">
          <UsageBar label="5 horas" w={ai?.limits?.fiveHour ?? null} />
          <UsageBar label="Semana" w={ai?.limits?.sevenDay ?? null} />
        </span>
        <span className="flex flex-col font-mono tnum text-xs text-ink-2" title={ai ? `${ai.provider} · claude-haiku-5-5 · ${ai.callsToday} chamadas hoje` : undefined}>
          <span>{ai ? usd(ai.spentTodayUsd) : "—"} <span className="font-sans text-label">hoje</span></span>
          <span>{ai ? usd(ai.spentUsd) : "—"} <span className="font-sans text-label">total</span></span>
        </span>
        <span className="flex gap-1.5">
          <button type="button" onClick={() => void send(ai?.paused ? "continuar" : "pausar")} disabled={!ai || busy != null} className={btn} aria-pressed={ai?.paused}>
            {ai?.paused ? "▶ Continuar" : "❚❚ Pausar"}
          </button>
          <button type="button" onClick={() => void send("rodar")} disabled={!ai || ai.paused || running || busy != null} className={btn} title="Categorias, análises e radar agora, sem esperar o próximo ciclo">
            {running || busy === "rodar" ? "Chamando…" : "✦ Chamar IA agora"}
          </button>
        </span>
      </div>
    </div>
  );
}

export function AppHeader({ active, status, live }: { active: NavKey | null; status: StatusDTO | null; live: boolean }) {
  const ai = status?.ai;
  return (
    <header className="border-b border-line">
      <div className="flex flex-wrap items-center justify-between gap-3 px-8 py-2.5">
        <div className="flex flex-wrap items-center gap-2.5 text-lg font-semibold tracking-tight">
          <Link href="/" className="flex items-center gap-2.5">
            <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 2l8 5v10l-8 5-8-5V7z" className="fill-gold" />
            </svg>
            Garimpo
          </Link>
          <nav aria-label="Seções do app" className="ml-3 flex flex-wrap gap-1 text-sm font-medium">
            {NAV.map((n) => (
              <Link
                key={n.key}
                href={n.href}
                aria-current={active === n.key ? "page" : undefined}
                className={`flex min-h-11 items-center rounded-[10px] px-3.5 ${active === n.key ? "bg-active text-ink" : "text-ink-2 hover:text-ink"}`}
              >
                {n.label}
              </Link>
            ))}
          </nav>
        </div>
        <span className="flex items-center gap-2 text-[13px] text-muted">
          <span className={`h-2 w-2 rounded-full ${live ? "bg-good-dot" : "bg-pause"}`} />
          {live ? "Ao vivo" : "Reconectando"}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-x-10 gap-y-2 border-t border-line bg-deep px-8 py-2.5">
        <Metric label="11.11 começa em">
          <Countdown />
        </Metric>
        <Metric label="Ofertas hoje">
          <span className="font-mono tnum text-[13px] text-ink-2">{status?.today ?? "—"}</span>
        </Metric>
        <Metric label="Verificando">
          <span className="font-mono tnum text-[13px] text-ink-2">{status?.pending ?? "—"}</span>
        </Metric>
        <AiControls ai={ai ?? null} />
        <Metric label="Fontes">
          <span className="flex flex-wrap items-center gap-3 text-xs text-ink-2">
            {(status?.sources ?? []).map((s) => (
              <span key={s.slug} className="flex items-center gap-1.5" title={s.note ?? s.status}>
                <span className={`h-[7px] w-[7px] rounded-full ${statusDot[s.status] ?? "bg-label"}`} />
                {s.name.replace("Fórum de Promoções do ", "")}
                {s.status !== "ok" && <span className="text-label">({s.status})</span>}
              </span>
            ))}
            {status?.telegram && (
              <span className="flex items-center gap-1.5" title={`${status.telegram.on} de ${status.telegram.total} grupos e canais ligados`}>
                <span className={`h-[7px] w-[7px] rounded-full ${status.telegram.on ? "bg-good-dot" : "bg-label"}`} />
                Telegram ({status.telegram.on})
              </span>
            )}
          </span>
        </Metric>
        <Metric label="Máquina">
          <span className="flex items-center gap-1.5 text-xs text-ink-2">
            <span className="h-[7px] w-[7px] rounded-full bg-good-dot" />
            Este PC · tudo local
          </span>
        </Metric>
      </div>
    </header>
  );
}

export function PageTitle({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <h1 className="text-[30px] font-semibold tracking-tight">{title}</h1>
      {children && <p className="max-w-3xl text-sm text-muted">{children}</p>}
    </div>
  );
}

export function Kbd({ children }: { children: React.ReactNode }) {
  return <kbd className="rounded-md border border-control px-1.5 py-0.5 font-mono text-[11px] text-ink-2">{children}</kbd>;
}
