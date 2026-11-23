"use client";

import { useEffect, useSyncExternalStore } from "react";
import { CHAVE_TEMA, ehTema, temaEfetivo, type Tema } from "@/lib/tema";

// Claro, escuro ou o do sistema. Mesmo padrão do preço em destaque (preco.tsx): guarda no navegador e avisa quem ouve.

let atual: Tema | undefined;
const ouvintes = new Set<() => void>();

function lerLocal(): Tema {
  try {
    const v = localStorage.getItem(CHAVE_TEMA);
    return ehTema(v) ? v : "sistema";
  } catch {
    return "sistema"; // navegador sem armazenamento: segue o sistema
  }
}

const sistemaEscuro = () => window.matchMedia("(prefers-color-scheme: dark)").matches;

/** Põe o tema na página (data-theme e color-scheme). */
function aplicar(t: Tema) {
  const e = temaEfetivo(t, sistemaEscuro()) === "escuro";
  const d = document.documentElement;
  d.dataset.theme = e ? "dark" : "light";
  d.style.colorScheme = e ? "dark" : "light";
}

const snapshot = (): Tema => (atual ??= lerLocal());

function subscribe(f: () => void) {
  ouvintes.add(f);
  const outraAba = (e: StorageEvent) => {
    if (e.key !== CHAVE_TEMA) return;
    atual = lerLocal();
    aplicar(atual);
    f();
  };
  window.addEventListener("storage", outraAba);
  return () => {
    ouvintes.delete(f);
    window.removeEventListener("storage", outraAba);
  };
}

export function definirTema(t: Tema) {
  atual = t;
  try {
    localStorage.setItem(CHAVE_TEMA, t);
  } catch {
    /* sem armazenamento: vale só nesta visita */
  }
  aplicar(t);
  ouvintes.forEach((f) => f());
}

export function useTema(): Tema {
  return useSyncExternalStore(subscribe, snapshot, () => "sistema");
}

/** Segue a troca de claro/escuro do aparelho quando a escolha é "sistema". Não desenha nada. */
export function TemaSync() {
  const tema = useTema();
  useEffect(() => {
    aplicar(tema);
    if (tema !== "sistema") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const mudou = () => aplicar("sistema");
    mq.addEventListener("change", mudou);
    return () => mq.removeEventListener("change", mudou);
  }, [tema]);
  return null;
}

const OPCOES: { valor: Tema; rotulo: string; icone: React.ReactNode }[] = [
  {
    valor: "claro",
    rotulo: "Claro",
    icone: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </svg>
    ),
  },
  {
    valor: "escuro",
    rotulo: "Escuro",
    icone: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
      </svg>
    ),
  },
  {
    valor: "sistema",
    rotulo: "Sistema",
    icone: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="4" width="18" height="12" rx="2" />
        <path d="M8 20h8M12 16v4" />
      </svg>
    ),
  },
];

/** Claro / Escuro / Sistema, em três botões. */
export function TemaToggle() {
  const tema = useTema();
  return (
    <div role="radiogroup" aria-label="Tema" className="grid grid-cols-3 gap-1 rounded-[10px] border border-control p-1 text-xs">
      {OPCOES.map((o) => (
        <button
          key={o.valor}
          type="button"
          role="radio"
          aria-checked={tema === o.valor}
          onClick={() => definirTema(o.valor)}
          className={`flex h-8 items-center justify-center gap-1.5 rounded-[7px] px-2 font-medium ${tema === o.valor ? "bg-active text-ink" : "text-ink-2 hover:text-ink"}`}
        >
          {o.icone}
          {o.rotulo}
        </button>
      ))}
    </div>
  );
}
