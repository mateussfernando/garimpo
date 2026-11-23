"use client";

import type { Compensa } from "@/lib/preco";
import { Badge, brl } from "./shell";

/** "Pix compensa R$ X" ou "Parcelar compensa R$ X": estimativa pelo rendimento do dinheiro enquanto se paga em parcelas. */
export function CompensaLinha({ c }: { c: Compensa | null }) {
  if (!c) return null;
  const dica = `Estimativa: valor presente das parcelas (${brl(c.valorPresenteCents)}) com o dinheiro rendendo ${String(c.rendimentoPct).replace(".", ",")}% ao mês, contra o preço no Pix. Não conta cashback, milhas nem limite do cartão. O admin ajusta a taxa (app_settings "rendimento_mensal").`;
  return (
    <span className="flex flex-wrap items-center gap-2 text-[13px]" title={dica}>
      <Badge tone={c.melhor === "pix" ? "good" : "neutral"}>{c.melhor === "pix" ? "Pix compensa" : "Parcelar compensa"}</Badge>
      <span className="font-mono tnum text-ink-2">{brl(c.economiaCents)} a menos</span>
      <span className="text-xs text-muted">estimativa</span>
    </span>
  );
}
