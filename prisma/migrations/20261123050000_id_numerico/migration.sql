-- Ids numéricos (1, 2, 3...) no lugar dos textos aleatórios do login, a pedido do usuário.
-- Os usuários são numerados pela data de criação (1 = o mais antigo) e o id antigo fica em usuarios.id_antigo.
-- Tudo que apontava para usuarios.id (Alvos, marcações, eventos, sessões e contas de login) é convertido para o número
-- novo antes de a coluna antiga sair; nenhuma linha é apagada e as sessões abertas continuam valendo.
-- As tabelas do login (sessoes, contas, verificacoes, limites_de_acesso) também passam a ter id numérico
-- (o better-auth usa o mesmo tipo de id em todas elas: generateId "serial").

-- 1) usuarios: número novo por ordem de criação, guardando o id antigo.
ALTER TABLE "usuarios" ADD COLUMN "id_antigo" TEXT;
UPDATE "usuarios" SET "id_antigo" = "id";
ALTER TABLE "usuarios" ADD COLUMN "id_novo" INTEGER;
UPDATE "usuarios" u SET "id_novo" = n.rn
  FROM (SELECT "id", (row_number() OVER (ORDER BY "created_at", "id"))::int AS rn FROM "usuarios") n
  WHERE n."id" = u."id";

-- 2) Cada tabela que aponta para o usuário ganha a coluna com o número novo, preenchida pelo id antigo.
ALTER TABLE "alvos" ADD COLUMN "owner_id_novo" INTEGER;
UPDATE "alvos" t SET "owner_id_novo" = u."id_novo" FROM "usuarios" u WHERE u."id" = t."owner_id";
ALTER TABLE "events" ADD COLUMN "user_id_novo" INTEGER;
UPDATE "events" t SET "user_id_novo" = u."id_novo" FROM "usuarios" u WHERE u."id" = t."user_id";
ALTER TABLE "oferta_alvo" ADD COLUMN "user_id_novo" INTEGER;
UPDATE "oferta_alvo" t SET "user_id_novo" = u."id_novo" FROM "usuarios" u WHERE u."id" = t."user_id";
ALTER TABLE "oferta_usuario" ADD COLUMN "user_id_novo" INTEGER;
UPDATE "oferta_usuario" t SET "user_id_novo" = u."id_novo" FROM "usuarios" u WHERE u."id" = t."user_id";
ALTER TABLE "sessoes" ADD COLUMN "user_id_novo" INTEGER;
UPDATE "sessoes" t SET "user_id_novo" = u."id_novo" FROM "usuarios" u WHERE u."id" = t."user_id";
ALTER TABLE "contas" ADD COLUMN "user_id_novo" INTEGER;
UPDATE "contas" t SET "user_id_novo" = u."id_novo" FROM "usuarios" u WHERE u."id" = t."user_id";

-- Quem assumiu os dados de antes das contas (guardado em app_settings) também passa para o número.
UPDATE "app_settings" s SET "value" = jsonb_set(s."value", '{userId}', to_jsonb(u."id_novo"))
  FROM "usuarios" u WHERE s."key" = 'dados_antigos' AND u."id_antigo" = s."value"->>'userId';

-- 3) Solta as ligações e chaves antigas.
ALTER TABLE "alvos" DROP CONSTRAINT "alvos_owner_id_fkey";
ALTER TABLE "events" DROP CONSTRAINT "events_user_id_fkey";
ALTER TABLE "oferta_alvo" DROP CONSTRAINT "oferta_alvo_user_id_fkey";
ALTER TABLE "oferta_alvo" DROP CONSTRAINT "oferta_alvo_pkey";
ALTER TABLE "oferta_usuario" DROP CONSTRAINT "oferta_usuario_user_id_fkey";
ALTER TABLE "oferta_usuario" DROP CONSTRAINT "oferta_usuario_pkey";
ALTER TABLE "sessoes" DROP CONSTRAINT "sessoes_user_id_fkey";
ALTER TABLE "contas" DROP CONSTRAINT "contas_user_id_fkey";
ALTER TABLE "usuarios" DROP CONSTRAINT "usuarios_pkey";

-- 4) Troca as colunas (a antiga sai; o mapeamento fica em usuarios.id_antigo). Os índices da coluna antiga saem junto.
ALTER TABLE "alvos" DROP COLUMN "owner_id";
ALTER TABLE "alvos" RENAME COLUMN "owner_id_novo" TO "owner_id";
ALTER TABLE "events" DROP COLUMN "user_id";
ALTER TABLE "events" RENAME COLUMN "user_id_novo" TO "user_id";
ALTER TABLE "oferta_alvo" DROP COLUMN "user_id";
ALTER TABLE "oferta_alvo" RENAME COLUMN "user_id_novo" TO "user_id";
ALTER TABLE "oferta_usuario" DROP COLUMN "user_id";
ALTER TABLE "oferta_usuario" RENAME COLUMN "user_id_novo" TO "user_id";
ALTER TABLE "sessoes" DROP COLUMN "user_id";
ALTER TABLE "sessoes" RENAME COLUMN "user_id_novo" TO "user_id";
ALTER TABLE "contas" DROP COLUMN "user_id";
ALTER TABLE "contas" RENAME COLUMN "user_id_novo" TO "user_id";
ALTER TABLE "usuarios" DROP COLUMN "id";
ALTER TABLE "usuarios" RENAME COLUMN "id_novo" TO "id";

