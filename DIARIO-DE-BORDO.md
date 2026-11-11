# Diário de bordo do Garimpo

Este diário é a memória do projeto entre sessões. Quem abrir uma sessão nova lê ele primeiro e continua de onde a última parou.

## Como usar

- **Ao começar:** leia este diário, o `CLAUDE.md` e o `ETAPAS.md`. Continue da primeira etapa sem `[x]`.
- **Ao terminar uma etapa ou a sessão:**
  - marque `[x]` em `ETAPAS.md`;
  - escreva uma entrada no topo do Registro;
  - faça um commit com a mensagem `diario: <etapa> <resumo>`.
- **Cada entrada tem:** data e hora, o que foi feito, as decisões, o que ficou pendente, o próximo passo e como testar.
- **Decisões tomadas:** não reabra nenhuma da tabela abaixo sem o usuário pedir. Uma decisão nova entra na tabela e no Registro.

## Estado atual

- **Quando:** 10/11/2026, 22:30.
- **Fase:** plano acelerado, Etapas 1 a 4 rodando ao vivo no PC, mais Telegram, IA com insights, vitrine do KaBuM! e as telas Detalhe, Fontes, Lojas e War Room. Falta o ensaio (Etapa 5).
- **Próximo passo:** Etapa 5, ensaio com tráfego real. O app já roda (`pnpm dev` no seu PC), com Telegram, Pelando, Promobit e Gatry; o Hardmob está pausado por 403.
- **Prazo:** o 11.11 começa à meia-noite de hoje. A linha de corte é às 21:30 e o congelamento às 23:00.

## Decisões tomadas

| Decisão | Detalhe |
| --- | --- |
| App pessoal em localhost | Só o usuário usa. Roda num PC só, com um banco só. |
| Um PC só (10/11, 22:00) | O segundo PC (8 GB) como ajudante saiu do plano. Um PC faz tudo: Postgres, Escuta, coleta, verificação, IA e Vitrine. Substitui a decisão antiga "Dois PCs". |
| Stack | Next.js 16.4 (App Router), TypeScript estrito, Tailwind v4, shadcn/ui, PostgreSQL com Drizzle, pg-boss, worker separado com tsx e tempo real por `pg_notify` e SSE. |
| Preço | Total no cartão no maior número de parcelas sem juros, em centavos. Frete grátis em destaque. |
| Alertas | Só na Vitrine. Nada de notificação no celular ou no WhatsApp. |
| WhatsApp e Telegram | Somente leitura. O app nunca envia mensagem nem entra em grupo. Conversas individuais nunca são lidas. |
| Fontes e Alvos | Descobertos sozinhos. O usuário só confirma e nunca digita configuração. |
| Coleta educada | robots.txt, 1 pedido a cada 5 a 10 s por loja, cache, pausa de 1 h em 429 ou 403, sem proxy. |
| Plano acelerado (10/11, 18:20) | Até o fim do 11.11 não há coleta rodando sozinha, agendamento nem pg-boss. Fica a verificação ao vivo de cada oferta que chega. Telegram e WhatsApp fora hoje: ofertas só do scraping ao vivo de comunidades e vitrines das lojas. Tudo num PC; o outro abre a Vitrine pela rede. Nota rápida, sem desconto real nem Black Fraude. |
| Telegram entra no 11.11 (10/11, 21:10) | Reverte a parte do plano acelerado que deixava o Telegram de fora. GramJS na conta do usuário, só leitura, papel `listen`. Chats de grupo e canal: os com nome de promoção ligam sozinhos, os outros ficam desligados em `sources.enabled`. WhatsApp segue fora. |
| Sem ensaio (10/11, 22:40) | O usuário pulou a Etapa 5 (ensaio e congelamento) e vai pedir melhorias numa sessão com o Fable 5.2. Quem pegar o projeto não precisa começar pelo ensaio. |
| Entram de novo no 11.11 (10/11, 22:00) | A pedido do usuário: IA com insights, vitrines das lojas, telas Detalhe, Fontes, Lojas e War Room. Continuam fora: WhatsApp, pg-boss e coleta diária, desconto real e Black Fraude. |
| Fontes bloqueadas (10/11, 21:40) | Bloqueio de site não se contorna: nada de proxy nem disfarce, vale o robots.txt. Alternativas legítimas viram fontes extras, e tudo cai no mesmo funil (a mesma oferta em várias fontes sobe a nota pelo calor social). |
| Coleta diária | Adiada para depois do 11.11: às 06:00, de 12/11 até a Black Friday (27/11). |
| IA: provedor | Interface `AiProvider` com `claude-cli` (teste pela assinatura), `anthropic-api` e `ollama`, escolhidos por `AI_PROVIDER`. |
| IA: modelo | `claude-haiku-5-5` em toda chamada e em todo provedor. Nada de Sonnet ou Opus no app. |
| IA: `claude-cli` | Token de `claude setup-token` no `.env` (CLAUDE_CODE_OAUTH_TOKEN), sem `ANTHROPIC_API_KEY` no ambiente do filho, sem `--bare`, rodando numa pasta vazia com `CLAUDE_CONFIG_DIR` próprio. |
| IA: insights | Job agendado com as métricas calculadas no código. Chama a IA só se o hash mudar e grava na tabela `insights`. O site só lê do banco. |
| Nota Garimpo | N = 100 × (0,35 D + 0,25 A + 0,15 C + 0,10 F + 0,10 S + 0,05 U). Detalhes em `docs/garimpo.md`. |
| Design | 5 telas em `design/`, tema escuro, ouro só para "Alvo atingido". |

