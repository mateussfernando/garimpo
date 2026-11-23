-- Fase 7 do deploy-v2: tranca todas as tabelas para quem não é o dono. Não muda nenhum dado.
-- O site e o worker entram como o dono das tabelas (postgres) e não são afetados pelo RLS (Row Level Security).
-- No Supabase, a "Data API" (PostgREST) entra como os papéis anon e authenticated: sem política nenhuma e sem
-- permissão, eles não leem nem escrevem nada, mesmo que alguém descubra a chave anon do projeto.
-- Tabela nova em migração futura: incluir "ALTER TABLE ... ENABLE ROW LEVEL SECURITY" (confira com `pnpm db:travas`).
DO $$
DECLARE
  t record;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.tablename);
  END LOOP;
  -- Só existem no Supabase.
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') AND EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
    REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
    REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon, authenticated;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM anon, authenticated;
  END IF;
END $$;
