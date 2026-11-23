"use client";

import type { Confianca, NotaDetalheDTO } from "@/lib/nota";
import { PESO_IA, faixaDeCerteza, fmtNota, notaDica } from "@/lib/nota";
import { Badge } from "./shell";

const pct = (p: number) => `${Math.round(p * 100)}%`;
const CONF: Record<Confianca, string> = { alta: "confiança alta", media: "confiança média", baixa: "confiança baixa" };

/**
 * "Como a nota final foi feita": o algoritmo e a IA em posição (entre as ofertas das últimas 48 h) e em valor, o peso de
 * cada um e os avisos. A posição da IA só chega a quem pode ver a IA; para os outros esta linha nem aparece.
 */
export function ComoANota({
  nota,
  d,
  iaScore,
  iaConfianca,
  pecas,
}: {
  nota: number | null;
  d: NotaDetalheDTO | null;
  iaScore: number | null;
  iaConfianca: Confianca | null;
  pecas?: { historico: boolean; conferida: boolean; mercado: boolean };
}) {
  const certeza = pecas ? faixaDeCerteza(nota, { ...pecas, ia: d?.iaPos != null }, d) : null;
  return (
    <div className="flex flex-col gap-2.5 rounded-xl border border-card-line bg-surface p-4 text-[13px]" aria-label="Como a nota final foi feita">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] uppercase tracking-[0.06em] text-label">Como a nota final foi feita</span>
        {d?.divergente && <Badge tone="neutral">algoritmo e IA divergem</Badge>}
        {d?.vetoIa && <Badge tone="bad">IA mandou evitar: no máximo 4,0</Badge>}
        {d?.fonte === "algoritmo" && <Badge tone="neutral">só algoritmo</Badge>}
        {d?.fonte === "ia" && <Badge tone="neutral">só IA</Badge>}
      </div>
      {!d ? (
        <p className="text-muted">{notaDica(nota, d)}</p>
      ) : (
        <>
          <p className="flex flex-wrap items-baseline justify-between gap-x-3">
            <span>
              <strong className="font-medium">Algoritmo</strong>{" "}
              <span className="text-muted">(preço, loja, frete e quem postou)</span>
            </span>
            <span className="font-mono tnum">
              {d.algoritmo ? (
                <>
                  {fmtNota(d.algoritmo.valor / 10)} <span className="text-muted">· posição {pct(d.algoritmo.pos)} · peso {d.pesos.algoritmo.toFixed(2).replace(".", ",")}</span>
                </>
              ) : (
                <span className="text-muted">não opinou: sem preço de referência</span>
              )}
            </span>
          </p>
          <p className="flex flex-wrap items-baseline justify-between gap-x-3">
            <span>
              <strong className="font-medium">IA</strong> <span className="text-muted">(segunda opinião)</span>
            </span>
            <span className="font-mono tnum">
              {d.iaPos != null ? (
                <>
                  {iaScore != null ? fmtNota(iaScore / 10) : "—"}{" "}
                  <span className="text-muted">
                    · posição {pct(d.iaPos)} · peso {d.pesos.ia.toFixed(2).replace(".", ",")}
                    {iaConfianca ? ` (${CONF[iaConfianca]})` : ""}
                  </span>
                </>
              ) : (
                <span className="text-muted">ainda não analisou</span>
              )}
            </span>
          </p>
          <p className="flex flex-wrap items-baseline justify-between gap-x-3 border-t border-line pt-2.5">
            <span className="font-medium">Nota final</span>
            <span className="font-mono tnum text-[15px] font-semibold text-num">{fmtNota(nota)}</span>
          </p>
          {certeza && (
            <p className="flex flex-wrap items-baseline justify-between gap-x-3" title="Estimativa por regra: quanto mais peças sustentam a nota (histórico, IA, loja conferida, mercado da faixa) e quanto mais concordam, mais estreita a faixa.">
              <span className="text-muted">
                Faixa provável <span aria-label={`${certeza.pontos} de 4 peças`}>{"●".repeat(certeza.pontos)}{"○".repeat(4 - certeza.pontos)}</span>
              </span>
              <span className="font-mono tnum">
                {fmtNota(certeza.de)} a {fmtNota(certeza.ate)}
              </span>
            </p>
          )}
          <p className="text-xs text-muted">
            A nota é a média das <em>posições</em> entre as ofertas das últimas 48 h, não dos números brutos: o algoritmo e a IA
            usam réguas diferentes. Pesos da IA: {Object.entries(PESO_IA).map(([k, v]) => `${k} ${String(v).replace(".", ",")}`).join(" · ")}.
          </p>
        </>
      )}
    </div>
  );
}
