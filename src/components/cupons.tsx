"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Toaster, toast } from "sonner";
import type { CupomDTO } from "@/lib/cupons";
import { plainText, titleHas } from "@/lib/smart-filter";
import { AppHeader, Badge, Kbd, PageTitle, ago, brl, useLive, useNow, useStatus } from "./shell";

type Sort = "recentes" | "desconto" | "citados";

/** "R$ 50 OFF", "25% OFF", "50% de cashback", "Frete grátis". */
function discountLabel(c: CupomDTO): string {
  if (c.discountKind === "reais" && c.discountValue) return `${brl(c.discountValue).replace(",00", "")} OFF`;
  if (c.discountKind === "pct" && c.discountValue) return `${c.discountValue}% OFF`;
  if (c.discountKind === "cashback" && c.discountValue) return `${c.discountValue}% de cashback`;
  if (c.discountKind === "frete") return "Frete grátis";
  return "Cupom";
}

/** Para ordenar por desconto: % vira um valor comparável (25% de R$ 400 de referência). */
const weight = (c: CupomDTO) =>
  c.discountKind === "reais" ? (c.discountValue ?? 0) : c.discountKind === "pct" ? Math.min((c.discountValue ?? 0) * 400, c.capCents ?? Infinity) : c.discountKind === "cashback" ? (c.discountValue ?? 0) * 200 : 0;

