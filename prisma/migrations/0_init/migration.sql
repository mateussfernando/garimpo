-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "ai_usage" (
    "id" SERIAL NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "input_tokens" INTEGER,
    "output_tokens" INTEGER,
    "cost_usd" DECIMAL(10,6),
    "ok" BOOLEAN NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_usage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alvo_refs" (
    "alvo_id" INTEGER NOT NULL,
    "band_key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "median_cents" INTEGER,
    "target_cents" INTEGER,
    "ceiling_cents" INTEGER,
    "n" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "manual_target_cents" INTEGER,
    "manual_ceiling_cents" INTEGER,

    CONSTRAINT "alvo_refs_alvo_id_band_key_pk" PRIMARY KEY ("alvo_id","band_key")
);

-- CreateTable
CREATE TABLE "alvos" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "terms" JSONB NOT NULL,
    "exclusions" JSONB NOT NULL,
    "target_cents" INTEGER,
    "ceiling_cents" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "origin" TEXT NOT NULL DEFAULT 'seed',
    "edited_at" TIMESTAMPTZ(6),
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "alvos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_settings" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "app_settings_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "coupons" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "store" TEXT,
    "code" TEXT,
    "title" TEXT NOT NULL,
    "discount_kind" TEXT,
    "discount_value" INTEGER,
    "cap_cents" INTEGER,
    "min_cents" INTEGER,
    "conditions" JSONB NOT NULL DEFAULT '[]',
    "url" TEXT,
    "post_url" TEXT,
    "offer_ids" JSONB NOT NULL DEFAULT '[]',
    "source_names" JSONB NOT NULL DEFAULT '[]',
    "for_product" TEXT,
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "first_seen_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coupons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" SERIAL NOT NULL,
    "type" TEXT NOT NULL,
    "offer_id" INTEGER,
    "title" TEXT NOT NULL,
    "detail" JSONB,
    "at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "insights" (
    "id" SERIAL NOT NULL,
    "produto_id" INTEGER NOT NULL,
    "periodo" DATE NOT NULL,
    "hash_dados" TEXT NOT NULL,
    "provedor" TEXT NOT NULL,
    "modelo" TEXT NOT NULL,
    "insight" JSONB NOT NULL,
    "gerado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "insights_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invites" (
    "link" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "mentions" INTEGER NOT NULL DEFAULT 1,
    "from_source" TEXT,
    "dismissed" BOOLEAN NOT NULL DEFAULT false,
    "first_seen_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invites_pkey" PRIMARY KEY ("link")
);

-- CreateTable
CREATE TABLE "market_obs" (
    "store" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "alvo_id" INTEGER NOT NULL,
    "band_key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "price_card_cents" INTEGER NOT NULL,
    "seen_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "market_obs_store_code_pk" PRIMARY KEY ("store","code")
);

-- CreateTable
CREATE TABLE "offer_analyses" (
    "offer_id" INTEGER NOT NULL,
    "hash" TEXT NOT NULL,
    "verdict" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "confidence" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "pros" JSONB NOT NULL DEFAULT '[]',
    "cons" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "offer_analyses_pkey" PRIMARY KEY ("offer_id")
);

