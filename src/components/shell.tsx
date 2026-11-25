"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Permissao } from "@/config/permissoes";
import { authClient } from "@/lib/auth-client";
import { pedirEntrar } from "./entrar-evento";
import type { StatusDTO } from "@/lib/offers";
import { obterMe, podeVer, useMe } from "./me";
import { Logo } from "./logo";
import { PrecoToggle } from "./preco";
import { TemaToggle } from "./tema";

export const brl = (cents: number | null | undefined) =>
  cents == null ? "—" : (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// Black Friday de 2026: sexta, 27/11, o dia inteiro (horário de Brasília).
export const BF_INICIO = new Date("2026-11-27T00:00:00-03:00").getTime();
export const BF_FIM = new Date("2026-11-28T00:00:00-03:00").getTime();

export function useNow(everyMs: number) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const first = setTimeout(() => setNow(Date.now()), 0);
    const t = setInterval(() => setNow(Date.now()), everyMs);
    return () => {
      clearTimeout(first);
      clearInterval(t);
    };
  }, [everyMs]);
  return now;
}

/** Selo do cabeçalho: quanto falta para a Black Friday, "ao vivo" no dia e nada depois. */
export function BlackFriday({ sempre = false }: { sempre?: boolean } = {}) {
  const now = useNow(1000);
  if (now == null || now >= BF_FIM) return null;
  const p = (n: number) => String(n).padStart(2, "0");
  let texto: string;
  if (now >= BF_INICIO) texto = "ao vivo";
  else {
    const s = Math.floor((BF_INICIO - now) / 1000);
    const d = Math.floor(s / 86400);
    texto = d >= 1 ? `em ${d}d ${Math.floor((s % 86400) / 3600)}h` : `em ${p(Math.floor(s / 3600))}:${p(Math.floor((s % 3600) / 60))}:${p(s % 60)}`;
  }
  return (
    <span className={`${sempre ? "flex w-fit" : "hidden lg:flex"} h-9 items-center gap-2 rounded-full border border-control bg-pill px-3 text-xs text-ink-2`} title="Black Friday: sexta, 27 de novembro">
      <span className="font-semibold text-ink">Black Friday</span>
      <span className="font-mono tnum">{texto}</span>
    </span>
  );
}

export function ago(iso: string | null, now: number | null) {
  if (!iso || now == null) return "";
  const min = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60000));
  return min < 1 ? "agora" : min < 60 ? `há ${min} min` : min < 1440 ? `há ${Math.round(min / 60)} h` : `há ${Math.round(min / 1440)} d`;
}

const DATA_HORA = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

/** "23/11 às 14:32", no horário de Brasília. */
export function dataHora(iso: string | null): string {
  if (!iso) return "";
  const partes = Object.fromEntries(DATA_HORA.formatToParts(new Date(iso)).map((p) => [p.type, p.value]));
  return `${partes.day}/${partes.month} às ${partes.hour}:${partes.minute}`;
}

export type Tone = "gold" | "good" | "bad" | "neutral";
export function Badge({ tone, children, title }: { tone: Tone; children: React.ReactNode; title?: string }) {
  const cls = {
    gold: "bg-gold text-on-gold font-semibold",
    good: "text-good bg-good-bg border border-good-line",
    bad: "text-bad bg-bad-bg border border-bad-line",
    neutral: "text-ink-2 bg-active border border-control",
  }[tone];
  return (
    <span title={title} className={`inline-flex h-6 items-center rounded-full px-2.5 text-xs font-medium ${cls}`}>
      {children}
    </span>
  );
}

export const statusDot: Record<string, string> = { ok: "bg-good-dot", pausada: "bg-pause", bloqueada: "bg-label", erro: "bg-bad" };

