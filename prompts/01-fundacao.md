# 1. Fundação

Siga o CLAUDE.md. Crie o projeto Garimpo: Next.js 16.4 com App Router, TypeScript, Tailwind e shadcn; pasta worker/ rodando com tsx watch; PostgreSQL com Drizzle (DATABASE_URL no .env) e as tabelas sources, raw_messages, offers, products, price_points, stores, suggestions, alvos, matches, coupons, purchases, ai_usage, insights e events; pg-boss instalado. O script pnpm dev sobe Next e worker juntos com concurrently.
Pronto quando: pnpm dev abre localhost:3000, o worker loga "worker ok" com os papéis de WORKER_ROLES e as tabelas aparecem no DBeaver.
