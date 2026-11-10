// Alvos v0, tirados dos interesses que já estão no plano.
// O usuário não digita nada: o preço-alvo e o teto vêm das ofertas vistas
// (85% e 115% da mediana do Alvo, a partir de 5 ofertas).

export type AlvoSeed = {
  slug: string;
  name: string;
  terms: string[];
  exclusions: string[];
};

export const ALVOS_V0: AlvoSeed[] = [
  {
    slug: "braco-articulado",
    name: "Braço articulado",
    terms: ["braco articulado", "suporte articulado", "suporte para monitor", "suporte de monitor", "monitor arm", "braco para monitor"],
    exclusions: ["tv", "celular", "microfone", "ring light", "tablet", "notebook"],
  },
  {
    slug: "mouse",
    name: "Mouse",
    terms: ["mouse"],
    exclusions: ["mousepad", "mouse pad", "bungee", "pad", "skate", "feet"],
  },
  {
    slug: "teclado",
    name: "Teclado",
    terms: ["teclado"],
    exclusions: ["capa", "pelicula", "piano", "musical", "keycap", "tablet"],
  },
  {
    slug: "monitor",
    name: "Monitor",
    terms: ["monitor"],
    exclusions: ["suporte", "braco", "bebe", "baba", "cardiaco", "pressao", "glicose", "articulado", "limpeza"],
  },
  {
    slug: "ssd",
    name: "SSD",
    terms: ["ssd", "nvme", "m.2"],
    exclusions: ["case", "adaptador", "gaveta", "dissipador", "enclosure"],
  },
  {
    slug: "acessorios",
    name: "Acessórios",
    terms: ["mousepad", "mouse pad", "headset", "fone gamer", "hub usb", "hub usb-c", "dock usb", "webcam", "microfone"],
    exclusions: [],
  },
];
