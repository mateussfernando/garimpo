// Alvos v1. O usuário não digita nada: o preço-alvo e o teto vêm dos preços vistos,
// calculados por faixa de cada Alvo (85% e 115% da mediana da faixa, a partir de 5 preços).
// As faixas (Monitor 27" QHD, SSD 1 TB...) ficam em worker/match/specs.ts.

export type AlvoSeed = {
  slug: string;
  name: string;
  /** O título precisa trazer um destes termos como o produto em si (o primeiro nome de produto do título). */
  terms: string[];
  /** Palavras que tiram o título do Alvo mesmo com o termo certo. */
  exclusions: string[];
};

export const ALVOS_V0: AlvoSeed[] = [
  {
    slug: "braco-articulado",
    name: "Braço articulado",
    terms: [
      "braco articulado",
      "suporte articulado",
      "suporte para monitor",
      "suporte de monitor",
      "suporte de mesa para monitor",
      "suporte de mesa articulado",
      "monitor arm",
      "braco para monitor",
    ],
    exclusions: ["tv", "celular", "microfone", "ring light", "tablet", "notebook"],
  },
  {
    slug: "mouse",
    name: "Mouse",
    terms: ["mouse"],
    exclusions: ["bungee", "skate", "feet", "grip"],
  },
  {
    slug: "teclado",
    name: "Teclado",
    terms: ["teclado", "keyboard"],
    exclusions: ["piano", "musical", "tablet", "numerico", "virtual"],
  },
  {
    slug: "monitor",
    name: "Monitor",
    terms: ["monitor"],
    exclusions: ["bebe", "baba", "cardiaco", "pressao", "glicose", "limpeza", "portatil", "audio", "estudio", "studio", "referencia", "som"],
  },
  {
    slug: "ssd",
    name: "SSD",
    terms: ["ssd", "nvme", "m.2"],
    // "512 GB SSD" numa linha com RAM, processador ou tela é a ficha de um notebook ou PC, não um SSD à venda.
    exclusions: ["externo", "portatil", "expansivel", "ram", "ddr4", "ddr5", "ryzen", "core", "intel", "rtx", "gtx", "tela", "specs"],
  },
  {
    slug: "mousepad",
    name: "Mousepad",
    terms: ["mousepad", "mouse pad", "deskpad", "desk pad"],
    exclusions: [],
  },
  {
    slug: "headset",
    name: "Headset",
    terms: ["headset", "fone gamer", "fone de ouvido gamer", "headphone gamer"],
    exclusions: [],
  },
  {
    slug: "webcam",
    name: "Webcam",
    terms: ["webcam", "web cam", "camera webcam"],
    exclusions: [],
  },
  {
    slug: "hub",
    name: "Hub USB",
    terms: ["hub usb", "hub usb c", "hub tipo c", "dock usb", "dockstation", "docking station"],
    exclusions: [],
  },
  {
    slug: "microfone",
    name: "Microfone",
    terms: ["microfone"],
    exclusions: ["karaoke", "lapela"],
  },
];

/**
 * Nomes de produto que NÃO são Alvos. Se um deles vier antes do termo do Alvo no título, o produto é outro:
 * "Notebook ... 512 GB SSD" é um notebook, "Placa-Mãe ... M.2" é uma placa-mãe, "Cabo para monitor" é um cabo.
 */
export const OTHER_TYPES: string[] = [
  "placa mae", "placa de video", "placa grafica", "processador", "memoria ram", "memoria", "notebook", "laptop", "macbook",
  "pc gamer", "computador", "desktop", "mini pc", "all in one", "console", "playstation", "ps5", "xbox", "nintendo switch",
  "controle", "gamepad", "joystick", "volante", "cadeira", "mesa", "escrivaninha", "gabinete", "fonte", "water cooler",
  "cooler", "ventoinha", "pasta termica", "smart tv", "tv", "televisao", "smartphone", "celular", "iphone", "tablet", "ipad",
  "kindle", "smartwatch", "relogio", "impressora", "roteador", "repetidor", "caixa de som", "soundbar", "fone de ouvido",
  "fone bluetooth", "earbuds", "airpods", "carregador", "power bank", "bateria", "pilha", "cabo", "adaptador", "extensor",
  "filtro de linha", "nobreak", "estabilizador", "hd externo", "hd", "pen drive", "pendrive", "cartao de memoria", "cartao sd",
  "leitor de cartao", "case", "gaveta", "dissipador", "enclosure", "capa", "pelicula", "keycap", "switch", "apoio", "descanso",
  "suporte", "tripe", "ring light", "luminaria", "fita led", "lampada", "kit", "combo", "projetor", "camera", "drone",
  "oculos", "licenca", "windows", "jogo", "game", "gift card", "assinatura", "garantia", "limpador", "escova", "limpeza",
  "spray", "pano", "base", "organizador", "adesivo", "protetor", "etiqueta",
  // Linhas de notebook que não dizem "notebook".
  "ideapad", "vivobook", "zenbook", "thinkpad", "legion", "loq", "nitro", "aspire", "inspiron", "galaxy book", "victus", "tuf gaming f15",
];