## Perguntas em aberto

- [ ] O usuário tem um segundo número para a Escuta?
- [ ] Qual é o orçamento total de compras do dia 11? O design usa R$ 2.500 só como exemplo.
- [ ] `AI_MAX_CHAMADAS_DIA=300` é um palpite. Ajuste depois de olhar o medidor.

## Links

- Plano (doc vivo): https://claude.ai/artifact/JLuTQZVzfJRim4uEgv5V8N
- Design (canvas clicável): https://claude.ai/artifact/KpCmQB2sKdW9GvHR9Z7MD2

## Registro (mais recente primeiro)

### 11/11/2026, 08:40 · Conferência do Bloco A e interface ao vivo (B1 a B6)

- **Conferido ao vivo (A1 a A3):** o Telegram virou a maior fonte (58 de 137 ofertas); oferta nova é conferida em 6 a 8 s; 73 ofertas com preço no Pix; "frete grátis" indevido caiu de 44 para 7. A leitura de botões resolveu o canal "lobão".
- **Feito (Telegram):** o título é a linha que mais parece nome de produto (tem modelo ou número); ficha técnica ("- 512GB SSD") e chamada de efeito ("CABE O MONITOR...") ficam de fora. A reclassificação da subida refaz o título das ofertas antigas de canal.
- **Feito (B1 a B6):** Motion e sonner instalados (shadcn completo ficou de fora: não fez falta). Tabela `events` e rota `/api/events`; o worker grava nova oferta, preço que mudou, esgotou e Alvo atingido (`logEvent` em `worker/pipeline.ts`). Vitrine refeita: cards entram animados e trocam de lugar, preço pisca ao mudar, brilho "Agora" por 1 min, faixa "Ao vivo" sob o cabeçalho, card com cartão, Pix, diferença para a faixa, fim da oferta e uma linha só de estado, painel do foco (Espaço abre, Esc fecha, J e K trocam), alerta de Alvo atingido com som, título da aba e aviso em ouro, "Desfazer" ao descartar, filtro "Só conferidas na loja", cards-esqueleto.
- **Decidido:** "Alvo atingido" só vale com preço conferido na loja e produto à venda.
- **Testado:** 70 testes, `tsc` e `eslint`. Vitrine e painel abertos no navegador do app, sem erro no console; a faixa mostrou um acontecimento real. NÃO testado: o som e o aviso de Alvo atingido (não houve um Alvo atingido novo durante o teste), a animação de entrada vista a olho e o layout de celular.
- **Pendente:** Pichau e Hardmob respondem 403 (pausa de 1 h, sem contorno). Shopee e AliExpress bloqueiam robô: 38 ofertas da Shopee ficam "não conferidas", várias com preço de post duvidoso (R$ 40). `pnpm simular --limpar` pode falhar por causa da tabela `events`.
- **Próximo passo:** A4 a A6 (um card por produto, ronda contínua, não cair), depois B7 a B14.
- **Como testar:** abra `/`, aperte J e Espaço; veja a faixa "Ao vivo"; M liga e desliga o som.

