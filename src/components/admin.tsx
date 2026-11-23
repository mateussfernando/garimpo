"use client";

import { useCallback, useState } from "react";
import type { Permissao } from "@/config/permissoes";
import type { AdminCargoDTO, AdminDTO } from "@/lib/admin";
import { Badge, PageTitle, useLive, useMe } from "./shell";

async function send(url: string, method: string, body?: unknown): Promise<string | null> {
  const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  if (r.ok) return null;
  return ((await r.json().catch(() => null)) as { erro?: string } | null)?.erro ?? "não deu para salvar";
}

function Btn({ children, onClick, primary, danger, disabled }: { children: React.ReactNode; onClick?: () => void; primary?: boolean; danger?: boolean; disabled?: boolean }) {
  const tone = primary ? "border-ink bg-ink text-bg" : danger ? "border-bad-line text-bad" : "border-control text-ink-2 hover:text-ink";
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={`h-10 rounded-[10px] border px-3.5 text-[13px] font-medium disabled:opacity-50 ${tone}`}>
      {children}
    </button>
  );
}

function CargoEditor({ cargo, permissoes, onDone }: { cargo: AdminCargoDTO | null; permissoes: AdminDTO["permissoes"]; onDone: () => Promise<void> }) {
  const [nome, setNome] = useState(cargo?.nome ?? "");
  const [descricao, setDescricao] = useState(cargo?.descricao ?? "");
  const [marcadas, setMarcadas] = useState<Permissao[]>(cargo?.permissoes ?? ["ofertas.ver"]);
  const [erro, setErro] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const todas = !!cargo?.todas;
  const salvar = async () => {
    setBusy(true);
    const body = { nome, descricao: descricao || null, permissoes: marcadas };
    const e = cargo ? await send(`/api/admin/cargos/${cargo.id}`, "PATCH", { acao: "editar", ...body }) : await send("/api/admin/cargos", "POST", body);
    setBusy(false);
    setErro(e);
    if (!e) await onDone();
  };
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-ink-3 bg-surface p-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] uppercase tracking-[0.06em] text-label">Nome do cargo</span>
          <input value={nome} onChange={(e) => setNome(e.target.value)} maxLength={40} className="h-10 rounded-[10px] border border-control bg-bg px-3 text-sm outline-none focus:border-ink-3" />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] uppercase tracking-[0.06em] text-label">Descrição</span>
          <input value={descricao} onChange={(e) => setDescricao(e.target.value)} maxLength={200} className="h-10 rounded-[10px] border border-control bg-bg px-3 text-sm outline-none focus:border-ink-3" />
        </label>
      </div>
      <fieldset className="flex flex-col gap-1.5" disabled={todas}>
        <legend className="mb-1 text-[11px] uppercase tracking-[0.06em] text-label">{todas ? "Permissões (o administrador tem todas, sempre)" : "Permissões"}</legend>
        {permissoes.map((p) => (
          <label key={p.slug} className="flex items-start gap-2.5 text-[13px]">
            <input
              type="checkbox"
              checked={todas || marcadas.includes(p.slug)}
              onChange={(e) => setMarcadas(e.target.checked ? [...marcadas, p.slug] : marcadas.filter((x) => x !== p.slug))}
              className="mt-0.5 size-4 accent-[var(--color-ink)]"
            />
            <span>
              <span className="text-ink">{p.descricao}</span> <span className="font-mono text-[11px] text-ink-3">{p.slug}</span>
            </span>
          </label>
        ))}
      </fieldset>
      <div className="flex flex-wrap items-center gap-2">
        <Btn primary disabled={busy || nome.trim().length < 2} onClick={() => void salvar()}>
          {busy ? "Salvando…" : cargo ? "Salvar cargo" : "Criar cargo"}
        </Btn>
        <Btn onClick={() => void onDone()}>Cancelar</Btn>
        {erro && <span className="text-xs text-bad">{erro}</span>}
      </div>
    </div>
  );
}

