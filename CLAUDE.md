@AGENTS.md

# Garimpo

App pessoal que roda em localhost num PC só do usuário (decisão de 10/11: o segundo PC saiu do plano). Acha as melhores ofertas do 11.11 e da Black Friday para os Alvos dele, que compra no cartão parcelado.

## Plano acelerado (decidido em 10/11 às 18:20, vale até o fim do 11.11)
- Nada de coleta rodando sozinha: sem coleta diária, sem agendamento e sem pg-boss hoje. Só a verificação ao vivo de cada oferta que chega, numa fila em memória por domínio, com as mesmas regras de coleta educada.
- O WhatsApp fica fora hoje. O Telegram ENTRA no 11.11 (decidido em 10/11 às 21:10): Escuta só leitura com GramJS na conta do usuário, papel `listen`. As outras ofertas vêm do scraping ao vivo de Pelando, Promobit, fórum do Hardmob e vitrines de ofertas das lojas, só com o app aberto.
- Tudo roda num PC só. Não existe segundo PC como ajudante (decidido em 10/11). A Vitrine ainda abre pela rede local (next dev -H 0.0.0.0), só para olhar.
- Tabelas de hoje: sources, raw_messages, offers, products, price_points, alvos, ai_usage e insights.
- Hoje não entram Playwright, War Room, job de insights, Black Fraude nem desconto real. Use a Nota rápida do prompts/hoje/04.
- Siga ETAPAS.md e prompts/hoje/. O resto deste arquivo volta a valer depois do 11.11.

## Arquitetura
- Next.js 16.4 (App Router) + TypeScript estrito + Tailwind v4 + shadcn/ui + Motion.
- PostgreSQL + Prisma 7 (prisma/schema.prisma, adaptador pg) em src/lib/db, compartilhado com o worker. DATABASE_URL no .env. Migrações em prisma/migrations só acrescentam, com dump antes (`pnpm db:backup <rótulo>`, em ~/garimpo-backups, nunca apagado).
- Contas (branch deploy-v2): better-auth com nome, e-mail e senha (bcrypt) e Google; cargos e permissões no banco (src/config/permissoes.ts). Toda rota da API chama `exigir(permissão)` de src/lib/sessao.ts; o que cada um vê sai de src/lib/visao.ts (respostas) e src/lib/avisos.ts (tempo real). Usuário comum nunca vê nome de grupo, custo e uso da IA, fontes, lojas nem a máquina.
- worker/ é um processo Node separado (tsx watch), um por PC. WORKER_ROLES liga os papéis: listen, collect, verify, ai.
- Filas e agendamentos com pg-boss no próprio Postgres. Uma fila por domínio.
- Tempo real: o worker chama pg_notify; app/api/stream/route.ts faz LISTEN e SSE. Com Cache Components não se exporta `runtime`; rotas que leem o banco chamam `await connection()`.
- WhatsApp: whatsapp-web.js oficial, SOMENTE LEITURA, papel listen. Proibido enviar mensagens ou entrar em grupos.
- Telegram: pacote telegram (GramJS), somente leitura.
- Sem notificação no celular ou no WhatsApp: alertas só na Vitrine. Fontes do Telegram são descobertas sozinhas (o usuário só confirma); além delas, a tela Fontes adiciona fontes configuráveis (decisão de 12/11): feed RSS, página de ofertas (__NEXT_DATA__/JSON-LD) e busca em loja VTEX, com Testar (quem lê é o worker), intervalo, editar e apagar, e as sugestões de docs/fontes-novas.md. Alvos são configuráveis na tela Alvos (decisão de 11/11): criar, editar termos e exclusões, ligar/desligar, apagar, preço-alvo e teto por faixa (vazio = automático). Os de config/alvos.ts são só o ponto de partida; um Alvo editado ou apagado na tela não é sobrescrito pelo worker. Desde 22/11 cada conta tem os seus (cópia de config/alvos.ts quando a conta nasce), com nota, "Alvo atingido" e marcações (vigiar, descartar, soneca) próprios, em oferta_alvo e oferta_usuario. Os Alvos de quem gerencia as fontes (admin) são os do sistema: decidem a coleta e o mercado da faixa usado na nota geral e na IA. Alvo de usuário comum nunca entra em prompt nem muda a coleta.
- IA: worker/ai/providers, uma interface AiProvider. O lado Claude vem de AI_PROVIDER: claude-cli (teste: claude -p oficial com a assinatura do usuário via CLAUDE_CODE_OAUTH_TOKEN, sem ANTHROPIC_API_KEY no ambiente do filho, sem --bare, pasta vazia e CLAUDE_CONFIG_DIR próprio), anthropic-api (@anthropic-ai/sdk) ou ollama. Desde 18/11 há também o agy (Antigravity CLI, `agy -p`), e o seletor "Usar" do cabeçalho escolhe Claude, agy ou os dois juntos (app_settings "ia_provedor"). O agy roda sempre travado: pasta vazia, --settings com agentMode "", toolPermission "strict" e deny command(*), e a conversa apagada do histórico depois de cada chamada. Modelo: claude-haiku-5-5 (o mais simples) em toda chamada do Claude, inclusive compilar Alvos e o analista; nada de Sonnet ou Opus. No agy, que não tem Haiku, o mais simples dele: gemini-3.8-flash-low (AGY_MODEL).
- Insights: job agendado; métricas calculadas no código, IA só se o hash mudou, resultado na tabela insights. Nenhuma chamada de IA dentro de uma requisição do site.

