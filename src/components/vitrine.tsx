"use client";

import { AnimatePresence, LayoutGroup, MotionConfig } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Toaster, toast } from "sonner";
import type { EventDTO } from "@/app/api/events/route";
import type { OfferDTO, StatusDTO } from "@/lib/offers";
import { Feed } from "./feed";
import { OfferCard } from "./offer-card";
import { PainelFoco } from "./painel-foco";
import { AppHeader, Kbd, ago, brl, useLive, useNow } from "./shell";
import { useAlertSound } from "./use-alert";

type Flash = Record<number, "down" | "up">;
type PatchBody = { watched?: boolean; dismissed?: boolean };

const json = <T,>(url: string): Promise<T> => fetch(url, { cache: "no-store" }).then((r) => r.json());

function SkeletonCard() {
  return (
    <div className="flex flex-col overflow-hidden rounded-[14px] border border-card-line bg-surface" aria-hidden="true">
      <div className="dots aspect-[4/3] animate-pulse" />
      <div className="flex flex-col gap-3 p-4">
        <div className="h-4 w-4/5 animate-pulse rounded bg-active" />
        <div className="h-7 w-1/2 animate-pulse rounded bg-active" />
        <div className="h-3 w-2/3 animate-pulse rounded bg-active" />
        <div className="mt-2 h-11 animate-pulse rounded-[10px] bg-active" />
      </div>
    </div>
  );
}

