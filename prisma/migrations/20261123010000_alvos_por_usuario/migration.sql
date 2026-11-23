-- Fase 6 do deploy-v2: Alvos e marcações de cada usuário. Só acrescenta: colunas novas (alvos.owner_id, events.user_id)
-- e as tabelas oferta_alvo e oferta_usuario. Nada é apagado; os Alvos, marcações e eventos de antes das contas ficam
-- como estão e passam para o admin quando ele rodar `pnpm admin:criar` (cópia, sem apagar a origem).

-- AlterTable
ALTER TABLE "alvos" ADD COLUMN     "owner_id" TEXT;

-- AlterTable
ALTER TABLE "events" ADD COLUMN     "user_id" TEXT;

-- CreateTable
CREATE TABLE "oferta_alvo" (
    "offer_id" INTEGER NOT NULL,
    "user_id" TEXT NOT NULL,
    "alvo_id" INTEGER,
    "band_key" TEXT,
    "nota" INTEGER,
    "nota_parts" JSONB,
    "hit_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "oferta_alvo_pkey" PRIMARY KEY ("offer_id","user_id")
);

-- CreateTable
CREATE TABLE "oferta_usuario" (
    "user_id" TEXT NOT NULL,
    "offer_id" INTEGER NOT NULL,
    "watched" BOOLEAN NOT NULL DEFAULT false,
    "dismissed" BOOLEAN NOT NULL DEFAULT false,
    "snoozed_until" TIMESTAMPTZ(6),
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "oferta_usuario_pkey" PRIMARY KEY ("user_id","offer_id")
);

-- CreateIndex
CREATE INDEX "oferta_alvo_user_id_alvo_id_idx" ON "oferta_alvo"("user_id", "alvo_id");

-- CreateIndex
CREATE INDEX "oferta_alvo_alvo_id_band_key_idx" ON "oferta_alvo"("alvo_id", "band_key");

-- CreateIndex
CREATE INDEX "oferta_usuario_offer_id_idx" ON "oferta_usuario"("offer_id");

-- CreateIndex
CREATE UNIQUE INDEX "alvos_dono_slug" ON "alvos"("owner_id", "slug");

-- O nome (slug) de um Alvo passa a ser único por dono, não no app todo: cada usuário tem o seu "monitor".
-- Sai só a regra antiga de unicidade; nenhum dado muda.
-- No banco que veio do Drizzle é uma restrição; num banco novo (0_init), um índice. Vale para os dois.
ALTER TABLE "alvos" DROP CONSTRAINT IF EXISTS "alvos_slug_unique";
DROP INDEX IF EXISTS "alvos_slug_unique";

-- CreateIndex
CREATE INDEX "events_user_id_id_idx" ON "events"("user_id", "id");

-- AddForeignKey
ALTER TABLE "alvos" ADD CONSTRAINT "alvos_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "oferta_alvo" ADD CONSTRAINT "oferta_alvo_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "offers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "oferta_alvo" ADD CONSTRAINT "oferta_alvo_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "oferta_alvo" ADD CONSTRAINT "oferta_alvo_alvo_id_fkey" FOREIGN KEY ("alvo_id") REFERENCES "alvos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "oferta_usuario" ADD CONSTRAINT "oferta_usuario_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "oferta_usuario" ADD CONSTRAINT "oferta_usuario_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "offers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
