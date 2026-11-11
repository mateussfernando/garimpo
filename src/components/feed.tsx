"use client";

import { AnimatePresence, motion } from "motion/react";
import type { EventDTO } from "@/app/api/events/route";
import { ago, brl } from "./shell";

const KIND: Record<EventDTO["type"], { label: string; cls: string; dot: string }> = {
  alvo: { label: "Alvo atingido", cls: "border-gold text-gold", dot: "bg-gold" },
  nova: { label: "Nova", cls: "border-control text-ink-2", dot: "bg-ink-3" },
  preco: { label: "Preço mudou", cls: "border-control text-ink-2", dot: "bg-good-dot" },
  esgotou: { label: "Esgotou", cls: "border-[rgba(255,107,107,0.4)] text-bad", dot: "bg-bad" },
  canal: { label: "Canal novo", cls: "border-control text-ink-2", dot: "bg-ink-3" },
};

/** Faixa "Ao vivo": os últimos acontecimentos, o mais novo à esquerda. Clicar abre a oferta no painel. */
export function Feed({ events, now, onOpen }: { events: EventDTO[]; now: number | null; onOpen: (offerId: number) => void }) {
  if (!events.length) return null;
  return (
    <section aria-label="Acontecimentos ao vivo" className="flex items-center gap-3 border-b border-line bg-deep px-8 py-2">
      <span className="flex flex-none items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-label">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-good-dot opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-good-dot" />
        </span>
        Ao vivo
      </span>
      <ol className="no-scrollbar flex min-w-0 flex-1 gap-2 overflow-x-auto">
        <AnimatePresence initial={false}>
          {events.slice(0, 24).map((e) => {
            const k = KIND[e.type];
            const fell = e.type === "preco" && e.from != null && e.to != null && e.to < e.from;
            return (
              <motion.li key={e.id} layout initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }} className="flex-none">
                <button
                  type="button"
                  disabled={e.offerId == null}
                  onClick={() => e.offerId != null && onOpen(e.offerId)}
                  className={`flex h-9 max-w-[420px] items-center gap-2 rounded-full border bg-surface px-3 text-xs ${k.cls}`}
                >
                  <span className={`h-1.5 w-1.5 flex-none rounded-full ${k.dot}`} />
                  <span className="flex-none font-semibold">{k.label}</span>
                  <span className="truncate text-ink-2">{e.title}</span>
                  {e.type === "preco" && e.from != null && e.to != null ? (
                    <span className={`flex-none font-mono tnum ${fell ? "text-good" : "text-bad"}`}>
                      {brl(e.from)} → {brl(e.to)}
                    </span>
                  ) : e.to != null ? (
                    <span className="flex-none font-mono tnum text-ink">{brl(e.to)}</span>
                  ) : null}
                  <span className="flex-none font-mono text-[11px] text-label">{ago(e.at, now)}</span>
                </button>
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ol>
    </section>
  );
}