export function Admin() {
  const [data, setData] = useState<AdminDTO | null>(null);
  const [editando, setEditando] = useState<number | "novo" | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const me = useMe();
  const load = useCallback(async () => {
    const r = await fetch("/api/admin", { cache: "no-store" });
    if (r.ok) setData(await r.json());
    else setErro(r.status === 403 ? "Esta tela é só para administradores." : "Não deu para carregar.");
  }, []);
  useLive(load);

  const trocarCargo = async (userId: number, cargoId: number) => {
    setErro(await send(`/api/admin/usuarios/${userId}`, "PATCH", { cargoId }));
    await load();
  };
  const trocarAtivo = async (userId: number, isActive: boolean) => {
    setErro(await send(`/api/admin/usuarios/${userId}`, "PATCH", { isActive }));
    await load();
  };
  const ativos = data?.usuarios.filter((u) => u.isActive).length ?? 0;
  const acaoCargo = async (url: string, method: string, body?: unknown) => {
    setErro(await send(url, method, body));
    await load();
  };
  const nomeCargo = (id: number | null) => data?.cargos.find((c) => c.id === (id ?? data.padraoId))?.nome ?? "—";

  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex flex-col gap-7">
        <PageTitle title="Usuários e cargos">
          Quem usa o Garimpo e o que cada cargo pode ver e fazer. Quem se cadastra entra no cargo padrão; só um administrador muda o cargo de alguém.
        </PageTitle>
        {erro && (
          <p role="alert" className="rounded-[10px] border border-bad-line px-3 py-2 text-sm text-bad">
            {erro}
          </p>
        )}

        <section aria-labelledby="usuarios" className="flex flex-col gap-3">
          <h2 id="usuarios" className="text-lg font-semibold tracking-tight">
            Usuários{" "}
            <span className="font-mono text-sm font-normal text-muted">
              {data ? (ativos === data.usuarios.length ? data.usuarios.length : `${ativos} ativos de ${data.usuarios.length}`) : ""}
            </span>
          </h2>
          <div role="table" aria-label="Usuários" className="overflow-x-auto rounded-2xl border border-card-line bg-surface">
            <div role="row" className="grid min-w-[780px] grid-cols-[0.5fr_1.4fr_1.6fr_0.8fr_0.9fr_1.2fr] gap-3 border-b border-line px-4 py-2.5 text-[11px] uppercase tracking-[0.06em] text-label">
              {["Ativo", "Nome", "E-mail", "Entra com", "Desde", "Cargo"].map((h) => (
                <span key={h} role="columnheader">
                  {h}
                </span>
              ))}
            </div>
            {(data?.usuarios ?? []).map((u) => (
              <div
                key={u.id}
                role="row"
                className={`grid min-w-[780px] grid-cols-[0.5fr_1.4fr_1.6fr_0.8fr_0.9fr_1.2fr] items-center gap-3 border-b border-line px-4 py-2 last:border-b-0 ${u.isActive ? "" : "opacity-55"}`}
              >
                <span role="cell" className="flex items-center">
                  {/* Desativada: não entra e os Alvos param; nada é apagado. A própria conta não se desativa. */}
                  <input
                    type="checkbox"
                    checked={u.isActive}
                    disabled={u.id === me?.id}
                    onChange={(e) => void trocarAtivo(u.id, e.target.checked)}
                    aria-label={`${u.isActive ? "Desativar" : "Ativar"} a conta de ${u.name}`}
                    title={u.id === me?.id ? "Você não pode desativar a sua própria conta" : u.isActive ? "Ativa: desmarque para desativar" : "Desativada: marque para ativar"}
                    className="h-4 w-4 cursor-pointer accent-[var(--color-ink)] disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </span>
                <span role="cell" className="truncate text-sm font-medium">
                  {u.name}
                  {!u.isActive && <span className="ml-2 text-[11px] font-normal text-muted">desativada</span>}
                </span>
                <span role="cell" className="truncate text-[13px] text-ink-2">
                  {u.email}
                </span>
                <span role="cell" className="text-xs text-muted">
                  {u.metodos.join(", ") || "—"}
                </span>
                <span role="cell" className="font-mono tnum text-xs text-muted">
                  {new Date(u.createdAt).toLocaleDateString("pt-BR")}
                </span>
                <span role="cell">
                  <select
                    value={u.cargoId ?? data?.padraoId ?? ""}
                    onChange={(e) => void trocarCargo(u.id, Number(e.target.value))}
                    aria-label={`Cargo de ${u.name}`}
                    className="h-9 w-full rounded-[10px] border border-control bg-bg px-2 text-[13px] text-ink outline-none"
                  >
                    {(data?.cargos ?? [])
                      .filter((c) => c.slug !== "visitante" && (c.isActive || c.id === (u.cargoId ?? data?.padraoId)))
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nome}
                          {c.isActive ? "" : " (desativado)"}
                        </option>
                      ))}
                  </select>
                </span>
              </div>
            ))}
            {data && data.usuarios.length === 0 && <p className="px-4 py-6 text-center text-[13px] text-muted">Ninguém cadastrado ainda.</p>}
          </div>
          {data && (
            <p className="text-xs text-muted">
              Sem cargo marcado, vale o padrão ({nomeCargo(null)}). Conta desativada não entra (nem com Google) e os Alvos dela param; nada dela é apagado.
            </p>
          )}
        </section>

        <section aria-labelledby="cargos" className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="cargos" className="text-lg font-semibold tracking-tight">
              Cargos
            </h2>
            {editando !== "novo" && <Btn onClick={() => setEditando("novo")}>Novo cargo</Btn>}
          </div>
          {editando === "novo" && data && (
            <CargoEditor
              cargo={null}
              permissoes={data.permissoes}
              onDone={async () => {
                setEditando(null);
                await load();
              }}
            />
          )}
          {(data?.cargos ?? []).map((c) =>
            editando === c.id && data ? (
              <CargoEditor
                key={c.id}
                cargo={c}
                permissoes={data.permissoes}
                onDone={async () => {
                  setEditando(null);
                  await load();
                }}
              />
            ) : (
              <article key={c.id} className={`flex flex-col gap-2 rounded-2xl border border-card-line bg-surface p-5 ${c.isActive ? "" : "opacity-60"}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex flex-col gap-1">
                    <h3 className="text-base font-semibold">{c.nome}</h3>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                      {c.todas && <Badge tone="neutral">Todas as permissões</Badge>}
                      {c.padrao && <Badge tone="good">Quem se cadastra</Badge>}
                      {c.sistema && <Badge tone="neutral">Do sistema</Badge>}
                      {!c.isActive && <Badge tone="neutral">Desativado</Badge>}
                      <span className="font-mono tnum">
                        {c.usuarios} {c.usuarios === 1 ? "pessoa" : "pessoas"}
                      </span>
                    </div>
                    {c.descricao && <p className="text-[13px] text-muted">{c.descricao}</p>}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {/* O admin e o cargo de quem se cadastra ficam sempre ativos. */}
                    <label className={`flex h-9 items-center gap-2 px-1 text-[13px] text-ink-2 ${c.todas || c.padrao ? "opacity-50" : "cursor-pointer"}`}>
                      <input
                        type="checkbox"
                        checked={c.isActive}
                        disabled={c.todas || c.padrao}
                        onChange={(e) => void acaoCargo(`/api/admin/cargos/${c.id}`, "PATCH", { acao: "ativo", isActive: e.target.checked })}
                        aria-label={`${c.isActive ? "Desativar" : "Ativar"} o cargo ${c.nome}`}
                        className="h-4 w-4 accent-[var(--color-ink)]"
                      />
                      Ativo
                    </label>
                    <Btn onClick={() => setEditando(c.id)}>Editar</Btn>
                    {!c.padrao && !c.todas && c.isActive && c.slug !== "visitante" && <Btn onClick={() => void acaoCargo(`/api/admin/cargos/${c.id}`, "PATCH", { acao: "padrao" })}>Usar para quem se cadastra</Btn>}
                    {!c.sistema && (
                      <Btn danger onClick={() => void acaoCargo(`/api/admin/cargos/${c.id}`, "DELETE")}>
                        Apagar
                      </Btn>
                    )}
                  </div>
                </div>
                {!c.todas && (
                  <ul className="flex flex-wrap gap-1.5">
                    {c.permissoes.map((p) => (
                      <li key={p} className="rounded-full bg-active px-2.5 py-1 font-mono text-[11px] text-ink-2">
                        {p}
                      </li>
                    ))}
                    {c.permissoes.length === 0 && <li className="text-xs text-muted">Nenhuma permissão.</li>}
                  </ul>
                )}
              </article>
            ),
          )}
        </section>
      </div>
    </div>
  );
}