/** Carrega dados e recarrega sozinho quando o worker avisa por SSE (pg_notify). */
export function useLive(load: () => Promise<void>) {
  const [live, setLive] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadRef = useRef(load);
  useEffect(() => {
    loadRef.current = load;
  }, [load]);
  // Quando o que a tela pede muda (o preço em destaque, o id), busca de novo na hora; a primeira busca é a de baixo.
  const primeiraBusca = useRef(true);
  useEffect(() => {
    if (primeiraBusca.current) {
      primeiraBusca.current = false;
      return;
    }
    void load();
  }, [load]);
  useEffect(() => {
    const first = setTimeout(() => void loadRef.current(), 0);
    let es: EventSource | null = null;
    let poll: ReturnType<typeof setInterval> | null = null;
    let fechou = false;
    void obterMe().then((me) => {
      if (fechou) return;
      if (me?.visitante) {
        // Visitante (sem conta): sem conexão ao vivo; confere de novo a cada 30 s.
        setLive(true);
        poll = setInterval(() => void loadRef.current(), 30_000);
        return;
      }
      es = new EventSource("/api/stream");
      // A cada (re)conexão, recarrega: pode ter perdido avisos enquanto caiu.
      es.addEventListener("ready", () => {
        setLive(true);
        void loadRef.current();
      });
      es.onmessage = () => {
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => void loadRef.current(), 400);
      };
      es.onerror = () => setLive(false);
    });
    return () => {
      fechou = true;
      clearTimeout(first);
      if (timer.current) clearTimeout(timer.current);
      if (poll) clearInterval(poll);
      es?.close();
    };
  }, []);
  return live;
}

/** Status do cabeçalho (fontes, IA, fila), atualizado ao vivo. */
export function useStatus() {
  const [status, setStatus] = useState<StatusDTO | null>(null);
  const load = useCallback(async () => {
    setStatus(await fetch("/api/status", { cache: "no-store" }).then((r) => r.json()));
  }, []);
  const live = useLive(load);
  return { status, live, reload: load };
}

// Cada item diz a permissão que precisa. O menu só esconde; quem barra de verdade são as rotas (exigir()).
// Menu enxuto para todos; o que é de administração mora na área Admin (/admin), aberta pelo menu da conta.
const NAV = [
  { key: "vitrine", href: "/", label: "Vitrine", perm: "ofertas.ver" },
  { key: "cupons", href: "/cupons", label: "Cupons", perm: "ofertas.ver" },
  { key: "alvos", href: "/alvos", label: "Alvos", perm: "alvos.proprios" },
] as const satisfies readonly { key: string; href: string; label: string; perm: Permissao }[];
export type NavKey = (typeof NAV)[number]["key"] | "war-room" | "admin";

/** Qualquer uma destas abre a área Admin no menu da conta. */
export const PERMISSOES_ADMIN: Permissao[] = ["sistema.ver", "fontes.gerenciar", "lojas.gerenciar", "ia.gerenciar", "usuarios.gerenciar"];

// Quem sou e o que posso (src/components/me.ts); reexportado aqui porque as telas já importam daqui.
export { podeVer, useMe, type Me } from "./me";

export function Metric({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] uppercase tracking-[0.06em] text-label">{label}</span>
      {children}
    </div>
  );
}

const usd = (v: number) => `US$ ${v.toFixed(v < 1 ? 4 : 2).replace(".", ",")}`;
const at = (ms: number | null) =>
  ms ? new Date(ms).toLocaleString("pt-BR", { weekday: "short", hour: "2-digit", minute: "2-digit" }) : "—";

/** Barra de uso da assinatura (janela de 5 h ou semanal). Vermelha a partir de 80%. */
function UsageBar({ label, w }: { label: string; w: { pct: number; resetsAt: number | null } | null }) {
  const pct = w ? Math.min(100, w.pct) : 0;
  return (
    <span className="flex items-center gap-2" title={w ? `${label}: ${w.pct}% usado · zera ${at(w.resetsAt)}` : `${label}: aparece depois da primeira chamada`}>
      <span className="w-12 text-[11px] text-label">{label}</span>
      <span className="block h-1.5 w-24 overflow-hidden rounded-full bg-active" aria-hidden="true">
        <span className={`block h-full ${pct >= 80 ? "bg-bad" : pct >= 50 ? "bg-pause" : "bg-ink-3"}`} style={{ width: `${pct}%` }} />
      </span>
      <span className="w-11 font-mono tnum text-xs text-ink-2">{w ? `${w.pct.toLocaleString("pt-BR")}%` : "—"}</span>
    </span>
  );
}

