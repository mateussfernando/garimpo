"use client";

import { useEffect, useState } from "react";
import type { PrecoPref } from "@/lib/preco";
import { useMe } from "./me";

/**
 * "Essa nota fez sentido?": 👍 ou 👎, para a nota ficar mais certeira com o tempo (o voto guarda a nota e o preço que estavam
 * na tela). Só para quem tem conta; clicar de novo no mesmo botão tira o voto.
 */
export function VotoNota({ offerId, nota, pref }: { offerId: number; nota: number | null; pref: PrecoPref }) {
  const me = useMe();
  const [voto, setVoto] = useState<1 | -1 | null>(null);
  const [erro, setErro] = useState(false);
  const logado = !!me && !me.visitante;

  useEffect(() => {
    if (!logado) return;
    let vivo = true;
    fetch(`/api/offers/${offerId}/feedback`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { voto: 1 | -1 | null } | null) => {
        if (vivo) setVoto(j?.voto ?? null);
      })
      .catch(() => undefined);
    return () => {
      vivo = false;
    };
  }, [offerId, logado]);

  if (!logado) return null;

  async function votar(novo: 1 | -1) {
    const anterior = voto;
    const tirar = anterior === novo;
    setVoto(tirar ? null : novo);
    setErro(false);
    try {
      const r = await fetch(`/api/offers/${offerId}/feedback`, {
        method: tirar ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: tirar ? undefined : JSON.stringify({ voto: novo, notaMostrada: nota, preco: pref }),
      });
      if (!r.ok) throw new Error(String(r.status));
    } catch {
      setVoto(anterior);
      setErro(true);
    }
  }

  const botao = (v: 1 | -1, rotulo: string, aria: string) => (
    <button
      type="button"
      aria-pressed={voto === v}
      aria-label={aria}
      onClick={() => void votar(v)}
      className={`h-8 rounded-[10px] border px-3 text-[13px] ${voto === v ? "border-ink bg-pill text-ink" : "border-control text-ink-2 hover:text-ink"}`}
    >
      {rotulo}
    </button>
  );

  return (
    <div className="flex flex-wrap items-center gap-2 text-[13px] text-ink-2">
      <span>Essa nota fez sentido?</span>
      {botao(1, "👍 Sim", "A nota fez sentido")}
      {botao(-1, "👎 Não", "A nota não fez sentido")}
      {erro && <span className="text-xs text-bad">não deu para salvar</span>}
    </div>
  );
}
