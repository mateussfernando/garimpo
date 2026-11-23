"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useMe } from "./me";

// Quem não tem conta vê a Vitrine, mas vigiar, descartar e os Alvos pedem conta. `pedirConta` abre o aviso de qualquer
// lugar; `useSeVisitante` é o atalho para as ações: devolve true (e abre o aviso) quando a pessoa é visitante.

export type MotivoConta = "vigiar" | "descartar" | "alvos";
export const TEXTO_MOTIVO: Record<MotivoConta, string> = {
  vigiar: "vigiar o preço das ofertas",
  descartar: "descartar ofertas",
  alvos: "criar os seus Alvos",
};
const EVENTO = "garimpo:pedir-conta";

export function pedirConta(motivo: MotivoConta) {
  window.dispatchEvent(new CustomEvent<MotivoConta>(EVENTO, { detail: motivo }));
}

/** `bloqueia("vigiar")` → true se for visitante (o aviso já abriu); false se pode seguir. */
export function useSeVisitante() {
  const me = useMe();
  return useCallback(
    (motivo: MotivoConta) => {
      if (!me?.visitante) return false;
      pedirConta(motivo);
      return true;
    },
    [me],
  );
}

export function AvisoConta() {
  const [pedido, setPedido] = useState<{ motivo: MotivoConta; de: string } | null>(null);
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const abrir = (e: Event) => setPedido({ motivo: (e as CustomEvent<MotivoConta>).detail, de: location.pathname + location.search });
    window.addEventListener(EVENTO, abrir);
    return () => window.removeEventListener(EVENTO, abrir);
  }, []);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (pedido && !d.open) d.showModal();
    if (!pedido && d.open) d.close();
  }, [pedido]);
  const destino = (modo: string) => `/entrar?modo=${modo}&motivo=${pedido?.motivo ?? ""}&de=${encodeURIComponent(pedido?.de ?? "/")}`;
  return (
    <dialog
      ref={ref}
      aria-labelledby="conta-titulo"
      onCancel={() => setPedido(null)}
      onClick={(e) => e.target === ref.current && setPedido(null)}
      className="m-auto w-[min(92vw,24rem)] rounded-2xl border border-card-line bg-surface p-6 text-ink backdrop:bg-black/60"
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <h2 id="conta-titulo" className="text-lg font-semibold tracking-tight">
            Crie uma conta para continuar
          </h2>
          <p className="text-[13px] text-muted">Para {pedido ? TEXTO_MOTIVO[pedido.motivo] : "isso"} é preciso ter uma conta. A Vitrine continua aberta para você olhar as ofertas.</p>
        </div>
        <div className="flex flex-col gap-2">
          <Link href={destino("criar")} className="flex h-11 items-center justify-center rounded-[10px] bg-ink text-sm font-semibold text-bg">
            Criar conta
          </Link>
          <Link href={destino("entrar")} className="flex h-11 items-center justify-center rounded-[10px] border border-control text-sm font-medium text-ink-2 hover:text-ink">
            Já tenho conta: entrar
          </Link>
          <button type="button" onClick={() => setPedido(null)} className="h-9 text-[13px] text-muted hover:text-ink-2">
            Agora não
          </button>
        </div>
      </div>
    </dialog>
  );
}