type AiChoice = NonNullable<StatusDTO["ai"]>["choice"];
/** Quem trabalha na IA. O agy é o Antigravity CLI (Gemini 3.8 Flash Low), pela conta do Antigravity. */
export const AI_CHOICE_LABEL: Record<AiChoice, string> = { claude: "Claude", agy: "agy (Antigravity)", ambos: "Claude + agy" };

/** IA no cabeçalho: qual IA, custo, uso da assinatura (5 h e semana), Pausar/Continuar e Chamar IA agora. */
export function AiControls({ ai }: { ai: StatusDTO["ai"] | null }) {
  const [busy, setBusy] = useState<string | null>(null);
  const send = async (acao: "pausar" | "continuar" | "rodar" | "provedor", modo?: AiChoice) => {
    setBusy(acao);
    try {
      await fetch("/api/ia", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ acao, modo }) });
    } finally {
      setTimeout(() => setBusy(null), 1200);
    }
  };
  const agyToday = ai?.callsTodayBy.agy ?? 0;
  const running = ai?.run?.running === true;
  const btn = "flex h-9 items-center gap-1.5 rounded-[10px] border border-control px-3 text-xs font-medium text-ink-2 hover:text-ink disabled:opacity-50";
  return (
    <div className="flex flex-col gap-1">
      <span className="flex items-center gap-2 text-[11px] uppercase tracking-[0.06em] text-label">
        IA
        {ai?.paused ? (
          <span className="rounded-full bg-pause-bg px-2 normal-case tracking-normal text-pause">pausada</span>
        ) : running ? (
          <span className="normal-case tracking-normal text-good">trabalhando…</span>
        ) : null}
      </span>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
        <span className="flex flex-col gap-1">
          <UsageBar label="5 horas" w={ai?.limits?.fiveHour ?? null} />
          <UsageBar label="Semana" w={ai?.limits?.sevenDay ?? null} />
        </span>
        <span
          className="flex flex-col font-mono tnum text-xs text-ink-2"
          title={ai ? `Claude: ${ai.provider} · claude-haiku-5-5 · ${ai.callsTodayBy[ai.provider] ?? 0} chamadas hoje
agy: gemini-3.8-flash-low · ${agyToday} chamadas hoje, pela conta do Antigravity (sem custo nem cota informados)` : undefined}
        >
          <span>{ai ? usd(ai.spentTodayUsd) : "—"} <span className="font-sans text-label">hoje</span></span>
          <span>{ai ? usd(ai.spentUsd) : "—"} <span className="font-sans text-label">total</span></span>
          {ai && ai.choice !== "claude" && (
            <span>
              {agyToday} <span className="font-sans text-label">no agy hoje</span>
            </span>
          )}
        </span>
        <label className="flex h-9 items-center gap-1.5 rounded-[10px] border border-control pl-2.5 pr-1 text-xs text-ink-2 focus-within:border-ink-3" title="Quem faz as análises, categorias, radar e insights. Com os dois, as análises rodam em pistas do Claude e do agy ao mesmo tempo; o freio de 85% da janela de 5 h para só o Claude.">
          <span className="text-label">Usar</span>
          <select
            value={ai?.choice ?? "claude"}
            disabled={!ai || busy === "provedor"}
            onChange={(e) => void send("provedor", e.target.value as AiChoice)}
            aria-label="Qual IA usar"
            className="h-8 cursor-pointer rounded-md bg-transparent pr-1 font-medium text-ink outline-none disabled:opacity-50"
          >
            {(Object.keys(AI_CHOICE_LABEL) as AiChoice[]).map((k) => (
              <option key={k} value={k} className="bg-surface text-ink">
                {AI_CHOICE_LABEL[k]}
              </option>
            ))}
          </select>
        </label>
        <span className="flex gap-1.5">
          <button type="button" onClick={() => void send(ai?.paused ? "continuar" : "pausar")} disabled={!ai || busy != null} className={btn} aria-pressed={ai?.paused}>
            {ai?.paused ? "▶ Continuar" : "❚❚ Pausar"}
          </button>
          <button type="button" onClick={() => void send("rodar")} disabled={!ai || ai.paused || running || busy != null} className={btn} title="Categorias, análises e radar agora, sem esperar o próximo ciclo">
            {running || busy === "rodar" ? "Chamando…" : "✦ Chamar IA agora"}
          </button>
        </span>
      </div>
    </div>
  );
}

