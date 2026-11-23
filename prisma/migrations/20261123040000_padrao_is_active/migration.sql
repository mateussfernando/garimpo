-- Padrão is_active (o do usuário nos esquemas dele): toda tabela em que dá para ligar ou desligar uma linha usa a
-- mesma coluna, is_active (true = ativa). Nada é apagado.
-- 1) As colunas que já tinham essa ideia com outro nome são renomeadas (os dados ficam). Duas vinham ao contrário
--    (hidden e paused_by_user: true = desligado) e têm o valor invertido na mesma hora.
ALTER TABLE "alvos" RENAME COLUMN "active" TO "is_active";
ALTER TABLE "sources" RENAME COLUMN "enabled" TO "is_active";

ALTER TABLE "coupons" RENAME COLUMN "hidden" TO "is_active";
UPDATE "coupons" SET "is_active" = NOT "is_active";
ALTER TABLE "coupons" ALTER COLUMN "is_active" SET DEFAULT true;

ALTER TABLE "store_state" RENAME COLUMN "paused_by_user" TO "is_active";
UPDATE "store_state" SET "is_active" = NOT "is_active";
ALTER TABLE "store_state" ALTER COLUMN "is_active" SET DEFAULT true;

-- 2) Colunas novas (tudo começa ativo).
ALTER TABLE "cargos" ADD COLUMN "is_active" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "offers" ADD COLUMN "is_active" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "products" ADD COLUMN "is_active" BOOLEAN NOT NULL DEFAULT true;

-- 3) Permissão nova: tirar uma oferta ou um produto da Vitrine de todos (o admin tem todas).
INSERT INTO "permissoes" ("slug", "descricao") VALUES
  ('ofertas.moderar', 'Tirar uma oferta ou um produto da Vitrine de todos')
ON CONFLICT DO NOTHING;
