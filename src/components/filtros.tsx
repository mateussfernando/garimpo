"use client";

// Filtros inteligentes da Vitrine: busca que entende frases, categorias com contagem e filtros combinados.
// Cada contagem já considera os outros filtros ligados, para nunca levar a uma tela vazia sem aviso.
import { useEffect, useMemo, useRef, useState } from "react";
import { CATEGORIES, OTHER_CATEGORY, categoryName } from "@/config/categories";
import { STORES } from "@/config/stores";
import type { OfferDTO } from "@/lib/offers";
import { describe, parseQuery, titleHas, type Parsed, type Sort } from "@/lib/smart-filter";
import { Kbd, brl } from "./shell";

export type FilterState = {
  q: string;
  category: string; // "all" | slug | PENDING
  alvo: string; // "all" | slug | "__nenhum"
  store: string; // "all" | nome da loja
  price: string; // "all" | chave da faixa
  free: boolean;
  verified: boolean;
  noInterest: boolean;
  coupon: boolean;
  aiPick: boolean;
  sort: Sort;
};

const DEFAULT: FilterState = { q: "", category: "all", alvo: "all", store: "all", price: "all", free: false, verified: false, noInterest: false, coupon: false, aiPick: false, sort: "nota" };
/** Ofertas que a IA ainda vai classificar. */
const PENDING = "__classificando";
const NO_ALVO = "__nenhum";
const STORAGE_KEY = "garimpo.vitrine.filtros.v1";

const PRICES = [
  { key: "ate100", label: "Até R$ 100", min: null, max: 10000 },
  { key: "100-500", label: "R$ 100 a 500", min: 10000, max: 50000 },
  { key: "500-2000", label: "R$ 500 a 2 mil", min: 50000, max: 200000 },
  { key: "2000+", label: "Acima de R$ 2 mil", min: 200000, max: null },
] as const;

const SORTS: { key: Sort; label: string }[] = [
  { key: "nota", label: "Maior nota" },
  { key: "ia", label: "Melhor pela IA" },
  { key: "preco", label: "Menor preço" },
  { key: "novos", label: "Mais novas" },
  { key: "desconto", label: "Maior desconto" },
];

const storeName = (slug: string) => STORES.find((s) => s.slug === slug)?.name ?? slug;
const discountOf = (o: OfferDTO) =>
  o.listPriceCents && o.priceCardCents && o.listPriceCents > o.priceCardCents ? 1 - o.priceCardCents / o.listPriceCents : 0;

type Facet = "category" | "alvo" | "store" | "price";

function matcher(st: FilterState, p: Parsed) {
  const category = p.category ?? st.category;
  const store = p.store ? storeName(p.store) : st.store;
  const band = PRICES.find((b) => b.key === st.price);
  const min = p.minCents ?? (p.maxCents == null ? (band?.min ?? null) : null);
  const max = p.maxCents ?? (p.minCents == null ? (band?.max ?? null) : null);
  return (o: OfferDTO, skip?: Facet) => {
    if (skip !== "category" && category !== "all") {
      if (category === PENDING ? o.category != null : (o.category ?? PENDING) !== category) return false;
    }
    if (skip !== "alvo" && st.alvo !== "all" && (st.alvo === NO_ALVO ? !!o.alvo : o.alvo?.slug !== st.alvo)) return false;
    if (skip !== "store" && store !== "all" && o.store !== store) return false;
    if (skip !== "price" && (min != null || max != null)) {
      if (o.priceCardCents == null) return false;
      if (min != null && o.priceCardCents < min) return false;
      if (max != null && o.priceCardCents > max) return false;
    }
    if ((st.free || p.free) && !o.freeShipping) return false;
    if ((st.verified || p.verified) && o.verifyStatus !== "verificado") return false;
    if ((st.noInterest || p.noInterest) && o.interest !== false) return false;
    if ((st.coupon || p.coupon) && !o.coupon) return false;
    if ((st.aiPick || p.aiPick) && !(o.ia && (o.ia.verdict === "excelente" || o.ia.verdict === "boa"))) return false;
    return titleHas(o.title, p.terms);
  };
}

