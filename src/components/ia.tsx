"use client";

// O veredito do Garimpo (feito pela IA, mas o usuário vê só o Garimpo): selo do card, análise completa e o radar da Vitrine.
import { useEffect, useState } from "react";
import type { OfferAiDTO, RadarDTO, Verdict } from "@/lib/offers";
import { Badge, ago, brl, podeVer, useMe, type Tone } from "./shell";

export const VERDICT: Record<Verdict, { label: string; tone: Tone; bar: string }> = {
  excelente: { label: "Excelente compra", tone: "good", bar: "bg-good-dot" },
  boa: { label: "Boa compra", tone: "good", bar: "bg-good" },
  ok: { label: "Preço ok", tone: "neutral", bar: "bg-ink-3" },
  fraca: { label: "Oferta fraca", tone: "neutral", bar: "bg-pause" },
  evitar: { label: "Evite", tone: "bad", bar: "bg-bad" },
};
const CONF = { alta: "confiança alta", media: "confiança média", baixa: "confiança baixa" } as const;

/** Linha curta no card: o veredito e o resumo (sem dizer "IA" para o usuário). A nota dela já está na nota única do card (src/lib/nota.ts). */
export function AiLine({ ia }: { ia: OfferAiDTO | null }) {
  // Altura fixa, com ou sem análise: todos os cards da grade ficam do mesmo tamanho.
  const box = "flex h-[78px] flex-none flex-col gap-1.5 overflow-hidden rounded-[10px] bg-deep px-3 py-2";
  if (!ia)
    return (
      <div className={box}>
        <span className="text-xs font-medium text-label">Analisando…</span>
        <p className="text-[12.5px] leading-snug text-label">O veredito do Garimpo chega em poucos minutos.</p>
      </div>
    );
  const v = VERDICT[ia.verdict];
  return (
    <div className={box}>
      <span className="flex items-center gap-2 overflow-hidden whitespace-nowrap text-xs">
        <Badge tone={v.tone} title={`${CONF[ia.confidence]}`}>
          {v.label}
        </Badge>
      </span>
      <p className="line-clamp-2 text-[12.5px] leading-snug text-ink-3" title={ia.summary}>
        {ia.summary}
      </p>
    </div>
  );
}

