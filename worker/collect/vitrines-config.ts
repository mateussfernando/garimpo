// Vitrines de lojas lidas ao vivo (só com o app aberto). O robots.txt da loja manda.
// Só entra loja cuja página já traz os produtos no HTML. Veja os motivos em vitrines.ts.
import { parseKabum, type VitrineProduct } from "./vitrines";

export type Vitrine = {
  slug: string;
  name: string;
  storeName: string;
  /** Página inicial da fonte (a tela Fontes mostra este link). */
  url: string;
  pages: { label: string; url: string }[];
  parse: (html: string) => VitrineProduct[];
};

export const VITRINES: Vitrine[] = [
  {
    slug: "kabum-vitrine",
    name: "KaBuM! (vitrine de ofertas)",
    storeName: "KaBuM!",
    url: "https://www.kabum.com.br/",
    // Só as categorias que o KaBuM! entrega prontas no HTML. Mouses, teclados, SSDs e headsets são montados no navegador
    // por uma API interna que não é pública: ficam com as comunidades e o Telegram.
    pages: [
      { label: "Monitores", url: "https://www.kabum.com.br/computadores/monitores" },
      { label: "Mousepads", url: "https://www.kabum.com.br/perifericos/mouse-pad" },
      { label: "Webcams", url: "https://www.kabum.com.br/perifericos/webcam" },
    ],
    parse: parseKabum,
  },
];