/** Estado dos filtros (lembrado neste navegador), as ofertas filtradas e as contagens de cada opção. */
export function useSmartFilters(offers: OfferDTO[] | null) {
  const [st, setSt] = useState<FilterState>(DEFAULT);
  const loaded = useRef(false);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- lê o que ficou salvo só depois de montar (o servidor não tem localStorage)
      if (raw) setSt({ ...DEFAULT, ...(JSON.parse(raw) as Partial<FilterState>) });
    } catch {
      /* sem localStorage: começa do padrão */
    }
    loaded.current = true;
  }, []);
  useEffect(() => {
    if (!loaded.current) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(st));
    } catch {
      /* navegador sem localStorage: os filtros só não são lembrados */
    }
  }, [st]);

  const parsed = useMemo(() => parseQuery(st.q), [st.q]);
  const result = useMemo(() => {
    const list = offers ?? [];
    const match = matcher(st, parsed);
    const count = (skip: Facet, key: (o: OfferDTO) => string) => {
      const m = new Map<string, number>();
      for (const o of list) if (match(o, skip)) m.set(key(o), (m.get(key(o)) ?? 0) + 1);
      return m;
    };
    const cats = count("category", (o) => o.category ?? PENDING);
    const alvos = count("alvo", (o) => o.alvo?.slug ?? NO_ALVO);
    const stores = count("store", (o) => o.store ?? "");
    const priceBase = list.filter((o) => match(o, "price"));
    const prices = new Map(PRICES.map((b) => [b.key, priceBase.filter((o) => o.priceCardCents != null && (b.min == null || o.priceCardCents >= b.min) && (b.max == null || o.priceCardCents <= b.max)).length]));
    const sort = parsed.sort ?? st.sort;
    const shown = list.filter((o) => match(o));
    if (sort === "preco") shown.sort((a, b) => (a.priceCardCents ?? Infinity) - (b.priceCardCents ?? Infinity));
    else if (sort === "ia") shown.sort((a, b) => (b.ia?.score ?? -1) - (a.ia?.score ?? -1) || (b.nota ?? -1) - (a.nota ?? -1));
    else if (sort === "novos") shown.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    else if (sort === "desconto") shown.sort((a, b) => discountOf(b) - discountOf(a) || (b.nota ?? -1) - (a.nota ?? -1));
    return { shown, cats, alvos, stores, prices, total: [...cats.values()].reduce((a, b) => a + b, 0), all: list.length };
  }, [offers, st, parsed]);

  const active =
    st.q.trim() !== "" || st.category !== "all" || st.alvo !== "all" || st.store !== "all" || st.price !== "all" || st.free || st.verified || st.noInterest || st.coupon || st.aiPick;
  return { st, setSt, parsed, ...result, active, reset: () => setSt((s) => ({ ...DEFAULT, sort: s.sort })) };
}

type Props = ReturnType<typeof useSmartFilters> & { alvoNames: Map<string, string>; onChange?: () => void };

const chip = (on: boolean) =>
  `flex h-11 flex-none items-center gap-2 rounded-full border px-4 text-[13px] font-medium ${on ? "border-ink bg-ink text-bg" : "border-control text-ink-2 hover:text-ink"}`;
const selectCls = (on: boolean) =>
  `h-11 rounded-full border bg-bg px-4 text-[13px] font-medium ${on ? "border-ink text-ink" : "border-control text-ink-2 hover:text-ink"}`;