-- 5) usuarios.id vira SERIAL: a próxima conta é o número seguinte.
CREATE SEQUENCE "usuarios_id_seq" OWNED BY "usuarios"."id";
SELECT setval('"usuarios_id_seq"', COALESCE((SELECT max("id") FROM "usuarios"), 0) + 1, false);
ALTER TABLE "usuarios" ALTER COLUMN "id" SET DEFAULT nextval('"usuarios_id_seq"');
ALTER TABLE "usuarios" ALTER COLUMN "id" SET NOT NULL;
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id");
CREATE UNIQUE INDEX "usuarios_id_antigo_key" ON "usuarios"("id_antigo");

-- 6) As tabelas do login: id numérico (SERIAL). As linhas existentes ganham 1, 2, 3...
ALTER TABLE "sessoes" DROP CONSTRAINT "sessoes_pkey";
ALTER TABLE "sessoes" DROP COLUMN "id";
ALTER TABLE "sessoes" ADD COLUMN "id" SERIAL NOT NULL;
ALTER TABLE "sessoes" ADD CONSTRAINT "sessoes_pkey" PRIMARY KEY ("id");
ALTER TABLE "contas" DROP CONSTRAINT "contas_pkey";
ALTER TABLE "contas" DROP COLUMN "id";
ALTER TABLE "contas" ADD COLUMN "id" SERIAL NOT NULL;
ALTER TABLE "contas" ADD CONSTRAINT "contas_pkey" PRIMARY KEY ("id");
ALTER TABLE "verificacoes" DROP CONSTRAINT "verificacoes_pkey";
ALTER TABLE "verificacoes" DROP COLUMN "id";
ALTER TABLE "verificacoes" ADD COLUMN "id" SERIAL NOT NULL;
ALTER TABLE "verificacoes" ADD CONSTRAINT "verificacoes_pkey" PRIMARY KEY ("id");
ALTER TABLE "limites_de_acesso" DROP CONSTRAINT "limites_de_acesso_pkey";
ALTER TABLE "limites_de_acesso" DROP COLUMN "id";
ALTER TABLE "limites_de_acesso" ADD COLUMN "id" SERIAL NOT NULL;
ALTER TABLE "limites_de_acesso" ADD CONSTRAINT "limites_de_acesso_pkey" PRIMARY KEY ("id");

-- Na conta de e-mail e senha, o account_id do login é o próprio id do usuário.
UPDATE "contas" SET "account_id" = "user_id"::text WHERE "provider_id" = 'credential';

-- 7) Refaz o que aponta para o usuário: obrigatoriedade, chaves, ligações e índices.
ALTER TABLE "events" ALTER COLUMN "user_id" DROP NOT NULL;
ALTER TABLE "oferta_alvo" ALTER COLUMN "user_id" SET NOT NULL;
ALTER TABLE "oferta_usuario" ALTER COLUMN "user_id" SET NOT NULL;
ALTER TABLE "sessoes" ALTER COLUMN "user_id" SET NOT NULL;
ALTER TABLE "contas" ALTER COLUMN "user_id" SET NOT NULL;
ALTER TABLE "oferta_alvo" ADD CONSTRAINT "oferta_alvo_pkey" PRIMARY KEY ("offer_id", "user_id");
ALTER TABLE "oferta_usuario" ADD CONSTRAINT "oferta_usuario_pkey" PRIMARY KEY ("user_id", "offer_id");
CREATE UNIQUE INDEX "alvos_dono_slug" ON "alvos"("owner_id", "slug");
CREATE INDEX "events_user_id_id_idx" ON "events"("user_id", "id");
CREATE INDEX "oferta_alvo_user_id_alvo_id_idx" ON "oferta_alvo"("user_id", "alvo_id");
CREATE INDEX "sessoes_user_id_idx" ON "sessoes"("user_id");
CREATE INDEX "contas_user_id_idx" ON "contas"("user_id");
ALTER TABLE "alvos" ADD CONSTRAINT "alvos_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "events" ADD CONSTRAINT "events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "oferta_alvo" ADD CONSTRAINT "oferta_alvo_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "oferta_usuario" ADD CONSTRAINT "oferta_usuario_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "sessoes" ADD CONSTRAINT "sessoes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "contas" ADD CONSTRAINT "contas_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