## Regras
- Determinístico primeiro. IA só como fallback, em lote, via worker/ai.
- Toda chamada de IA passa por worker/ai/budget.ts: registra usage e custo (no claude-cli, o total_cost_usd do próprio claude -p; senão, config/pricing.ts). Sem teto de gasto (decisão do usuário em 11/11): quem para a IA é o botão Pausar do cabeçalho (app_settings "ia"). O uso da assinatura (janela de 5 h e semanal) vem do rate_limit_event do claude -p e aparece no cabeçalho. O botão "Chamar IA agora" só avisa o worker por pg_notify (canal garimpo_ia); o site nunca chama a IA.
- Haiku 5.5: sem temperature/top_p/top_k, sem prefill, resposta via output_config.format (JSON Schema gerado do Zod), effort baixo para extração, prompt abaixo de 100 mil tokens, tratar stop_reason "refusal".
- Preço em centavos (inteiro). Preço principal = total no cartão no maior número de parcelas sem juros. "10x de R$ 129,90 sem juros" -> 129900. Guardar parcela, juros (sim/não), à vista e frete.
- Fotos: guardar só o endereço (URL) de CDN externo, nunca arquivo de imagem no projeto, no banco ou no Storage (decisão de 12/11).
- Domínio fora de config/stores.ts = suspeito: não abrir, não mostrar na Vitrine principal.
- Coleta educada: ler robots.txt, 1 requisição por domínio a cada 5-10 s, cache (10 min na verificação, 12 h na coleta diária), pausa em 429/403/503 que vale para o domínio inteiro (www, api...), segura os pedidos já na fila, sobrevive ao reinício do worker (app_settings "pausas") e cresce se o site reclamar de novo em 24 h (1 h, 6 h, 24 h; Retry-After maior vence), User-Agent fixo, sem proxy. O objetivo é nunca insistir num site que pediu para parar. Falhou = "não verificado".
- Segurança (deploy-v2, Fase 7): o worker só abre endereços públicos (worker/http/rede.ts confere cada endereço e cada redirecionamento: nada de localhost, rede de casa, link-local ou porta fora da web). Comando que chega por pg_notify passa pelo zod (worker/comandos.ts, AlvosCmdSchema). `claude -p` e `agy` rodam com ambiente mínimo (worker/ai/providers/ambiente.ts): nada do .env do worker vai para eles. Tabela nova em migração: `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` (confira com `pnpm db:travas`).
- Padrão is_active (pedido do usuário): toda tabela em que dá para ligar ou desligar uma linha usa a coluna `is_active` (boolean, padrão true, true = ativa; no Prisma `isActive @map("is_active")`), nunca enabled/active/hidden/paused. Já têm: usuarios, cargos, alvos, sources, coupons, store_state, offers e products. Desligar nunca apaga a linha. Tabelas de histórico (price_points, events, raw_messages, ai_usage...) não têm.
- Não adicionar dependências sem perguntar. Nunca instalar forks de whatsapp-web.js ou baileys.
- O parser só muda com os testes Vitest de fixtures/messages passando.

## Interface
- Ofertas de qualquer produto (decisão de 11/11): os grupos em que o usuário entra são o filtro. Alvos só classificam. Cada oferta ganha categoria (src/config/categories.ts, por regra; o resto vai para a IA em lote) e posts que são só cupom vão para a tabela coupons e a tela Cupons, não para a Vitrine.
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
