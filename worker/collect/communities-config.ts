// Comunidades lidas ao vivo (só com o app aberto, a cada 10 min).
// O robots.txt de cada site manda: se ele não permitir, a fonte fica "bloqueada".
// Os padrões de link são o ponto de ajuste: rode `pnpm fontes:debug` e confira.

export type Community = {
  slug: string;
  name: string;
  /** Página com as ofertas mais recentes. */
  url: string;
  /** Casa o link de um post de oferta (o caminho, sem domínio). */
  dealPath: RegExp;
  /** Texto ou caminho do botão que leva à loja. */
  outbound: { text: RegExp; path: RegExp } | null;
};

export const COMMUNITIES: Community[] = [
  {
    slug: "promobit",
    name: "Promobit",
    url: "https://www.promobit.com.br/",
    dealPath: /^\/oferta\/[a-z0-9-]+-\d+\/?$/i,
    outbound: { text: /pegar promo|ir para a loja|ir para loja|ver oferta|pegar cupom/i, path: /redirect|\/r\/|\/ir\//i },
  },
  {
    slug: "pelando",
    name: "Pelando",
    url: "https://www.pelando.com.br/recentes",
    dealPath: /^\/d\/[a-z0-9-]+\/?$/i,
    outbound: { text: /pegar promo|ir para a loja|ir para loja|ver oferta|pegar cupom/i, path: /redirect|\/api\/r|\/ir\//i },
  },
  {
    // Sem robots.txt e sem bloqueio de robô. Os links de loja já vêm na própria página.
    slug: "gatry",
    name: "Gatry",
    url: "https://gatry.com/",
    dealPath: /^\/promocoes\/\d+\/[a-z0-9-]+\/?$/i,
    outbound: null,
  },
  {
    slug: "hardmob",
    name: "Fórum de Promoções do Hardmob",
    url: "https://www.hardmob.com.br/forums/407-Promocoes",
    dealPath: /^\/threads\/\d+/i,
    outbound: null,
  },
];