### 10/11/2026, 23:50 · Plano "Garimpo absurdo": A1, A2 e A3

- **Plano aprovado pelo usuário:** foco no 11.11, no ao vivo e em UX e UI no limite. Blocos: A (caminho da oferta ao vivo), B (interface: Motion e shadcn/ui autorizados, tela ao vivo, faixa de acontecimentos, card novo, painel do foco, alerta, ⌘K, desfazer, celular), C (reconferir na hora, nota do 11.11, filtros, compras e fatura, cupons, tela Alvos, analista), D (rotinas programadas e Black Friday, por último).
- **Feito (A2):** Alvo só casa quando o termo é o produto em si (primeiro nome de produto do título; preposição antes do termo indica acessório). Acessórios virou Mousepad, Headset, Webcam, Hub e Microfone. Especificações sem IA (`worker/match/specs.ts`) e faixas por Alvo; preço-alvo e teto por faixa em `alvo_refs`, com mediana de ofertas mais preços de mercado das vitrines (`market_obs`). "Alvo atingido" caiu de 19 para 9, todos em faixas com 5 ou mais preços.
- **Feito (A3):** leitores exatos do KaBuM! e da Amazon (`worker/verify/adapters/`), com fixtures de páginas reais. Guardam Pix, cartão, parcelas, "de", estoque, cupom, fim da oferta e fotos. Frete grátis só quando a loja afirma. Vitrine do KaBuM! usa o preço das parcelas (o do dia), porque os campos de preço da listagem são de antes da campanha. Link de loja de caminho único perde os parâmetros (o robots.txt da Pichau proíbe endereço com parâmetros).
- **Feito (A1):** Escuta relê o que falta de cada canal (últimas 24 h na primeira vez), via rápida de verificação, contadores por canal na tela Fontes, links de botões e de texto clicável. Chegou a primeira oferta ao vivo por evento.
- **Correção de um erro meu:** os dois "preços errados" citados no plano (mousepad a R$ 4,22 e MX Master 4 a R$ 625,90) estavam CERTOS, conferidos nas páginas reais.
- **Operação:** o site roda na aba "garimpo dev" (`pnpm dev:web`) e o worker na aba "garimpo worker" (`pnpm worker:run`, sem reinício automático, para não reconectar no Telegram a cada edição).
- **Testado:** 66 testes, `tsc` e `eslint` passam. NÃO conferido: o resultado da releitura do Telegram com botões e a reconferência das 78 ofertas, que estavam em andamento quando a sessão parou.
- **Pendente:** Mercado Livre sem leitor (a loja pede verificação de conta). Shopee e AliExpress bloqueiam robô no encurtador: ficam "não verificadas".
- **Próximo passo:** conferir os logs do worker (contadores e "links sem loja conhecida"), depois B1 a B6.
- **Como testar:** `pnpm test`; abra `/fontes` para ver os contadores e `/` para ver Pix, faixa e esgotado nos cards.

### 10/11/2026, 22:30 · IA, telas, vitrines e canais do Telegram

