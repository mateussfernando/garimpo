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

/**
 * O que o preço de uma oferta é. `priceBasis` diz como o parser leu o post ("parcelado", "cartao", "avista" = Pix,
 * "unico" = um preço sem forma de pagamento) ou "loja" (o leitor exato da loja leu cartão e Pix na página).
 * Sem `priceBasis` (listas antigas, outras lojas do mesmo produto) vale o de sempre: o preço principal é o do cartão.
 */
type OfertaPreco = {
  priceCardCents: number | null;
  cashCents: number | null;
  priceBasis?: string | null;
  verifyStatus?: string;
  verifyNote?: string | null;
};

export type RotuloPreco = "no cartão" | "no Pix" | "anunciado";
export type FormaPreco = "cartao" | "pix" | "anunciado";

export type PrecoDestaque = {
  /** O preço grande do card. */
  cents: number | null;
  rotulo: RotuloPreco;
  /** O que realmente está em destaque: a forma escolhida quando a oferta a informa; senão a que existe. */
  efetivo: FormaPreco;
  /** O outro preço, para a linha de baixo (null = a oferta não tem). */
  outro: { cents: number; rotulo: RotuloPreco } | null;
  /** Aviso curto quando a forma escolhida não foi informada (ex.: "Pix não informado"). */
  aviso: string | null;
  /** Dica (ao passar o mouse) de onde o preço veio, quando a forma de pagamento não é conhecida. */
  dica: string | null;
};

const pixDe = (o: OfertaPreco) => (o.cashCents != null && o.cashCents > 0 ? o.cashCents : null);

/**
 * O que se sabe de verdade do preço (decisão de 25/11: o app mostra o preço como foi anunciado e não inventa a forma).
 * - cartão: o post disse cartão ou parcelas, ou o leitor exato conferiu na loja;
 * - Pix: `cashCents`; com base "avista", o preço do post é o Pix e o cartão fica desconhecido;
 * - anunciado: um preço sem forma de pagamento (o post não disse, ou a página da loja lida de modo genérico).
 */
export function precoConhecido(o: OfertaPreco): { cartao: number | null; pix: number | null; anunciado: number | null } {
  const pix = pixDe(o);
  const principal = o.priceCardCents != null && o.priceCardCents > 0 ? o.priceCardCents : null;
  const exata = o.verifyStatus === "verificado" && !o.verifyNote;
  if (o.priceBasis === undefined || exata || o.priceBasis === "loja" || o.priceBasis === "parcelado" || o.priceBasis === "cartao") {
    return { cartao: principal, pix, anunciado: null };
  }
  if (o.priceBasis === "avista") return { cartao: null, pix: pix ?? principal, anunciado: null };
  // "unico" (ou nada): a forma de pagamento do preço principal não é conhecida.
  return { cartao: null, pix, anunciado: principal != null && principal !== pix ? principal : null };
}

export function precoDe(o: OfertaPreco, pref: PrecoPref): PrecoDestaque {
  const k = precoConhecido(o);
  const cartao = k.cartao != null ? { cents: k.cartao, rotulo: "no cartão" as const, forma: "cartao" as const } : null;
  const pix = k.pix != null ? { cents: k.pix, rotulo: "no Pix" as const, forma: "pix" as const } : null;
  const anunciado = k.anunciado != null ? { cents: k.anunciado, rotulo: "anunciado" as const, forma: "anunciado" as const } : null;
  const principal = (pref === "pix" ? [pix, cartao, anunciado] : [cartao, pix, anunciado]).find((x) => x != null) ?? null;
  const dica =
    principal?.forma === "anunciado"
      ? o.verifyStatus === "verificado"
        ? "Preço da página da loja: ela não diz se é no Pix ou no cartão"
        : "O post não disse se é no Pix ou no cartão"
      : null;
  if (!principal) return { cents: null, rotulo: "no cartão", efetivo: "cartao", outro: null, aviso: null, dica: null };
  let outro: PrecoDestaque["outro"] = null;
  if (principal.forma === "pix") outro = cartao ?? anunciado;
  // Cartão em destaque: o Pix só aparece embaixo quando é de fato mais barato.
  else if (principal.forma === "cartao") outro = pix != null && pix.cents < principal.cents ? pix : null;
  return {
    cents: principal.cents,
    rotulo: principal.rotulo,
    efetivo: principal.forma,
    outro: outro ? { cents: outro.cents, rotulo: outro.rotulo } : null,
    aviso: pref === "pix" && pix == null ? "Pix não informado" : null,
    dica,
  };
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
