-- CreateTable
CREATE TABLE "acessos" (
    "id" SERIAL NOT NULL,
    "quem" TEXT NOT NULL,
    "user_id" INTEGER,
    "hora" TIMESTAMPTZ(6) NOT NULL,
    "primeira_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ultima_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paginas" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "acessos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "acessos_ultima_em_idx" ON "acessos"("ultima_em");

-- CreateIndex
CREATE INDEX "acessos_hora_idx" ON "acessos"("hora");

-- CreateIndex
CREATE UNIQUE INDEX "acessos_quem_hora" ON "acessos"("quem", "hora");


-- Tabela nova = trava ligada (RLS), como as outras (pnpm db:travas confere).
ALTER TABLE "acessos" ENABLE ROW LEVEL SECURITY;
