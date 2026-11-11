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

- **Quando:** 10/11/2026, 21:15.
- **Fase:** plano acelerado. O código das Etapas 1 a 4 está pronto e testado com exemplos; ainda não rodou contra os sites de verdade.
- **Próximo passo:** `pnpm telegram:login`, colar `TELEGRAM_SESSION` no `.env`, pôr `listen` em `WORKER_ROLES` e rodar o ensaio (Etapa 5). Comunidades conferidas ao vivo às 21:10.
- **Prazo:** o 11.11 começa à meia-noite de hoje. A linha de corte é às 21:30 e o congelamento às 23:00.

## Decisões tomadas

| Decisão | Detalhe |
| --- | --- |
| App pessoal em localhost | Só o usuário usa. Roda nos dois PCs, com um banco só. |
| Dois PCs | 16 GB é o servidor: Postgres, Escuta, Playwright e coleta diária. 8 GB é o ajudante: verificação, IA e Vitrine. |
| Stack | Next.js 16.4 (App Router), TypeScript estrito, Tailwind v4, shadcn/ui, PostgreSQL com Drizzle, pg-boss, worker separado com tsx e tempo real por `pg_notify` e SSE. |
| Preço | Total no cartão no maior número de parcelas sem juros, em centavos. Frete grátis em destaque. |
| Alertas | Só na Vitrine. Nada de notificação no celular ou no WhatsApp. |
| WhatsApp e Telegram | Somente leitura. O app nunca envia mensagem nem entra em grupo. Conversas individuais nunca são lidas. |
| Fontes e Alvos | Descobertos sozinhos. O usuário só confirma e nunca digita configuração. |
| Coleta educada | robots.txt, 1 pedido a cada 5 a 10 s por loja, cache, pausa de 1 h em 429 ou 403, sem proxy. |
| Plano acelerado (10/11, 18:20) | Até o fim do 11.11 não há coleta rodando sozinha, agendamento nem pg-boss. Fica a verificação ao vivo de cada oferta que chega. Telegram e WhatsApp fora hoje: ofertas só do scraping ao vivo de comunidades e vitrines das lojas. Tudo num PC; o outro abre a Vitrine pela rede. Nota rápida, sem desconto real nem Black Fraude. |
| Telegram entra no 11.11 (10/11, 21:10) | Reverte a parte do plano acelerado que deixava o Telegram de fora. GramJS na conta do usuário, só leitura, papel `listen`. Chats de grupo e canal: os com nome de promoção ligam sozinhos, os outros ficam desligados em `sources.enabled`. WhatsApp segue fora. |
| Coleta diária | Adiada para depois do 11.11: às 06:00, de 12/11 até a Black Friday (27/11). |
| IA: provedor | Interface `AiProvider` com `claude-cli` (teste pela assinatura), `anthropic-api` e `ollama`, escolhidos por `AI_PROVIDER`. |
| IA: modelo | `claude-haiku-5-5` em toda chamada e em todo provedor. Nada de Sonnet ou Opus no app. |
| IA: `claude-cli` | Token de `claude setup-token` no PC com o papel `ai` (hoje o de 16 GB; depois do 11.11, o de 8 GB), sem `ANTHROPIC_API_KEY` no ambiente do filho, sem `--bare`, rodando numa pasta vazia com `CLAUDE_CONFIG_DIR` próprio. |
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
