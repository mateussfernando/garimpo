// Categorias de produto. A oferta ganha a categoria do primeiro nome de produto do título
// (worker/match/category.ts), sem IA. O que sobrar sem categoria vai para a IA, em lote (worker/ai/categorias.ts).
// Os termos são escritos sem acento e em minúsculas; plural é aceito sozinho ("tenis" pega "tênis").

export type CategorySeed = {
  slug: string;
  name: string;
  /** Palavras que, na busca da Vitrine, também querem dizer esta categoria. */
  aliases: string[];
  terms: string[];
};

export const CATEGORIES: CategorySeed[] = [
  {
    // Pedido do usuário (27/11): notebooks saem de Informática e ganham categoria própria.
    slug: "notebooks",
    name: "Notebooks",
    aliases: ["notebook", "laptop", "macbook"],
    terms: [
      "notebook", "macbook", "chromebook", "laptop", "ultrabook", "ideapad", "thinkpad", "thinkbook", "vivobook", "zenbook", "expertbook",
      "inspiron", "vostro", "galaxy book", "galaxy book2", "galaxy book3", "galaxy book4", "galaxy book5","acer aspire", "nitro v", "nitro v15", "nitro v16", "nitro 5", "legion slim", "victus",
      "tuf gaming f15", "tuf gaming f16", "tuf gaming a15", "tuf gaming a16",
    ],
  },
  {
    slug: "informatica",
    name: "Informática",
    aliases: ["pc", "computador", "periferico", "perifericos", "hardware"],
    terms: [
      "mac mini", "imac", "computador", "pc gamer", "desktop", "all in one",
      "monitor", "ssd", "nvme", "hd externo", "hd interno", "hd sata", "disco rigido", "memoria ram", "memoria ddr4", "memoria ddr5", "pendrive", "pen drive",
      "cartao de memoria", "cartao micro sd", "micro sd", "placa de video", "placa mae", "processador", "gabinete", "fonte atx", "water cooler",
      "cooler", "mouse", "mousepad", "mouse pad", "deskpad", "teclado", "webcam", "hub usb", "hub", "dock", "roteador", "repetidor", "mesh",
      "switch de rede", "impressora", "multifuncional", "cartucho", "toner", "tablet", "ipad", "kindle", "e reader", "estabilizador", "nobreak",
      "braco articulado", "suporte para monitor", "cadeira gamer", "mesa gamer", "ryzen", "geforce", "rtx", "radeon",
    ],
  },
  {
    slug: "celulares",
    name: "Celulares",
    aliases: ["celular", "smartphone", "telefone"],
    terms: [
      "smartphone", "celular", "iphone", "galaxy", "redmi", "xiaomi", "motorola", "moto g", "moto e", "realme", "pixel",
      "carregador", "power bank", "powerbank", "bateria portatil", "carregador portatil", "cabo usb", "cabo lightning", "capinha", "capa para celular",
      "pelicula", "suporte veicular",
    ],
  },
  {
    slug: "audio",
    name: "Áudio",
    aliases: ["som", "fone"],
    terms: [
      "monitor de audio", "monitor de referencia", "fone", "fones", "headset", "headphone", "earbuds", "airpods", "galaxy buds", "caixa de som", "caixinha de som", "soundbar", "home theater",
      "microfone", "jbl", "amplificador", "toca discos", "radio",
    ],
  },
  {
    slug: "tv-video",
    name: "TV e vídeo",
    aliases: ["tv", "televisao", "televisor"],
    terms: ["smart tv", "tv", "televisao", "televisor", "projetor", "chromecast", "fire tv", "fire stick", "roku", "tv box", "apple tv", "suporte para tv"],
  },
  {
    slug: "games",
    name: "Games",
    aliases: ["game", "jogo", "jogos", "console", "videogame"],
    terms: [
      "playstation", "ps5", "ps4", "xbox", "nintendo", "switch 2", "steam deck", "console", "controle dualsense", "dualsense", "controle xbox",
      "controle", "gamepad", "joystick", "jogo", "game", "volante logitech", "headset gamer", "gift card",
    ],
  },
  {
    slug: "relogios",
    name: "Relógios e wearables",
    aliases: ["relogio", "smartwatch", "wearable"],
    terms: ["smartwatch", "apple watch", "galaxy watch", "watch fit", "watch gt", "amazfit", "mi band", "smart band", "smartband", "relogio", "pulseira inteligente"],
  },
  {
    slug: "eletro",
    name: "Eletrodomésticos",
    aliases: ["eletrodomestico", "linha branca"],
    terms: [
      "geladeira", "refrigerador", "freezer", "frigobar", "fogao", "cooktop", "forno", "micro ondas", "microondas", "lava e seca", "lavadora",
      "maquina de lavar", "secadora", "lava loucas", "lava louca", "ar condicionado", "climatizador", "ventilador", "aquecedor", "aspirador",
      "robo aspirador", "purificador", "bebedouro", "ferro de passar", "vaporizador", "depurador", "coifa",
    ],
  },
  {
    slug: "cozinha",
    name: "Cozinha",
    aliases: ["utensilio", "utensilios"],
    terms: [
      "air fryer", "airfryer", "fritadeira", "cafeteira", "maquina de cafe", "nespresso", "dolce gusto", "liquidificador", "batedeira", "mixer",
      "processador de alimentos", "panela", "jogo de panelas", "frigideira", "pipoqueira", "sanduicheira", "grill", "chaleira", "torradeira",
      "sorveteira", "ninja creami", "maquina de sorvete", "faca", "jogo de facas", "talheres", "pote", "garrafa termica", "copo termico", "squeeze",
      "assadeira", "tabua",
    ],
  },
  {
    slug: "casa",
    name: "Casa e decoração",
    aliases: ["decoracao", "moveis", "movel", "natal"],
    terms: [
      "colchao", "travesseiro", "jogo de cama", "lencol", "edredom", "cobertor", "toalha", "tapete", "cortina", "luminaria", "lampada", "smart lampada",
      "abajur", "sofa", "cadeira", "mesa", "escrivaninha", "estante", "rack", "painel para tv", "guarda roupa", "armario", "organizador", "cabide",
      "decoracao", "enfeite", "arvore de natal", "pisca pisca", "vaso", "quadro", "espelho", "fechadura", "campainha", "camera de seguranca",
      "camera wi fi", "tomada inteligente", "alexa", "echo dot", "echo show", "google nest",
    ],
  },
  {
    slug: "ferramentas",
    name: "Ferramentas",
    aliases: ["ferramenta", "construcao"],
    terms: [
      "furadeira", "parafusadeira", "serra", "esmerilhadeira", "lixadeira", "tupia", "jogo de chaves", "kit de ferramentas", "maleta de ferramentas",
      "chave de fenda", "alicate", "trena", "nivel a laser", "lavadora de alta pressao", "compressor", "soprador", "multimetro", "escada",
    ],
  },
  {
    slug: "beleza",
    name: "Beleza e saúde",
    aliases: ["higiene", "cuidados", "perfumaria", "saude"],
    terms: [
      "perfume", "colonia", "body splash", "shampoo", "condicionador", "mascara capilar", "creme", "hidratante", "protetor solar", "sabonete",
      "desodorante", "maquiagem", "batom", "rimel", "serum", "secador", "chapinha", "prancha", "modelador", "escova rotativa", "barbeador",
      "aparador", "maquina de cortar cabelo", "depilador", "escova de dente", "escova dental", "creme dental", "kit de higiene", "fio dental",
      "lixadeira de unha", "lixadeira unha", "lixa de unha", "termometro", "balanca", "medidor de pressao", "oximetro", "vitamina", "colageno",
    ],
  },
  {
    slug: "moda",
    name: "Moda",
    aliases: ["roupa", "roupas", "calcado", "calcados", "vestuario"],
    terms: [
      "tenis", "sapato", "sapatenis", "bota", "sandalia", "chinelo", "camiseta", "camisa", "polo", "regata", "blusa", "moletom", "jaqueta", "casaco",
      "calca", "jeans", "bermuda", "short", "saia", "vestido", "cueca", "calcinha", "sutia", "pijama", "meia", "bone", "mochila", "bolsa", "carteira",
      "mala", "oculos", "cinto", "relogio de pulso",
    ],
  },
  {
    slug: "esporte",
    name: "Esporte e fitness",
    aliases: ["esportes", "fitness", "academia", "suplemento"],
    terms: [
      "whey", "creatina", "pre treino", "suplemento", "bicicleta", "bike", "patinete", "halter", "anilha", "kettlebell", "esteira", "elastico",
      "colchonete", "tapete de yoga", "bola", "chuteira", "camisa de time", "barraca", "saco de dormir",
    ],
  },
  {
    slug: "mercado",
    name: "Mercado",
    aliases: ["supermercado", "comida", "bebida", "bebidas", "alimento", "limpeza"],
    terms: [
      "cerveja", "vinho", "whisky", "vodka", "gin", "espumante", "refrigerante", "energetico", "agua mineral", "cafe", "cafe em capsula", "capsula",
      "chocolate", "panettone", "chocotone", "bombom", "biscoito", "bolacha", "azeite", "arroz", "feijao", "macarrao", "leite", "achocolatado",
      "creme kit kat", "nutella", "granola", "sabao", "lava roupas", "amaciante", "detergente", "desinfetante", "papel higienico", "papel toalha",
      "guardanapo", "saco de lixo",
    ],
  },
  {
    slug: "infantil",
    name: "Bebês e brinquedos",
    aliases: ["bebe", "brinquedo", "brinquedos", "crianca"],
    terms: ["fralda", "lenco umedecido", "carrinho de bebe", "bebe conforto", "cadeirinha", "mamadeira", "chupeta", "brinquedo", "lego", "boneca", "pelucia", "quebra cabeca", "jogo de tabuleiro", "hot wheels"],
  },
  {
    slug: "pet",
    name: "Pet",
    aliases: ["cachorro", "gato", "animal"],
    terms: ["racao", "petisco", "areia para gato", "areia higienica", "tapete higienico", "arranhador", "coleira", "caminha pet", "comedouro"],
  },
  {
    slug: "livros",
    name: "Livros",
    aliases: ["livro", "leitura"],
    terms: ["livro", "box de livros", "hq", "manga", "edicao de luxo", "edicao especial"],
  },
  {
    slug: "automotivo",
    name: "Automotivo",
    aliases: ["carro", "moto", "veiculo"],
    terms: ["pneu", "oleo de motor", "oleo para motor", "bateria automotiva", "som automotivo", "central multimidia", "camera de re", "aspirador automotivo", "capacete", "calibrador"],
  },
  {
    slug: "servicos",
    name: "Serviços e assinaturas",
    aliases: ["servico", "assinatura", "streaming"],
    terms: ["hospedagem", "vps", "assinatura", "streaming", "prime video", "amazon prime", "netflix", "spotify", "curso"],
  },
];

/** Sem categoria certa (nem regra nem IA). */
export const OTHER_CATEGORY = { slug: "outros", name: "Outros" } as const;

export const CATEGORY_SLUGS: [string, ...string[]] = [OTHER_CATEGORY.slug, ...CATEGORIES.map((c) => c.slug)];

export function categoryName(slug: string | null | undefined): string {
  if (!slug) return OTHER_CATEGORY.name;
  return CATEGORIES.find((c) => c.slug === slug)?.name ?? OTHER_CATEGORY.name;
}
