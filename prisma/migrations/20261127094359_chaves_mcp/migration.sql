-- CreateTable
CREATE TABLE "chaves_mcp" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "nome" TEXT NOT NULL,
    "prefixo" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "criada_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usada_em" TIMESTAMPTZ(6),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "chaves_mcp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "chaves_mcp_hash_key" ON "chaves_mcp"("hash");

-- CreateIndex
CREATE INDEX "chaves_mcp_user_id_idx" ON "chaves_mcp"("user_id");

-- AddForeignKey
ALTER TABLE "chaves_mcp" ADD CONSTRAINT "chaves_mcp_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Tabela nova = trava ligada (RLS), como as outras (pnpm db:travas confere).
ALTER TABLE "chaves_mcp" ENABLE ROW LEVEL SECURITY;
