import {
  boolean,
  date,
  integer,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// Plano acelerado (10/11): só as tabelas de hoje.
// Preço sempre em centavos (inteiro).

/** Contadores do dia de uma fonte ao vivo (Telegram). `lastId` é a última mensagem já lida, para não ler duas vezes. */
export type SourceStats = { day: string; read: number; withLink: number; touched: number; offers: number; lastId: number };

/** Especificações tiradas do título, sem IA. Servem para comparar só produtos da mesma faixa. */
export type OfferSpecs = {
  inches?: number;
  res?: "hd" | "fhd" | "qhd" | "4k";
  ultrawide?: boolean;
  hz?: number;
  gb?: number;
  nvme?: boolean;
  wireless?: boolean;
  mechanical?: boolean;
  size?: "pequeno" | "medio" | "grande" | "estendido";
};

/** O que só algumas lojas informam na página do produto. */
export type OfferExtra = {
  /** Cartão em 1x, quando a loja dá desconto nessa forma. */
  card1xCents?: number;
  card1xDiscountPct?: number;
  /** Fim da oferta (ISO) e unidades restantes, quando a loja informa. */
  endsAt?: string;
  stockLeft?: number;
  campaign?: string;
  couponNote?: string;
  images?: string[];
  brand?: string;
  rating?: number;
  ratingCount?: number;
};

export const sources = pgTable("sources", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(), // ex.: "promobit"
  kind: text("kind").notNull(), // "comunidade" | "loja"
  name: text("name").notNull(),
  url: text("url").notNull(),
  enabled: boolean("enabled").notNull().default(true),
  status: text("status").notNull().default("ok"), // ok | bloqueada | pausada | erro
  statusNote: text("status_note"),
  /** Escolha do usuário na tela Fontes: null (sugerida/confirmada pelo enabled), "pausada" ou "ignorada". */
  decision: text("decision"),
  stats: jsonb("stats").$type<SourceStats>(),
  lastMessageAt: timestamp("last_message_at", { withTimezone: true }),
  lastRunAt: timestamp("last_run_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const rawMessages = pgTable(
  "raw_messages",
  {
    id: serial("id").primaryKey(),
    sourceId: integer("source_id")
      .notNull()
      .references(() => sources.id),
    externalId: text("external_id").notNull(), // URL do post na comunidade
    text: text("text").notNull(),
    url: text("url"),
    outboundUrl: text("outbound_url"), // link para a loja, se achado
    imageUrl: text("image_url"),
    seenAt: timestamp("seen_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("raw_messages_source_external").on(t.sourceId, t.externalId)],
);

export const products = pgTable(
  "products",
  {
    id: serial("id").primaryKey(),
    store: text("store").notNull(), // slug de config/stores.ts
    storeProductId: text("store_product_id").notNull(), // ASIN, MLB...
    canonicalUrl: text("canonical_url").notNull(),
    title: text("title"),
    imageUrl: text("image_url"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("products_store_id").on(t.store, t.storeProductId)],
);

export const alvos = pgTable("alvos", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  terms: jsonb("terms").$type<string[]>().notNull(),
  exclusions: jsonb("exclusions").$type<string[]>().notNull(),
  targetCents: integer("target_cents"), // preço-alvo (null = sem referência)
  ceilingCents: integer("ceiling_cents"), // teto
  active: boolean("active").notNull().default(true),
});

export const offers = pgTable(
  "offers",
  {
    id: serial("id").primaryKey(),
    rawMessageId: integer("raw_message_id")
      .notNull()
      .references(() => rawMessages.id),
    sourceId: integer("source_id")
      .notNull()
      .references(() => sources.id),
    productId: integer("product_id").references(() => products.id),
    alvoId: integer("alvo_id").references(() => alvos.id),
    title: text("title").notNull(),
    store: text("store"), // slug da loja, se conhecida
    url: text("url"), // link limpo para comprar
    imageUrl: text("image_url"),
    priceCardCents: integer("price_card_cents"), // total no cartão
    priceBasis: text("price_basis"), // parcelado | cartao | avista | unico
    installments: integer("installments"),
    installmentCents: integer("installment_cents"),
    interest: boolean("interest"), // true = com juros
    cashCents: integer("cash_cents"), // à vista / pix
    listPriceCents: integer("list_price_cents"), // "de"
    shippingCents: integer("shipping_cents"),
    freeShipping: boolean("free_shipping"),
    coupon: text("coupon"),
    verifyStatus: text("verify_status").notNull().default("pendente"), // pendente | verificado | nao_verificado
    verifyNote: text("verify_note"),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    nota: integer("nota"),
    notaParts: jsonb("nota_parts").$type<Record<string, number>>(),
    watched: boolean("watched").notNull().default(false),
    dismissed: boolean("dismissed").notNull().default(false),
    snoozedUntil: timestamp("snoozed_until", { withTimezone: true }),
    specs: jsonb("specs").$type<OfferSpecs>(),
    /** Faixa do Alvo (ex.: "27-qhd"). O preço-alvo é calculado por faixa, em alvo_refs. */
    bandKey: text("band_key"),
    /** false = a loja diz que acabou; null = não sabemos. */
    available: boolean("available"),
    extra: jsonb("extra").$type<OfferExtra>(),
    /** Primeira vez em que a oferta atingiu o preço-alvo da faixa. Serve para o alerta tocar uma vez só. */
    hitAt: timestamp("hit_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("offers_raw_message").on(t.rawMessageId)],
);

export const pricePoints = pgTable("price_points", {
  id: serial("id").primaryKey(),
  productId: integer("product_id")
    .notNull()
    .references(() => products.id),
  priceCardCents: integer("price_card_cents"),
  cashCents: integer("cash_cents"),
  installments: integer("installments"),
  interest: boolean("interest"),
  shippingCents: integer("shipping_cents"),
  freeShipping: boolean("free_shipping"),
  imageUrl: text("image_url"),
  origin: text("origin").notNull(), // loja | comunidade
  observedAt: timestamp("observed_at", { withTimezone: true }).notNull().defaultNow(),
});

export const aiUsage = pgTable("ai_usage", {
  id: serial("id").primaryKey(),
  provider: text("provider").notNull(), // claude-cli | anthropic-api | ollama
  model: text("model").notNull(),
  purpose: text("purpose").notNull(),
  inputTokens: integer("input_tokens"),
  outputTokens: integer("output_tokens"),
  costUsd: numeric("cost_usd", { precision: 10, scale: 6 }),
  ok: boolean("ok").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insights = pgTable(
  "insights",
  {
    id: serial("id").primaryKey(),
    produtoId: integer("produto_id")
      .notNull()
      .references(() => products.id),
    periodo: date("periodo").notNull(),
    hashDados: text("hash_dados").notNull(),
    provedor: text("provedor").notNull(),
    modelo: text("modelo").notNull(),
    insight: jsonb("insight").notNull(),
    geradoEm: timestamp("gerado_em", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("insights_produto_periodo_hash").on(t.produtoId, t.periodo, t.hashDados)],
);

/** Estado de cada loja de config/stores.ts: pausa pedida pelo usuário e pausa de 1 h pedida pela loja (429/403). */
export const storeState = pgTable("store_state", {
  slug: text("slug").primaryKey(),
  pausedByUser: boolean("paused_by_user").notNull().default(false),
  pauseUntil: timestamp("pause_until", { withTimezone: true }),
  pauseNote: text("pause_note"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Convites de grupos e canais vistos nas mensagens (t.me, chat.whatsapp.com). O app nunca entra sozinho. */
export const invites = pgTable("invites", {
  link: text("link").primaryKey(),
  kind: text("kind").notNull(), // telegram | whatsapp
  mentions: integer("mentions").notNull().default(1),
  fromSource: text("from_source"),
  dismissed: boolean("dismissed").notNull().default(false),
  firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).notNull().defaultNow(),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Referência de preço de cada faixa de um Alvo: mediana dos preços vistos, preço-alvo (85%) e teto (115%). */
export const alvoRefs = pgTable(
  "alvo_refs",
  {
    alvoId: integer("alvo_id")
      .notNull()
      .references(() => alvos.id),
    bandKey: text("band_key").notNull(),
    label: text("label").notNull(),
    medianCents: integer("median_cents"),
    targetCents: integer("target_cents"),
    ceilingCents: integer("ceiling_cents"),
    n: integer("n").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.alvoId, t.bandKey] })],
);

/** Preços de mercado vistos nas vitrines das lojas (todos os produtos da categoria, não só as ofertas). Alimentam a mediana da faixa. */
export const marketObs = pgTable(
  "market_obs",
  {
    store: text("store").notNull(),
    code: text("code").notNull(),
    alvoId: integer("alvo_id")
      .notNull()
      .references(() => alvos.id),
    bandKey: text("band_key").notNull(),
    title: text("title").notNull(),
    priceCardCents: integer("price_card_cents").notNull(),
    seenAt: timestamp("seen_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.store, t.code] })],
);

/** Acontecimentos da faixa "Ao vivo": nova oferta, preço mudou, esgotou, Alvo atingido, canal novo. */
export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(), // nova | preco | esgotou | alvo | canal
  offerId: integer("offer_id").references(() => offers.id),
  title: text("title").notNull(),
  detail: jsonb("detail").$type<{ from?: number; to?: number; store?: string | null; source?: string; band?: string; target?: number }>(),
  at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
});

/** Batimento do worker: se parar de bater, a Vitrine avisa que o worker caiu em vez de dizer "Ao vivo". */
export const workerState = pgTable("worker_state", {
  id: text("id").primaryKey(), // sempre "worker"
  beatAt: timestamp("beat_at", { withTimezone: true }).notNull().defaultNow(),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  roles: text("roles").notNull().default(""),
});
