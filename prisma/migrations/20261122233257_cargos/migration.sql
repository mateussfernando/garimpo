-- AlterTable
ALTER TABLE "usuarios" ADD COLUMN     "cargo_id" INTEGER;

-- CreateTable
CREATE TABLE "cargos" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "todas" BOOLEAN NOT NULL DEFAULT false,
    "padrao" BOOLEAN NOT NULL DEFAULT false,
    "sistema" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cargos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissoes" (
    "slug" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,

    CONSTRAINT "permissoes_pkey" PRIMARY KEY ("slug")
);

-- CreateTable
CREATE TABLE "cargo_permissoes" (
    "cargo_id" INTEGER NOT NULL,
    "permissao_slug" TEXT NOT NULL,

    CONSTRAINT "cargo_permissoes_pkey" PRIMARY KEY ("cargo_id","permissao_slug")
);

-- CreateIndex
CREATE UNIQUE INDEX "cargos_slug_key" ON "cargos"("slug");

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_cargo_id_fkey" FOREIGN KEY ("cargo_id") REFERENCES "cargos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cargo_permissoes" ADD CONSTRAINT "cargo_permissoes_cargo_id_fkey" FOREIGN KEY ("cargo_id") REFERENCES "cargos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cargo_permissoes" ADD CONSTRAINT "cargo_permissoes_permissao_slug_fkey" FOREIGN KEY ("permissao_slug") REFERENCES "permissoes"("slug") ON DELETE CASCADE ON UPDATE CASCADE;

-- Ponto de partida dos cargos (só INSERT, nada é apagado).
INSERT INTO "permissoes" ("slug", "descricao") VALUES
  ('ofertas.ver', 'Ver a Vitrine, o Detalhe das ofertas e os Cupons'),
  ('ia.analises.ver', 'Ver as análises da IA (veredito, nota, resumo e radar)'),
  ('alvos.proprios', 'Criar e editar os próprios Alvos'),
  ('ofertas.detalhes_internos', 'Ver os nomes dos grupos, o link do post e o motivo técnico da conferência'),
  ('ia.gerenciar', 'Fila da IA, custo e uso da assinatura, Pausar, Chamar IA e escolher Claude ou agy'),
  ('fontes.gerenciar', 'Tela Fontes: grupos, convites, sugestões e fontes configuráveis'),
  ('lojas.gerenciar', 'Tela Lojas: saúde das lojas e pausar a conferência'),
  ('cupons.moderar', 'Esconder um cupom para todos'),
  ('sistema.ver', 'Saúde das fontes, máquina e fila de conferência no cabeçalho'),
  ('usuarios.gerenciar', 'Usuários e cargos')
ON CONFLICT DO NOTHING;
INSERT INTO "cargos" ("slug", "nome", "descricao", "todas", "padrao", "sistema") VALUES
  ('admin', 'Administrador', 'Tudo, inclusive fontes, lojas, IA, usuários e cargos', true, false, true),
  ('usuario', 'Usuário', 'Quem se cadastra: ofertas, cupons e os próprios Alvos', false, true, true)
ON CONFLICT DO NOTHING;
INSERT INTO "cargo_permissoes" ("cargo_id", "permissao_slug")
  SELECT c.id, p.slug FROM "cargos" c, "permissoes" p
  WHERE (c.slug = 'admin') OR (c.slug = 'usuario' AND p.slug IN ('ofertas.ver', 'ia.analises.ver', 'alvos.proprios'))
ON CONFLICT DO NOTHING;