-- CreateTable
CREATE TABLE "offers" (
    "id" SERIAL NOT NULL,
    "raw_message_id" INTEGER NOT NULL,
    "source_id" INTEGER NOT NULL,
    "product_id" INTEGER,
    "alvo_id" INTEGER,
    "title" TEXT NOT NULL,
    "store" TEXT,
    "url" TEXT,
    "image_url" TEXT,
    "price_card_cents" INTEGER,
    "price_basis" TEXT,
    "installments" INTEGER,
    "installment_cents" INTEGER,
    "interest" BOOLEAN,
    "cash_cents" INTEGER,
    "list_price_cents" INTEGER,
    "shipping_cents" INTEGER,
    "free_shipping" BOOLEAN,
    "coupon" TEXT,
    "verify_status" TEXT NOT NULL DEFAULT 'pendente',
    "verify_note" TEXT,
    "verified_at" TIMESTAMPTZ(6),
    "nota" INTEGER,
    "nota_parts" JSONB,
    "watched" BOOLEAN NOT NULL DEFAULT false,
    "dismissed" BOOLEAN NOT NULL DEFAULT false,
    "snoozed_until" TIMESTAMPTZ(6),
    "specs" JSONB,
    "band_key" TEXT,
    "available" BOOLEAN,
    "extra" JSONB,
    "hit_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "kind" TEXT NOT NULL DEFAULT 'produto',
    "category" TEXT,
    "category_source" TEXT,

    CONSTRAINT "offers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "price_points" (
    "id" SERIAL NOT NULL,
    "product_id" INTEGER NOT NULL,
    "price_card_cents" INTEGER,
    "cash_cents" INTEGER,
    "installments" INTEGER,
    "interest" BOOLEAN,
    "shipping_cents" INTEGER,
    "free_shipping" BOOLEAN,
    "image_url" TEXT,
    "origin" TEXT NOT NULL,
    "observed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "price_points_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" SERIAL NOT NULL,
    "store" TEXT NOT NULL,
    "store_product_id" TEXT NOT NULL,
    "canonical_url" TEXT NOT NULL,
    "title" TEXT,
    "image_url" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "raw_messages" (
    "id" SERIAL NOT NULL,
    "source_id" INTEGER NOT NULL,
    "external_id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "url" TEXT,
    "outbound_url" TEXT,
    "image_url" TEXT,
    "seen_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "raw_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sources" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'ok',
    "status_note" TEXT,
    "decision" TEXT,
    "stats" JSONB,
    "last_message_at" TIMESTAMPTZ(6),
    "last_run_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "config" JSONB,
    "origin" TEXT NOT NULL DEFAULT 'codigo',
    "interval_min" INTEGER,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "store_state" (
    "slug" TEXT NOT NULL,
    "paused_by_user" BOOLEAN NOT NULL DEFAULT false,
    "pause_until" TIMESTAMPTZ(6),
    "pause_note" TEXT,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "store_state_pkey" PRIMARY KEY ("slug")
);

-- CreateTable
CREATE TABLE "worker_state" (
    "id" TEXT NOT NULL,
    "beat_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "started_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "roles" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "worker_state_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "alvos_slug_unique" ON "alvos"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "coupons_key_unique" ON "coupons"("key");

-- CreateIndex
CREATE UNIQUE INDEX "insights_produto_periodo_hash" ON "insights"("produto_id", "periodo", "hash_dados");

-- CreateIndex
CREATE UNIQUE INDEX "offers_raw_message" ON "offers"("raw_message_id");

-- CreateIndex
CREATE UNIQUE INDEX "products_store_id" ON "products"("store", "store_product_id");

-- CreateIndex
CREATE UNIQUE INDEX "raw_messages_source_external" ON "raw_messages"("source_id", "external_id");

-- CreateIndex
CREATE UNIQUE INDEX "sources_slug_unique" ON "sources"("slug");

-- AddForeignKey
ALTER TABLE "alvo_refs" ADD CONSTRAINT "alvo_refs_alvo_id_alvos_id_fk" FOREIGN KEY ("alvo_id") REFERENCES "alvos"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_offer_id_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "offers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "insights" ADD CONSTRAINT "insights_produto_id_products_id_fk" FOREIGN KEY ("produto_id") REFERENCES "products"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "market_obs" ADD CONSTRAINT "market_obs_alvo_id_alvos_id_fk" FOREIGN KEY ("alvo_id") REFERENCES "alvos"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "offer_analyses" ADD CONSTRAINT "offer_analyses_offer_id_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "offers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "offers" ADD CONSTRAINT "offers_alvo_id_alvos_id_fk" FOREIGN KEY ("alvo_id") REFERENCES "alvos"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "offers" ADD CONSTRAINT "offers_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "offers" ADD CONSTRAINT "offers_raw_message_id_raw_messages_id_fk" FOREIGN KEY ("raw_message_id") REFERENCES "raw_messages"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "offers" ADD CONSTRAINT "offers_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "sources"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "price_points" ADD CONSTRAINT "price_points_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "raw_messages" ADD CONSTRAINT "raw_messages_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "sources"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

