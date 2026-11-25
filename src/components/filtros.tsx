"use client";

// Filtros inteligentes da Vitrine: busca que entende frases, categorias com contagem e filtros combinados.
// Cada contagem já considera os outros filtros ligados, para nunca levar a uma tela vazia sem aviso.
import { useEffect, useMemo, useRef, useState } from "react";
import { CATEGORIES, OTHER_CATEGORY, categoryName } from "@/config/categories";
import { STORES } from "@/config/stores";
import { storeCount } from "./comparar-lojas";
import type { OfferDTO } from "@/lib/offers";
import { precoConhecido, valorDe, type PrecoPref } from "@/lib/preco";
import { describe, parseQuery, titleHas, type Parsed, type Sort } from "@/lib/smart-filter";
import { usePreco } from "./preco";
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
  /** Só ofertas que informam o preço no Pix (o post ou a loja). */
  pix: boolean;
  aiPick: boolean;
  /** Só produtos achados em mais de uma loja. */
  multiStore: boolean;
  sort: Sort;
};

const VEREDITO_ORDEM = { excelente: 0, boa: 1, ok: 2, fraca: 3, evitar: 4 } as const;
const DEFAULT: FilterState = { q: "", category: "all", alvo: "all", store: "all", price: "all", free: false, verified: false, noInterest: false, coupon: false, pix: false, aiPick: false, multiStore: false, sort: "nota" };
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
  { key: "ia", label: "Melhor veredito" },
  { key: "preco", label: "Menor preço" },
  { key: "novos", label: "Mais novas" },
  { key: "desconto", label: "Maior desconto" },
];

const storeName = (slug: string) => STORES.find((s) => s.slug === slug)?.name ?? slug;
const discountOf = (o: OfferDTO) =>
  o.listPriceCents && o.priceCardCents && o.listPriceCents > o.priceCardCents ? 1 - o.priceCardCents / o.listPriceCents : 0;

type Facet = "category" | "alvo" | "store" | "price";

function matcher(st: FilterState, p: Parsed, pref: PrecoPref) {
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
    // O card junta o mesmo produto de várias lojas: vale qualquer uma delas.
    if (skip !== "store" && store !== "all" && o.store !== store && !o.lojas.some((l) => l.store === store)) return false;
    if (st.multiStore && storeCount(o.lojas) < 2) return false;
    if (skip !== "price" && (min != null || max != null)) {
      const v = valorDe(o, pref);
      if (v == null) return false;
      if (min != null && v < min) return false;
      if (max != null && v > max) return false;
    }
    if ((st.free || p.free) && !o.freeShipping) return false;
    if ((st.verified || p.verified) && o.verifyStatus !== "verificado") return false;
    if ((st.noInterest || p.noInterest) && o.interest !== false) return false;
    if ((st.coupon || p.coupon) && !o.coupon) return false;
    if (st.pix && precoConhecido(o).pix == null) return false;
    if ((st.aiPick || p.aiPick) && !(o.ia && (o.ia.verdict === "excelente" || o.ia.verdict === "boa"))) return false;
    return titleHas(o.title, p.terms);
  };
}

/** Estado dos filtros (lembrado neste navegador), as ofertas filtradas e as contagens de cada opção. */
export function useSmartFilters(offers: OfferDTO[] | null) {
  const { pref } = usePreco();
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
    const match = matcher(st, parsed, pref);
    const count = (skip: Facet, key: (o: OfferDTO) => string) => {
      const m = new Map<string, number>();
      for (const o of list) if (match(o, skip)) m.set(key(o), (m.get(key(o)) ?? 0) + 1);
      return m;
    };
    const cats = count("category", (o) => o.category ?? PENDING);
    const alvos = count("alvo", (o) => o.alvo?.slug ?? NO_ALVO);
    const stores = count("store", (o) => o.store ?? "");
    const priceBase = list.filter((o) => match(o, "price"));
    const prices = new Map(PRICES.map((b) => [b.key, priceBase.filter((o) => { const v = valorDe(o, pref); return v != null && (b.min == null || v >= b.min) && (b.max == null || v <= b.max); }).length]));
    const sort = parsed.sort ?? st.sort;
    const shown = list.filter((o) => match(o));
    if (sort === "preco") shown.sort((a, b) => (valorDe(a, pref) ?? Infinity) - (valorDe(b, pref) ?? Infinity));
    // "IA": o veredito dela primeiro (a nota dela já faz parte da nota única), e dentro de cada veredito a nota.
    else if (sort === "ia") shown.sort((a, b) => (a.ia ? VEREDITO_ORDEM[a.ia.verdict] : 9) - (b.ia ? VEREDITO_ORDEM[b.ia.verdict] : 9) || (b.nota ?? -1) - (a.nota ?? -1));
    else if (sort === "novos") shown.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    else if (sort === "desconto") shown.sort((a, b) => discountOf(b) - discountOf(a) || (b.nota ?? -1) - (a.nota ?? -1));
    return { shown, cats, alvos, stores, prices, total: [...cats.values()].reduce((a, b) => a + b, 0), all: list.length };
  }, [offers, st, parsed, pref]);

  const active =
    st.q.trim() !== "" || st.category !== "all" || st.alvo !== "all" || st.store !== "all" || st.price !== "all" || st.free || st.verified || st.noInterest || st.coupon || st.pix || st.aiPick || st.multiStore;
  return { st, setSt, parsed, ...result, active, reset: () => setSt((s) => ({ ...DEFAULT, sort: s.sort })) };
}