export function Vitrine() {
  const [offers, setOffers] = useState<OfferDTO[] | null>(null);
  const [status, setStatus] = useState<StatusDTO | null>(null);
  const [events, setEvents] = useState<EventDTO[]>([]);
  const [version, setVersion] = useState(0);
  const [flash, setFlash] = useState<Flash>({});
  const [alvo, setAlvo] = useState<string>("all");
  const [freeOnly, setFreeOnly] = useState(false);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [focus, setFocus] = useState(0);
  const [openId, setOpenId] = useState<number | null>(null);
  const now = useNow(15_000);
  const { muted, toggleMute, play, flashTitle } = useAlertSound();

  const prices = useRef(new Map<number, number | null>());
  const lastEventId = useRef<number | null>(null);
  // O alerta precisa do som e do estado mais recentes sem recriar o `load` a cada render.
  const onHit = useRef<(e: EventDTO) => void>(() => undefined);
  useEffect(() => {
    onHit.current = (e) => {
      const played = play("alvo");
      flashTitle("★ Alvo atingido · Garimpo");
      toast(`Alvo atingido: ${e.title}`, {
        description: `${brl(e.to)} no cartão${e.target ? ` · alvo ${brl(e.target)}` : ""}${e.band ? ` · ${e.band}` : ""}${played ? "" : " · som desligado"}`,
        duration: 25_000,
        action: e.offerId != null ? { label: "Ver", onClick: () => setOpenId(e.offerId) } : undefined,
        style: { borderColor: "#F5B83D", background: "#17140A", color: "#F5B83D" },
      });
    };
  }, [play, flashTitle]);

  const load = useCallback(async () => {
    const [o, s, e] = await Promise.all([json<OfferDTO[]>("/api/offers"), json<StatusDTO>("/api/status"), json<EventDTO[]>("/api/events")]);

    // Preço que mudou pisca como cotação.
    const changed: Flash = {};
    for (const x of o) {
      const prev = prices.current.get(x.id);
      if (prev != null && x.priceCardCents != null && prev !== x.priceCardCents) changed[x.id] = x.priceCardCents < prev ? "down" : "up";
      prices.current.set(x.id, x.priceCardCents);
    }
    const ids = Object.keys(changed).map(Number);
    if (ids.length) {
      setFlash((f) => ({ ...f, ...changed }));
      setTimeout(() => setFlash((f) => Object.fromEntries(Object.entries(f).filter(([k]) => !ids.includes(Number(k)))) as Flash), 2600);
    }

    setOffers(o);
    setStatus(s);
    setEvents(e);
    setVersion((v) => v + 1);

    // Alerta: só para Alvo atingido que aconteceu depois que a página abriu.
    const newest = e[0]?.id ?? 0;
    if (lastEventId.current == null) lastEventId.current = newest;
    else {
      const since = lastEventId.current;
      lastEventId.current = Math.max(since, newest);
      for (const hit of e.filter((x) => x.type === "alvo" && x.id > since).slice(0, 3)) onHit.current(hit);
    }
  }, []);
  const live = useLive(load);

  const patch = useCallback(
    async (id: number, body: PatchBody) => {
      setOffers((prev) => (prev ?? []).flatMap((o) => (o.id !== id ? [o] : body.dismissed ? [] : [{ ...o, ...body }])));
      await fetch(`/api/offers/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (body.dismissed === false) await load();
    },
    [load],
  );

  const dismiss = useCallback(
    (o: OfferDTO) => {
      void patch(o.id, { dismissed: true });
      setOpenId((cur) => (cur === o.id ? null : cur));
      toast("Oferta descartada", {
        description: o.title.slice(0, 70),
        duration: 6000,
        action: { label: "Desfazer", onClick: () => void patch(o.id, { dismissed: false }) },
      });
    },
    [patch],
  );

  const alvoChips = useMemo(() => {
    const base = (offers ?? []).filter((o) => (!freeOnly || o.freeShipping) && (!verifiedOnly || o.verifyStatus === "verificado"));
    const counts = new Map<string, number>();
    for (const o of base) if (o.alvo) counts.set(o.alvo.slug, (counts.get(o.alvo.slug) ?? 0) + 1);
    return [
      { slug: "all", name: "Todos os Alvos", count: base.filter((o) => o.alvo).length },
      ...(status?.alvos ?? []).map((a) => ({ slug: a.slug, name: a.name, count: counts.get(a.slug) ?? 0 })).filter((c) => c.count > 0),
    ];
  }, [offers, status, freeOnly, verifiedOnly]);

  const shown = useMemo(
    () =>
      (offers ?? []).filter(
        (o) => o.alvo && (alvo === "all" || o.alvo.slug === alvo) && (!freeOnly || o.freeShipping) && (!verifiedOnly || o.verifyStatus === "verificado"),
      ),
    [offers, alvo, freeOnly, verifiedOnly],
  );
  const atingidos = shown.filter((o) => o.alvoAtingido).slice(0, 6);
  const lastOfferAt = useMemo(() => (offers ?? []).reduce((mx, o) => (o.createdAt > mx ? o.createdAt : mx), ""), [offers]);

  const open = useCallback(
    (id: number) => {
      setOpenId(id);
      const i = shown.findIndex((o) => o.id === id);
      if (i >= 0) setFocus(i);
    },
    [shown],
  );

  // Atalhos: J/K navegam, Enter compra, Espaço abre o painel, Esc fecha, W vigia, X descarta, M silencia.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || e.metaKey || e.ctrlKey || e.altKey) return;
      const cur = shown[focus];
      const k = e.key.toLowerCase();
      const move = (dir: 1 | -1) => {
        const next = Math.max(0, Math.min(focus + dir, shown.length - 1));
        setFocus(next);
        if (openId != null && shown[next]) setOpenId(shown[next].id);
      };
      if (k === "j" || k === "arrowdown") move(1);
      else if (k === "k" || k === "arrowup") move(-1);
      else if (k === "enter" && cur?.url && !/^(BUTTON|A)$/.test(t.tagName)) window.open(cur.url, "_blank", "noopener,noreferrer");
      else if ((k === " " || k === "arrowright") && cur && !/^(BUTTON|A)$/.test(t.tagName)) setOpenId(cur.id);
      else if ((k === "escape" || k === "arrowleft") && openId != null) setOpenId(null);
      else if (k === "w" && cur) void patch(cur.id, { watched: !cur.watched });
      else if (k === "x" && cur) dismiss(cur);
      else if (k === "m") toggleMute();
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [shown, focus, openId, patch, dismiss, toggleMute]);

  useEffect(() => {
    document.querySelector(`[data-card="${focus}"]`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [focus]);

  const chip = (on: boolean) => `flex h-11 items-center gap-2 rounded-full border px-4 text-[13px] font-medium ${on ? "border-ink bg-ink text-bg" : "border-control text-ink-2 hover:text-ink"}`;

  return (
    <MotionConfig reducedMotion="user">
      <div className={`flex min-h-screen flex-col transition-[padding] duration-300 ${openId != null ? "xl:pr-[440px]" : ""}`}>
        <AppHeader active="vitrine" status={status} live={live} />
        <Feed events={events} now={now} onOpen={open} />

        <main className="mx-auto flex w-full max-w-[1440px] flex-col gap-6 px-8 pb-8 pt-7">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex flex-col gap-1.5">
              <h1 className="text-[30px] font-semibold tracking-tight">Vitrine</h1>
              <p className="text-sm text-muted">Ofertas ao vivo para os seus Alvos, ordenadas pela nota. O preço grande é o total no cartão.</p>
            </div>
            <div className="flex items-center gap-3 text-[13px] text-muted">
              {lastOfferAt && <span>última oferta {ago(lastOfferAt, now)}</span>}
              <button type="button" onClick={toggleMute} aria-pressed={!muted} className="flex h-11 items-center gap-2 rounded-[10px] border border-control px-3.5 text-ink-2 hover:text-ink" title="Som do alerta de Alvo atingido (tecla M)">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M11 5L6 9H3v6h3l5 4z" />
                  {muted ? <path d="M22 9l-6 6M16 9l6 6" /> : <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" />}
                </svg>
                {muted ? "Som desligado" : "Som ligado"}
              </button>
            </div>
          </div>

          {atingidos.length > 0 && (
            <section aria-labelledby="alvos-atingidos" className="flex flex-col gap-3.5 rounded-2xl border border-[color-mix(in_srgb,var(--color-gold)_45%,transparent)] bg-[color-mix(in_srgb,var(--color-gold)_7%,var(--color-bg))] p-[18px]">
              <h2 id="alvos-atingidos" className="flex items-center gap-2.5 text-[15px] font-semibold text-gold">
                <span className="h-2 w-2 rounded-full bg-gold" />
                Alvos atingidos
              </h2>
              <div className="grid grid-cols-[repeat(auto-fit,minmax(min(380px,100%),1fr))] gap-3">
                {atingidos.map((o) => (
                  <div key={o.id} className="flex min-w-0 items-center gap-3.5 rounded-xl border border-[#23272E] bg-[#111316] p-3">
                    <button type="button" onClick={() => open(o.id)} className="dots flex h-14 w-14 flex-none items-center justify-center overflow-hidden rounded-[10px]" aria-label={`Abrir ${o.title}`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {o.imageUrl && <img src={o.imageUrl} alt="" className="h-full w-full object-contain" loading="lazy" referrerPolicy="no-referrer" />}
                    </button>
                    <button type="button" onClick={() => open(o.id)} className="flex min-w-0 flex-1 flex-col gap-1 text-left">
                      <span className="truncate font-medium">{o.title}</span>
                      <span className="truncate font-mono text-[13px] text-[#DADDE1]">
                        {brl(o.priceCardCents)} <span className="text-muted">· alvo {brl(o.alvo?.targetCents)}{o.band ? ` · ${o.band.label}` : ""}</span>
                      </span>
                    </button>
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
              {alvoChips.map((c) => (
                <button
                  key={c.slug}
                  type="button"
                  aria-pressed={alvo === c.slug}
                  onClick={() => {
                    setAlvo(c.slug);
                    setFocus(0);
                  }}
                  className={chip(alvo === c.slug)}
                >
                  {c.name}
                  <span className="font-mono text-xs opacity-65">{c.count}</span>
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" aria-pressed={verifiedOnly} onClick={() => setVerifiedOnly((v) => !v)} className={chip(verifiedOnly)}>
                Só conferidas na loja
              </button>
              <button type="button" aria-pressed={freeOnly} onClick={() => setFreeOnly((v) => !v)} className={chip(freeOnly)}>
                Só frete grátis
              </button>
            </div>
          </div>

          {offers == null ? (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(min(300px,100%),1fr))] gap-5" aria-busy="true" aria-label="Carregando ofertas">
              {Array.from({ length: 8 }, (_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : shown.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-[14px] border border-dashed border-control px-6 py-14 text-center">
              <span className="text-base font-medium">Nenhuma oferta com esses filtros agora</span>
              <span className="max-w-xl text-[13px] text-muted">As ofertas chegam sozinhas pelos canais do Telegram e pelas comunidades, enquanto o app está aberto. Tire um filtro ou espere a próxima.</span>
            </div>
          ) : (
            <LayoutGroup>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(min(300px,100%),1fr))] gap-5">
                <AnimatePresence mode="popLayout" initial={false}>
                  {shown.map((o, i) => (
                    <OfferCard
                      key={o.id}
                      o={o}
                      index={i}
                      focused={i === focus}
                      now={now}
                      flash={flash[o.id]}
                      onOpen={() => open(o.id)}
                      onWatch={() => void patch(o.id, { watched: !o.watched })}
                      onDismiss={() => dismiss(o)}
                      onFocus={() => setFocus(i)}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </LayoutGroup>
          )}
        </main>

        <footer className="mt-auto flex flex-wrap items-center justify-center gap-x-5 gap-y-2 px-8 pb-7 pt-4 text-xs text-label">
          {[["J K", "navegar"], ["Espaço", "abrir o painel"], ["Enter", "comprar"], ["W", "vigiar"], ["X", "descartar"], ["M", "som"], ["Esc", "fechar"]].map(([k, v]) => (
            <span key={k} className="flex items-center gap-1.5">
              <Kbd>{k}</Kbd> {v}
            </span>
          ))}
        </footer>
      </div>

      <AnimatePresence>
        {openId != null && (
          <PainelFoco
            key="painel"
            id={openId}
            now={now}
            version={version}
            onClose={() => setOpenId(null)}
            onWatch={(watched) => void patch(openId, { watched })}
            onDismiss={() => {
              const o = (offers ?? []).find((x) => x.id === openId);
              if (o) dismiss(o);
            }}
          />
        )}
      </AnimatePresence>
      <Toaster theme="dark" position="bottom-left" toastOptions={{ style: { background: "#1C2026", border: "1px solid #2C313A", color: "#ECEDEE" } }} />
    </MotionConfig>
  );
}
