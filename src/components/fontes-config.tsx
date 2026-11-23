"use client";

import { useEffect, useRef, useState } from "react";
import { DEFAULT_INTERVAL_MIN, KIND_LABEL, MIN_INTERVAL_MIN, type FonteKind } from "@/config/fontes";
import type { FonteDTO, FontesDTO } from "@/lib/fontes";
import { formatBRL } from "@/lib/money";
import { Badge } from "./shell";

type Teste = { ok: boolean; note: string; total: number; items: { title: string; priceCents: number | null; url: string; store: string | null }[] };

export function Btn({ children, onClick, primary, danger, disabled }: { children: React.ReactNode; onClick: () => void; primary?: boolean; danger?: boolean; disabled?: boolean }) {
  const tone = primary ? "border-ink bg-ink text-bg" : danger ? "border-bad-line text-bad hover:bg-bad-bg" : "border-control text-ink-2 hover:text-ink";
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={`h-11 rounded-[10px] border px-3.5 text-[13px] font-medium disabled:opacity-50 ${tone}`}>
      {children}
    </button>
  );
}

export async function send(url: string, method: string, body?: unknown): Promise<string | null> {
  const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  if (r.ok) return null;
  return ((await r.json().catch(() => null)) as { erro?: string } | null)?.erro ?? "não deu certo";
}

/** Pede ao worker para ler a fonte uma vez, sem gravar, e espera o resultado (até 60 s). */
function useTeste() {
  const [state, setState] = useState<{ busy: boolean; result: Teste | null; erro: string | null }>({ busy: false, result: null, erro: null });
  const alive = useRef(true);
  useEffect(() => () => void (alive.current = false), []);
  const run = async (kind: FonteKind, config: unknown) => {
    setState({ busy: true, result: null, erro: null });
    const r = await fetch("/api/fontes/teste", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind, config }) });
    const { token } = (await r.json().catch(() => ({}))) as { token?: string };
    if (!token) return setState({ busy: false, result: null, erro: "não deu para pedir o teste" });
    const started = Date.now();
    while (alive.current && Date.now() - started < 60_000) {
      await new Promise((res) => setTimeout(res, 1500));
      const s = (await fetch(`/api/fontes/teste?token=${token}`, { cache: "no-store" }).then((x) => x.json()).catch(() => null)) as { pronto: boolean; result?: Teste } | null;
      if (s?.pronto) return alive.current && setState({ busy: false, result: s.result ?? null, erro: null });
    }
    if (alive.current) setState({ busy: false, result: null, erro: "o worker não respondeu em 60 s. Ele está ligado (pnpm worker) e já foi reiniciado com o código novo?" });
  };
  return { ...state, run };
}

function TesteBox({ t }: { t: ReturnType<typeof useTeste> }) {
  if (t.busy) return <p className="rounded-[10px] border border-line bg-bg px-3 py-2.5 text-[13px] text-muted">Testando… o worker lê a fonte com a coleta educada (pode levar alguns segundos por domínio).</p>;
  if (t.erro) return <p className="rounded-[10px] border border-bad-line px-3 py-2.5 text-[13px] text-bad">{t.erro}</p>;
  if (!t.result) return null;
  const r = t.result;
  return (
    <div aria-live="polite" className={`flex flex-col gap-1.5 rounded-[10px] border px-3 py-2.5 ${r.ok ? "border-line bg-bg" : "border-pause-line"}`}>
      <span className={`text-[13px] ${r.ok ? "text-ink" : "text-pause"}`}>{r.note}</span>
      {r.items.map((i, k) => (
        <span key={k} className="flex items-baseline gap-2 text-xs">
          <span className="font-mono tnum text-ink-2">{i.priceCents ? formatBRL(i.priceCents) : "sem preço"}</span>
          <span className="min-w-0 flex-1 truncate text-ink-2">{i.title}</span>
          <span className="shrink-0 text-ink-3">{i.store ?? "loja ?"}</span>
        </span>
      ))}
    </div>
  );
}

const field = "h-11 w-full rounded-[10px] border border-control bg-bg px-3 text-[13px] outline-none placeholder:text-ink-3 focus:border-ink-3";

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] uppercase tracking-[0.06em] text-label">{label}</span>
      {children}
      {hint && <span className="text-[11px] text-ink-3">{hint}</span>}
    </label>
  );
}

type Draft = { kind: FonteKind; name: string; url: string; urls: string; pathFilter: string; storeName: string; terms: string; seller: string; interval: string };

function draftOf(f: FonteDTO | null): Draft {
  const c = (f?.config ?? {}) as { url?: string; urls?: string[]; pathFilter?: string; storeName?: string; terms?: string[]; seller?: string };
  return {
    kind: (f?.kind as FonteKind) ?? "feed",
    name: f?.name ?? "",
    url: c.url ?? "",
    urls: (c.urls ?? []).join("\n"),
    pathFilter: c.pathFilter ?? "",
    storeName: c.storeName ?? "",
    terms: (c.terms ?? []).join(", "),
    seller: c.seller ?? "",
    interval: f?.intervalMin != null ? String(f.intervalMin) : "",
  };
}