type Props = ReturnType<typeof useSmartFilters> & { alvoNames: Map<string, string>; onChange?: () => void; children?: React.ReactNode };

// Item da lista lateral: a categoria escolhida ganha fundo e um traço à esquerda.
const item = (on: boolean) =>
  `flex min-h-9 w-full items-center justify-between gap-2 rounded-[8px] px-2.5 text-left text-[13.5px] disabled:opacity-50 ${on ? "bg-active font-semibold text-ink shadow-[inset_2px_0_0_var(--color-ink)]" : "text-ink-2 hover:bg-active hover:text-ink"}`;
const numCls = "flex-none font-mono text-[11.5px] font-normal text-label tnum";
const tituloCls = "px-2.5 pb-1.5 text-[11px] uppercase tracking-[0.06em] text-label";
const selectCls = (on: boolean) =>
  `h-10 w-full rounded-[10px] border bg-bg px-3 text-[13px] font-medium ${on ? "border-ink text-ink" : "border-control text-ink-2 hover:text-ink"}`;

export function FiltersBar({ st, setSt, parsed, cats, alvos, stores, prices, total, all, shown, active, reset, alvoNames, onChange, children }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [allCats, setAllCats] = useState(false);
  // Celular e tablet: a coluna de categorias e filtros abre e fecha pelo botão.
  const [painel, setPainel] = useState(false);
  // No celular, escolher a categoria fecha a lista para as ofertas aparecerem; os filtros de "Mostrar só" deixam aberta.
  const escolherCategoria = (category: string) => {
    set({ category });
    setPainel(false);
  };
  const nAtivos = [st.store !== "all", st.price !== "all", st.alvo !== "all", st.aiPick, st.multiStore, st.verified, st.free, st.noInterest, st.coupon, st.pix].filter(Boolean).length;
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
  // As 12 maiores categorias e um "Mais" para o resto (a categoria escolhida sempre aparece).
  const VISIBLE = 12;
  const catShown = allCats ? catList : catList.filter((c, i) => i < VISIBLE || c.slug === st.category);
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
            className="h-11 w-full rounded-xl border border-control bg-surface pl-11 pr-12 text-sm text-ink placeholder:text-label focus:border-ink"
          />
          <span className="pointer-events-none absolute right-4">
            <Kbd>/</Kbd>
          </span>
        </label>
        <label className="flex items-center gap-2 text-[13px] text-muted">
          Ordenar
          <select value={parsed.sort ?? st.sort} onChange={(e) => set({ sort: e.target.value as Sort })} disabled={parsed.sort != null} className="h-11 rounded-xl border border-control bg-bg px-3 text-[13px] font-medium text-ink-2 hover:text-ink">
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
            <span key={u} className="inline-flex h-7 items-center rounded-[8px] border border-control bg-active px-2.5 text-ink-2">
              {u}
            </span>
          ))}
        </div>
      )}

      {/* Lista lateral (escolhida em 25/11): categorias e filtros numa coluna à esquerda da grade a partir do notebook.
          No celular e no tablet ficam atrás do botão "Categorias e filtros". Nada rola para o lado. */}
      <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[232px_minmax(0,1fr)] lg:items-start lg:gap-7">
        <button
          type="button"
          onClick={() => setPainel((v) => !v)}
          aria-expanded={painel}
          aria-controls="filtros-laterais"
          className="flex h-11 items-center gap-2.5 rounded-xl border border-control bg-surface px-4 text-sm font-medium text-ink lg:hidden"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
            <path d="M4 6h16M7 12h10M10 18h4" />
          </svg>
          Categorias e filtros
          <span className="ml-auto truncate text-[13px] font-normal text-muted">
            {[st.category !== "all" ? catList.find((c) => c.slug === st.category)?.name : null, nAtivos > 0 ? `${nAtivos} ${nAtivos === 1 ? "filtro" : "filtros"}` : null].filter(Boolean).join(" · ")}
          </span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" className={`flex-none text-muted transition-transform ${painel ? "rotate-180" : ""}`}>
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>

        <aside id="filtros-laterais" aria-label="Categorias e filtros" className={`${painel ? "flex" : "hidden"} flex-col gap-6 rounded-2xl border border-card-line bg-surface p-3 lg:flex lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0`}>
          <div role="group" aria-labelledby="cat-titulo" className="flex flex-col gap-px">
            <span id="cat-titulo" className={tituloCls}>Categorias</span>
            <button type="button" aria-pressed={!catLocked && st.category === "all"} disabled={catLocked} onClick={() => escolherCategoria("all")} className={item(!catLocked && st.category === "all")}>
              Todas
              <span className={numCls}>{total.toLocaleString("pt-BR")}</span>
            </button>
            {catShown.map((c) => {
              const on = catLocked ? parsed.category === c.slug : st.category === c.slug;
              return (
                <button
                  key={c.slug}
                  type="button"
                  aria-pressed={on}
                  disabled={catLocked}
                  onClick={() => escolherCategoria(on ? "all" : c.slug)}
                  className={item(on)}
                  title={c.slug === PENDING ? "Ofertas que as regras não souberam classificar; o Garimpo classifica em poucos minutos" : undefined}
                >
                  <span className="truncate">{c.name}</span>
                  <span className={numCls}>{c.n}</span>
                </button>
              );
            })}
            {catList.length > VISIBLE && (
              <button type="button" onClick={() => setAllCats((v) => !v)} aria-expanded={allCats} className="flex min-h-9 items-center rounded-[8px] px-2.5 text-left text-[13px] text-muted hover:bg-active hover:text-ink">
                {allCats ? "Mostrar menos" : `Mais ${catList.length - VISIBLE} categorias`}
              </button>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <span className={tituloCls}>Loja e preço</span>
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
          </div>

          <div role="group" aria-labelledby="mostrar-titulo" className="flex flex-col gap-px">
            <span id="mostrar-titulo" className={tituloCls}>Mostrar só</span>
            {(
              [
                ["Recomendadas", st.aiPick || parsed.aiPick, () => set({ aiPick: !st.aiPick }), "Excelentes e boas compras, segundo o veredito do Garimpo"],
                ["Em várias lojas", st.multiStore, () => set({ multiStore: !st.multiStore }), "O mesmo produto achado em mais de uma loja, para comparar"],
                ["Conferidas na loja", st.verified || parsed.verified, () => set({ verified: !st.verified }), "Preço conferido na página da loja"],
                ["Frete grátis", st.free || parsed.free, () => set({ free: !st.free }), undefined],
                ["Sem juros", st.noInterest || parsed.noInterest, () => set({ noInterest: !st.noInterest }), undefined],
                ["Com cupom", st.coupon || parsed.coupon, () => set({ coupon: !st.coupon }), undefined],
                ["Com preço no Pix", st.pix, () => set({ pix: !st.pix }), "Só ofertas em que o post ou a loja informam o preço no Pix"],
              ] as const
            ).map(([rotulo, on, toggle, dica]) => (
              <button key={rotulo} type="button" aria-pressed={on} onClick={toggle} title={dica} className={`flex min-h-9 items-center gap-2.5 rounded-[8px] px-2.5 text-left text-[13.5px] ${on ? "font-medium text-ink" : "text-ink-2 hover:bg-active hover:text-ink"}`}>
                <span className={`flex h-4 w-4 flex-none items-center justify-center rounded-[4px] border ${on ? "border-ink bg-ink text-bg" : "border-control"}`} aria-hidden="true">
                  {on && (
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12.5l4.5 4.5L19 7.5" />
                    </svg>
                  )}
                </span>
                {rotulo}
              </button>
            ))}
          </div>
        </aside>

        <div className="flex min-w-0 flex-col gap-4">
          <div className="flex min-h-9 items-center justify-between gap-3 text-[13px] text-muted">
            {shown.length === all ? (
              <span>
                <span className="font-mono tnum text-ink-2">{all.toLocaleString("pt-BR")}</span> ofertas
              </span>
            ) : (
              <span>
                <span className="font-mono tnum text-ink-2">{shown.length.toLocaleString("pt-BR")}</span> de <span className="font-mono tnum">{all.toLocaleString("pt-BR")}</span> ofertas
              </span>
            )}
            {active && (
              <button type="button" onClick={reset} className="h-9 rounded-[10px] px-3 text-ink-2 underline-offset-4 hover:text-ink hover:underline">
                Limpar filtros
              </button>
            )}
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
