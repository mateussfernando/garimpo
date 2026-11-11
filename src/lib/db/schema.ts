import {
  boolean,
  date,
  integer,
  jsonb,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// Plano acelerado (10/11): só as tabelas de hoje.
// Preço sempre em centavos (inteiro).

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