function configOf(d: Draft) {
  if (d.kind === "feed") return { url: d.url.trim(), pathFilter: d.pathFilter.trim() };
  if (d.kind === "pagina") return { urls: d.urls.split(/\s+/).map((u) => u.trim()).filter(Boolean) };
  return { url: d.url.trim(), storeName: d.storeName.trim(), terms: d.terms.split(",").map((t) => t.trim()).filter(Boolean), seller: d.seller.trim() };
}

/** Formulário de fonte (nova ou editando), com o botão Testar. */
export function FonteForm({ fonte, onDone }: { fonte: FonteDTO | null; onDone: (saved: boolean) => Promise<void> | void }) {
  const [d, setD] = useState<Draft>(() => draftOf(fonte));
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const t = useTeste();
  const set = (k: keyof Draft) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setD({ ...d, [k]: e.target.value });
  const interval = d.interval.trim() ? Number(d.interval) : null;
  const badInterval = interval != null && (!Number.isInteger(interval) || interval < MIN_INTERVAL_MIN[d.kind]);
  const save = async () => {
    setBusy(true);
    const body = { name: d.name, config: configOf(d), intervalMin: interval };
    const e = fonte ? await send(`/api/fontes/${fonte.id}`, "PATCH", { acao: "editar", ...body }) : await send("/api/fontes", "POST", { kind: d.kind, ...body });
    setErr(e);
    setBusy(false);
    if (!e) await onDone(true);
  };

  return (
    <div className="flex flex-col gap-4">
      {!fonte && (
        <div role="radiogroup" aria-label="Tipo de fonte" className="flex flex-wrap gap-2">
          {(["feed", "pagina", "vtex"] as FonteKind[]).map((k) => (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={d.kind === k}
              onClick={() => setD({ ...d, kind: k })}
              className={`h-11 rounded-[10px] border px-3.5 text-[13px] font-medium ${d.kind === k ? "border-ink bg-active text-ink" : "border-control text-ink-2 hover:text-ink"}`}
            >
              {KIND_LABEL[k]}
            </button>
          ))}
        </div>
      )}
      <p className="text-xs text-muted">
        {d.kind === "feed" && "O endereço do feed RSS ou Atom do site (em WordPress costuma ser /feed/). Cada post vira uma oferta, com o primeiro link de loja do texto."}
        {d.kind === "pagina" && "Páginas que já trazem as ofertas nos dados da própria página (__NEXT_DATA__ ou JSON-LD). Página montada só no navegador não funciona: use Testar antes."}
        {d.kind === "vtex" && "Lojas em VTEX têm uma busca pública com parcelas e juros por cartão. Os preços dos seus Alvos viram histórico; vira oferta o que está 10% ou mais abaixo do preço “de”. A loja precisa estar em config/stores.ts."}
      </p>
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Nome">
          <input value={d.name} onChange={set("name")} maxLength={60} placeholder="ex.: Pechinchou informática" className={field} />
        </Field>
        <Field label="Intervalo (min)" hint={`Vazio = ${DEFAULT_INTERVAL_MIN[d.kind]} min. Mínimo ${MIN_INTERVAL_MIN[d.kind]} min (coleta educada).`}>
          <input value={d.interval} onChange={set("interval")} inputMode="numeric" placeholder={String(DEFAULT_INTERVAL_MIN[d.kind])} aria-invalid={badInterval} className={`${field} font-mono tnum ${badInterval ? "text-bad" : ""}`} />
        </Field>
        {d.kind === "feed" && (
          <>
            <Field label="Endereço do feed">
              <input value={d.url} onChange={set("url")} placeholder="https://site.com.br/feed/" className={`${field} font-mono`} />
            </Field>
            <Field label="Só links com" hint="Opcional: só os posts cujo link tem este pedaço, ex.: /achados/.">
              <input value={d.pathFilter} onChange={set("pathFilter")} placeholder="/ofertas/" className={`${field} font-mono`} />
            </Field>
          </>
        )}
        {d.kind === "pagina" && (
          <div className="md:col-span-2">
            <Field label="Páginas (uma por linha, até 5)">
              <textarea value={d.urls} onChange={set("urls")} rows={3} placeholder="https://www.pechinchou.com.br/recentes" className={`${field} h-auto py-2 font-mono`} />
            </Field>
          </div>
        )}
        {d.kind === "vtex" && (
          <>
            <Field label="Endereço da loja">
              <input value={d.url} onChange={set("url")} placeholder="https://www.waz.com.br" className={`${field} font-mono`} />
            </Field>
            <Field label="Nome da loja">
              <input value={d.storeName} onChange={set("storeName")} placeholder="Waz" className={field} />
            </Field>
            <Field label="Termos buscados" hint="Separados por vírgula. Vazio = o primeiro termo de cada Alvo ligado.">
              <input value={d.terms} onChange={set("terms")} placeholder="mouse, teclado, headset" className={field} />
            </Field>
            <Field label="Só o vendedor" hint="Para marketplace (ex.: Americanas). Vazio = o vendedor padrão.">
              <input value={d.seller} onChange={set("seller")} placeholder="" className={field} />
            </Field>
          </>
        )}
      </div>
      <TesteBox t={t} />
      <div className="flex flex-wrap items-center gap-2">
        <Btn primary disabled={busy || d.name.trim().length < 2 || badInterval} onClick={() => void save()}>
          {busy ? "Salvando…" : fonte ? "Salvar" : "Adicionar fonte"}
        </Btn>
        <Btn disabled={t.busy} onClick={() => void t.run(d.kind, configOf(d))}>
          {t.busy ? "Testando…" : "Testar"}
        </Btn>
        <Btn onClick={() => void onDone(false)}>Cancelar</Btn>
        {err && <span className="text-xs text-bad">{err}</span>}
      </div>
    </div>
  );
}