- **Feito:**
  - **IA (`worker/ai`):** interface `AiProvider` com `claude-cli`, `anthropic-api` (SDK oficial, instalado com o aval do CLAUDE.md) e `ollama`; Haiku 5.5 em tudo; `budget.ts` registra o uso, calcula o custo (`src/config/pricing.ts`: US$ 0,10 e US$ 0,50 por milhão de tokens) e recusa acima de US$ 4,50 ou de `AI_MAX_CHAMADAS_DIA`. Job de insights a cada 30 min: métricas do código, IA só quando o hash muda, resultado em `insights`. Testado com a sua assinatura: 3 insights, depois `iguais: 3` sem nova chamada;
  - **Telas:** cabeçalho único com navegação e Gasto de IA; **Detalhe** (`/oferta/[id]`: histórico de 30 dias em gráfico e tabela, nota explicada, escada de preços, calor social, análise da IA); **Fontes** (Confirmar, Ignorar, Pausar, Retomar, Procurar de novo e convites achados); **Lojas** (saúde, pausa pelo usuário e pausas pedidas pela loja); **War Room** (`/war-room`, tudo pelo teclado, soneca de 1 h, fila ordenada pela nota);
  - **Vitrine do KaBuM!:** categorias que trazem os produtos no HTML (monitores, mousepads, webcams); só ofertas com 10% ou mais de desconto que toquem um Alvo; marketplace de terceiros fora;
  - **Telegram:** convites vistos nas mensagens vão para a tabela `invites`; filtro de nome também liga canais oficiais de loja; lista conferida de canais em `docs/canais-telegram.md`;
  - **Plano:** o segundo PC (8 GB) saiu do plano e dos docs;
  - **Pesquisa:** `docs/fontes-alternativas.md` (APIs, outros sites e buscadores).
- **Decidido:** bloqueio não se contorna. Mercado Livre exige token na API. Buscadores não são fonte de preço. Posts do Pelando perdem o prefixo "Por R$ x:" no título, e a foto da loja vale mais que o banner da comunidade.
- **Testado:** 21 testes, `tsc` e `eslint` passam; todas as páginas e APIs respondem; ações de Fontes e Lojas exercitadas e restauradas; Vitrine, Detalhe, Fontes e War Room abertas no navegador do app. O `next build` não foi rodado de novo hoje.
- **Pendente:**
  - mouses, teclados, SSDs e headsets do KaBuM! vêm de uma API interna: ficam com comunidades e Telegram;
  - ⌘K "Buscar ou criar Alvo" (compilar Alvo por IA) e a triagem em lote não foram feitos; telas Alvos, Cupons e Compras do menu do design também não;
  - Mercado Livre API: precisa de um app seu em developers.mercadolivre.com.br;
  - preço da loja difere do post em alguns casos (ex.: Pix versus cartão): a Vitrine mostra o da loja.
- **Próximo passo:** o ensaio foi dispensado pelo usuário. Melhorias sugeridas: separar o Alvo "Acessórios" (mousepad e headset distorcem o preço-alvo), conferir se as 5 fontes do Telegram trazem mensagem real e manter o PC acordado.
- **Como testar:** `pnpm dev`; abra `/`, `/fontes`, `/lojas`, `/war-room` e uma oferta; `pnpm ia:insights`; `pnpm vitrines:debug`; `pnpm test`.

### 10/11/2026, 21:45 · App rodando, verificação corrigida, filtro do Telegram e Gatry

