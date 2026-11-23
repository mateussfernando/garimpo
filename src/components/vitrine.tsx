"use client";

import { AnimatePresence, LayoutGroup, MotionConfig } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Toaster, toast } from "sonner";
import type { EventDTO } from "@/app/api/events/route";
import type { OfferDTO, StatusDTO } from "@/lib/offers";
import { precoDe } from "@/lib/preco";
import { useSeVisitante } from "./conta-aviso";
import { usePreco } from "./preco";
import { Feed } from "./feed";
import { FiltersBar, useSmartFilters } from "./filtros";
import { OfferCard } from "./offer-card";
import { PainelFoco } from "./painel-foco";
import { RadarPanel } from "./ia";
import { AppHeader, Kbd, ago, brl, useLive, useNow } from "./shell";
import { useAlertSound } from "./use-alert";

type Flash = Record<number, "down" | "up">;
type PatchBody = { watched?: boolean; dismissed?: boolean };

const json = <T,>(url: string): Promise<T> => fetch(url, { cache: "no-store" }).then((r) => r.json());
/** O feed "Ao vivo" é da conta (Alvos dela): visitante recebe 401 e fica sem feed, sem erro. */
const jsonOuVazio = <T,>(url: string, vazio: T): Promise<T> => fetch(url, { cache: "no-store" }).then((r) => (r.ok ? (r.json() as Promise<T>) : vazio));

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
  const { pref } = usePreco();
  const seVisitante = useSeVisitante();
  const [version, setVersion] = useState(0);
  const [flash, setFlash] = useState<Flash>({});
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
    const [o, s, e] = await Promise.all([json<OfferDTO[]>("/api/offers"), json<StatusDTO>("/api/status"), jsonOuVazio<EventDTO[]>("/api/events", [])]);

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
      // Sem conta: a Vitrine é aberta, mas vigiar e descartar pedem conta.
      if (seVisitante(body.dismissed !== undefined ? "descartar" : "vigiar")) return;
      setOffers((prev) => (prev ?? []).flatMap((o) => (o.id !== id ? [o] : body.dismissed ? [] : [{ ...o, ...body }])));
      await fetch(`/api/offers/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (body.dismissed === false) await load();
    },
    [load, seVisitante],
  );

  const dismiss = useCallback(
    (o: OfferDTO) => {
      // O card reúne todas as ofertas do mesmo produto: descartar (e desfazer) vale para todas.
      const send = (dismissed: boolean) => Promise.all(o.groupIds.map((id) => patch(id, { dismissed })));
      void send(true);
      setOpenId((cur) => (cur === o.id ? null : cur));
      toast("Oferta descartada", {
        description: o.title.slice(0, 70),
        duration: 6000,
        action: { label: "Desfazer", onClick: () => void send(false) },
      });
    },
    [patch],
  );

  const filters = useSmartFilters(offers);

  // Rolagem livre: enquanto você está lendo mais abaixo, a grade não se reordena nem ganha cards novos em cima
  // (isso empurrava a página). As novas esperam num aviso "N ofertas novas"; no topo, tudo entra na hora.
  const [frozen, setFrozen] = useState<number[] | null>(null);
  const liveIds = useRef<number[]>([]);
  const filterKey = JSON.stringify(filters.st);
  useEffect(() => {
    liveIds.current = filters.shown.map((o) => o.id);
  }, [filters.shown]);
  useEffect(() => {
    const onScroll = () => {
      const down = window.scrollY > 240;
      setFrozen((cur) => (down ? (cur ?? liveIds.current) : null));
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => {
    // Mudou o filtro: a grade nova vale já, mesmo rolada.
    setFrozen((cur) => (cur ? liveIds.current : null));
  }, [filterKey]);
  const { shown, pendingNew } = useMemo(() => {
    if (!frozen) return { shown: filters.shown, pendingNew: 0 };
    const byId = new Map(filters.shown.map((o) => [o.id, o]));
    const keep = frozen.map((id) => byId.get(id)).filter((o): o is OfferDTO => !!o);
    return { shown: keep, pendingNew: filters.shown.length - keep.length };
  }, [frozen, filters.shown]);
  const alvoNames = useMemo(() => new Map((status?.alvos ?? []).map((a) => [a.slug, a.name])), [status]);
  const atingidos = shown.filter((o) => o.alvoAtingido).slice(0, 6);
  const lastOfferAt = useMemo(() => (offers ?? []).reduce((mx, o) => (o.createdAt > mx ? o.createdAt : mx), ""), [offers]);

  const open = useCallback(
    (id: number) => {
      setOpenId(id);
    },
    [],
  );




  return (
    <MotionConfig reducedMotion="user">
      <div className={`flex min-h-screen flex-col transition-[padding] duration-300 ${openId != null ? "xl:pr-[440px]" : ""}`}>
        <AppHeader active="vitrine" status={status} live={live} />
        <Feed events={events} now={now} onOpen={open} />

        <main className="mx-auto flex w-full max-w-[1440px] flex-col gap-6 px-8 pb-8 pt-7">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex flex-col gap-1.5">
              <h1 className="text-[30px] font-semibold tracking-tight">Vitrine</h1>
              <p className="text-sm text-muted">Ofertas ao vivo de qualquer produto dos seus grupos e comunidades, ordenadas pela nota. O preço grande é o total no cartão.</p>
            </div>
            <div className="flex items-center gap-3 text-[13px] text-muted">
              {lastOfferAt && <span>última oferta {ago(lastOfferAt, now)}</span>}
              <button type="button" onClick={toggleMute} aria-pressed={!muted} className="flex h-11 items-center gap-2 rounded-[10px] border border-control px-3.5 text-ink-2 hover:text-ink" title="Som do alerta de Alvo atingido">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M11 5L6 9H3v6h3l5 4z" />
                  {muted ? <path d="M22 9l-6 6M16 9l6 6" /> : <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" />}
                </svg>
                {muted ? "Som desligado" : "Som ligado"}
              </button>
            </div>
          </div>

          {status?.radar && <RadarPanel radar={status.radar} now={now} onOpen={open} />}

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
                        {brl(precoDe(o, pref).cents)} <span className="text-muted">· alvo {brl(o.alvo?.targetCents)}{o.band ? ` · ${o.band.label}` : ""}</span>
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

          <FiltersBar {...filters} alvoNames={alvoNames} />

          {pendingNew > 0 && (
            <button
              type="button"
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="fixed left-1/2 top-4 z-40 flex h-10 -translate-x-1/2 items-center gap-2 rounded-full bg-ink px-4 text-[13px] font-semibold text-bg shadow-lg"
            >
              ↑ {pendingNew} {pendingNew === 1 ? "oferta nova" : "ofertas novas"}
            </button>
          )}

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
                      now={now}
                      flash={flash[o.id]}
                      onOpen={() => open(o.id)}
                      onWatch={() => void patch(o.id, { watched: !o.watched })}
                      onDismiss={() => dismiss(o)}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </LayoutGroup>
          )}
        </main>

        <footer className="mt-auto flex items-center justify-center px-8 pb-7 pt-4 text-xs text-label">
          <span className="flex items-center gap-1.5">
            <Kbd>/</Kbd> buscar
          </span>
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
