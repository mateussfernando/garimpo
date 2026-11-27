-- CreateTable
CREATE TABLE "oauth_clientes" (
    "id" SERIAL NOT NULL,
    "client_id" TEXT NOT NULL,
    "segredo_hash" TEXT,
    "auth_metodo" TEXT NOT NULL DEFAULT 'none',
    "nome" TEXT NOT NULL,
    "redirect_uris" TEXT[],
    "criado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "oauth_clientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "oauth_codigos" (
    "id" SERIAL NOT NULL,
    "hash" TEXT NOT NULL,
    "cliente_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "redirect_uri" TEXT NOT NULL,
    "desafio" TEXT NOT NULL,
    "escopo" TEXT NOT NULL DEFAULT '',
    "expira_em" TIMESTAMPTZ(6) NOT NULL,
    "usado_em" TIMESTAMPTZ(6),
    "criado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "oauth_codigos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "oauth_tokens" (
    "id" SERIAL NOT NULL,
    "hash" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "cliente_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "escopo" TEXT NOT NULL DEFAULT '',
    "expira_em" TIMESTAMPTZ(6) NOT NULL,
    "criado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usado_em" TIMESTAMPTZ(6),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "oauth_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "oauth_clientes_client_id_key" ON "oauth_clientes"("client_id");

-- CreateIndex
CREATE UNIQUE INDEX "oauth_codigos_hash_key" ON "oauth_codigos"("hash");

-- CreateIndex
CREATE UNIQUE INDEX "oauth_tokens_hash_key" ON "oauth_tokens"("hash");

-- CreateIndex
CREATE INDEX "oauth_tokens_user_id_idx" ON "oauth_tokens"("user_id");

-- AddForeignKey
ALTER TABLE "oauth_codigos" ADD CONSTRAINT "oauth_codigos_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "oauth_clientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "oauth_codigos" ADD CONSTRAINT "oauth_codigos_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "oauth_tokens" ADD CONSTRAINT "oauth_tokens_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "oauth_clientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "oauth_tokens" ADD CONSTRAINT "oauth_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Tabelas novas = trava ligada (RLS), como as outras (pnpm db:travas confere).
ALTER TABLE "oauth_clientes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "oauth_codigos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "oauth_tokens" ENABLE ROW LEVEL SECURITY;
