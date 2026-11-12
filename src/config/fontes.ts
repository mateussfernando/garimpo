import { z } from "zod";

// Fontes que você liga ou cria na tela Fontes. Três tipos genéricos, todos lidos pelo worker com coleta educada
// (robots.txt, um pedido por domínio a cada 5-10 s, pausa em 429/403/503). Nada de navegador: só HTTP.
// As fontes do código (Promobit, Pelando, Gatry, Hardmob, vitrine do KaBuM!) e os grupos do Telegram continuam como estão.

export type FonteKind = "feed" | "pagina" | "vtex";

const url = z
  .string()
  .trim()
  .url("endereço inválido")
  .refine((u) => /^https:\/\//i.test(u), "use um endereço https://");

const terms = z
  .array(z.string().trim().min(2).max(40))
  .max(20)
  .transform((l) => [...new Set(l.map((t) => t.toLowerCase()))]);

export const FeedConfig = z.object({
  url,
  /** Só os itens cujo link tem este pedaço (ex.: "/achados/" no feed geral do Tecnoblog). Vazio = todos. */
  pathFilter: z.string().trim().max(80).default(""),
});

export const PaginaConfig = z.object({
  /** Páginas com as ofertas nos dados da própria página (__NEXT_DATA__, JSON-LD ou JSON embutido). */
  urls: z.array(url).min(1, "ponha pelo menos uma página").max(5),
});

export const VtexConfig = z.object({
  /** Endereço da loja, ex.: https://www.waz.com.br. A busca usa /api/catalog_system/pub/products/search?ft=termo. */
  url,
  storeName: z.string().trim().min(2).max(40),
  /** Termos buscados. Vazio = o primeiro termo de cada Alvo ligado. */
  terms: terms.default([]),
  /** Só o vendedor com este nome (marketplace como a Americanas). Vazio = o vendedor padrão do produto. */
  seller: z.string().trim().max(40).default(""),
});

export type FeedConfig = z.infer<typeof FeedConfig>;
export type PaginaConfig = z.infer<typeof PaginaConfig>;
export type VtexConfig = z.infer<typeof VtexConfig>;
export type FonteConfig = FeedConfig | PaginaConfig | VtexConfig;

export const CONFIG_SCHEMA = { feed: FeedConfig, pagina: PaginaConfig, vtex: VtexConfig } as const;

/** De quanto em quanto tempo cada tipo é lido, se você não mudar. */
export const DEFAULT_INTERVAL_MIN: Record<FonteKind, number> = { feed: 30, pagina: 10, vtex: 12 * 60 };
export const MIN_INTERVAL_MIN: Record<FonteKind, number> = { feed: 10, pagina: 5, vtex: 60 };

export const KIND_LABEL: Record<FonteKind, string> = { feed: "Feed RSS", pagina: "Página de ofertas", vtex: "Busca em loja VTEX" };

export type Sugestao = {
  /** Vira o slug da fonte quando você adiciona. */
  slug: string;
  name: string;
  kind: FonteKind;
  config: FonteConfig;
  why: string;
  /** Rótulo da pesquisa de 11 e 12/11 (docs/fontes-novas.md). */
  rotulo: string;
};

/** Fontes que a pesquisa de 11 e 12/11/2026 achou possíveis com HTTP simples. Ver docs/fontes-novas.md. */
export const SUGESTOES: Sugestao[] = [
  {
    slug: "pechinchou",
    name: "Pechinchou",
    kind: "pagina",
    config: { urls: ["https://www.pechinchou.com.br/recentes", "https://www.pechinchou.com.br/categorias/informatica"] },
    why: "Maior volume, com preço, preço antigo e link direto da loja nos dados da página. Muita Amazon e Mercado Livre.",
    rotulo: "dá hoje com HTTP simples",
  },
  {
    slug: "vtex-waz",
    name: "Waz (busca)",
    kind: "vtex",
    config: { url: "https://www.waz.com.br", storeName: "Waz", terms: [], seller: "" },
    why: "Catálogo público com parcelas e juros por cartão: dá o total no cartão certo. Cobre mouse, teclado e headset.",
    rotulo: "dá hoje com HTTP simples",
  },
  {
    slug: "vtex-fastshop",
    name: "Fast Shop (busca)",
    kind: "vtex",
    config: { url: "https://site.fastshop.com.br", storeName: "Fast Shop", terms: [], seller: "" },
    why: "Mesma API pública da Waz, com parcelas e juros. Bom para monitor, headset e webcam.",
    rotulo: "dá hoje com HTTP simples",
  },
  {
    slug: "hardwarebarato",
    name: "Hardware Barato",
    kind: "pagina",
    config: { urls: ["https://www.hardwarebarato.com/produtos/promocoes"] },
    why: "Promoções de hardware em JSON-LD (SSD, monitor, muito CPU e placa de vídeo). Volume baixo.",
    rotulo: "dá hoje com HTTP simples",
  },
  {
    slug: "feed-hardware-indica",
    name: "Hardware.com.br (Hardware Indica)",
    kind: "feed",
    config: { url: "https://www.hardware.com.br/hardware-indica/feed/", pathFilter: "" },
    why: "Feed só de ofertas, 3 a 6 por dia, quase tudo Amazon.",
    rotulo: "dá hoje com HTTP simples",
  },
  {
    slug: "feed-tecnoblog-achados",
    name: "Achados do Tecnoblog",
    kind: "feed",
    config: { url: "https://tecnoblog.net/feed/", pathFilter: "/achados/" },
    why: "Feed geral filtrado pelos posts de ofertas. O link da loja passa por tecno.click, que proíbe robôs: chega como “não verificado”.",
    rotulo: "dá hoje, mas sem link de loja",
  },
  {
    slug: "feed-olhardigital",
    name: "Olhar Digital (ofertas)",
    kind: "feed",
    config: { url: "https://olhardigital.com.br/reviews/feed/", pathFilter: "" },
    why: "Posts de seleção com links diretos da Amazon. Pouco valor para os Alvos.",
    rotulo: "dá hoje com HTTP simples",
  },
];

/** Canais que a pesquisa conferiu no t.me e você ainda não segue. O Garimpo nunca entra sozinho: entre pelo app do Telegram. */
export const CANAIS_SUGERIDOS: { handle: string; name: string; why: string }[] = [
  { handle: "ctofertas", name: "Canaltech Ofertas", why: "grupo oficial do Canaltech, tecnologia e gamer (102 mil membros)" },
  { handle: "cupomonline", name: "Cupom Online Promoções", why: "geral com hardware, links diretos de Shopee e Mercado Livre" },
  { handle: "Promoimporta", name: "PromoImporta", why: "AliExpress com links diretos; irmão do PromoTop, pode repetir ofertas" },
];