export function Cupons() {
  const [data, setData] = useState<CupomDTO[] | null>(null);
  const [q, setQ] = useState("");
  const [store, setStore] = useState("all");
  const [withCode, setWithCode] = useState(false);
  const [noMin, setNoMin] = useState(false);
  const [sort, setSort] = useState<Sort>("recentes");
  const { status, live } = useStatus();
  const now = useNow(30_000);
  const input = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setData(await fetch("/api/cupons", { cache: "no-store" }).then((r) => r.json()));
  }, []);
  useLive(load);

  const base = useMemo(() => {
    const terms = plainText(q).split(" ").filter((w) => w.length > 1);
    return (data ?? []).filter(
      (c) => (!withCode || c.code) && (!noMin || !c.minCents) && titleHas(`${c.title} ${c.code ?? ""} ${c.store ?? ""} ${c.forProduct ?? ""} ${c.conditions.join(" ")}`, terms),
    );
  }, [data, q, withCode, noMin]);
  const stores = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of base) m.set(c.store ?? "Outras lojas", (m.get(c.store ?? "Outras lojas") ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [base]);
  const shown = useMemo(() => {
    const list = base.filter((c) => store === "all" || (c.store ?? "Outras lojas") === store);
    if (sort === "desconto") list.sort((a, b) => weight(b) - weight(a));
    else if (sort === "citados") list.sort((a, b) => b.mentions - a.mentions || b.lastSeenAt.localeCompare(a.lastSeenAt));
    return list;
  }, [base, store, sort]);

  const copy = useCallback(async (c: CupomDTO) => {
    if (!c.code) {
      toast("Este cupom não tem código", { description: "É de resgatar na página da loja: use Abrir na loja." });
      return;
    }
    try {
      await navigator.clipboard.writeText(c.code);
      toast(`Copiado: ${c.code}`, { description: `${discountLabel(c)}${c.store ? ` · ${c.store}` : ""}`, duration: 3000 });
    } catch {
      toast("Não deu para copiar", { description: `Copie à mão: ${c.code}` });
    }
  }, []);

  const hide = useCallback(
    async (c: CupomDTO) => {
      setData((d) => (d ?? []).filter((x) => x.id !== c.id));
      await fetch(`/api/cupons/${c.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ hidden: true }) });
      toast("Cupom escondido", {
        description: c.title.slice(0, 70),
        action: {
          label: "Desfazer",
          onClick: () =>
            void fetch(`/api/cupons/${c.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ hidden: false }) }).then(load),
        },
      });
    },
    [load],
  );

  // Único atalho: / põe o cursor na busca.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key !== "/") return;
      e.preventDefault();
      input.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const chip = (on: boolean) =>
    `flex h-11 flex-none items-center gap-2 rounded-full border px-4 text-[13px] font-medium ${on ? "border-ink bg-ink text-bg" : "border-control text-ink-2 hover:text-ink"}`;
  const withCodeN = (data ?? []).filter((c) => c.code).length;

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader active="cupons" status={status} live={live} />
      <main className="mx-auto flex w-full max-w-[1440px] flex-col gap-6 px-8 pb-8 pt-7">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <PageTitle title="Cupons">
            Cupons que apareceram nos seus grupos e comunidades nos últimos 3 dias, juntados por loja e código. O mesmo cupom em vários posts aparece uma vez só, com quantas vezes foi citado.
          </PageTitle>
          <div className="flex gap-6 text-[13px] text-muted">
            <span>
              <span className="font-mono tnum text-ink">{data?.length ?? "—"}</span> cupons
            </span>
            <span>
              <span className="font-mono tnum text-ink">{data ? withCodeN : "—"}</span> com código
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <label className="relative flex min-w-[min(100%,320px)] flex-1 items-center">
              <span className="sr-only">Buscar cupom</span>
              <svg className="pointer-events-none absolute left-4 text-label" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20l-3.5-3.5" />
              </svg>
              <input
                ref={input}
                type="search"
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setQ("");
                    e.currentTarget.blur();
                  }
                }}
                placeholder='Busque por loja, código ou produto: "shopee", "nubank", "smartphones"'
                className="h-11 w-full rounded-full border border-control bg-surface pl-11 pr-12 text-sm text-ink placeholder:text-label focus:border-ink"
              />
              <span className="pointer-events-none absolute right-4">
                <Kbd>/</Kbd>
              </span>
            </label>
            <label className="flex items-center gap-2 text-[13px] text-muted">
              Ordenar
              <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="h-11 rounded-full border border-control bg-bg px-4 text-[13px] font-medium text-ink-2">
                <option value="recentes">Mais recentes</option>
                <option value="desconto">Maior desconto</option>
                <option value="citados">Mais citados</option>
              </select>
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" aria-pressed={store === "all"} onClick={() => setStore("all")} className={chip(store === "all")}>
              Todas as lojas <span className="font-mono text-xs opacity-65">{base.length}</span>
            </button>
            {stores.map(([name, n]) => (
              <button key={name} type="button" aria-pressed={store === name} onClick={() => setStore(store === name ? "all" : name)} className={chip(store === name)}>
                {name} <span className="font-mono text-xs opacity-65">{n}</span>
              </button>
            ))}
            <span className="mx-1 hidden h-6 w-px bg-control sm:block" aria-hidden="true" />
            <button type="button" aria-pressed={withCode} onClick={() => setWithCode((v) => !v)} className={chip(withCode)}>
              Só com código
            </button>
            <button type="button" aria-pressed={noMin} onClick={() => setNoMin((v) => !v)} className={chip(noMin)}>
              Sem compra mínima
            </button>
          </div>
        </div>

        {data == null ? (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(min(320px,100%),1fr))] gap-4" aria-busy="true" aria-label="Carregando cupons">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="h-48 animate-pulse rounded-[14px] border border-card-line bg-surface" />
            ))}
          </div>
        ) : shown.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-[14px] border border-dashed border-control px-6 py-14 text-center">
            <span className="text-base font-medium">{data.length ? "Nenhum cupom com esses filtros" : "Nenhum cupom visto ainda"}</span>
            <span className="max-w-xl text-[13px] text-muted">Os cupons chegam sozinhos pelos grupos do Telegram e pelas comunidades, junto com as ofertas.</span>
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(min(320px,100%),1fr))] gap-4">
            {shown.map((c, i) => {
              const stale = now != null && now - new Date(c.lastSeenAt).getTime() > 12 * 3600 * 1000;
              return (
                <article
                  key={c.id}
                  data-cupom={i}
                  className={`flex flex-col gap-3 rounded-[14px] border bg-surface p-4 border-card-line hover:border-ink-3 ${stale ? "opacity-75" : ""}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <span className="text-[11px] uppercase tracking-[0.06em] text-label">{c.store ?? "Loja não identificada"}</span>
                      <span className="font-mono tnum text-[24px] font-semibold leading-tight text-num">{discountLabel(c)}</span>
                      <span className="text-[13px] text-muted">
                        {c.minCents ? `em compras acima de ${brl(c.minCents).replace(",00", "")}` : "sem compra mínima citada"}
                        {c.capCents ? ` · até ${brl(c.capCents).replace(",00", "")}` : ""}
                      </span>
                    </div>
                    <button type="button" onClick={() => void hide(c)} className="flex h-9 w-9 flex-none items-center justify-center rounded-full text-label hover:bg-active hover:text-ink" aria-label="Esconder este cupom" title="Esconder">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                        <path d="M6 6l12 12M18 6L6 18" />
                      </svg>
                    </button>
                  </div>

                  {c.code ? (
                    <button
                      type="button"
                      onClick={() => void copy(c)}
                      className="flex h-11 items-center justify-between gap-3 rounded-[10px] border border-dashed border-ink-3 bg-deep px-4 font-mono text-[15px] font-semibold tracking-wide text-ink hover:border-ink"
                      title="Copiar código"
                    >
                      <span className="truncate">{c.code}</span>
                      <span className="flex-none font-sans text-xs font-medium text-muted">Copiar</span>
                    </button>
                  ) : (
                    <div className="flex h-11 items-center rounded-[10px] border border-dashed border-control px-4 text-[13px] text-muted">Sem código: resgatar na página da loja</div>
                  )}

                  <p className="line-clamp-2 text-[13px] text-ink-2" title={c.title}>
                    {c.forProduct ? `Citado na oferta: ${c.forProduct}` : c.title}
                  </p>

                  <div className="flex flex-wrap gap-1.5">
                    {c.conditions.map((cond) => (
                      <Badge key={cond} tone={cond === "Frete grátis" ? "good" : "neutral"}>
                        {cond}
                      </Badge>
                    ))}
                    {stale && <Badge tone="bad">Pode ter acabado</Badge>}
                  </div>

                  <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3 text-xs text-muted">
                    <span title={c.sources.join(", ")}>
                      visto {ago(c.lastSeenAt, now)} · {c.mentions} {c.mentions === 1 ? "post" : "posts"}
                      {c.sources.length ? ` · ${c.sources.slice(0, 2).join(", ")}${c.sources.length > 2 ? ` +${c.sources.length - 2}` : ""}` : ""}
                    </span>
                    <span className="flex gap-2">
                      {c.postUrl && (
                        <a href={c.postUrl} target="_blank" rel="noopener noreferrer" className="flex h-9 items-center rounded-[10px] px-3 text-ink-2 hover:bg-active hover:text-ink">
                          Ver post
                        </a>
                      )}
                      {c.url && (
                        <a href={c.url} target="_blank" rel="noopener noreferrer" className="flex h-9 items-center rounded-[10px] bg-ink px-3 font-medium text-bg">
                          Abrir na loja
                        </a>
                      )}
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>
      <footer className="mt-auto flex flex-wrap items-center justify-center gap-x-5 gap-y-2 px-8 pb-7 pt-4 text-xs text-label">
        {[["/", "buscar"]].map(([k, v]) => (
          <span key={k} className="flex items-center gap-1.5">
            <Kbd>{k}</Kbd> {v}
          </span>
        ))}
      </footer>
      <Toaster theme="dark" position="bottom-left" toastOptions={{ style: { background: "#1C2026", border: "1px solid #2C313A", color: "#ECEDEE" } }} />
    </div>
  );
}
