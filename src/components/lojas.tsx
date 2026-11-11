"use client";

import { useCallback, useState } from "react";
import type { LojaDTO, LojasDTO } from "@/lib/lojas";
import { AppHeader, PageTitle, ago, useLive, useNow, useStatus } from "./shell";

const dot: Record<LojaDTO["health"], string> = { ok: "bg-good-dot", pausada_loja: "bg-pause", pausada_usuario: "bg-label" };
const healthLabel: Record<LojaDTO["health"], string> = { ok: "OK", pausada_loja: "Pausada 1 h", pausada_usuario: "Pausada por você" };

export function Lojas() {
  const [data, setData] = useState<LojasDTO | null>(null);
  const { status, live } = useStatus();
  const now = useNow(30_000);
  const load = useCallback(async () => {
    setData(await fetch("/api/lojas", { cache: "no-store" }).then((r) => r.json()));
  }, []);
  useLive(load);

  const toggle = async (s: LojaDTO) => {
    await fetch(`/api/lojas/${s.slug}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ paused: s.health !== "pausada_usuario" }) });
    await load();
  };
  const active = (data?.stores ?? []).filter((s) => s.health === "ok").length;

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader active="lojas" status={status} live={live} />
      <main className="mx-auto flex w-full max-w-[1440px] flex-col gap-7 px-8 pb-10 pt-7">
        <PageTitle title="Lojas">
          Onde o Garimpo confere preços. A conferência é educada: respeita o robots.txt, espaça os pedidos e pausa sozinha quando a loja pede.
        </PageTitle>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ["Verificação", "ao vivo", "só quando uma oferta chega; a coleta diária entra depois do 11.11"],
            ["Na fila agora", `${data?.queue ?? "—"} ${data?.queue === 1 ? "página" : "páginas"}`, "uma loja por vez, 5 a 10 s entre pedidos"],
            ["Hoje", `${data?.readToday ?? "—"} páginas lidas`, `${data?.pausesActive ?? 0} ${data?.pausesActive === 1 ? "pausa pedida pela loja e respeitada" : "pausas pedidas pelas lojas e respeitadas"}`],
            ["Conferidor", "este PC", "só HTTP, sem navegador"],
          ].map(([l, v, s]) => (
            <div key={l} className="flex flex-col gap-1 rounded-2xl border border-card-line bg-surface p-5">
              <span className="text-[11px] uppercase tracking-[0.06em] text-label">{l}</span>
              <span className="font-mono tnum text-2xl font-semibold">{v}</span>
              <span className="text-xs text-muted">{s}</span>
            </div>
          ))}
        </div>

        <section aria-labelledby="vigiadas" className="flex flex-col gap-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="vigiadas" className="text-lg font-semibold tracking-tight">
              Lojas vigiadas
            </h2>
            <span className="text-[13px] text-muted">{active} conferindo agora · só as lojas de config/stores.ts são abertas</span>
          </div>
          <div role="table" aria-label="Lojas vigiadas" className="overflow-x-auto rounded-2xl border border-card-line bg-surface">
            <div role="row" className="grid min-w-[900px] grid-cols-[1.3fr_1.5fr_1.7fr_1fr_1.8fr_0.9fr_1fr] gap-3 border-b border-line px-4 py-2.5 text-[11px] uppercase tracking-[0.06em] text-label">
              {["Loja", "Foco", "Como confere", "Última passagem", "Saúde", "Site", "Ações"].map((h) => (
                <span key={h} role="columnheader">
                  {h}
                </span>
              ))}
            </div>
            {(data?.stores ?? []).map((s) => (
              <div key={s.slug} role="row" className={`grid min-w-[900px] grid-cols-[1.3fr_1.5fr_1.7fr_1fr_1.8fr_0.9fr_1fr] items-center gap-3 border-b border-line px-4 py-2.5 last:border-b-0 ${s.health === "pausada_usuario" ? "opacity-55" : ""}`}>
                <span role="cell" className="text-sm font-medium">{s.name}</span>
                <span role="cell" className="text-[13px] text-ink-2">{s.focus}</span>
                <span role="cell" className="text-[13px] text-ink-2">{s.how}</span>
                <span role="cell" className="font-mono text-[13px] text-ink-2">{s.lastAt ? ago(s.lastAt, now) : "nunca"}</span>
                <span role="cell" className="flex items-center gap-2">
                  <span className={`h-2 w-2 flex-none rounded-full ${dot[s.health]}`} />
                  <span className="flex flex-col">
                    <span className="text-[13px]">{healthLabel[s.health]}</span>
                    <span className="text-xs text-muted">{s.healthNote}</span>
                  </span>
                </span>
                <span role="cell">
                  <a href={s.site} target="_blank" rel="noopener noreferrer" className="flex min-h-11 items-center text-[13px] text-ink-2 underline-offset-2 hover:underline">
                    Ver no site
                  </a>
                </span>
                <span role="cell">
                  {s.health === "pausada_loja" ? (
                    <span className="text-xs text-pause">a loja pediu pausa</span>
                  ) : (
                    <button type="button" onClick={() => void toggle(s)} className="h-11 rounded-[10px] border border-control px-3.5 text-[13px] font-medium text-ink-2 hover:text-ink">
                      {s.health === "pausada_usuario" ? "Retomar" : "Pausar"}
                    </button>
                  )}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section aria-labelledby="sugeridas" className="flex flex-col gap-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="sugeridas" className="text-lg font-semibold tracking-tight">
              Lojas que apareceram e não são vigiadas
            </h2>
            <span className="text-[13px] text-muted">Domínio fora de config/stores.ts é suspeito: o app não abre a página nem mostra a oferta na Vitrine principal</span>
          </div>
          {data && data.suggested.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-control px-5 py-6 text-[13px] text-muted">Nenhuma loja fora da lista nas ofertas dos últimos 7 dias.</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {(data?.suggested ?? []).map((g) => (
                <article key={g.host} className="flex flex-col gap-2 rounded-2xl border border-card-line bg-surface p-5">
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="break-all font-mono text-sm">{g.host}</h3>
                    <span className="font-mono text-xs text-muted">{g.seen}x</span>
                  </div>
                  <p className="text-[13px] text-muted">
                    Apareceu {g.seen} {g.seen === 1 ? "vez" : "vezes"} nas ofertas desta semana. Para vigiar, a loja precisa entrar em config/stores.ts com o jeito de achar o ID do produto.
                  </p>
                </article>
              ))}
            </div>
          )}
        </section>

        <section aria-labelledby="regras" className="flex flex-col gap-3">
          <h2 id="regras" className="text-lg font-semibold tracking-tight">
            Regras de coleta educada
          </h2>
          <ul className="grid gap-2 text-[13px] text-ink-2 md:grid-cols-2 xl:grid-cols-5">
            {[
              "Lê o robots.txt antes de cada loja",
              "1 pedido a cada 5 a 10 s por loja",
              "Cache de 10 min na conferência",
              "Pausa de 1 h em 429 ou 403",
              "User-Agent fixo, sem proxy e sem driblar captcha",
            ].map((r) => (
              <li key={r} className="rounded-xl border border-card-line bg-surface px-4 py-3">
                {r}
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}