/** Ações a mais das fontes da tela: editar, ler agora, apagar. */
export function ConfigActions({ f, onEdit, reload }: { f: FonteDTO; onEdit: () => void; reload: () => Promise<void> }) {
  const [confirm, setConfirm] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const act = async (url: string, method: string, body?: unknown) => {
    const e = await send(url, method, body);
    setErr(e);
    if (!e) await reload();
  };
  return (
    <>
      <Btn onClick={onEdit}>Editar</Btn>
      {f.state === "confirmada" && <Btn onClick={() => void act(`/api/fontes/${f.id}`, "PATCH", { acao: "ler_agora" })}>Ler agora</Btn>}
      {confirm ? (
        <>
          <Btn danger onClick={() => void act(`/api/fontes/${f.id}`, "DELETE")}>Apagar mesmo</Btn>
          <Btn onClick={() => setConfirm(false)}>Cancelar</Btn>
        </>
      ) : (
        <Btn danger onClick={() => setConfirm(true)}>Apagar</Btn>
      )}
      {err && <span className="text-[11px] text-bad">{err}</span>}
    </>
  );
}

function SugestaoCard({ s, reload }: { s: FontesDTO["sugestoes"][number]; reload: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const t = useTeste();
  return (
    <article className="flex flex-col gap-2 rounded-2xl border border-card-line bg-surface p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-medium">{s.name}</h3>
        <Badge tone="neutral">{s.kindLabel}</Badge>
      </div>
      <p className="text-[13px] text-muted">{s.why}</p>
      <span className="text-[11px] text-ink-3">Pesquisa de 11/11: {s.rotulo}</span>
      <TesteBox t={t} />
      <div className="mt-1 flex flex-wrap gap-2">
        <Btn
          primary
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            const e = await send("/api/fontes", "POST", { sugestao: s.slug });
            setErr(e);
            setBusy(false);
            if (!e) await reload();
          }}
        >
          {busy ? "Adicionando…" : "Adicionar"}
        </Btn>
        <Btn disabled={t.busy} onClick={() => void t.run(s.kind, s.config)}>
          {t.busy ? "Testando…" : "Testar"}
        </Btn>
      </div>
      {err && <span className="text-xs text-bad">{err}</span>}
    </article>
  );
}

export function Sugestoes({ data, reload }: { data: FontesDTO | null; reload: () => Promise<void> }) {
  const list = data?.sugestoes ?? [];
  const canais = data?.canais ?? [];
  return (
    <>
      <section aria-labelledby="sugeridas" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="sugeridas" className="text-lg font-semibold tracking-tight">
            Sugeridas pela pesquisa
          </h2>
          <span className="text-[13px] text-muted">Conferidas em 11 e 12/11 com HTTP simples e o robots.txt de cada site · detalhes em docs/fontes-novas.md</span>
        </div>
        {data && list.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-control px-5 py-6 text-[13px] text-muted">Todas as sugestões já foram adicionadas.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {list.map((s) => (
              <SugestaoCard key={s.slug} s={s} reload={reload} />
            ))}
          </div>
        )}
      </section>
      {canais.length > 0 && (
        <section aria-labelledby="canais" className="flex flex-col gap-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="canais" className="text-lg font-semibold tracking-tight">
              Canais do Telegram para entrar
            </h2>
            <span className="text-[13px] text-muted">Conferidos no t.me em 12/11. Entre pelo seu app do Telegram: o canal aparece aqui na próxima busca</span>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {canais.map((c) => (
              <article key={c.handle} className="flex flex-col gap-1.5 rounded-2xl border border-card-line bg-surface p-5">
                <h3 className="text-sm font-medium">{c.name}</h3>
                <a href={`https://t.me/${c.handle}`} target="_blank" rel="noreferrer" className="font-mono text-[13px] text-ink-2 hover:text-ink hover:underline">
                  t.me/{c.handle}
                </a>
                <p className="text-[13px] text-muted">{c.why}</p>
              </article>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