export function FiltersBar({ st, setSt, parsed, cats, alvos, stores, prices, total, all, shown, active, reset, alvoNames, onChange }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [allCats, setAllCats] = useState(false);
  const set = (patch: Partial<FilterState>) => {
    setSt((s) => ({ ...s, ...patch }));
    onChange?.();
  };

  // "/" põe o cursor na busca; Esc dentro dela limpa e sai.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.key === "/" && !/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) && !t.isContentEditable) {
        e.preventDefault();
        input.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const understood = describe(parsed, { category: categoryName, store: storeName, brl });
  const catList = [
    ...CATEGORIES.map((c) => ({ slug: c.slug, name: c.name, n: cats.get(c.slug) ?? 0 })),
    { slug: OTHER_CATEGORY.slug, name: OTHER_CATEGORY.name, n: cats.get(OTHER_CATEGORY.slug) ?? 0 },
    { slug: PENDING, name: "Classificando", n: cats.get(PENDING) ?? 0 },
  ]
    .filter((c) => c.n > 0 || c.slug === st.category)
    .sort((a, b) => (a.slug === PENDING ? 1 : b.slug === PENDING ? -1 : b.n - a.n));
  const VISIBLE = 8;
  const catShown = allCats ? catList : catList.slice(0, VISIBLE);
  const catLocked = parsed.category != null;
  const storeList = [...stores.entries()].filter(([name]) => name).sort((a, b) => b[1] - a[1]);
  const alvoList = [...alvos.entries()].filter(([slug]) => slug !== NO_ALVO).sort((a, b) => b[1] - a[1]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <label className="relative flex min-w-[min(100%,320px)] flex-1 items-center">
          <span className="sr-only">Buscar ou filtrar ofertas</span>
          <svg className="pointer-events-none absolute left-4 text-label" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" />
          </svg>
          <input
            ref={input}
            type="search"
            value={st.q}
            onChange={(e) => set({ q: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                set({ q: "" });
                e.currentTarget.blur();
              }
            }}
            placeholder='Busque ou peça: "tv até 2000 frete grátis", "air fryer shopee", "fone mais barato"'
            className="h-11 w-full rounded-full border border-control bg-surface pl-11 pr-12 text-sm text-ink placeholder:text-label focus:border-ink"
          />
          <span className="pointer-events-none absolute right-4">
            <Kbd>/</Kbd>
          </span>
        </label>
        <label className="flex items-center gap-2 text-[13px] text-muted">
          Ordenar
          <select value={parsed.sort ?? st.sort} onChange={(e) => set({ sort: e.target.value as Sort })} disabled={parsed.sort != null} className={selectCls(false)}>
            {SORTS.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {understood.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-[13px] text-muted" aria-live="polite">
          <span>Entendi:</span>
          {understood.map((u) => (
            <span key={u} className="inline-flex h-7 items-center rounded-full border border-control bg-active px-3 text-ink-2">
              {u}
            </span>
          ))}
        </div>
      )}

      <div role="group" aria-label="Categorias" className="flex flex-wrap gap-2">
        <button type="button" aria-pressed={!catLocked && st.category === "all"} disabled={catLocked} onClick={() => set({ category: "all" })} className={chip(!catLocked && st.category === "all")}>
          Todas
          <span className="font-mono text-xs opacity-65">{total}</span>
        </button>
        {catShown.map((c) => {
          const on = catLocked ? parsed.category === c.slug : st.category === c.slug;
          return (
            <button
              key={c.slug}
              type="button"
              aria-pressed={on}
              disabled={catLocked}
              onClick={() => set({ category: on ? "all" : c.slug })}
              className={chip(on)}
              title={c.slug === PENDING ? "Ofertas que as regras não souberam classificar; a IA classifica em lote em poucos minutos" : undefined}
            >
              {c.name}
              <span className="font-mono text-xs opacity-65">{c.n}</span>
            </button>
          );
        })}
        {catList.length > VISIBLE && (
          <button type="button" onClick={() => setAllCats((v) => !v)} className={chip(false)} aria-expanded={allCats}>
            {allCats ? "Menos" : `Mais ${catList.length - VISIBLE}`}
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select aria-label="Loja" value={parsed.store ? storeName(parsed.store) : st.store} disabled={parsed.store != null} onChange={(e) => set({ store: e.target.value })} className={selectCls(st.store !== "all" || parsed.store != null)}>
          <option value="all">Todas as lojas</option>
          {storeList.map(([name, n]) => (
            <option key={name} value={name}>
              {name} ({n})
            </option>
          ))}
          {st.store !== "all" && !stores.has(st.store) && <option value={st.store}>{st.store} (0)</option>}
        </select>
        <select
          aria-label="Faixa de preço"
          value={st.price}
          disabled={parsed.minCents != null || parsed.maxCents != null}
          onChange={(e) => set({ price: e.target.value })}
          className={selectCls(st.price !== "all")}
        >
          <option value="all">Qualquer preço</option>
          {PRICES.map((b) => (
            <option key={b.key} value={b.key}>
              {b.label} ({prices.get(b.key) ?? 0})
            </option>
          ))}
        </select>
        {alvoList.length > 0 && (
          <select aria-label="Alvo" value={st.alvo} onChange={(e) => set({ alvo: e.target.value })} className={selectCls(st.alvo !== "all")}>
            <option value="all">Todos os Alvos</option>
            {alvoList.map(([slug, n]) => (
              <option key={slug} value={slug}>
                {alvoNames.get(slug) ?? slug} ({n})
              </option>
            ))}
            <option value={NO_ALVO}>Fora dos Alvos ({alvos.get(NO_ALVO) ?? 0})</option>
          </select>
        )}
        <span className="mx-1 hidden h-6 w-px bg-control sm:block" aria-hidden="true" />
        <button type="button" aria-pressed={st.aiPick || parsed.aiPick} onClick={() => set({ aiPick: !st.aiPick })} className={chip(st.aiPick || parsed.aiPick)} title="Excelentes e boas compras, segundo a análise da IA">
          ✦ Recomendadas pela IA
        </button>
        <button type="button" aria-pressed={st.verified || parsed.verified} onClick={() => set({ verified: !st.verified })} className={chip(st.verified || parsed.verified)}>
          Conferidas na loja
        </button>
        <button type="button" aria-pressed={st.free || parsed.free} onClick={() => set({ free: !st.free })} className={chip(st.free || parsed.free)}>
          Frete grátis
        </button>
        <button type="button" aria-pressed={st.noInterest || parsed.noInterest} onClick={() => set({ noInterest: !st.noInterest })} className={chip(st.noInterest || parsed.noInterest)}>
          Sem juros
        </button>
        <button type="button" aria-pressed={st.coupon || parsed.coupon} onClick={() => set({ coupon: !st.coupon })} className={chip(st.coupon || parsed.coupon)}>
          Com cupom
        </button>
        <span className="ml-auto flex items-center gap-3 text-[13px] text-muted">
          <span className="font-mono tnum">{shown.length}</span> de <span className="font-mono tnum">{all}</span>
          {active && (
            <button type="button" onClick={reset} className="h-11 rounded-full px-3 text-ink-2 underline-offset-4 hover:text-ink hover:underline">
              Limpar filtros
            </button>
          )}
        </span>
      </div>
    </div>
  );
}