/** Análise completa (painel e detalhe): nota, veredito, prós, contras e confiança. */
export function AiAnalysis({ ia, now }: { ia: OfferAiDTO | null; now: number | null }) {
  // A nota de 0 a 100 da IA só aparece para admin: para o usuário, a nota é uma só (a de 0 a 10 do card).
  const admin = podeVer(useMe(), "ia.gerenciar");
  if (!ia)
    return (
      <section className="flex flex-col gap-2 rounded-xl border border-dashed border-control p-4 text-[13px] text-muted">
        <span className="font-medium text-ink-2">Veredito do Garimpo</span>
        Ainda sem veredito. O Garimpo analisa as ofertas novas a cada poucos minutos.
      </section>
    );
  const v = VERDICT[ia.verdict];
  return (
    <section className="flex flex-col gap-3 rounded-xl border border-card-line bg-surface p-4" aria-label="Veredito do Garimpo">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[13px] font-medium text-ink-2">Veredito do Garimpo</span>
        <span className="text-[11px] text-label">
          {CONF[ia.confidence]} · {ago(ia.at, now)}
        </span>
      </div>
      {admin ? (
        <div className="flex items-center gap-3">
          <span className="font-mono tnum text-[30px] font-semibold leading-none text-num" title="Nota da IA, de 0 a 100 (só admin vê)">{ia.score}</span>
          <div className="flex flex-1 flex-col gap-1.5">
            <Badge tone={v.tone}>{v.label}</Badge>
            <span className="block h-1.5 w-full overflow-hidden rounded-full bg-active" aria-hidden="true">
              <span className={`block h-full ${v.bar}`} style={{ width: `${ia.score}%` }} />
            </span>
          </div>
        </div>
      ) : (
        <div className="flex">
          <Badge tone={v.tone}>{v.label}</Badge>
        </div>
      )}
      <p className="text-sm text-ink">{ia.summary}</p>
      {(ia.pros.length > 0 || ia.cons.length > 0) && (
        <div className="grid gap-3 sm:grid-cols-2">
          {ia.pros.length > 0 && (
            <ul className="flex flex-col gap-1 text-[13px] text-ink-2">
              {ia.pros.map((p) => (
                <li key={p} className="flex gap-2">
                  <span className="text-good" aria-hidden="true">+</span>
                  {p}
                </li>
              ))}
            </ul>
          )}
          {ia.cons.length > 0 && (
            <ul className="flex flex-col gap-1 text-[13px] text-ink-2">
              {ia.cons.map((p) => (
                <li key={p} className="flex gap-2">
                  <span className="text-bad" aria-hidden="true">−</span>
                  {p}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}

const RADAR_KEY = "garimpo:radar-minimizado";

/** Radar do Garimpo no topo da Vitrine: manchete, destaques clicáveis, alertas e dicas. Minimizável (lembrado neste navegador). */
export function RadarPanel({ radar, now, onOpen }: { radar: RadarDTO; now: number | null; onOpen: (id: number) => void }) {
  const [min, setMin] = useState(false);
  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- lê o que ficou salvo só depois de montar (o servidor não tem localStorage)
      setMin(localStorage.getItem(RADAR_KEY) === "1");
    } catch {
      /* sem localStorage: começa aberto */
    }
  }, []);
  const toggle = () => {
    const next = !min;
    setMin(next);
    try {
      localStorage.setItem(RADAR_KEY, next ? "1" : "0");
    } catch {
      /* sem localStorage: só não é lembrado */
    }
  };
  const header = (
    <div className="flex items-center justify-between gap-3">
      <h2 id="radar-ia" className="flex flex-none items-center gap-2 text-[15px] font-semibold text-ink">
        Radar do Garimpo
      </h2>
      {min && <p className="min-w-0 flex-1 truncate text-[13px] text-ink-2">{radar.manchete}</p>}
      <span className="flex flex-none items-center gap-3">
        <span className="text-xs text-label">atualizado {ago(radar.at, now)}</span>
        <button type="button" onClick={toggle} aria-expanded={!min} className="h-9 rounded-[10px] border border-control px-3 text-xs font-medium text-ink-2 hover:text-ink">
          {min ? "Mostrar" : "Minimizar"}
        </button>
      </span>
    </div>
  );
  if (min)
    return (
      <section aria-labelledby="radar-ia" className="rounded-2xl border border-card-line bg-surface px-[18px] py-2.5">
        {header}
      </section>
    );
  return (
    <section aria-labelledby="radar-ia" className="flex flex-col gap-3.5 rounded-2xl border border-card-line bg-surface p-[18px]">
      {header}
      <p className="text-base font-medium text-ink">{radar.manchete}</p>
      {radar.destaques.length > 0 && (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(260px,100%),1fr))] gap-2.5">
          {radar.destaques.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => onOpen(d.id)}
              className="flex min-w-0 flex-col gap-1 rounded-xl border border-line bg-deep p-3 text-left hover:border-ink-3"
            >
              <span className="flex items-baseline justify-between gap-2">
                <span className="truncate text-[13px] font-medium text-ink">{d.title ?? `Oferta ${d.id}`}</span>
                <span className="flex-none font-mono tnum text-[13px] text-num">{brl(d.priceCardCents)}</span>
              </span>
              <span className="line-clamp-2 text-xs text-muted">{d.porque}</span>
            </button>
          ))}
        </div>
      )}
      {(radar.alertas.length > 0 || radar.dicas.length > 0) && (
        <div className="grid gap-3 text-[13px] sm:grid-cols-2">
          {radar.alertas.length > 0 && (
            <ul className="flex flex-col gap-1">
              {radar.alertas.map((a) => (
                <li key={a} className="flex gap-2 text-ink-2">
                  <span className="text-bad" aria-hidden="true">!</span>
                  {a}
                </li>
              ))}
            </ul>
          )}
          {radar.dicas.length > 0 && (
            <ul className="flex flex-col gap-1">
              {radar.dicas.map((a) => (
                <li key={a} className="flex gap-2 text-ink-2">
                  <span className="text-good" aria-hidden="true">→</span>
                  {a}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