- **Feito:**
  - o banco `garimpo` tinha tabelas de uma versão antiga (Prisma, 12 fontes, 960 mensagens); a pedido do usuário foram apagadas e recriadas com o esquema novo;
  - verificação: todas as ofertas caíam em "robots.txt não permite" porque o link do Pelando é um redirecionador (`dpl.pelando.com.br/r/<JWT>`, bloqueado por robots.txt e Cloudflare). Agora `decodeTrackingUrl` lê a URL da loja dentro do token, sem rede. Depois disso 8 de 12 ofertas ficaram verificadas, com preço, parcelas e foto;
  - filtro do Telegram: grupo só liga sozinho se o nome é de promoção e não é de outro assunto (cursos, vagas, bate-papo, etc.; os já ligados e fora do assunto são desligados), e cada mensagem precisa ter link de loja e tocar um Alvo, igual às comunidades. Hoje: 5 grupos ligados, 7 desligados;
  - Gatry entrou como fonte extra (sem robots.txt, link da loja na própria página); título vem do slug quando o link só diz "N Comentários".
- **Decidido:** bloqueio não se contorna. Pelando e Promobit não têm RSS (404). Mercado Livre exige token na API, e buscadores não permitem raspar resultados: ficam de fora.
- **Testado:** 12 testes, `tsc` e `eslint` passam; verificação, Telegram e Gatry conferidos ao vivo. Uma oferta deu timeout na loja.
- **Pendente:**
  - Hardmob devolve 403 ao vivo e fica pausado 1 h por vez. Alternativa: entrar no grupo "hardMOB Promoções no Telegram" na sua conta, que a Escuta já cobre;
  - achar canais públicos de ofertas confiáveis (o canal do Promobit seria `cupons_desconto`, não confirmado) e ligar em `sources.enabled`;
  - o preço da página da loja às vezes difere do post (ex.: post R$ 409, loja 10x de R$ 51,11); a Vitrine mostra o da loja.
- **Próximo passo:** Etapa 5, ensaio.
- **Como testar:** `pnpm dev` e abra localhost:3000; ofertas verificadas mostram o selo "verificado há X min".

### 10/11/2026, 21:15 · Telegram no 11.11 e Hardmob corrigido

- **Feito:**
  - `pnpm fontes:debug` rodou ao vivo: Promobit 16 posts, Pelando 20. O Hardmob dava 0 por causa do `<base href>` (links relativos); corrigido em `anchors()` e coberto por teste, agora acha 32;
  - o `fontes:debug` quebrava com await no topo do arquivo (CJS); agora roda numa função `main`;
  - Escuta do Telegram (`worker/ingest/telegram.ts`): GramJS, só leitura, ignora conversas individuais, só vira oferta mensagem com link de loja ou encurtador. `pnpm telegram:login` gera a sessão.
- **Decidido:** o Telegram entra no 11.11 (pedido do usuário). Dependência `telegram` instalada com o OK dele.
- **Testado:** 11 testes, `tsc` e `eslint` passam. A Escuta em si NÃO foi testada: depende de login interativo na conta.
- **Pendente:**
  - rodar `pnpm telegram:login` (telefone, código e senha), colar `TELEGRAM_SESSION` e pôr `listen` em `WORKER_ROLES`;
  - confirmar quais chats ficaram ligados (log `[telegram] escutando N`) e ajustar `sources.enabled` no DBeaver;
  - a regra de "mais de 30% das últimas 50 mensagens com preço e link" não foi feita, só o nome do chat.
- **Próximo passo:** Etapa 5, ensaio com tráfego real.
- **Como testar:** `pnpm telegram:login`, depois `pnpm dev` e mande uma mensagem com link de loja num grupo ligado (de outra conta): a oferta aparece na Vitrine.

### 10/11/2026, 18:50 · Etapas 1 a 4 no claude.ai

- **Feito:**
  - projeto Next.js 16.4 com Tailwind v4, Drizzle e Postgres, e um worker com tsx; o `pnpm dev` sobe os dois;
  - coleta educada (`worker/http/polite.ts`), comunidades (`worker/collect`), parser BR, verificação na loja, Alvos v0, Nota rápida e pg_notify;
  - Vitrine ao vivo por SSE, com faixa de Alvos atingidos, filtros, frete grátis e os atalhos J/K, Enter, W e X;
  - `pnpm simular` para ver e ensaiar sem esperar a coleta, e `pnpm fontes:debug` para conferir as comunidades.
