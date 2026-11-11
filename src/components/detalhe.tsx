"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { OfferDetailDTO } from "@/lib/detail";
import { AppHeader, Badge, Kbd, ago, brl, useLive, useNow, useStatus } from "./shell";

const dayBR = (iso: string) => iso.slice(8, 10) + "/" + iso.slice(5, 7);

function Section({ id, title, sub, right, children }: { id: string; title: string; sub?: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex min-w-0 flex-col gap-4 rounded-2xl border border-card-line bg-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 id={id} className="text-[17px] font-semibold tracking-tight">
            {title}
          </h2>
          {sub && <span className="text-[13px] text-muted">{sub}</span>}
        </div>
        {right}
      </div>
      {children}
    </section>
  );
}

function Chart({ d }: { d: OfferDetailDTO }) {
  const [hover, setHover] = useState(-1);
  const pts = d.history;
  const W = 720;
  const H = 240;
  const refs = [d.stats.alvoCents, d.stats.medianCents].filter((v): v is number => v != null);
  const all = [...pts.map((p) => p.cents), ...refs];
  const lo = Math.min(...all);
  const hi = Math.max(...all);
  const pad = Math.max(1, (hi - lo) * 0.18);
  const yMin = lo - pad;
  const yMax = hi + pad;
  const x = (i: number) => 56 + (pts.length === 1 ? 320 : (i * 640) / (pts.length - 1));
  const y = (c: number) => 200 - ((c - yMin) / (yMax - yMin)) * 184;
  const path = pts.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(p.cents).toFixed(1)}`).join(" ");
  const med = d.stats.medianCents;
  const vs = (c: number) => (med ? `${c < med ? "−" : "+"}${(Math.abs((c - med) / med) * 100).toFixed(1).replace(".", ",")}% vs mediana` : "");
  return (
    <div className="relative" onMouseLeave={() => setHover(-1)}>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Histórico de preço no cartão, um ponto por dia">
        {[0, 1, 2, 3].map((k) => {
          const v = yMin + ((yMax - yMin) * k) / 3;
          return (
            <g key={k}>
              <line x1="56" x2="696" y1={y(v)} y2={y(v)} stroke="#1F2329" />
              <text x="48" y={y(v) + 4} textAnchor="end" fontSize="11" fill="#8E949C" fontFamily="var(--font-geist-mono)">
                {Math.round(v / 100)}
              </text>
            </g>
          );
        })}
        {d.stats.alvoCents != null && <line x1="56" x2="696" y1={y(d.stats.alvoCents)} y2={y(d.stats.alvoCents)} stroke="#F5B83D" strokeWidth="1.5" strokeDasharray="6 5" />}
        {med != null && <line x1="56" x2="696" y1={y(med)} y2={y(med)} stroke="#9BA1A9" strokeWidth="1.2" strokeDasharray="2 5" />}
        <path d={path} fill="none" stroke="#ECEDEE" strokeWidth="2" strokeLinejoin="round" />
        {pts.map((p, i) => (
          <circle key={p.day} cx={x(i)} cy={y(p.cents)} r={i === pts.length - 1 || i === hover ? 4.5 : 2.5} fill="#ECEDEE" />
        ))}
        {pts.map((p, i) =>
          i % Math.max(1, Math.ceil(pts.length / 6)) === 0 ? (
            <text key={p.day} x={x(i)} y="228" textAnchor="middle" fontSize="11" fill="#8E949C" fontFamily="var(--font-geist-mono)">
              {dayBR(p.day)}
            </text>
          ) : null,
        )}
      </svg>
      <div className="absolute inset-0 flex">
        {pts.map((p, i) => (
          <div key={p.day} className="h-full flex-1" onMouseEnter={() => setHover(i)} aria-hidden="true" />
        ))}
      </div>
      {hover >= 0 && pts[hover] && (
        <div
          className="pointer-events-none absolute rounded-lg border border-control bg-pill px-3 py-2 text-xs"
          style={{ left: `${(x(hover) / W) * 100}%`, top: `${(y(pts[hover].cents) / H) * 100}%`, transform: hover > pts.length * 0.7 ? "translate(calc(-100% - 14px), -50%)" : "translate(14px, -50%)" }}
        >
          <div className="text-muted">{dayBR(pts[hover].day)}</div>
          <div className="font-mono tnum text-[13px] font-semibold text-num">{brl(pts[hover].cents)}</div>
          <div className="text-muted">{vs(pts[hover].cents)}</div>
        </div>
      )}
    </div>
  );
}

const PART_INFO: Record<"A" | "C" | "F" | "S", { label: string; weight: number }> = {
  A: { label: "Encaixe no Alvo", weight: 45 },
  C: { label: "Confiança na loja", weight: 25 },
  F: { label: "Frete", weight: 20 },
  S: { label: "Calor social", weight: 10 },
};

function partWhy(k: "A" | "C" | "F" | "S", d: OfferDetailDTO): string {
  const o = d.offer;
  if (k === "A") {
    if (!o.alvo) return "Esta oferta não toca nenhum Alvo: nota neutra";
    if (!d.stats.alvoCents) return "O Alvo ainda não tem referência (precisa de 5 ofertas vistas): nota neutra";
    return o.alvoAtingido ? `No ou abaixo do preço-alvo de ${brl(d.stats.alvoCents)}` : `Alvo de ${brl(d.stats.alvoCents)}, teto de ${brl(d.stats.tetoCents)}`;
  }
  if (k === "C") return o.store ? `${o.store}: a confiança vem da lista de lojas do app` : "Loja fora da lista: confiança baixa";
  if (k === "F") return o.freeShipping ? "Frete grátis" : o.shippingCents != null ? `Frete de ${brl(o.shippingCents)}` : "Frete não informado";
  return `${d.heat.length} ${d.heat.length === 1 ? "fonte" : "fontes"} com este produto; nota cheia com 4`;
}

export function Detalhe({ id }: { id: number }) {
  const [d, setD] = useState<OfferDetailDTO | null>(null);
  const [missing, setMissing] = useState(false);
  const [view, setView] = useState<"chart" | "table">("chart");
  const { status, live } = useStatus();
  const now = useNow(30_000);

  const load = useCallback(async () => {
    const r = await fetch(`/api/offers/${id}`, { cache: "no-store" });
    if (r.status === 404) return setMissing(true);
    setD(await r.json());
  }, [id]);
  useLive(load);

  const patch = useCallback(
    async (body: { watched?: boolean; dismissed?: boolean }) => {
      setD((p) => (p ? { ...p, offer: { ...p.offer, ...body } } : p));
      await fetch(`/api/offers/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    },
    [id],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || e.metaKey || e.ctrlKey || e.altKey || !d) return;
      const k = e.key.toLowerCase();
      if (k === "escape") window.history.back();
      else if (k === "enter" && d.offer.url && !/^(BUTTON|A)$/.test(t.tagName)) window.open(d.offer.url, "_blank", "noopener,noreferrer");
      else if (k === "w") void patch({ watched: !d.offer.watched });
      else if (k === "x") void patch({ dismissed: true }).then(() => window.history.back());
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [d, patch]);

  const rows = useMemo(() => (d ? [...d.history].reverse() : []), [d]);

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader active={null} status={status} live={live} />
      <main className="mx-auto flex w-full max-w-[1440px] flex-col gap-6 px-8 pb-8 pt-6">
        {missing ? (
          <div className="flex flex-col items-center gap-3 rounded-[14px] border border-dashed border-control px-6 py-14 text-center">
            <span className="text-base font-medium">Oferta não encontrada</span>
            <Link href="/" className="flex h-11 items-center rounded-[10px] bg-ink px-5 text-sm font-semibold text-bg">
              Voltar à Vitrine
            </Link>
          </div>
        ) : !d ? (
          <p className="text-sm text-muted">Carregando…</p>
        ) : (
          <>
            <nav aria-label="Caminho" className="flex flex-wrap items-center gap-2 text-[13px] text-muted">
              <Link href="/" className="flex min-h-11 items-center hover:text-ink">
                ← Vitrine
              </Link>
              {d.offer.alvo && (
                <>
                  <span aria-hidden="true">/</span>
                  <span>{d.offer.alvo.name}</span>
                </>
              )}
              <span aria-hidden="true">/</span>
              <span aria-current="page" className="max-w-[60ch] truncate text-ink-2">
                {d.offer.title}
              </span>
            </nav>

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <div className="dots relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-2xl border border-card-line">
                {d.offer.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={d.offer.imageUrl} alt="" className="h-full w-full object-contain p-8" referrerPolicy="no-referrer" />
                ) : (
                  <span className="text-sm text-muted">Sem foto ainda</span>
                )}
                {d.offer.alvoAtingido && (
                  <span className="absolute left-4 top-4">
                    <Badge tone="gold">Alvo atingido</Badge>
                  </span>
                )}
                <span className="absolute bottom-4 left-4 text-xs text-muted">foto da página da loja</span>
              </div>

              <div className="flex min-w-0 flex-col gap-5">
                <div className="flex flex-wrap items-center gap-2">
                  {d.offer.store && <span className="rounded-full border border-control bg-pill px-2.5 py-1.5 text-xs text-ink-2">{d.offer.store}</span>}
                  <span className="rounded-full border border-control bg-pill px-2.5 py-1.5 text-xs text-ink-2">via {d.offer.source}</span>
                  <span className="flex items-baseline gap-1.5 rounded-full border border-control bg-pill px-2.5 py-1.5">
                    <span className="font-mono text-[15px] font-semibold text-num">{d.offer.nota ?? "—"}</span>
                    <span className="text-[11px] uppercase tracking-[0.06em] text-muted">nota</span>
                  </span>
                </div>
                <h1 className="text-[26px] font-semibold leading-tight tracking-tight">{d.offer.title}</h1>
                <div className="flex flex-col gap-1">
                  <div className="flex flex-wrap items-baseline gap-x-3">
                    <span className="font-mono tnum text-[48px] font-semibold leading-none tracking-tight text-num">{brl(d.offer.priceCardCents)}</span>
                    <span className="text-sm text-muted">no cartão</span>
                  </div>
                  <span className="font-mono text-sm text-ink-3">
                    {d.offer.installments && d.offer.installmentCents
                      ? `${d.offer.installments}x de ${brl(d.offer.installmentCents)}${d.offer.interest === false ? " sem juros" : d.offer.interest ? " com juros" : ""}`
                      : d.offer.cashCents
                        ? `${brl(d.offer.cashCents)} à vista`
                        : "parcelas não informadas"}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {d.offer.freeShipping && <Badge tone="good">Frete grátis</Badge>}
                  {d.offer.interest === true && <Badge tone="bad">Com juros</Badge>}
                  {d.stats.points < 5 && <Badge tone="neutral">Sem histórico</Badge>}
                  {d.stats.minPrevCents != null && d.offer.priceCardCents != null && d.offer.priceCardCents < d.stats.minPrevCents && <Badge tone="good">Menor preço visto</Badge>}
                  {d.offer.verifyStatus === "verificado" && <Badge tone="neutral">Verificado {ago(d.offer.verifiedAt, now)}</Badge>}
                  {d.offer.verifyStatus === "nao_verificado" && <Badge tone="neutral" title={d.offer.verifyNote ?? undefined}>Não verificado</Badge>}
                  {d.offer.verifyStatus === "pendente" && <Badge tone="neutral">Verificando…</Badge>}
                </div>

                <Section id="kit-compra" title="Kit de compra" sub={d.offer.verifiedAt ? `conferido na página da loja às ${new Date(d.offer.verifiedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}` : "ainda não conferido na loja"}>
                  <ul className="flex flex-col divide-y divide-line text-sm">
                    <li className="flex flex-wrap justify-between gap-2 py-2.5">
                      <span>{d.offer.installments ? `Cartão em ${d.offer.installments}x ${d.offer.interest === false ? "sem juros" : d.offer.interest ? "com juros" : ""}` : "Cartão"}</span>
                      <span className="font-mono tnum text-ink-3">{d.offer.installmentCents ? (d.offer.installments === 1 ? `${brl(d.offer.installmentCents)} de uma vez` : `${brl(d.offer.installmentCents)} por mês`) : "—"}</span>
                    </li>
                    <li className="flex flex-wrap justify-between gap-2 py-2.5">
                      <span>{d.offer.freeShipping ? "Frete grátis" : "Frete"}</span>
                      <span className="text-ink-3">{d.offer.freeShipping ? "confira o seu CEP na loja" : d.offer.shippingCents != null ? brl(d.offer.shippingCents) : "não informado"}</span>
                    </li>
                    <li className="flex flex-wrap justify-between gap-2 py-2.5">
                      <span>{d.offer.coupon ? `Cupom ${d.offer.coupon}` : "Nenhum cupom citado"}</span>
                      <span className="text-ink-3">{d.offer.coupon ? "citado no post; confira se vale" : "—"}</span>
                    </li>
                    <li className="flex flex-wrap justify-between gap-2 py-2.5">
                      <span>Arrependimento em 7 dias</span>
                      <span className="text-ink-3">compra online, a contar da entrega</span>
                    </li>
                  </ul>
                </Section>

                <div className="flex flex-wrap gap-2">
                  {d.offer.url ? (
                    <a href={d.offer.url} target="_blank" rel="noopener noreferrer" className={`flex h-11 flex-1 items-center justify-center rounded-[10px] px-5 text-sm font-semibold ${d.offer.alvoAtingido ? "bg-gold text-on-gold" : "bg-ink text-bg"}`}>
                      Comprar{d.offer.store ? ` na ${d.offer.store}` : ""}
                    </a>
                  ) : (
                    <span className="flex h-11 flex-1 items-center justify-center rounded-[10px] border border-control text-sm text-muted">Sem link</span>
                  )}
                  <button type="button" aria-pressed={d.offer.watched} onClick={() => void patch({ watched: !d.offer.watched })} className={`h-11 rounded-[10px] border px-4 text-sm ${d.offer.watched ? "border-ink bg-pill text-ink" : "border-control text-ink-2"}`}>
                    {d.offer.watched ? "Vigiando" : "Vigiar"}
                  </button>
                  <button type="button" onClick={() => void patch({ dismissed: true }).then(() => window.history.back())} className="h-11 rounded-[10px] border border-control px-4 text-sm text-ink-2">
                    Descartar
                  </button>
                </div>
                <p className="text-xs text-muted">O botão abre a página da loja. O Garimpo nunca compra sozinho.</p>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
              <Section
                id="historico"
                title="Histórico de 30 dias"
                sub="Menor preço no cartão de cada dia em que o app olhou esta loja"
                right={
                  <div role="group" aria-label="Ver como" className="flex rounded-[10px] border border-control p-0.5 text-[13px]">
                    {(["chart", "table"] as const).map((v) => (
                      <button key={v} type="button" aria-pressed={view === v} onClick={() => setView(v)} className={`h-9 rounded-lg px-3.5 ${view === v ? "bg-ink text-bg" : "text-ink-2"}`}>
                        {v === "chart" ? "Gráfico" : "Tabela"}
                      </button>
                    ))}
                  </div>
                }
              >
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                    ["Hoje", brl(d.offer.priceCardCents), null],
                    ["Alvo", d.stats.alvoCents ? brl(d.stats.alvoCents) : "sem referência", "text-gold"],
                    ["Mediana de 30 dias", d.stats.medianCents ? brl(d.stats.medianCents) : "—", null],
                    ["Mínimo anterior", d.stats.minPrevCents ? `${brl(d.stats.minPrevCents)} · ${dayBR(d.stats.minPrevDay!)}` : "—", null],
                  ].map(([label, value, cls]) => (
                    <div key={label as string} className="flex flex-col gap-0.5 rounded-xl bg-deep px-3 py-2.5">
                      <span className="text-[11px] uppercase tracking-[0.06em] text-label">{label}</span>
                      <span className={`font-mono tnum text-[13px] ${cls ?? "text-ink"}`}>{value}</span>
                    </div>
                  ))}
                </div>
                {d.history.length < 2 ? (
                  <p className="rounded-xl border border-dashed border-control px-4 py-8 text-center text-[13px] text-muted">
                    {d.history.length === 0 ? "Ainda sem pontos de preço desta loja." : "Só 1 dia de histórico: o gráfico aparece quando o app olhar esta loja em mais dias."} A coleta diária entra depois do 11.11.
                  </p>
                ) : view === "chart" ? (
                  <Chart d={d} />
                ) : (
                  <div role="table" aria-label="Histórico em tabela" className="max-h-72 overflow-auto text-[13px]">
                    <div role="row" className="grid grid-cols-3 border-b border-line py-2 text-[11px] uppercase tracking-[0.06em] text-label">
                      <span role="columnheader">Dia</span>
                      <span role="columnheader">Preço no cartão</span>
                      <span role="columnheader">Vs mediana</span>
                    </div>
                    {rows.map((r) => (
                      <div key={r.day} role="row" className="grid grid-cols-3 border-b border-line py-2">
                        <span role="cell" className="font-mono tnum">{dayBR(r.day)}</span>
                        <span role="cell" className="font-mono tnum">{brl(r.cents)}</span>
                        <span role="cell" className="text-muted">{d.stats.medianCents ? `${(((r.cents - d.stats.medianCents) / d.stats.medianCents) * 100).toFixed(1).replace(".", ",")}%` : "—"}</span>
                      </div>
                    ))}
                  </div>
                )}
              </Section>

              <Section id="por-que-nota" title={`Por que nota ${d.offer.nota ?? "—"}`} sub="Quatro sinais somam até 100. O desconto real e o Black Fraude entram depois do 11.11, com histórico.">
                {d.parts ? (
                  <div className="flex flex-col gap-4">
                    {(["A", "C", "F", "S"] as const).map((k) => {
                      const info = PART_INFO[k];
                      const value = Math.round(d.parts![k] * info.weight);
                      return (
                        <div key={k} className="flex flex-col gap-1.5">
                          <div className="flex items-baseline justify-between text-sm">
                            <span>{info.label}</span>
                            <span className="font-mono tnum">
                              {value}
                              <span className="text-muted"> / {info.weight}</span>
                            </span>
                          </div>
                          <div className="h-1.5 overflow-hidden rounded-full bg-active" role="img" aria-label={`${value} de ${info.weight}`}>
                            <div className="h-full rounded-full bg-ink-3" style={{ width: `${(value / info.weight) * 100}%` }} />
                          </div>
                          <span className="text-xs text-muted">{partWhy(k, d)}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted">A nota ainda não foi calculada.</p>
                )}
              </Section>
            </div>

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
              <Section id="escada" title="Escada de preços" sub="Ofertas parecidas em outras lojas nas últimas 72 h: total no cartão">
                {d.ladder.length === 0 ? (
                  <p className="text-[13px] text-muted">Nenhuma oferta parecida em outra loja por enquanto.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[480px] text-left text-[13px]">
                      <thead className="text-[11px] uppercase tracking-[0.06em] text-label">
                        <tr>
                          <th scope="col" className="py-2 pr-3 font-medium">Loja</th>
                          <th scope="col" className="py-2 pr-3 font-medium">Condição</th>
                          <th scope="col" className="py-2 pr-3 font-medium">Total</th>
                          <th scope="col" className="py-2 font-medium">Diferença</th>
                        </tr>
                      </thead>
                      <tbody>
                        {d.ladder.map((l) => {
                          const diff = l.priceCardCents != null && d.offer.priceCardCents != null ? l.priceCardCents - d.offer.priceCardCents : null;
                          return (
                            <tr key={l.id} className="border-t border-line">
                              <td className="py-2.5 pr-3">
                                <Link href={`/oferta/${l.id}`} className="underline-offset-2 hover:underline">
                                  {l.store}
                                </Link>
                              </td>
                              <td className="py-2.5 pr-3 text-ink-3">
                                {l.installments && l.installmentCents ? `${l.installments}x de ${brl(l.installmentCents)}${l.interest ? " com juros" : l.interest === false ? " sem juros" : ""}` : "—"}
                                {l.freeShipping ? " · frete grátis" : ""}
                              </td>
                              <td className="py-2.5 pr-3 font-mono tnum">{brl(l.priceCardCents)}</td>
                              <td className={`py-2.5 font-mono tnum ${diff != null && diff < 0 ? "text-good" : "text-muted"}`}>{diff == null ? "—" : `${diff < 0 ? "−" : "+"} ${brl(Math.abs(diff))}`}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </Section>

              <div className="flex min-w-0 flex-col gap-6">
                <Section id="calor" title="Calor social" sub="Quem postou este produto nas últimas 24 h">
                  <ul className="flex flex-col divide-y divide-line">
                    {d.heat.map((h) => (
                      <li key={h.source} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                        <span className="flex min-w-0 flex-col">
                          <span className="truncate">{h.source}</span>
                          <span className="text-xs text-muted">{h.kind === "telegram" ? "grupo ou canal do Telegram" : "comunidade de promoções"}</span>
                        </span>
                        <span className="font-mono text-xs text-muted">{ago(h.at, now)}</span>
                      </li>
                    ))}
                  </ul>
                </Section>

                <Section id="analise" title="Análise do Garimpo" sub={d.insight ? `${d.insight.provedor} · claude-haiku-5-5 · ${ago(d.insight.geradoEm, now)}` : "gerada pela IA a cada 30 min, só quando os números mudam"}>
                  {d.insight ? (
                    <div className="flex flex-col gap-3 text-sm">
                      <div className="flex flex-wrap gap-1.5">
                        <Badge tone={d.insight.veredito === "comprar" ? "good" : d.insight.veredito === "evitar" ? "bad" : "neutral"}>{d.insight.veredito}</Badge>
                        <Badge tone="neutral">confiança {d.insight.confianca}</Badge>
                      </div>
                      <p className="text-ink-2">{d.insight.resumo}</p>
                      <ul className="list-disc pl-5 text-[13px] text-ink-3">
                        {d.insight.motivos.map((m) => (
                          <li key={m}>{m}</li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <p className="text-[13px] text-muted">Ainda sem análise. Ela aparece quando o produto é verificado na loja.</p>
                  )}
                </Section>
              </div>
            </div>
          </>
        )}
      </main>
      <footer className="mt-auto flex flex-wrap items-center justify-center gap-x-5 gap-y-2 px-8 pb-7 pt-4 text-xs text-label">
        {[["Esc", "voltar"], ["Enter", "comprar"], ["W", "vigiar"], ["X", "descartar"]].map(([k, v]) => (
          <span key={k} className="flex items-center gap-1.5">
            <Kbd>{k}</Kbd> {v}
          </span>
        ))}
      </footer>
    </div>
  );
}
