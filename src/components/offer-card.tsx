"use client";

import { motion } from "motion/react";
import type { OfferDTO } from "@/lib/offers";
import { Badge, ago, brl } from "./shell";

/** Quanto falta para o fim da oferta, em texto curto. null se já passou ou não há prazo. */
export function endsIn(iso: string | undefined, now: number | null): string | null {
  if (!iso || now == null) return null;
  const left = new Date(iso).getTime() - now;
  if (left <= 0) return null;
  const h = Math.floor(left / 3_600_000);
  const m = Math.floor((left % 3_600_000) / 60_000);
  return h >= 1 ? `${h} h ${m} min` : `${m} min`;
}

/** Diferença do preço para a mediana da faixa (negativo = abaixo). null sem referência. */
export function vsBand(o: OfferDTO): number | null {
  if (!o.band?.medianCents || !o.priceCardCents) return null;
  return Math.round(((o.priceCardCents - o.band.medianCents) / o.band.medianCents) * 100);
}

export function parcelaText(o: OfferDTO): string {
  if (o.installments && o.installmentCents) {
    if (o.installments === 1) return "1x no cartão";
    return `${o.installments}x de ${brl(o.installmentCents)}${o.interest === false ? " sem juros" : o.interest ? " com juros" : ""}`;
  }
  return o.priceBasis === "unico" || !o.priceBasis ? "parcelas na loja" : "";
}

function Placeholder() {
  return (
    <svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="text-ink-3">
      <rect x="3" y="4" width="18" height="12" rx="1.5" />
      <path d="M9 20h6M12 16v4" />
    </svg>
  );
}

type Props = {
  o: OfferDTO;
  index: number;
  focused: boolean;
  now: number | null;
  flash: "down" | "up" | undefined;
  onOpen: () => void;
  onWatch: () => void;
  onDismiss: () => void;
  onFocus: () => void;
};