/**
 * Pausar/Continuar a coleta nos sites (comunidades, vitrines, fontes configuráveis e conferência nas lojas).
 * O Telegram continua escutando; o que chega fica "conferindo" até a coleta voltar. Botão só para quem gerencia as fontes.
 */
export function ColetaControl({ coleta, onChange }: { coleta: StatusDTO["coleta"] | undefined; onChange?: () => void }) {
  const me = useMe();
  const now = useNow(30_000);
  const [busy, setBusy] = useState(false);
  if (!coleta) return null;
  const pode = podeVer(me, "fontes.gerenciar");
  const send = async () => {
    setBusy(true);
    try {
      await fetch("/api/coleta", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ acao: coleta.paused ? "continuar" : "pausar" }) });
      onChange?.();
    } finally {
      setTimeout(() => setBusy(false), 800);
    }
  };
  return (
    <span className="flex flex-wrap items-center gap-2.5 text-[13px]">
      <span className="flex items-center gap-1.5 text-ink-2" title="Comunidades (Pelando, Promobit, Hardmob), vitrines das lojas, fontes configuráveis e a conferência de preço nas lojas">
        <span className={`h-2 w-2 rounded-full ${coleta.paused ? "bg-pause" : "bg-good-dot"}`} />
        {coleta.paused ? (
          <span className="text-pause">Coleta pausada{coleta.since ? ` ${ago(coleta.since, now)}` : ""}</span>
        ) : (
          "Coleta nos sites ligada"
        )}
      </span>
      {pode && (
        <button
          type="button"
          onClick={() => void send()}
          disabled={busy}
          aria-pressed={coleta.paused}
          title={
            coleta.paused
              ? "Volta a ler as comunidades, vitrines e fontes, e confere o que ficou esperando"
              : "Para de abrir sites: comunidades, vitrines, fontes configuráveis e conferência nas lojas. O Telegram continua escutando e o que chegar fica “conferindo” até você continuar."
          }
          className={`flex h-9 items-center gap-1.5 rounded-[10px] border px-3 text-xs font-medium disabled:opacity-50 ${coleta.paused ? "border-ink bg-ink text-bg" : "border-control text-ink-2 hover:text-ink"}`}
        >
          {coleta.paused ? "▶ Continuar coleta" : "❚❚ Pausar coleta"}
        </button>
      )}
    </span>
  );
}

