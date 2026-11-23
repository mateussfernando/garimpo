"use client";

import { MIN_DIAS_SELO } from "@/lib/historico";
import type { OfferDTO } from "@/lib/offers";
import { Badge, brl } from "./shell";

type Parte = Pick<OfferDTO, "historico">;

/** Selos do card a partir do histórico de preço do produto (só aparecem onde há história). */
export function SelosHistorico({ o }: { o: Parte }) {
  const h = o.historico;
  if (!h) return null;
  if (h.selo === "black-fraude")
    return (
      <Badge tone="bad" title={`Indício: o preço subiu 15% ou mais na última semana e o desconto só o devolve ao de antes (série de ${h.periodoDias} dias). Confira o histórico.`}>
        Black Fraude?
      </Badge>
    );
  if (h.selo === "referencia-inflada")
    return (
      <Badge tone="bad" title={`Indício: o preço "de" anunciado (${h.anunciadoPct}% de desconto) nunca apareceu nos ${h.periodoDias} dias de série. Confira o histórico.`}>
        &quot;De&quot; inflado?
      </Badge>
    );
  // Com poucos dias (menos de 5) o histórico entra na nota, mas não vira selo no card.
  if (h.dias < MIN_DIAS_SELO) return null;
  if (h.menorDaSerie)
    return (
      <Badge tone="good" title={`O menor preço que o app registrou deste produto em ${h.periodoDias} dias (${h.dias} dias com preço).`}>
        Menor em {h.periodoDias} dias
      </Badge>
    );
  if (h.descontoRealPct >= 5)
    return (
      <Badge tone="good" title={`Contra a mediana de ${brl(h.medianaCents)} em ${h.periodoDias} dias${h.anunciadoPct != null ? ` (anunciado: ${h.anunciadoPct}%)` : ""}.`}>
        {Math.round(h.descontoRealPct)}% abaixo do normal
      </Badge>
    );
  return null;
}

/** Bloco "Histórico de preço" do Detalhe e do painel: os números, a fonte e o link para ver o gráfico em outro site. */
export function HistoricoBloco({ o }: { o: Pick<OfferDTO, "historico" | "refPromobit" | "title" | "curtidas"> }) {
  const h = o.historico;
  const busca = `https://www.google.com/search?q=${encodeURIComponent(`histórico de preço ${o.title}`.slice(0, 160))}`;
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-card-line bg-surface p-4 text-[13px]" aria-label="Histórico de preço">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-[11px] uppercase tracking-[0.06em] text-label">Histórico de preço</span>
        <a href={busca} target="_blank" rel="noopener noreferrer" className="text-xs text-ink-2 hover:text-ink">
          Ver histórico ↗
        </a>
      </div>
      {h ? (
        <>
          <p className="flex flex-wrap justify-between gap-x-3">
            <span className="text-muted">Série do app</span>
            <span className="font-mono tnum">
              {h.dias} dias com preço em {h.periodoDias} dias
            </span>
          </p>
          <p className="flex flex-wrap justify-between gap-x-3">
            <span className="text-muted">Mediana · mínimo · máximo</span>
            <span className="font-mono tnum">
              {brl(h.medianaCents)} · {brl(h.minimoCents)} · {brl(h.maximoCents)}
            </span>
          </p>
          <p className="flex flex-wrap justify-between gap-x-3">
            <span className="text-muted">Desconto real{h.anunciadoPct != null ? " (anunciado)" : ""}</span>
            <span className={`font-mono tnum ${h.descontoRealPct > 0 ? "text-good" : ""}`}>
              {h.descontoRealPct}%{h.anunciadoPct != null ? ` (${h.anunciadoPct}%)` : ""}
            </span>
          </p>
          <p className="flex flex-wrap justify-between gap-x-3">
            <span className="text-muted">Mais barato que em</span>
            <span className="font-mono tnum">{Math.round(h.maisBaratoQue * 100)}% dos dias</span>
          </p>
          {h.selo && (
            <p className="text-xs text-bad">
              {h.selo === "black-fraude"
                ? "Indício de Black Fraude: o preço subiu 15% ou mais na última semana e o desconto só o devolve ao de antes. É um indício, não uma prova."
                : 'Indício de "de" inflado: o preço de referência anunciado nunca apareceu na série do app. É um indício, não uma prova.'}
            </p>
          )}
        </>
      ) : (
        <p className="text-muted">Sem histórico: o app ainda não viu este produto em dias suficientes (precisa de 4 dias com preço da loja).</p>
      )}
      {o.refPromobit && (
        <p className="flex flex-wrap justify-between gap-x-3">
          <span className="text-muted">Referência do Promobit (mín · máx)</span>
          <span className="font-mono tnum">
            {brl(o.refPromobit.minCents)} · {brl(o.refPromobit.maxCents)}
          </span>
        </p>
      )}
      {o.curtidas != null && (
        <p className="flex flex-wrap justify-between gap-x-3">
          <span className="text-muted">Curtidas no Promobit</span>
          <span className="font-mono tnum">{o.curtidas}</span>
        </p>
      )}
      <p className="text-xs text-muted">O botão abre uma busca no seu navegador; o app não lê esses sites.</p>
    </div>
  );
}
