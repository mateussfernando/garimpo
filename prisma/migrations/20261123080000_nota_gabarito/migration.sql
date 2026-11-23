-- CreateTable
CREATE TABLE "nota_registro" (
    "id" SERIAL NOT NULL,
    "offer_id" INTEGER NOT NULL,
    "product_id" INTEGER,
    "registrado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nota_algoritmo" INTEGER,
    "base_algoritmo" DOUBLE PRECISION,
    "nota_ia" INTEGER NOT NULL,
    "confianca_ia" TEXT NOT NULL,
    "veredito_ia" TEXT NOT NULL,
    "preco_cartao_cents" INTEGER,
    "preco_pix_cents" INTEGER,

    CONSTRAINT "nota_registro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nota_feedback" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "offer_id" INTEGER NOT NULL,
    "voto" INTEGER NOT NULL,
    "nota_mostrada" DOUBLE PRECISION,
    "preco" TEXT NOT NULL,
    "criado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "nota_feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cliques_comprar" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "offer_id" INTEGER NOT NULL,
    "criado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cliques_comprar_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "nota_registro_offer_id_idx" ON "nota_registro"("offer_id");

-- CreateIndex
CREATE INDEX "nota_registro_product_id_registrado_em_idx" ON "nota_registro"("product_id", "registrado_em");

-- CreateIndex
CREATE INDEX "nota_feedback_offer_id_idx" ON "nota_feedback"("offer_id");

-- CreateIndex
CREATE UNIQUE INDEX "nota_feedback_conta_oferta" ON "nota_feedback"("user_id", "offer_id");

-- CreateIndex
CREATE INDEX "cliques_comprar_user_id_criado_em_idx" ON "cliques_comprar"("user_id", "criado_em");

-- CreateIndex
CREATE INDEX "cliques_comprar_offer_id_idx" ON "cliques_comprar"("offer_id");


-- Tabela nova = trava ligada (RLS), como as outras (pnpm db:travas confere).
ALTER TABLE "nota_registro" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "nota_feedback" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "cliques_comprar" ENABLE ROW LEVEL SECURITY;