/** Menu da conta: nome, tema, área Admin (para quem administra) e Sair. Visitante: tema, Entrar e Criar conta. */
function UserMenu() {
  const { data, isPending } = authClient.useSession();
  const me = useMe();
  const router = useRouter();
  const [saindo, setSaindo] = useState(false);
  const [aberto, setAberto] = useState(false);
  const caixa = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!aberto) return;
    const fora = (e: MouseEvent) => {
      if (caixa.current && !caixa.current.contains(e.target as Node)) setAberto(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setAberto(false);
    document.addEventListener("mousedown", fora);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", fora);
      document.removeEventListener("keydown", esc);
    };
  }, [aberto]);
  if (isPending) return null;
  const admin = PERMISSOES_ADMIN.some((p) => podeVer(me, p));
  // A primeira aba da área Admin que a pessoa pode abrir (o Painel pede "sistema.ver").
  const destinoAdmin = podeVer(me, "sistema.ver") ? "/admin" : podeVer(me, "fontes.gerenciar") ? "/admin/fontes" : podeVer(me, "lojas.gerenciar") ? "/admin/lojas" : podeVer(me, "ia.gerenciar") ? "/admin/ia" : "/admin/usuarios";
  const sair = async () => {
    setSaindo(true);
    await authClient.signOut();
    router.replace("/");
    router.refresh();
  };
  const nome = data?.user.name ?? "";
  return (
    <div ref={caixa} className="relative flex items-center gap-2 text-[13px]">
      {!data && (
        <>
          <button type="button" onClick={() => pedirEntrar({ modo: "entrar", de: location.pathname + location.search })} className="flex h-9 items-center rounded-[10px] border border-control px-3 text-xs font-medium text-ink-2 hover:text-ink">
            Entrar
          </button>
          <button type="button" onClick={() => pedirEntrar({ modo: "criar", de: location.pathname + location.search })} className="hidden h-9 items-center rounded-[10px] bg-ink px-3 text-xs font-semibold text-bg sm:flex">
            Criar conta
          </button>
        </>
      )}
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={aberto}
        onClick={() => setAberto((a) => !a)}
        title={data ? data.user.email : "Tema"}
        aria-label={data ? `Conta de ${nome}` : "Tema"}
        className={`${data ? "flex" : "hidden sm:flex"} h-9 items-center gap-2 rounded-full border border-control p-1 text-ink-2 hover:text-ink sm:pr-2.5`}
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-active text-xs font-semibold text-ink" aria-hidden="true">
          {data ? (nome.trim()[0] ?? "?").toUpperCase() : "◐"}
        </span>
        {data && <span className="hidden max-w-32 truncate lg:inline">{nome}</span>}
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" className="hidden sm:block">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {aberto && (
        <div role="menu" className="absolute right-0 top-11 z-50 flex w-64 flex-col gap-3 rounded-2xl border border-card-line bg-surface p-3 shadow-xl">
          {data && (
            <div className="flex flex-col px-1">
              <span className="truncate text-sm font-medium text-ink">{nome}</span>
              <span className="truncate text-xs text-muted">{data.user.email}</span>
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <span className="px-1 text-[11px] uppercase tracking-[0.06em] text-label">Tema</span>
            <TemaToggle />
          </div>
          {admin && (
            <Link href={destinoAdmin} role="menuitem" onClick={() => setAberto(false)} className="flex h-10 items-center rounded-[10px] px-2 text-sm text-ink-2 hover:bg-active hover:text-ink">
              Admin e estatísticas
            </Link>
          )}
          {data && (
            <button type="button" role="menuitem" onClick={() => void sair()} disabled={saindo} className="flex h-10 items-center rounded-[10px] px-2 text-left text-sm text-ink-2 hover:bg-active hover:text-ink disabled:opacity-50">
              {saindo ? "Saindo…" : "Sair"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// Ícones de traço do menu do celular (mesmo traço do logo e dos ícones do site).
const ICONE_NAV: Record<string, React.ReactNode> = {
  vitrine: <path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" />,
  cupons: <path d="M3 7h18v3a2 2 0 0 0 0 4v3H3v-3a2 2 0 0 0 0-4zM14 7v10" />,
  alvos: (
    <>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="12" cy="12" r=".8" />
    </>
  ),
  "war-room": <path d="M13 3 5 13h6l-1 8 8-10h-6z" />,
  admin: <path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0M14 4v4M8 10v4M16 16v4" />,
};
const IconeNav = ({ k }: { k: string }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="flex-none">
    {ICONE_NAV[k]}
  </svg>
);

/**
 * Menu hambúrguer do celular (abaixo de 640 px): uma gaveta que entra pela esquerda, com as seções, o modo decisão,
 * a área Admin, o preço em destaque, o tema e a conta. No computador o cabeçalho mostra tudo e este botão some.
 */
function MenuCelular({ active }: { active: NavKey | null }) {
  const { data } = authClient.useSession();
  const me = useMe();
  const router = useRouter();
  const ref = useRef<HTMLDialogElement>(null);
  const [saindo, setSaindo] = useState(false);
  const abrir = () => ref.current?.showModal();
  const fechar = () => ref.current?.close();
  const admin = PERMISSOES_ADMIN.some((p) => podeVer(me, p));
  const destinoAdmin = podeVer(me, "sistema.ver") ? "/admin" : podeVer(me, "fontes.gerenciar") ? "/admin/fontes" : podeVer(me, "lojas.gerenciar") ? "/admin/lojas" : podeVer(me, "ia.gerenciar") ? "/admin/ia" : "/admin/usuarios";
  const itens: { key: string; href: string; label: string }[] = [
    ...NAV.filter((n) => podeVer(me, n.perm) || (me?.visitante && n.key === "alvos")),
    ...(data ? [{ key: "war-room", href: "/war-room", label: "Modo decisão" }] : []),
    ...(admin ? [{ key: "admin", href: destinoAdmin, label: "Admin e estatísticas" }] : []),
  ];
  const sair = async () => {
    setSaindo(true);
    await authClient.signOut();
    fechar();
    router.replace("/");
    router.refresh();
  };
  const nome = data?.user.name ?? "";
  return (
    <>
      <button type="button" onClick={abrir} aria-label="Abrir o menu" aria-haspopup="dialog" className="-ml-1.5 flex h-10 w-10 flex-none items-center justify-center rounded-[10px] text-ink hover:bg-active sm:hidden">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M4 7h16M4 12h16M4 17h10" />
        </svg>
      </button>
      <dialog
        ref={ref}
        aria-label="Menu"
        onClick={(e) => e.target === ref.current && fechar()}
        className="gaveta fixed inset-y-0 left-0 m-0 h-dvh max-h-none w-[min(86vw,340px)] max-w-none border-r border-card-line bg-surface p-0 text-ink"
      >
        <div className="flex h-full flex-col gap-5 overflow-y-auto px-4 pb-[max(20px,env(safe-area-inset-bottom))] pt-[max(12px,env(safe-area-inset-top))]">
          <div className="flex items-center justify-between">
            <Link href="/" onClick={fechar} className="flex items-center gap-2 text-lg font-semibold tracking-tight">
              <Logo size={24} />
              Garimpo
            </Link>
            <button type="button" onClick={fechar} aria-label="Fechar o menu" className="-mr-1.5 flex h-10 w-10 items-center justify-center rounded-[10px] text-ink-2 hover:bg-active hover:text-ink">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>

          {data && (
            <div className="flex items-center gap-3 rounded-2xl bg-deep p-3">
              <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-active text-sm font-semibold" aria-hidden="true">
                {(nome.trim()[0] ?? "?").toUpperCase()}
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-sm font-medium">{nome}</span>
                <span className="truncate text-xs text-muted">{data.user.email}</span>
              </span>
            </div>
          )}

          <nav aria-label="Seções do app" className="flex flex-col gap-1">
            {itens.map((n) => {
              const on = active === n.key;
              return (
                <Link
                  key={n.key}
                  href={n.href}
                  onClick={fechar}
                  aria-current={on ? "page" : undefined}
                  className={`flex min-h-12 items-center gap-3 rounded-xl px-3 text-[15px] font-medium ${on ? "bg-active text-ink" : "text-ink-2 hover:bg-active hover:text-ink"}`}
                >
                  <IconeNav k={n.key} />
                  {n.label}
                  {on && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-gold" aria-hidden="true" />}
                </Link>
              );
            })}
          </nav>

          <div className="flex flex-col gap-4 border-t border-line pt-5">
            <div className="flex flex-col gap-2">
              <span className="text-[11px] uppercase tracking-[0.06em] text-label">Preço em destaque</span>
              <PrecoToggle />
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-[11px] uppercase tracking-[0.06em] text-label">Tema</span>
              <TemaToggle />
            </div>
            <BlackFriday sempre />
          </div>

          <div className="mt-auto flex flex-col gap-2 border-t border-line pt-5">
            {data ? (
              <button type="button" onClick={() => void sair()} disabled={saindo} className="flex h-12 items-center justify-center rounded-xl border border-control text-sm font-medium text-ink-2 hover:text-ink disabled:opacity-50">
                {saindo ? "Saindo…" : "Sair da conta"}
              </button>
            ) : (
              <>
                <button type="button" onClick={() => { fechar(); pedirEntrar({ modo: "criar", de: location.pathname + location.search }); }} className="flex h-12 items-center justify-center rounded-xl bg-ink text-sm font-semibold text-bg">
                  Criar conta
                </button>
                <button type="button" onClick={() => { fechar(); pedirEntrar({ modo: "entrar", de: location.pathname + location.search }); }} className="flex h-12 items-center justify-center rounded-xl border border-control text-sm font-medium text-ink-2 hover:text-ink">
                  Entrar
                </button>
              </>
            )}
          </div>
        </div>
      </dialog>
    </>
  );
}

/**
 * Cabeçalho de todas as telas: marca, menu curto, Black Friday, ponto "ao vivo", preço em destaque e a conta.
 * Fica preso no topo e numa linha só. No celular vira cara de app: hambúrguer, marca e a conta; o resto mora na gaveta.
 */
export function AppHeader({ active, live }: { active: NavKey | null; status?: StatusDTO | null; live: boolean }) {
  const me = useMe();
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-bg/80 backdrop-blur-md">
      <div className="flex items-center gap-x-3 px-4 py-2 sm:px-8">
        <MenuCelular active={active} />
        <Link href="/" className="flex flex-none items-center gap-2 text-lg font-semibold tracking-tight">
          <Logo size={24} />
          Garimpo
        </Link>
        <nav aria-label="Seções do app" className="ml-4 hidden gap-1 text-sm font-medium sm:flex">
          {NAV.filter((n) => podeVer(me, n.perm) || (me?.visitante && n.key === "alvos")).map((n) => (
            <Link
              key={n.key}
              href={n.href}
              aria-current={active === n.key ? "page" : undefined}
              className={`flex min-h-11 flex-none items-center rounded-[10px] px-3.5 ${active === n.key ? "bg-active text-ink" : "text-ink-2 hover:text-ink"}`}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <span className="ml-auto flex flex-none items-center gap-1.5 sm:gap-2.5">
          <BlackFriday />
          <span className="hidden h-9 w-5 items-center justify-center sm:flex" title={live ? "Ao vivo: as ofertas chegam sozinhas" : "Reconectando…"} role="status" aria-label={live ? "Ao vivo" : "Reconectando"}>
            <span className={`h-2 w-2 rounded-full ${live ? "bg-good-dot shadow-[0_0_0_3px_var(--color-good-bg)]" : "bg-pause"}`} />
          </span>
          <span className="hidden sm:flex">
            <PrecoToggle />
          </span>
          <UserMenu />
        </span>
      </div>
    </header>
  );
}

export function PageTitle({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <h1 className="text-[30px] font-semibold tracking-tight">{title}</h1>
      {children && <p className="max-w-3xl text-sm text-muted">{children}</p>}
    </div>
  );
}

export function Kbd({ children }: { children: React.ReactNode }) {
  return <kbd className="rounded-md border border-control px-1.5 py-0.5 font-mono text-[11px] text-ink-2">{children}</kbd>;
}