- **Decidido:**
  - sem shadcn hoje: Tailwind puro com os tokens de `design/tokens.md`, e fontes Geist pelo pacote `geist`, sem baixar nada no build;
  - o Next 16 vem com Cache Components ligado: as rotas de API chamam `connection()` e não exportam `runtime`;
  - preço-alvo de cada Alvo = 85% da mediana das ofertas vistas em 7 dias, e teto = 115%, a partir de 5 ofertas.
- **Testado:**
  - 10 testes passam, e o parser acerta as 15 fixtures (`PARSER_STRICT=1 pnpm test` mostra uma por uma);
  - `tsc` e `eslint` passam, e o `next build` passa;
  - com um Postgres local, o worker sobe e semeia as fontes e os Alvos, a API devolve as ofertas com nota e Alvo, o SSE entrega o aviso do banco na hora, e a Vitrine renderiza igual ao design.
- **Pendente:**
  - a coleta não foi testada contra os sites, porque a sessão não tinha acesso a eles. O Fórum do Hardmob bloqueia robôs no robots.txt e o Pelando recusou o acesso de teste. Rode `pnpm fontes:debug` no PC e, se der 0 posts, ajuste os padrões em `worker/collect/communities-config.ts` com o HTML salvo;
  - vitrines de ofertas das lojas e IA ficam para depois.
- **Próximo passo:** rodar no PC e ir para a Etapa 5 (ensaio).
- **Como testar:** `pnpm test`; depois `pnpm db:push`, `pnpm simular` e `pnpm dev`, e abra localhost:3000.

### 10/11/2026, 18:20 · mudança de plano no claude.ai

- **Decidido:**
  - sai a coleta que fica rodando sozinha no PC e fica a verificação ao vivo;
  - Telegram e WhatsApp ficam fora hoje: as ofertas vêm do scraping ao vivo de Pelando, Promobit, fórum do Hardmob e vitrines das lojas;
  - hoje tudo roda num PC só;
  - pg-boss, Playwright, War Room, job de insights, desconto real e Black Fraude ficam para depois do 11.11.
- **Feito:** `ETAPAS.md` refeito com 7 etapas; 4 prompts novos em `prompts/hoje/`; seção "Plano acelerado" no `CLAUDE.md`.
- **Pendente:** todo o código e o Plano B no Pelando.
- **Próximo passo:** Etapa 1.
- **Como testar:** ainda não há o que testar.

### 10/11/2026, 08:20 · sessão de ideação no claude.ai

- **Feito:**
  - montado este kit: `CLAUDE.md`, `docs/garimpo.md`, os 8 prompts, as 5 telas em `design/`, `.env.example`, `ETAPAS.md` e este diário;
  - o trabalho foi dividido em 11 etapas com janelas de horário para hoje.
- **Decidido:**
  - a IA roda pela assinatura do Claude Code (`claude -p`) para teste;
  - o modelo é o Haiku 5.5 em tudo, inclusive se trocar para a API;
  - entrou o job de insights com a tabela `insights`.
- **Pendente:** todo o código, as duas perguntas em aberto e o Plano B no Pelando.
- **Próximo passo:** Etapa 0.
- **Como testar:** ainda não há o que testar.

### 09/11/2026 · ideação

- **Feito:**
  - criado o plano do zero;
  - os requisitos foram ajustados ao longo do dia: preço no cartão parcelado, PostgreSQL com DBeaver, Vitrine com fotos, nada de notificação no celular, Escuta do WhatsApp Web e do Telegram, lista de lojas e comunidades, coleta diária até a Black Friday e os dois PCs rodando juntos;
  - desenhadas a Vitrine, o Detalhe e o War Room.
- **Decidido:** fontes e Alvos são descobertos sozinhos, sem o usuário digitar nada.
