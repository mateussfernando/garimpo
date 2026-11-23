-- Coluna is_active em usuarios (padrão do usuário para ativar/desativar uma linha). Só acrescenta: toda conta começa ativa.
-- AlterTable
ALTER TABLE "usuarios" ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true;
