"use client";

import { useCallback, useState } from "react";
import type { FonteDTO, FonteState, FontesDTO } from "@/lib/fontes";
import { AppHeader, Badge, PageTitle, ago, useLive, useNow, useStatus } from "./shell";

const LABEL: Record<FonteState, string> = { confirmada: "Confirmada", sugerida: "Sugerida", pausada: "Pausada", ignorada: "Ignorada" };

function Btn({ children, onClick, primary }: { children: React.ReactNode; onClick: () => void; primary?: boolean }) {
  return (
    <button type="button" onClick={onClick} className={`h-11 rounded-[10px] border px-3.5 text-[13px] font-medium ${primary ? "border-ink bg-ink text-bg" : "border-control text-ink-2 hover:text-ink"}`}>
      {children}
    </button>
  );
}

export function Fontes() {
  const [data, setData] = useState<FontesDTO | null>(null);
  const [scanning, setScanning] = useState(false);
  const { status, live } = useStatus();
  const now = useNow(30_000);

  const load = useCallback(async () => {
    setData(await fetch("/api/fontes", { cache: "no-store" }).then((r) => r.json()));
  }, []);
  useLive(load);

  const act = async (f: FonteDTO, acao: "confirmar" | "ignorar" | "pausar" | "retomar" | "desfazer") => {
    await fetch(`/api/fontes/${f.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ acao }) });
    await load();
  };
  const rescan = async () => {
    setScanning(true);
    await fetch("/api/fontes/rescan", { method: "POST" });
    setTimeout(() => {
      void load();
      setScanning(false);
    }, 4000);
  };
  const dismissInvite = async (link: string) => {
    await fetch("/api/fontes/convite", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ link }) });
    await load();
  };

  const fontes = data?.fontes ?? [];
  const nConf = fontes.filter((f) => f.state === "confirmada").length;
  const nSug = fontes.filter((f) => f.state === "sugerida").length;
  const tg = data?.telegram;

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader active="fontes" status={status} live={live} />
      <main className="mx-auto flex w-full max-w-[1440px] flex-col gap-7 px-8 pb-10 pt-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <PageTitle title="Fontes">
            Grupos e canais de promoção achados sozinhos na sua conta do Telegram, e as comunidades na web. O Garimpo só lê: não envia mensagens, não entra em grupos e nunca abre conversas individuais.
          </PageTitle>
          <div className="flex items-center gap-3 text-[13px] text-muted">
            <span>{scanning ? "lendo a lista de grupos e canais" : tg?.lastScan ? `última busca ${ago(tg.lastScan, now)}` : "sem busca ainda"}</span>
            <button type="button" onClick={rescan} aria-busy={scanning} disabled={scanning || !tg?.hasSession} className="h-11 rounded-[10px] border border-control px-4 text-[13px] font-medium text-ink-2 disabled:opacity-50">
              {scanning ? "Procurando…" : "Procurar de novo"}
            </button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-2 rounded-2xl border border-card-line bg-surface p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Telegram</span>
              <Badge tone={tg?.connected ? "good" : "neutral"}>{!tg?.hasSession ? "Sem sessão" : tg.connected ? "Conectado · só leitura" : "Sem sinal do worker"}</Badge>
            </div>
            <span className="font-mono tnum text-3xl font-semibold">
              {tg?.on ?? "—"} <span className="text-sm font-normal text-muted">de {tg?.total ?? "—"} grupos e canais ligados</span>
            </span>
            <span className="text-xs text-muted">{tg?.hasSession ? "Sessão neste PC · mensagens privadas nunca são lidas" : "Rode `pnpm telegram:login` e ponha o papel listen em WORKER_ROLES"}</span>
          </div>
          <div className="flex flex-col gap-2 rounded-2xl border border-card-line bg-surface p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Comunidades na web</span>
              <Badge tone="good">Coleta educada</Badge>
            </div>
            <span className="font-mono tnum text-3xl font-semibold">
              {data?.web.active ?? "—"} <span className="text-sm font-normal text-muted">{data?.web.active === 1 ? "ativa" : "ativas"}: {data?.web.names.join(", ")}</span>
            </span>
            <span className="text-xs text-muted">Páginas públicas, respeitando o robots.txt de cada site</span>
          </div>
        </div>

        <section aria-labelledby="encontradas" className="flex flex-col gap-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="encontradas" className="text-lg font-semibold tracking-tight">
              Fontes encontradas
            </h2>
            <span className="text-[13px] text-muted">
              {nConf} {nConf === 1 ? "confirmada" : "confirmadas"} · {nSug} {nSug === 1 ? "sugerida" : "sugeridas"} · taxa de acerto: ofertas que bateram com o preço na loja
            </span>
          </div>
          <div role="table" aria-label="Fontes encontradas" className="overflow-x-auto rounded-2xl border border-card-line bg-surface">
            <div role="row" className="grid min-w-[900px] grid-cols-[2.4fr_1.3fr_0.8fr_1fr_1fr_1.6fr] gap-3 border-b border-line px-4 py-2.5 text-[11px] uppercase tracking-[0.06em] text-label">
              {["Fonte", "Onde", "Ofertas/dia", "Taxa de acerto", "Status", "Ações"].map((h) => (
                <span key={h} role="columnheader">
                  {h}
                </span>
              ))}
            </div>
            {fontes.map((f) => (
              <div key={f.id} role="row" className={`grid min-w-[900px] grid-cols-[2.4fr_1.3fr_0.8fr_1fr_1fr_1.6fr] items-center gap-3 border-b border-line px-4 py-2.5 last:border-b-0 ${f.state === "ignorada" ? "opacity-50" : ""}`}>
                <span role="cell" className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-medium">{f.name}</span>
                  <span className="truncate text-xs text-muted">{f.why}</span>
                  {f.kind === "telegram" && f.state === "confirmada" && (
                    <span className="truncate font-mono text-[11px] text-ink-3">
                      {f.stats
                        ? `hoje: ${f.stats.read} lidas · ${f.stats.withLink} com link de loja · ${f.stats.touched} nos Alvos · ${f.stats.offers} ofertas`
                        : "ainda sem leitura"}
                      {f.lastMessageAt ? ` · última mensagem ${ago(f.lastMessageAt, now)}` : ""}
                    </span>
                  )}
                  {f.kind !== "telegram" && f.statusNote && <span className="truncate font-mono text-[11px] text-ink-3">{f.statusNote}</span>}
                </span>
                <span role="cell" className="text-[13px] text-ink-2">{f.where}</span>
                <span role="cell" className="font-mono tnum text-[13px]">{f.perDay || "—"}</span>
                <span role="cell" className="flex flex-col gap-1">
                  <span className="font-mono tnum text-[13px]">{f.hitPct == null ? "—" : `${f.hitPct}%`}</span>
                  <span className="h-1 overflow-hidden rounded-full bg-active" aria-hidden="true">
                    <span className="block h-full bg-good-dot" style={{ width: `${f.hitPct ?? 0}%` }} />
                  </span>
                </span>
                <span role="cell" className="flex flex-col items-start gap-1">
                  <Badge tone={f.state === "confirmada" ? "good" : "neutral"}>{LABEL[f.state]}</Badge>
                  {f.status !== "ok" && f.kind !== "telegram" && <span className="text-[11px] text-pause">{f.status}</span>}
                </span>
                <span role="cell" className="flex flex-wrap gap-2">
                  {f.state === "sugerida" && (
                    <>
                      <Btn primary onClick={() => void act(f, "confirmar")}>Confirmar</Btn>
                      <Btn onClick={() => void act(f, "ignorar")}>Ignorar</Btn>
                    </>
                  )}
                  {f.state === "confirmada" && <Btn onClick={() => void act(f, "pausar")}>Pausar</Btn>}
                  {f.state === "pausada" && <Btn onClick={() => void act(f, "retomar")}>Retomar</Btn>}
                  {f.state === "ignorada" && <Btn onClick={() => void act(f, "desfazer")}>Desfazer</Btn>}
                </span>
              </div>
            ))}
            {data && fontes.length === 0 && <p className="px-4 py-8 text-center text-[13px] text-muted">Nenhuma fonte ainda. O worker cria as fontes quando sobe.</p>}
          </div>
          <p className="text-xs text-muted">Grupos com nome de promoção ligam sozinhos; os de outros assuntos (cursos, vagas, bate-papo) ficam como sugeridos para você decidir. Além do nome, só entra mensagem com link de loja que toque um dos seus Alvos.</p>
        </section>

        <section aria-labelledby="sugestoes" className="flex flex-col gap-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="sugestoes" className="text-lg font-semibold tracking-tight">
              Convites encontrados
            </h2>
            <span className="text-[13px] text-muted">O Garimpo nunca entra sozinho: você decide e entra pelo próprio app do Telegram</span>
          </div>
          {data && data.invites.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-control px-5 py-6 text-[13px] text-muted">Nenhum convite visto nas mensagens por enquanto. Quando um grupo citar outro grupo, ele aparece aqui, com a contagem de menções.</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {(data?.invites ?? []).map((i) => (
                <article key={i.link} className="flex flex-col gap-2 rounded-2xl border border-[rgba(255,143,90,0.45)] bg-surface p-5">
                  <span className="text-[11px] uppercase tracking-[0.06em] text-pause">Link de convite encontrado</span>
                  <h3 className="break-all font-mono text-sm">{i.link}</h3>
                  <p className="text-[13px] text-muted">
                    Visto {i.mentions}x, a última {ago(i.lastSeenAt, now)}
                    {i.fromSource ? ` em ${i.fromSource}` : ""}. Grupo desconhecido: confira quem administra antes de entrar. Convite falso é golpe comum.
                  </p>
                  <div className="mt-1 flex gap-2">
                    <Btn onClick={() => void dismissInvite(i.link)}>Ignorar</Btn>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
