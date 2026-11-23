"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { ehPrecoPref, type PrecoPref } from "@/lib/preco";
import { esquecerMe, useMe } from "./me";

// Qual preço fica em destaque (cartão ou Pix). Quem tem conta guarda no banco (usuarios.preco_preferido) e a escolha o
// segue em qualquer aparelho; o visitante guarda no navegador (localStorage). Ao entrar com uma conta sem escolha, a do
// navegador vai para a conta; conta que já escolheu manda no navegador.

const CHAVE = "garimpo:preco";
let atual: PrecoPref | null | undefined; // undefined = ainda não lido do navegador
let contaLogada = false;
const ouvintes = new Set<() => void>();

function lerLocal(): PrecoPref | null {
  try {
    const v = localStorage.getItem(CHAVE);
    return ehPrecoPref(v) ? v : null;
  } catch {
    return null; // navegador sem armazenamento: vale só nesta visita
  }
}
const snapshot = (): PrecoPref | null => (atual === undefined ? (atual = lerLocal()) : atual);
const avisar = () => ouvintes.forEach((f) => f());

function subscribe(f: () => void) {
  ouvintes.add(f);
  const outraAba = (e: StorageEvent) => {
    if (e.key !== CHAVE) return;
    atual = lerLocal();
    f();
  };
  window.addEventListener("storage", outraAba);
  return () => {
    ouvintes.delete(f);
    window.removeEventListener("storage", outraAba);
  };
}

function definirLocal(p: PrecoPref) {
  atual = p;
  try {
    localStorage.setItem(CHAVE, p);
  } catch {
    /* sem armazenamento: fica só na memória desta visita */
  }
  avisar();
}

function gravarNaConta(p: PrecoPref) {
  void fetch("/api/me", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ precoPreferido: p }) })
    .then(() => esquecerMe())
    .catch(() => undefined);
}

/** Muda o preço em destaque: na hora na tela e, se tem conta, no banco. */
export function definirPreco(p: PrecoPref) {
  definirLocal(p);
  if (contaLogada) gravarNaConta(p);
}

/** O preço em destaque (cartão até a pessoa escolher) e se ela já escolheu. */
export function usePreco(): { pref: PrecoPref; escolhido: boolean; definir: (p: PrecoPref) => void } {
  const v = useSyncExternalStore(subscribe, snapshot, () => null);
  return { pref: v ?? "cartao", escolhido: v != null, definir: definirPreco };
}

/** Junta a conta e o navegador (uma vez por carregamento). Não desenha nada. */
export function PrecoSync() {
  const me = useMe();
  useEffect(() => {
    if (!me || me.visitante) {
      contaLogada = false;
      return;
    }
    contaLogada = true;
    if (me.precoPreferido) {
      if (snapshot() !== me.precoPreferido) definirLocal(me.precoPreferido); // a conta manda
    } else {
      const local = snapshot();
      if (local) gravarNaConta(local); // a escolha do navegador vai para a conta nova
    }
  }, [me]);
  return null;
}

const OPCOES: { valor: PrecoPref; rotulo: string }[] = [
  { valor: "cartao", rotulo: "Cartão" },
  { valor: "pix", rotulo: "Pix" },
];

/** "Preço: Cartão | Pix" no cabeçalho. */
export function PrecoToggle() {
  const { pref, definir } = usePreco();
  return (
    <span role="group" aria-label="Preço em destaque" className="flex h-9 items-center gap-0.5 rounded-[10px] border border-control p-0.5 text-xs">
      <span className="px-1.5 text-label">Preço</span>
      {OPCOES.map((o) => (
        <button
          key={o.valor}
          type="button"
          aria-pressed={pref === o.valor}
          onClick={() => definir(o.valor)}
          className={`h-7 rounded-[8px] px-2.5 font-medium ${pref === o.valor ? "bg-active text-ink" : "text-ink-2 hover:text-ink"}`}
        >
          {o.rotulo}
        </button>
      ))}
    </span>
  );
}

/** Pergunta na primeira visita (sem escolha no navegador nem na conta). Fechar sem escolher fica no cartão. */
export function PrecoPopup() {
  const me = useMe();
  const { escolhido, definir } = usePreco();
  const ref = useRef<HTMLDialogElement>(null);
  const aberto = !!me && !escolhido && me.precoPreferido == null;
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (aberto && !d.open) d.showModal();
    if (!aberto && d.open) d.close();
  }, [aberto]);
  return (
    <dialog
      ref={ref}
      aria-labelledby="preco-titulo"
      onCancel={(e) => {
        e.preventDefault();
        definir("cartao");
      }}
      className="m-auto w-[min(92vw,26rem)] rounded-2xl border border-card-line bg-surface p-6 text-ink backdrop:bg-black/60"
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <h2 id="preco-titulo" className="text-lg font-semibold tracking-tight">
            Qual preço você quer ver em destaque?
          </h2>
          <p className="text-[13px] text-muted">Você pode trocar quando quiser no botão “Preço” do topo. A nota, o “Alvo atingido” e a comparação entre lojas seguem o preço que você escolher.</p>
        </div>
        <div className="flex flex-col gap-2">
          <button type="button" onClick={() => definir("cartao")} className="flex flex-col items-start gap-0.5 rounded-[12px] border border-control px-4 py-3 text-left hover:border-ink-3">
            <span className="text-[15px] font-semibold">No cartão</span>
            <span className="text-xs text-muted">O total parcelado, como o Garimpo sempre mostrou</span>
          </button>
          <button type="button" onClick={() => definir("pix")} className="flex flex-col items-start gap-0.5 rounded-[12px] border border-control px-4 py-3 text-left hover:border-ink-3">
            <span className="text-[15px] font-semibold">No Pix</span>
            <span className="text-xs text-muted">O preço à vista, quando a loja informa (senão mostra o do cartão)</span>
          </button>
        </div>
      </div>
    </dialog>
  );
}
