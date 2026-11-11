"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import type { OfferDetailDTO } from "@/lib/detail";
import { endsIn, parcelaText, vsBand } from "./offer-card";
import { Badge, Kbd, ago, brl } from "./shell";

const PARTS = [
  ["A", "Encaixe no Alvo", 45],
  ["C", "Confiança na loja", 25],
  ["F", "Frete", 20],
  ["S", "Calor social", 10],
] as const;

function Row({ label, value, strong, tone }: { label: string; value: string; strong?: boolean; tone?: "good" | "muted" }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-2">
      <span className="text-[13px] text-ink-2">{label}</span>
      <span className={`font-mono tnum ${strong ? "text-lg font-semibold text-num" : "text-[13px]"} ${tone === "good" ? "text-good" : tone === "muted" ? "text-muted line-through" : ""}`}>{value}</span>
    </div>
  );
}

/**
 * Painel do foco: o Detalhe da oferta ao lado da Vitrine, sem sair da página.
 * Abre com Espaço ou seta para a direita; fecha com Esc ou seta para a esquerda; J e K trocam de oferta com ele aberto.
 */
export function PainelFoco({ id, now, version, onClose, onWatch, onDismiss }: { id: number; now: number | null; version: number; onClose: () => void; onWatch: (watched: boolean) => void; onDismiss: () => void }) {
  const [d, setD] = useState<OfferDetailDTO | null>(null);
  const [img, setImg] = useState(0);

  useEffect(() => {
    let alive = true;
    fetch(`/api/offers/${id}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (alive) setD(j);
      });
    return () => {
      alive = false;
    };
  }, [id, version]);

  const ready = d?.offer.id === id ? d : null;
  const o = ready?.offer;
  const images = o?.extra?.images?.length ? o.extra.images : o?.imageUrl ? [o.imageUrl] : [];
  const delta = o ? vsBand(o) : null;
  const ends = o ? endsIn(o.extra?.endsAt, now) : null;

  return (
    <motion.aside
      aria-label="Detalhe da oferta em foco"
      initial={{ x: 40, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 40, opacity: 0 }}
      transition={{ type: "spring", stiffness: 380, damping: 36 }}
      className="fixed inset-y-0 right-0 z-40 flex w-full max-w-[440px] flex-col border-l border-card-line bg-surface shadow-[-24px_0_60px_rgba(0,0,0,0.5)]"
    >
      <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3">
        <span className="flex items-center gap-2 text-xs text-label">
          <Kbd>Esc</Kbd> fecha <Kbd>J K</Kbd> troca
        </span>
        <div className="flex items-center gap-2">
          <Link href={`/oferta/${id}`} className="flex h-9 items-center rounded-[10px] border border-control px-3 text-xs text-ink-2 hover:text-ink">
            Página completa
          </Link>
          <button type="button" onClick={onClose} aria-label="Fechar painel" className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-control text-ink-2 hover:text-ink">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
      </div>

      {!o || !ready ? (
        <div className="flex flex-1 flex-col gap-4 p-5" aria-busy="true">
          <div className="dots aspect-[4/3] animate-pulse rounded-xl" />
          <div className="h-5 w-4/5 animate-pulse rounded bg-active" />
          <div className="h-10 w-1/2 animate-pulse rounded bg-active" />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <div className="flex flex-col gap-4 p-5">
            <div className="dots relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-xl">
              {images[img] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={images[Math.min(img, images.length - 1)]} alt="" className="h-full w-full object-contain p-5" referrerPolicy="no-referrer" />
              ) : (
                <span className="text-xs text-muted">sem foto</span>
              )}
              {o.alvoAtingido && (
                <span className="absolute left-3 top-3">
                  <Badge tone="gold">Alvo atingido</Badge>
                </span>
              )}
            </div>
            {images.length > 1 && (
              <div role="group" aria-label="Fotos do produto" className="flex gap-2">
                {images.slice(0, 6).map((src, i) => (
                  <button key={src} type="button" aria-pressed={i === img} aria-label={`Foto ${i + 1} de ${images.length}`} onClick={() => setImg(i)} className={`dots h-12 w-12 overflow-hidden rounded-lg border ${i === img ? "border-ink" : "border-card-line"}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt="" className="h-full w-full object-contain p-1" loading="lazy" referrerPolicy="no-referrer" />
                  </button>
                ))}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2 text-xs text-ink-2">
              {o.store && <span className="rounded-full border border-control bg-pill px-2.5 py-1">{o.store}</span>}
              <span className="rounded-full border border-control bg-pill px-2.5 py-1">via {o.source}</span>
              <span className="rounded-full border border-control bg-pill px-2.5 py-1 font-mono">nota {o.nota ?? "—"}</span>
            </div>
            <h2 className="text-lg font-semibold leading-snug tracking-tight">{o.title}</h2>

            <div className="rounded-xl bg-deep px-4 py-2">
              <Row label={`No cartão${o.installments && o.installments > 1 ? `, ${parcelaText(o)}` : o.installments === 1 ? ", em 1x" : ""}`} value={brl(o.priceCardCents)} strong />
              {o.cashCents && o.priceCardCents && o.cashCents < o.priceCardCents && <Row label="No Pix" value={brl(o.cashCents)} tone="good" />}
              {o.listPriceCents && o.priceCardCents && o.listPriceCents > o.priceCardCents && <Row label={'Preço "de" da loja'} value={brl(o.listPriceCents)} tone="muted" />}
              {o.band && (
                <Row
                  label={`Mediana da faixa ${o.band.label}`}
                  value={o.band.medianCents ? `${brl(o.band.medianCents)}${delta != null ? ` (${delta > 0 ? "+" : ""}${delta}%)` : ""}` : `${o.band.n} de 5 preços`}
                />
              )}
              {o.alvo?.targetCents && <Row label="Preço-alvo da faixa" value={brl(o.alvo.targetCents)} />}
            </div>

            <div className="flex flex-wrap gap-1.5">
              {o.available === false && <Badge tone="bad">Esgotado</Badge>}
              {o.freeShipping && <Badge tone="good">Frete grátis</Badge>}
              {o.interest === true && <Badge tone="bad">Com juros</Badge>}
              {ends && <Badge tone="neutral">acaba em {ends}</Badge>}
              {o.extra?.stockLeft != null && <Badge tone="neutral">restam {o.extra.stockLeft}</Badge>}
              {o.coupon && <Badge tone="neutral">Cupom {o.coupon}</Badge>}
              <Badge tone="neutral">{o.verifyStatus === "verificado" ? `conferido ${ago(o.verifiedAt, now)}` : o.verifyStatus === "pendente" ? "conferindo…" : "não conferido"}</Badge>
            </div>
            {o.extra?.couponNote && <p className="text-xs text-muted">{o.extra.couponNote}</p>}
            {o.verifyStatus === "nao_verificado" && o.verifyNote && <p className="text-xs text-pause">Não conferido: {o.verifyNote}. O preço é o do post.</p>}

            {ready.insight && (
              <section aria-label="Análise do Garimpo" className="flex flex-col gap-2 rounded-xl border border-card-line p-4">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] uppercase tracking-[0.06em] text-label">Análise</span>
                  <Badge tone={ready.insight.veredito === "comprar" ? "good" : ready.insight.veredito === "evitar" ? "bad" : "neutral"}>{ready.insight.veredito}</Badge>
                  <Badge tone="neutral">confiança {ready.insight.confianca}</Badge>
                </div>
                <p className="text-[13px] text-ink-2">{ready.insight.resumo}</p>
              </section>
            )}

            {ready.parts && (
              <section aria-label={`Por que nota ${o.nota}`} className="flex flex-col gap-3">
                <span className="text-[11px] uppercase tracking-[0.06em] text-label">Por que nota {o.nota}</span>
                {PARTS.map(([k, label, max]) => {
                  const v = Math.round(ready.parts![k] * max);
                  return (
                    <div key={k} className="flex flex-col gap-1">
                      <div className="flex justify-between text-[13px]">
                        <span>{label}</span>
                        <span className="font-mono tnum">
                          {v}
                          <span className="text-muted"> / {max}</span>
                        </span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-active">
                        <div className="h-full rounded-full bg-ink-3" style={{ width: `${(v / max) * 100}%` }} />
                      </div>
                    </div>
                  );
                })}
              </section>
            )}

            <section aria-label="Quem postou" className="flex flex-col gap-1">
              <span className="text-[11px] uppercase tracking-[0.06em] text-label">Quem postou nas últimas 24 h</span>
              {ready.heat.map((h) => (
                <div key={h.source} className="flex justify-between gap-3 py-1 text-[13px]">
                  <span className="truncate">{h.source}</span>
                  <span className="flex-none font-mono text-xs text-muted">{ago(h.at, now)}</span>
                </div>
              ))}
            </section>

            {ready.ladder.length > 0 && (
              <section aria-label="Em outras lojas" className="flex flex-col gap-1">
                <span className="text-[11px] uppercase tracking-[0.06em] text-label">Parecidas em outras lojas</span>
                {ready.ladder.slice(0, 4).map((l) => (
                  <div key={l.id} className="flex justify-between gap-3 py-1 text-[13px]">
                    <span className="truncate">{l.store}</span>
                    <span className="flex-none font-mono tnum">{brl(l.priceCardCents)}</span>
                  </div>
                ))}
              </section>
            )}
          </div>
        </div>
      )}

      {o && (
        <div className="flex gap-2 border-t border-line p-4">
          {o.url ? (
            <a href={o.url} target="_blank" rel="noopener noreferrer" className={`flex h-12 flex-1 items-center justify-center gap-2 rounded-xl text-[15px] font-semibold ${o.alvoAtingido ? "bg-gold text-on-gold" : "bg-ink text-bg"}`}>
              Comprar{o.store ? ` na ${o.store}` : ""}
            </a>
          ) : (
            <span className="flex h-12 flex-1 items-center justify-center rounded-xl border border-control text-sm text-muted">Sem link</span>
          )}
          <button type="button" aria-pressed={o.watched} onClick={() => onWatch(!o.watched)} className={`h-12 rounded-xl border px-4 text-sm ${o.watched ? "border-ink bg-pill text-ink" : "border-control text-ink-2"}`}>
            {o.watched ? "Vigiando" : "Vigiar"}
          </button>
          <button type="button" onClick={onDismiss} className="h-12 rounded-xl border border-control px-4 text-sm text-ink-2">
            Descartar
          </button>
        </div>
      )}
    </motion.aside>
  );
}
