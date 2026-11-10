"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { OfferDTO, StatusDTO } from "@/lib/offers";

const brl = (cents: number | null | undefined) =>
  cents == null ? "—" : (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const START_11_11 = new Date("2026-11-11T00:00:00-03:00").getTime();

function useNow(everyMs: number) {
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

function Countdown() {
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

function ago(iso: string | null, now: number | null) {
  if (!iso || now == null) return "";
  const min = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60000));
  return min < 1 ? "agora" : min < 60 ? `há ${min} min` : `há ${Math.round(min / 60)} h`;
}

type Tone = "gold" | "good" | "bad" | "neutral";
function Badge({ tone, children, title }: { tone: Tone; children: React.ReactNode; title?: string }) {
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

const statusDot: Record<string, string> = { ok: "bg-good-dot", pausada: "bg-pause", bloqueada: "bg-label", erro: "bg-bad" };

export function Vitrine() {
  const [offers, setOffers] = useState<OfferDTO[] | null>(null);
  const [status, setStatus] = useState<StatusDTO | null>(null);
  const [live, setLive] = useState(false);
  const [alvo, setAlvo] = useState<string>("all");
  const [freeOnly, setFreeOnly] = useState(false);
  const [focus, setFocus] = useState(0);
  const now = useNow(30_000);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    const [o, s] = await Promise.all([
      fetch("/api/offers", { cache: "no-store" }).then((r) => r.json()),
      fetch("/api/status", { cache: "no-store" }).then((r) => r.json()),
    ]);
    setOffers(o);
    setStatus(s);
  }, []);

  useEffect(() => {
    const first = setTimeout(() => void load(), 0);
    const es = new EventSource("/api/stream");
    // A cada (re)conexão, recarrega: pode ter perdido avisos enquanto caiu.
    es.addEventListener("ready", () => {
      setLive(true);
      void load();
    });
    es.onmessage = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void load(), 400);
    };
    es.onerror = () => setLive(false);
    return () => {
      clearTimeout(first);
      es.close();
    };
  }, [load]);

  const patch = useCallback(async (id: number, body: { watched?: boolean; dismissed?: boolean }) => {
    setOffers((prev) => (prev ?? []).flatMap((o) => (o.id !== id ? [o] : body.dismissed ? [] : [{ ...o, ...body }])));
    await fetch(`/api/offers/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  }, []);

  const alvoChips = useMemo(() => {
    const base = (offers ?? []).filter((o) => !freeOnly || o.freeShipping);
    const counts = new Map<string, number>();
    for (const o of base) if (o.alvo) counts.set(o.alvo.slug, (counts.get(o.alvo.slug) ?? 0) + 1);
    return [
      { slug: "all", name: "Todos os Alvos", count: base.filter((o) => o.alvo).length },
      ...(status?.alvos ?? []).map((a) => ({ slug: a.slug, name: a.name, count: counts.get(a.slug) ?? 0 })),
    ];
  }, [offers, status, freeOnly]);

  const shown = useMemo(
    () =>
      (offers ?? []).filter(
        (o) => o.alvo && (alvo === "all" || o.alvo.slug === alvo) && (!freeOnly || o.freeShipping),
      ),
    [offers, alvo, freeOnly],
  );
  const atingidos = shown.filter((o) => o.alvoAtingido).slice(0, 6);

  // Atalhos: J/K navegam, Enter compra, W vigia, X descarta.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || e.metaKey || e.ctrlKey || e.altKey) return;
      const cur = shown[focus];
      const k = e.key.toLowerCase();
      if (k === "j" || k === "arrowdown") setFocus((f) => Math.min(f + 1, Math.max(0, shown.length - 1)));
      else if (k === "k" || k === "arrowup") setFocus((f) => Math.max(0, f - 1));
      else if (k === "enter" && cur?.url && !/^(BUTTON|A)$/.test(t.tagName)) window.open(cur.url, "_blank", "noopener,noreferrer");
      else if (k === "w" && cur) void patch(cur.id, { watched: !cur.watched });
      else if (k === "x" && cur) void patch(cur.id, { dismissed: true });
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [shown, focus, patch]);

  useEffect(() => {
    document.querySelector(`[data-card="${focus}"]`)?.scrollIntoView({ block: "nearest" });
  }, [focus]);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-line">
        <div className="flex flex-wrap items-center justify-between gap-3 px-8 py-2.5">
          <div className="flex items-center gap-2.5 text-lg font-semibold tracking-tight">
            <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 2l8 5v10l-8 5-8-5V7z" className="fill-gold" />
            </svg>
            Garimpo
            <span className="ml-3 rounded-[10px] bg-active px-3.5 py-2.5 text-sm font-medium">Vitrine</span>
          </div>
          <span className="flex items-center gap-2 text-[13px] text-muted">
            <span className={`h-2 w-2 rounded-full ${live ? "bg-good-dot" : "bg-pause"}`} />
            {live ? "Ao vivo" : "Reconectando"}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-x-10 gap-y-2 border-t border-line bg-deep px-8 py-2.5">
          <div className="flex flex-col gap-0.5">
            <span className="text-[11px] uppercase tracking-[0.06em] text-label">11.11 começa em</span>
            <Countdown />
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-[11px] uppercase tracking-[0.06em] text-label">Ofertas hoje</span>
            <span className="font-mono tnum text-[13px] text-ink-2">{status?.today ?? "—"}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-[11px] uppercase tracking-[0.06em] text-label">Verificando</span>
            <span className="font-mono tnum text-[13px] text-ink-2">{status?.pending ?? "—"}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[11px] uppercase tracking-[0.06em] text-label">Fontes</span>
            <span className="flex flex-wrap items-center gap-3 text-xs text-ink-2">
              {(status?.sources ?? []).map((s) => (
                <span key={s.slug} className="flex items-center gap-1.5" title={s.note ?? s.status}>
                  <span className={`h-[7px] w-[7px] rounded-full ${statusDot[s.status] ?? "bg-label"}`} />
                  {s.name.replace("Fórum de Promoções do ", "")}
                  {s.status !== "ok" && <span className="text-label">({s.status})</span>}
                </span>
              ))}
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[1440px] flex-col gap-6 px-8 pb-8 pt-7">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-[30px] font-semibold tracking-tight">Vitrine</h1>
          <p className="text-sm text-muted">
            Ofertas das comunidades para os seus Alvos, ordenadas pela nota. O preço é o total no cartão.
          </p>
        </div>

        {atingidos.length > 0 && (
          <section
            aria-labelledby="alvos-atingidos"
            className="flex flex-col gap-3.5 rounded-2xl border border-[color-mix(in_srgb,var(--color-gold)_45%,transparent)] bg-[color-mix(in_srgb,var(--color-gold)_7%,var(--color-bg))] p-[18px]"
          >
            <h2 id="alvos-atingidos" className="flex items-center gap-2.5 text-[15px] font-semibold text-gold">
              <span className="h-2 w-2 rounded-full bg-gold" />
              Alvos atingidos
            </h2>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(min(380px,100%),1fr))] gap-3">
              {atingidos.map((o) => (
                <div key={o.id} className="flex min-w-0 items-center gap-3.5 rounded-xl border border-[#23272E] bg-[#111316] p-3">
                  <Thumb src={o.imageUrl} size={56} slug={o.alvo?.slug} />
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="truncate font-medium">{o.title}</span>
                    <span className="font-mono text-[13px] text-[#DADDE1]">
                      {brl(o.priceCardCents)} <span className="text-muted">· alvo {brl(o.alvo?.targetCents)}</span>
                    </span>
                  </div>
                  {o.url && (
                    <a href={o.url} target="_blank" rel="noopener noreferrer" className="flex h-11 flex-none items-center rounded-[10px] bg-gold px-[18px] text-sm font-semibold text-on-gold">
                      Comprar
                    </a>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div role="group" aria-label="Filtrar por Alvo" className="flex flex-wrap gap-2">
            {alvoChips.map((c) => {
              const on = alvo === c.slug;
              return (
                <button
                  key={c.slug}
                  type="button"
                  aria-pressed={on}
                  onClick={() => {
                    setAlvo(c.slug);
                    setFocus(0);
                  }}
                  className={`flex h-11 items-center gap-2 rounded-full border px-4 text-[13px] font-medium ${on ? "border-ink bg-ink text-bg" : "border-control text-ink-2"}`}
                >
                  {c.name}
                  <span className="font-mono text-xs opacity-65">{c.count}</span>
                </button>
              );
            })}
          </div>
          <label className="flex h-11 cursor-pointer items-center gap-2 rounded-[10px] border border-control px-3.5 text-[13px] text-ink-2">
            <input type="checkbox" checked={freeOnly} onChange={() => setFreeOnly((v) => !v)} className="h-4 w-4 accent-good-dot" />
            Só frete grátis
          </label>
        </div>

        {offers == null ? (
          <p className="text-sm text-muted">Carregando…</p>
        ) : shown.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-[14px] border border-dashed border-control px-6 py-14 text-center">
            <span className="text-base font-medium">Nenhuma oferta para os seus Alvos ainda</span>
            <span className="max-w-xl text-[13px] text-muted">
              A coleta lê as comunidades a cada 10 min enquanto o app está aberto, respeitando o robots.txt de cada site. As ofertas aparecem aqui sozinhas.
            </span>
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(min(300px,100%),1fr))] gap-5">
            {shown.map((o, i) => (
              <Card key={o.id} o={o} index={i} focused={i === focus} now={now} onWatch={() => void patch(o.id, { watched: !o.watched })} onDismiss={() => void patch(o.id, { dismissed: true })} onFocus={() => setFocus(i)} />
            ))}
          </div>
        )}
      </main>

      <footer className="mt-auto flex flex-wrap items-center justify-center gap-x-5 gap-y-2 px-8 pb-7 pt-4 text-xs text-label">
        {[["J K", "navegar"], ["Enter", "comprar"], ["W", "vigiar"], ["X", "descartar"]].map(([k, v]) => (
          <span key={k} className="flex items-center gap-1.5">
            <kbd className="rounded-md border border-control px-1.5 py-0.5 font-mono text-[11px] text-ink-2">{k}</kbd> {v}
          </span>
        ))}
      </footer>
    </div>
  );
}

const ICONS: Record<string, React.ReactNode> = {
  "braco-articulado": (
    <>
      <rect x="13" y="3.5" width="8.5" height="6" rx="1" />
      <path d="M3 21h7M6.5 21v-4.5M6.5 16.5l5-3.5M11.5 13l2.5-3" />
      <circle cx="6.5" cy="16.5" r="1" />
      <circle cx="11.5" cy="13" r="1" />
    </>
  ),
  mouse: (
    <>
      <rect x="7.5" y="3" width="9" height="18" rx="4.5" />
      <path d="M12 6.5v4" />
    </>
  ),
  teclado: (
    <>
      <rect x="2" y="7" width="20" height="10" rx="2" />
      <path d="M5.5 10.5h1M8.5 10.5h1M11.5 10.5h1M14.5 10.5h1M17.5 10.5h1M7 13.8h10" />
    </>
  ),
  monitor: (
    <>
      <rect x="3" y="4" width="18" height="12" rx="1.5" />
      <path d="M9 20h6M12 16v4" />
    </>
  ),
  ssd: (
    <>
      <rect x="2.5" y="8.5" width="19" height="7" rx="1.2" />
      <path d="M5 12h7M15 11v2M17.5 11v2" />
    </>
  ),
  acessorios: (
    <>
      <path d="M4 15v-3a8 8 0 0 1 16 0v3" />
      <rect x="3" y="14" width="4" height="6" rx="1.5" />
      <rect x="17" y="14" width="4" height="6" rx="1.5" />
    </>
  ),
};

/** Sem foto da loja ainda: o ícone de traço do Alvo, como no design. */
function AlvoIcon({ slug, size }: { slug: string | undefined; size: number }) {
  const icon = (slug && ICONS[slug]) || ICONS.acessorios;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={size > 60 ? 0.9 : 1.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="text-ink-2">
      {icon}
    </svg>
  );
}

function Thumb({ src, size, slug }: { src: string | null; size: number; slug?: string }) {
  return (
    <div className="dots flex flex-none items-center justify-center overflow-hidden rounded-[10px]" style={{ width: size, height: size }}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="h-full w-full object-contain" loading="lazy" referrerPolicy="no-referrer" />
      ) : (
        <AlvoIcon slug={slug} size={Math.round(size * 0.6)} />
      )}
    </div>
  );
}

function Card({ o, index, focused, now, onWatch, onDismiss, onFocus }: { o: OfferDTO; index: number; focused: boolean; now: number | null; onWatch: () => void; onDismiss: () => void; onFocus: () => void }) {
  const parcela =
    o.installments && o.installmentCents
      ? `${o.installments}x de ${brl(o.installmentCents)}${o.interest === false ? " sem juros" : o.interest ? " com juros" : ""}`
      : o.cashCents && o.cashCents !== o.priceCardCents
        ? `${brl(o.cashCents)} à vista`
        : o.priceBasis === "unico"
          ? "parcelas não informadas"
          : "";
  return (
    <article
      data-card={index}
      onMouseEnter={onFocus}
      className={`flex min-w-0 flex-col overflow-hidden rounded-[14px] border bg-surface ${o.alvoAtingido ? "border-gold" : "border-card-line"} ${focused ? "ring-2 ring-ink ring-offset-2 ring-offset-bg" : ""}`}
    >
      <div className="dots relative flex aspect-[4/3] items-center justify-center">
        {o.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={o.imageUrl} alt="" className="h-full w-full object-contain p-4" loading="lazy" referrerPolicy="no-referrer" />
        ) : (
          <AlvoIcon slug={o.alvo?.slug} size={104} />
        )}
        <div className="absolute left-3 top-3 flex items-baseline gap-1.5 rounded-full border border-control bg-pill px-2.5 py-1.5">
          <span className="font-mono text-[15px] font-semibold text-num">{o.nota ?? "—"}</span>
          <span className="text-[11px] uppercase tracking-[0.06em] text-muted">nota</span>
        </div>
        {o.store && <span className="absolute right-3 top-3 rounded-full border border-control bg-pill px-2.5 py-1.5 text-xs text-ink-2">{o.store}</span>}
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <a href={o.url ?? "#"} target="_blank" rel="noopener noreferrer" className="line-clamp-2 min-h-10 text-[15px] font-medium leading-snug text-ink">
          {o.title}
        </a>
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <span className="font-mono tnum text-[26px] font-semibold tracking-tight text-num">{brl(o.priceCardCents)}</span>
            <span className="text-xs text-muted">no cartão</span>
          </div>
          <span className="font-mono text-[12.5px] text-ink-3">{parcela}</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {o.alvoAtingido && <Badge tone="gold">Alvo atingido</Badge>}
          {o.freeShipping && <Badge tone="good">Frete grátis</Badge>}
          {o.interest === true && <Badge tone="bad">Com juros</Badge>}
          {o.verifyStatus === "verificado" && <Badge tone="neutral">Verificado {ago(o.verifiedAt, now)}</Badge>}
          {o.verifyStatus === "pendente" && <Badge tone="neutral">Verificando…</Badge>}
          {o.verifyStatus === "nao_verificado" && (
            <Badge tone="neutral" title={o.verifyNote ?? undefined}>
              Não verificado
            </Badge>
          )}
          {o.alvo && !o.alvo.targetCents && <Badge tone="neutral">Sem referência</Badge>}
          {o.coupon && <Badge tone="neutral">Cupom {o.coupon}</Badge>}
          <Badge tone="neutral">via {o.source}</Badge>
        </div>
        <div className="mt-auto flex gap-2">
          {o.url ? (
            <a href={o.url} target="_blank" rel="noopener noreferrer" className="flex h-11 flex-1 items-center justify-center rounded-[10px] bg-ink text-sm font-semibold text-bg">
              Comprar
            </a>
          ) : (
            <span className="flex h-11 flex-1 items-center justify-center rounded-[10px] border border-control text-sm text-muted">Sem link</span>
          )}
          <button type="button" aria-pressed={o.watched} aria-label={o.watched ? "Parar de vigiar o preço" : "Vigiar o preço"} onClick={onWatch} className={`flex h-11 w-11 flex-none items-center justify-center rounded-[10px] border ${o.watched ? "border-ink bg-ink text-bg" : "border-control text-ink-2"}`}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </button>
          <button type="button" aria-label="Descartar oferta" onClick={onDismiss} className="flex h-11 w-11 flex-none items-center justify-center rounded-[10px] border border-control text-ink-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
      </div>
    </article>
  );
}
