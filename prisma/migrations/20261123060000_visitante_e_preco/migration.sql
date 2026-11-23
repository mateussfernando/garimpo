-- Vitrine aberta e preço preferido. Só acrescenta.
-- 1) Cargo "Visitante": o que quem não entrou na conta pode ver. É um cargo como os outros (as permissões se mudam na tela
--    Usuários); desmarcar "ofertas.ver" nele fecha o site de novo para quem não tem conta. Não é o cargo de quem se cadastra.
INSERT INTO "cargos" ("slug", "nome", "descricao", "todas", "padrao", "sistema") VALUES
  ('visitante', 'Visitante', 'Quem ainda não tem conta: vê a Vitrine, o Detalhe e os Cupons; vigiar, descartar e Alvos pedem conta', false, false, true)
ON CONFLICT DO NOTHING;
INSERT INTO "cargo_permissoes" ("cargo_id", "permissao_slug")
  SELECT c."id", p."slug" FROM "cargos" c, "permissoes" p
  WHERE c."slug" = 'visitante' AND p."slug" IN ('ofertas.ver', 'ia.analises.ver')
ON CONFLICT DO NOTHING;

-- 2) Preço que a pessoa prefere ver em destaque: 'cartao' (padrão do app) ou 'pix'. Vazio = ainda não escolheu.
ALTER TABLE "usuarios" ADD COLUMN "preco_preferido" TEXT;
