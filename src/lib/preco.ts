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

/** Rendimento mensal padrão do dinheiro que fica na conta enquanto se paga em parcelas (1,0% ao mês). Ajuste: app_settings `rendimento_mensal` (em %). */
export const RENDIMENTO_PADRAO_PCT = 1;

export type Compensa = {
  /** O que sai mais barato de verdade: pagar no Pix ou parcelar. */
  melhor: "pix" | "parcelar";
  /** Quanto se economiza escolhendo o melhor, em centavos de hoje. */
  economiaCents: number;
  /** Valor presente das parcelas na taxa usada. */
  valorPresenteCents: number;
  rendimentoPct: number;
};

type OfertaParcelada = { cashCents: number | null; installments: number | null; installmentCents: number | null };

/**
 * Pix ou parcelar, qual compensa: o valor presente das parcelas (a primeira daqui a 1 mês, o dinheiro rendendo
 * `rendimentoPct` ao mês enquanto não sai da conta) contra o preço no Pix. É uma estimativa: não conta cashback, milhas
 * nem limite do cartão. null = falta Pix ou parcelas, ou a diferença é menor que 0,5% (empate).
 */
export function compensa(o: OfertaParcelada, rendimentoPct: number = RENDIMENTO_PADRAO_PCT): Compensa | null {
  const n = o.installments;
  const p = o.installmentCents;
  const pix = o.cashCents;
  if (n == null || n < 2 || p == null || p <= 0 || pix == null || pix <= 0 || !(rendimentoPct >= 0)) return null;
  const r = rendimentoPct / 100;
  let vp = 0;
  for (let k = 1; k <= n; k++) vp += p / (1 + r) ** k;
  const dif = vp - pix;
  if (Math.abs(dif) < pix * 0.005) return null;
  return { melhor: dif > 0 ? "pix" : "parcelar", economiaCents: Math.round(Math.abs(dif)), valorPresenteCents: Math.round(vp), rendimentoPct };
}
