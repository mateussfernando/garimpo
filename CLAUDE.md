@AGENTS.md

# Garimpo

App pessoal que roda em localhost nos dois PCs do usuário. Acha as melhores ofertas do 11.11 e da Black Friday para os Alvos dele, que compra no cartão parcelado.

## Plano acelerado (decidido em 10/11 às 18:20, vale até o fim do 11.11)
- Nada de coleta rodando sozinha: sem coleta diária, sem agendamento e sem pg-boss hoje. Só a verificação ao vivo de cada oferta que chega, numa fila em memória por domínio, com as mesmas regras de coleta educada.
- O WhatsApp fica fora hoje. O Telegram ENTRA no 11.11 (decidido em 10/11 às 21:10): Escuta só leitura com GramJS na conta do usuário, papel `listen`. As outras ofertas vêm do scraping ao vivo de Pelando, Promobit, fórum do Hardmob e vitrines de ofertas das lojas, só com o app aberto.
- Tudo roda num PC só. O outro só abre a Vitrine pela rede (next dev -H 0.0.0.0).
- Tabelas de hoje: sources, raw_messages, offers, products, price_points, alvos, ai_usage e insights.
- Hoje não entram Playwright, War Room, job de insights, Black Fraude nem desconto real. Use a Nota rápida do prompts/hoje/04.
- Siga ETAPAS.md e prompts/hoje/. O resto deste arquivo volta a valer depois do 11.11.

## Arquitetura
- Next.js 16.4 (App Router) + TypeScript estrito + Tailwind v4 + shadcn/ui + Motion.
- PostgreSQL + Drizzle (driver pg) em src/lib/db, compartilhado com o worker. DATABASE_URL no .env.
- worker/ é um processo Node separado (tsx watch), um por PC. WORKER_ROLES liga os papéis: listen, collect, verify, ai.
- Filas e agendamentos com pg-boss no próprio Postgres. Uma fila por domínio, global para os dois PCs.
- Tempo real: o worker chama pg_notify; app/api/stream/route.ts faz LISTEN e SSE. Com Cache Components não se exporta `runtime`; rotas que leem o banco chamam `await connection()`.
- WhatsApp: whatsapp-web.js oficial, SOMENTE LEITURA, papel listen só no PC de 16 GB. Proibido enviar mensagens ou entrar em grupos.
- Telegram: pacote telegram (GramJS), somente leitura.
- Sem notificação no celular ou no WhatsApp: alertas só na Vitrine. Fontes e Alvos são descobertos sozinhos: o usuário só confirma, nunca digita config.
- IA: worker/ai/providers, uma interface AiProvider e três provedores escolhidos por AI_PROVIDER: claude-cli (teste: claude -p oficial com a assinatura do usuário via CLAUDE_CODE_OAUTH_TOKEN, sem ANTHROPIC_API_KEY no ambiente do filho, sem --bare, pasta vazia e CLAUDE_CONFIG_DIR próprio), anthropic-api (@anthropic-ai/sdk) e ollama. Modelo único: claude-haiku-5-5 (o mais simples) em toda chamada e em todo provedor, inclusive compilar Alvos e o analista; nada de Sonnet ou Opus.
- Insights: job agendado; métricas calculadas no código, IA só se o hash mudou, resultado na tabela insights. Nenhuma chamada de IA dentro de uma requisição do site.

## Regras
- Determinístico primeiro. IA só como fallback, em lote, via worker/ai.
- Toda chamada de IA passa por worker/ai/budget.ts: registra usage, calcula o custo com config/pricing.ts e recusa se o total for >= US$ 4,50 (no claude-cli, se passar de AI_MAX_CHAMADAS_DIA).
- Haiku 5.5: sem temperature/top_p/top_k, sem prefill, resposta via output_config.format (JSON Schema gerado do Zod), effort baixo para extração, prompt abaixo de 100 mil tokens, tratar stop_reason "refusal".
- Preço em centavos (inteiro). Preço principal = total no cartão no maior número de parcelas sem juros. "10x de R$ 129,90 sem juros" -> 129900. Guardar parcela, juros (sim/não), à vista e frete.
- Domínio fora de config/stores.ts = suspeito: não abrir, não mostrar na Vitrine principal.
- Coleta educada: ler robots.txt, 1 requisição por domínio a cada 5-10 s, cache (10 min na verificação, 12 h na coleta diária), pausa de 1 h em 429/403, User-Agent fixo, sem proxy. Falhou = "não verificado".
- Não adicionar dependências sem perguntar. Nunca instalar forks de whatsapp-web.js ou baileys.
- O parser só muda com os testes Vitest de fixtures/messages passando.

## Interface
- Home = Vitrine: grade de cards com foto, total no cartão, parcela, selos (frete grátis, desconto real, Black Fraude, com juros), nota e botão Comprar.
- Tema escuro, Geist + Geist Mono com tabular-nums. Ouro só para "Alvo atingido", verde para desconto real e frete grátis, vermelho para Black Fraude e "com juros".
- Atalhos: J/K, Enter (Comprar), C, B, X, S, W, Cmd+K.
- Todo estado incerto vira selo: verificado há X min, não verificado, sem histórico.

## Diário de bordo e etapas
- Ao começar uma sessão: leia DIARIO-DE-BORDO.md e ETAPAS.md e continue da primeira etapa sem [x]. Não reabra decisões da tabela do diário sem o usuário pedir.
- Ao terminar uma etapa (ou a sessão): marque [x] em ETAPAS.md, escreva uma entrada no topo do Registro do diário (feito, decisões, pendente, próximo passo, como testar) e faça commit "diario: <etapa> <resumo>".
- Uma etapa só termina com o "Pronto quando" cumprido. Às 18h de 10/11, siga a linha de corte do ETAPAS.md.

## Referências
- DIARIO-DE-BORDO.md: estado atual, decisões tomadas, perguntas em aberto e o registro de cada sessão.
- ETAPAS.md: as 11 etapas, com prompt, PC, horário e critério de pronto.
- docs/garimpo.md: o plano completo, com o porquê de cada decisão (fontes, Nota Garimpo, IA, riscos). Leia antes de começar.
- design/: as telas aprovadas. Main.dc.html = Vitrine (home), Detalhe.dc.html, WarRoom.dc.html, Fontes.dc.html e Lojas.dc.html. Antes de mexer em UI, leia design/README.md e design/tokens.md. Implemente em React + Tailwind + shadcn seguindo layout, cores, textos e interações; não copie o HTML.
- prompts/: os 8 passos, na ordem. Cada um termina com "Pronto quando"; pare ali e mostre o resultado.
