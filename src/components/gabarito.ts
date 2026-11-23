"use client";

// O gabarito da nota (src/lib/nota.ts): o que a pessoa faz diz se a nota acertou. Só conta; o visitante nunca é registrado.
import { obterMe } from "./me";

/** Avisa que a conta clicou em Comprar numa oferta. Não espera resposta nem atrapalha a abertura da loja. */
export function registrarClique(offerId: number) {
  void obterMe()
    .then((me) => {
      if (!me || me.visitante) return;
      return fetch(`/api/offers/${offerId}/clique`, { method: "POST", keepalive: true });
    })
    .catch(() => undefined);
}