export function OfferCard({ o, index, focused, now, flash, onOpen, onWatch, onDismiss, onFocus }: Props) {
  const ageMin = now == null ? 0 : (now - new Date(o.createdAt).getTime()) / 60_000;
  const fresh = ageMin < 1.5;
  const soldOut = o.available === false;
  const delta = vsBand(o);
  const ends = endsIn(o.extra?.endsAt, now);
  const parcela = parcelaText(o);
  const hasPix = !!(o.cashCents && o.priceCardCents && o.cashCents < o.priceCardCents);
  // Oferta velha perde brilho aos poucos; esgotada fica apagada.
  const dim = soldOut ? "opacity-50 grayscale" : ageMin > 12 * 60 ? "opacity-75" : "";

  const status =
    o.verifyStatus === "verificado"
      ? `conferido na loja ${ago(o.verifiedAt, now)}`
      : o.verifyStatus === "pendente"
        ? "conferindo na loja…"
        : "não conferido: preço do post";

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: -18, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.94 }}
      transition={{ type: "spring", stiffness: 420, damping: 36, mass: 0.7 }}
      data-card={index}
      onMouseEnter={onFocus}
      className={`group flex min-w-0 flex-col overflow-hidden rounded-[14px] border bg-surface ${o.alvoAtingido ? "border-gold" : "border-card-line"} ${focused ? "ring-2 ring-ink ring-offset-2 ring-offset-bg" : ""} ${fresh ? "fresh" : ""} ${dim}`}
    >
      <button type="button" onClick={onOpen} aria-label={`Abrir ${o.title}`} className="dots relative flex aspect-[4/3] items-center justify-center">
        {o.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={o.imageUrl} alt="" className="h-full w-full object-contain p-4 transition-transform duration-300 group-hover:scale-[1.04]" loading="lazy" decoding="async" referrerPolicy="no-referrer" />
        ) : (
          <Placeholder />
        )}
        <span className="absolute left-3 top-3 flex items-baseline gap-1.5 rounded-full border border-control bg-pill px-2.5 py-1.5">
          <span className="font-mono text-[15px] font-semibold text-num">{o.nota ?? "—"}</span>
          <span className="text-[11px] uppercase tracking-[0.06em] text-muted">nota</span>
        </span>
        {o.store && <span className="absolute right-3 top-3 rounded-full border border-control bg-pill px-2.5 py-1.5 text-xs text-ink-2">{o.store}</span>}
        {fresh && <span className="absolute bottom-3 left-3 rounded-full bg-ink px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-bg">Agora</span>}
        {soldOut && <span className="absolute bottom-3 left-3 rounded-full border border-[rgba(255,107,107,0.4)] bg-pill px-2.5 py-1 text-[11px] font-semibold uppercase text-bad">Esgotado</span>}
      </button>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <button type="button" onClick={onOpen} className="line-clamp-2 min-h-10 text-left text-[15px] font-medium leading-snug text-ink hover:underline">
          {o.title}
        </button>

        <div className="flex flex-col gap-1">
          <div className={`flex flex-wrap items-baseline gap-x-2 ${flash === "down" ? "flash-down" : flash === "up" ? "flash-up" : ""}`}>
            <span className="font-mono tnum text-[26px] font-semibold leading-none tracking-tight text-num">{brl(o.priceCardCents)}</span>
            <span className="text-xs text-muted">no cartão</span>
          </div>
          <span className="font-mono text-[12.5px] text-ink-3">
            {parcela}
            {hasPix && (
              <span className="text-good">
                {parcela ? " · " : ""}Pix {brl(o.cashCents)}
              </span>
            )}
          </span>
        </div>

        {/* Só selos com significado: ouro, verde e vermelho. O resto vai na linha de estado. */}
        <div className="flex min-h-6 flex-wrap gap-1.5">
          {o.alvoAtingido && (
            <Badge tone="gold" title={o.band ? `Abaixo do preço-alvo da faixa ${o.band.label}: ${brl(o.alvo?.targetCents)}` : undefined}>
              Alvo atingido
            </Badge>
          )}
          {delta != null && delta <= -5 && (
            <Badge tone="good" title={`Mediana de ${o.band!.n} preços da faixa ${o.band!.label}: ${brl(o.band!.medianCents)}`}>
              {Math.abs(delta)}% abaixo da faixa
            </Badge>
          )}
          {o.freeShipping && <Badge tone="good">Frete grátis</Badge>}
          {o.interest === true && <Badge tone="bad">Com juros</Badge>}
          {ends && (
            <Badge tone="neutral" title={o.extra?.stockLeft != null ? `Restam ${o.extra.stockLeft} unidades na oferta` : undefined}>
              acaba em {ends}
            </Badge>
          )}
          {o.coupon && <Badge tone="neutral" title={o.extra?.couponNote}>Cupom {o.coupon}</Badge>}
        </div>

        <p className="flex items-center gap-1.5 truncate text-[11.5px] text-label" title={o.verifyNote ?? undefined}>
          <span className={`h-1.5 w-1.5 flex-none rounded-full ${o.verifyStatus === "verificado" ? "bg-good-dot" : o.verifyStatus === "pendente" ? "bg-ink-3" : "bg-pause"}`} />
          <span className="truncate">
            {status} · {o.band ? `${o.band.label} · ` : ""}
            {o.sources.length > 1 ? <span className="font-semibold text-ink-2" title={o.sources.join(", ")}>em {o.sources.length} fontes</span> : `via ${o.source}`}
          </span>
        </p>

        <div className="mt-auto flex gap-2">
          {o.url ? (
            <a href={o.url} target="_blank" rel="noopener noreferrer" className={`flex h-11 flex-1 items-center justify-center rounded-[10px] text-sm font-semibold ${o.alvoAtingido ? "bg-gold text-on-gold" : "bg-ink text-bg"}`}>
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
    </motion.article>
  );
}
