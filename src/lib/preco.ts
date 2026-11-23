// Preço em destaque: cartão (o padrão do app) ou Pix. Vale para o que se vê, para a nota (o A é refeito pelo Pix), para o
// "Alvo atingido" exibido e para a comparação entre lojas. Os avisos "Alvo atingido" que o worker grava seguem o cartão.
// Sem acesso a banco nem a navegador (testável).

export type PrecoPref = "cartao" | "pix";
export const ehPrecoPref = (v: unknown): v is PrecoPref => v === "cartao" || v === "pix";

/** A escolha que o cliente manda no pedido (`?preco=pix`); qualquer outra coisa vale cartão, o padrão. */
export function precoDoPedido(request: Request): PrecoPref {
  const v = new URL(request.url).searchParams.get("preco");
  return ehPrecoPref(v) ? v : "cartao";
}

type OfertaPreco = { priceCardCents: number | null; cashCents: number | null };

export type PrecoDestaque = {
  /** O preço grande do card. */
  cents: number | null;
  rotulo: "no cartão" | "no Pix";
  /** O que realmente está em destaque: com Pix preferido e oferta sem preço no Pix, cai no cartão. */
  efetivo: PrecoPref;
  /** O outro preço, para a linha de baixo (null = a oferta não tem). */
  outro: { cents: number; rotulo: "no cartão" | "no Pix" } | null;
};

const pixDe = (o: OfertaPreco) => (o.cashCents != null && o.cashCents > 0 ? o.cashCents : null);

export function precoDe(o: OfertaPreco, pref: PrecoPref): PrecoDestaque {
  const pix = pixDe(o);
  const cartao = o.priceCardCents;
  if (pref === "pix" && pix != null) {
    return { cents: pix, rotulo: "no Pix", efetivo: "pix", outro: cartao != null ? { cents: cartao, rotulo: "no cartão" } : null };
  }
  // Cartão em destaque; o Pix só aparece como "outro" quando é de fato mais barato.
  return { cents: cartao, rotulo: "no cartão", efetivo: "cartao", outro: pix != null && cartao != null && pix < cartao ? { cents: pix, rotulo: "no Pix" } : null };
}

/** O valor que filtro e ordenação de preço usam: o mesmo do destaque, para a tela não se contradizer. */
export const valorDe = (o: OfertaPreco, pref: PrecoPref): number | null => precoDe(o, pref).cents;
