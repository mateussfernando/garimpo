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
| Fontes e Alvos | Descobertos sozinhos. O usuário só confirma e nunca digita configuração. Vale para as Fontes; os Alvos mudaram em 11/11 (linha abaixo). |
| Alvos configuráveis (11/11, 17:55) | A pedido do usuário, os Alvos se ajustam na tela Alvos: criar, editar nome, termos e exclusões, ligar e desligar, voltar ao padrão, apagar, e preço-alvo e teto por faixa (vazio = automático, 85% e 115% da mediana). Os Alvos de `config/alvos.ts` são só o ponto de partida: um Alvo editado ou apagado na tela não é mais sobrescrito pelo worker. |
| Coleta educada | robots.txt, 1 pedido a cada 5 a 10 s por loja, cache, sem proxy. Pausa em 429, 403 ou 503 vale para o domínio inteiro, segura a fila, sobrevive ao reinício e cresce se o site reclamar de novo (1 h, 6 h, 24 h). Atualizado em 11/11 a pedido do usuário: o IP não pode entrar em lista de bloqueio. |
| Qualquer produto (11/11) | Telegram e comunidades trazem qualquer produto com link de loja; o usuário escolhe pelos grupos em que entra. Alvos só classificam. Categorias por regra e, no que sobrar, IA em lote. Posts de cupom vão para a tela Cupons. |
| IA sem teto (11/11) | A trava de US$ 4,50 e `AI_MAX_CHAMADAS_DIA` saíram. O usuário pausa e continua a IA no cabeçalho, chama a IA quando quiser e vê o custo e o uso da assinatura (5 h e semana). |
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
- [x] ~~`AI_MAX_CHAMADAS_DIA=300` é um palpite.~~ Saiu em 11/11: sem teto, com botão Pausar.

## Links

- Plano (doc vivo): https://claude.ai/artifact/JLuTQZVzfJRim4uEgv5V8N
- Design (canvas clicável): https://claude.ai/artifact/KpCmQB2sKdW9GvHR9Z7MD2

## Registro (mais recente primeiro)

### 11/11/2026, 17:55 · Alvos configuráveis na tela Alvos

- **Pedido:** "eu quero que os alvos sejam configuraveis". Antes, os Alvos vinham fixos de `config/alvos.ts` e o worker sobrescrevia termos, exclusões e "ligado" a cada partida.
- **Feito:**
  - **Tela Alvos** (`/alvos`, novo item no menu; `src/components/alvos.tsx`): um card por Alvo, com nome editável, termos e exclusões como chips (× tira, Enter ou vírgula põe), Ligar/Desligar, "Voltar ao padrão" (Alvos do código editados) e Apagar com confirmação. "Novo Alvo" cria um Alvo do zero;
  - **Teste ao vivo:** enquanto você edita, o card mostra quantas das ofertas dos últimos 7 dias o Alvo pegaria, com exemplos, e quais ele deixaria de pegar e para onde iriam. É o mesmo `matchAlvo` do worker, sem IA (`POST /api/alvos/teste`, cerca de 1 s para 3.000 ofertas);
  - **Preço-alvo e teto por faixa:** cada faixa mostra preços vistos e mediana; os campos aceitam o seu preço-alvo e o seu teto. Vazio = automático (85% e 115% da mediana, a partir de 5 preços). Só o preço-alvo: o teto fica 35% acima dele. Alvo novo sem ofertas já aceita preço-alvo na faixa "Geral";
  - **Banco:** `alvos.origin` ("seed" ou "usuario"), `alvos.edited_at`, `alvos.deleted_at`, `alvo_refs.manual_target_cents` e `alvo_refs.manual_ceiling_cents` (`db:push` aplicado);
  - **Worker:** `ensureSeed` só insere os Alvos do código e atualiza os que você não editou; nunca mexe em "ligado" nem traz de volta um apagado. `refreshRef` usa o seu preço quando existe (`effectiveTargets`). O canal `garimpo_alvos` (pg_notify) recebe "rematch" (reclassifica as ofertas de 7 dias) ou "faixa" (refaz as notas da faixa); pedidos seguidos viram uma rodada só;
  - **Casamento:** um tipo da lista "outro produto" (cadeira, tv, smart tv...) deixa de bloquear quando vira termo de um Alvo seu. Com um Alvo "TV", "Smart TV LG 55" entra nele e "Suporte para TV" continua fora.
- **Decisões:** Alvos configuráveis (nova linha na tabela). Apagar é definitivo para a tela, mas o histórico de preços fica no banco. Alvo criado na tela ganha slug `u-...`, para nunca usar as faixas especiais de monitor, SSD etc.
- **Testado:** 100 testes (5 novos: Alvos do usuário e preço-alvo manual), `tsc` e `eslint`. No navegador, com um worker de teste sem papéis: criar "Cadeira gamer" (89 ofertas entraram, faixa Geral com mediana R$ 384,47), preço-alvo R$ 300 (teto R$ 405, notas refeitas), teste mostrando o que sairia com a exclusão "escritorio", erros de teto menor que o alvo e Alvo sem nome, e Apagar (as 89 ofertas saíram do Alvo). Subindo o worker com as regras novas, nenhuma das 4.264 ofertas mudou de Alvo. O Alvo de teste foi apagado do banco depois.
- **Pendente:**
  - O worker em execução (desde 15:43, sem watch) não tem o canal novo: as mudanças da tela ficam gravadas, mas só reclassificam as ofertas quando ele for reiniciado com `pnpm worker`;
  - Criar Alvo escrevendo em português (a IA compila os termos), como no `docs/garimpo.md`, fica para depois.
- **Como testar:** `pnpm worker`, abra `/alvos`, clique em "Novo Alvo", ponha um nome e termos e veja o teste à direita; crie, ponha um preço-alvo numa faixa e confira a nota das ofertas na Vitrine.

### 11/11/2026, 17:00 · Sem produto falso para link que não é de produto

- **Problema:** a verificação usava o caminho do link como ID quando o leitor da loja não achava um. Páginas de moedas da AliExpress (105 ofertas), erro 404 (18), live da Shopee (7), promoções da Amazon e da KaBuM! e a home da Amazon viraram "produtos". As ofertas ficavam "conferidas na loja" com o preço lido dessas páginas (55 preços diferentes só nas moedas) e dividiam o mesmo histórico.
- **Feito:**
  - `productIdFor` (`src/config/stores.ts`, com testes): só devolve ID para link de produto. Loja sem leitor usa o caminho, menos home, erro, busca, promoção, carrinho e categoria;
  - A verificação nem abre um link sem ID: a oferta fica "não conferida" com o motivo, e o preço continua o do post;
  - A Shopee entende os três formatos de link do mesmo item (`-i.LOJA.ITEM`, `/product/LOJA/ITEM`, `/opaanlp/LOJA/ITEM`); a Americanas, o formato novo `/nome-ID/p`;
  - Limpeza única no banco: 14 produtos falsos apagados com os preços e insights deles; 144 ofertas voltaram ao preço, parcelas, frete e foto do post, como "não conferidas", e sem a análise da IA (ela será refeita); 12 produtos da Shopee e da Americanas renomeados para o ID novo e 1 juntado ao que já existia.
- **Testado:** 95 testes, `tsc` e `eslint`. A limpeza rodou de novo em simulação e não achou mais nada.
- **Pendente:** o worker em execução ainda tem o código antigo (sem watch, desde 11:32) e pode criar produto falso até ser reiniciado com `pnpm worker`.

### 11/11/2026, 16:30 · Mesmo produto num card só e comparação entre lojas

- **Feito:**
  - **Agrupamento entre lojas** (`src/lib/same-product.ts`, com testes): junta o mesmo produto de grupos e lojas diferentes. Regras conservadoras: mesmo título; mesmo código de modelo (27GS60F, 5700X3D) com título parecido; ou títulos 70% iguais com os mesmos números (iPhone 15 ≠ 16, 128 ≠ 256 GB, TV 50" ≠ 55"). Categoria diferente ou preço acima do dobro nunca juntam, e o grupo inteiro fica dentro do dobro (um post sem preço não liga R$ 4,99 a R$ 3.725). Antes só juntava pelo mesmo produto na loja ou pelo código dentro de um Alvo;
  - **`lojas` em cada card** (`storeQuotes` em `src/lib/offers.ts`): a melhor oferta de cada loja (conferida primeiro), da mais barata para a mais cara, esgotada por último. A "loja não identificada" só aparece se não houver loja conhecida;
  - **Comparar lojas** (`src/components/comparar-lojas.tsx`): no painel lateral e no Detalhe, cada loja com total, parcelas, juros, Pix, frete, cupom, se foi conferida e quem postou. A mais barata ganha "Mais barato" e as outras mostram "+ R$ X". Uma frase diz quanto se economiza. No Detalhe, a antiga Escada de preços virou "Parecidas em outras lojas" quando há comparação;
  - **Card:** selo da loja com "+N" e, na linha de estado, "em N lojas, a partir de R$ X" (ou "aqui é o menor");
  - **Filtros:** o filtro de loja acha o card por qualquer loja do grupo; novo botão "Em várias lojas";
  - Vitrine lê até 2.000 ofertas (antes 800), para achar mais pares.
- **Medido:** 2.000 ofertas viram 805 cards em uns 160 ms; 13 produtos aparecem em 2 ou 3 lojas (PS5 Slim, GTA VI, G29, Ryzen 5700X, Boombox 4, EK241Y...).
- **Achado:** o worker dá o mesmo `product_id` a páginas que não são produto: moedas da AliExpress (102 ofertas, 57 títulos), `aliexpress.com/s/error/404` (18) e live da Shopee (7). Por isso o mesmo `product_id` agora também precisa de título parecido para juntar. O histórico de preço desses "produtos" mistura coisas sem relação: falta corrigir na verificação.
- **Testado:** 92 testes, `tsc` e `eslint`. No navegador: botão "Em várias lojas" (13 de 806), card "KaBuM! +1 … em 2 lojas, a partir de R$ 347,00", painel e Detalhe do PS5 com as 3 lojas.
- **Próximo passo:** não criar produto para página de erro, moedas ou live na verificação, e limpar os que já existem.

### 11/11/2026, 15:40 · Análises da IA em 3 pistas ao mesmo tempo

- **Feito:**
  - **3 lotes ao mesmo tempo:** `runAnalises` agora roda até `AI_PARALLEL` = 3 pistas (`src/config/pricing.ts`, máximo pedido pelo usuário). Cada pista pega os próximos produtos que nenhuma outra pegou (conjunto `claimed`), então nada vai à IA duas vezes. Pausa ou freio param todas; um erro (recusa, timeout) para só a pista dele. As pistas começam com 1,5 s de diferença. Rodada automática: até 6 lotes a cada 2 min; "Chamar IA agora": até 150 lotes;
  - **Uma pasta de configuração por `claude -p` vivo** (`config`, `config-1`, `config-2`...), para dois processos nunca escreverem o mesmo arquivo;
  - Fila da IA explica as 3 pistas.
- **Medido:** antes, um lote de 12 por vez, uns 25 s cada (cerca de 30 produtos por minuto). Teste com 3 pistas: 36 produtos (78 ofertas, contando as cópias) em 46 s, cerca de 47 produtos por minuto. A janela de 5 h não muda de tamanho: as pistas só gastam o mesmo uso mais rápido, e o freio de 85% continua valendo.
- **Achado:** o worker que estava rodando era `tsx worker/index.ts` sem watch, iniciado às 11:32, ou seja, ainda com o código anterior às 13:30. Precisa reiniciar com `pnpm worker` (com watch).
- **Corrigido no teste:** `analisadas += await ...` perdia a conta com as pistas juntas (contou 23 de 78); agora lê o resultado antes de somar.
- **Testado:** 85 testes, `tsc` e `eslint`; rodada real de 3 lotes em paralelo pelo `claude -p`, as 3 chamadas terminaram com 9 s de diferença entre si.
- **Próximo passo:** reiniciar o worker e acompanhar a Fila da IA.

### 11/11/2026, 13:30 · Rolagem livre, cards do mesmo tamanho, IA cobrindo todas as ofertas e Fila da IA

- **Feito:**
  - **Rolagem livre:** o mouse sobre um card não rola mais a página (o foco seguia o mouse e o `scrollIntoView` puxava a página para baixo, em cadeia). Setas e espaço voltaram a rolar a página. Rolado para baixo, a grade não se reordena nem ganha cards em cima: as novas esperam num aviso "↑ N ofertas novas";
  - **Atalhos:** a pedido do usuário, só o `/` (busca) ficou, na Vitrine, em Cupons e no Detalhe. A War Room, que é toda pelo teclado, ficou como estava;
  - **Cards do mesmo tamanho:** foto numa caixa 4:3 fixa, título em 2 linhas, uma linha de selos e o quadro da IA sempre com a mesma altura (60 de 60 cards com 635 px);
  - **IA cobrindo tudo:** antes, 16 análises a cada 5 min só das 150 de nota mais alta e com preço (195 de 1.675). Agora: todas as ofertas de produto de 48 h, mesmo produto em vários grupos analisado uma vez só (964 produtos para 1.480 ofertas), lotes de 12 em sequência a cada 2 min, nunca analisadas primeiro, resposta mais curta. "Chamar IA agora" vai até zerar a fila, mesmo com uma rodada em andamento. O card agrupado usa a análise de qualquer cópia;
  - **Freio da assinatura:** as rodadas automáticas esperam quando a janela de 5 h passa de 85% (`AI_AUTO_STOP_PCT` em `src/config/pricing.ts`); o botão passa por cima;
  - **Fila da IA** (`/ia`, menu): quantas ofertas têm análise, quantas esperam, a fila na ordem em que a IA vai pegar (com posts iguais juntos) e as analisadas há pouco.
- **Decidido:** só o atalho de busca; freio automático da IA em 85% da janela de 5 h.
- **Testado:** 85 testes, `tsc` e `eslint`. No navegador: Fila da IA com os números do banco; cards com a mesma altura; rodapé só com "/ buscar". O congelamento da grade com ofertas chegando não foi exercitado ao vivo.
- **Próximo passo:** acompanhar a fila zerar na aba Fila da IA e o uso da janela de 5 h.


### 11/11/2026, 12:00 · Porta pelo .env, títulos do Telegram, encurtadores e fila de conferência

- **Feito:**
  - **Porta:** `scripts/web.mjs` sobe o site na porta de `PORT` no `.env` (agora 3333); se estiver ocupada, usa a próxima livre e avisa. Sem `PORT`: 3000, ou 3333 se a 3000 estiver ocupada. `pnpm dev`, `dev:web` e `start` usam o lançador (o Next não lê PORT do .env);
  - **Títulos do Telegram:** a linha do produto não some mais por causa de "✔️" no começo, negrito `**`, "5700x" ou "2x Mouse" (eram lidos como ficha técnica ou parcela). Rótulos ("Telegram de Ofertas:", "BOT DE ALERTAS:"), chamadas para clicar, sorteio e conversa não viram título; nome de tipo de produto conhecido (categoria) ganha pontos. Sem produto e sem cupom, a mensagem não é oferta; só cupom vira post de cupom. Na reclassificação, mensagem antiga que não é oferta vira `kind = "ruido"` e sai da Vitrine. Em 400 mensagens reais: 79 títulos melhores, 24 lixos fora;
  - **Cupom pelo texto:** "Use: ZAFADINHO15 · COM 15% OFF" vira cupom mesmo sem a palavra no título (`isCouponMessage`);
  - **Encurtadores novos:** meli.la, a.aliexpress.com, promoby.me (canal do Promobit: 30 mensagens, 0 aproveitadas), ofertou.ai, adrena.click, linkmc.click, curt.link, i.promotop.net, aoferta.net, boletando.com, nerdofertas.com;
  - **Fila de conferência:** loja cujo robots.txt bloqueou 90% ou mais das páginas de produto nas últimas 2 h (Shopee: 194 de 204) não abre mais o link curto à toa; 1 em 20 ainda tenta. A fila chegava a 14 min.
- **Testado:** 85 testes, `tsc` e `eslint` passam. A porta 3000 está ocupada por outro app e a 3333 livre (detecção conferida). O site não foi reaberto pelo lançador nesta sessão.
- **Próximo passo:** parar e subir de novo com `pnpm dev` e abrir http://localhost:3333.


### 11/11/2026, 11:30 · Qualquer produto, categorias, Cupons, filtros inteligentes, IA sem teto e pausa mais segura

- **Feito:**
  - **Qualquer produto:** Telegram aceita toda mensagem com link de loja; o título é a linha que mais parece nome de produto (preço, cupom e ficha técnica não contam). Comunidades abrem qualquer post novo (até 15 por ronda). Vitrine mostra tudo;
  - **Categorias** (`src/config/categories.ts`, `worker/match/category.ts`): 19 categorias por palavras do primeiro nome de produto do título; o que sobra vai para a IA em lote (`worker/ai/categorias.ts`, 50 títulos por chamada, a cada 3 min);
  - **Cupons** (`worker/parse/coupons.ts`, tabela `coupons`, tela `/cupons`): post que é só cupom sai da Vitrine e vira cupom (código, desconto, mínimo, limite, condições, loja); mensagem com vários cupons vira um por linha; código citado em post de produto também entra. Atalhos: / J K C Enter X;
  - **Filtros inteligentes** (`src/lib/smart-filter.ts`, `src/components/filtros.tsx`): busca que entende "tv até 2000 frete grátis", "air fryer shopee", "recomendadas", "mais barato"; categorias com contagem; loja, preço, Alvo, conferidas, frete grátis, sem juros, com cupom e recomendadas pela IA; ordem por nota, IA, preço, novas ou desconto; lembrados no navegador;
  - **IA:** sem teto; Pausar/Continuar e "Chamar IA agora" no cabeçalho (o worker roda categorias, análises, radar e insights); custo de hoje e total; uso da janela de 5 h e da semanal lido do `rate_limit_event` do `claude -p` (agora em stream-json);
  - **Análise por oferta** (`worker/ai/analises.ts`, tabela `offer_analyses`): veredito (excelente, boa, ok, fraca, evitar), nota 0 a 100, resumo, prós e contras, 8 ofertas por chamada, só quando os números mudam; aparece no card, no painel e no Detalhe;
  - **Radar da IA** (`worker/ai/radar.ts`): manchete, destaques clicáveis, alertas e dicas no topo da Vitrine, a cada 15 min se o quadro mudou;
  - **Pausa de site:** vale para o domínio inteiro, segura a fila, grava em `app_settings` e cresce (1 h, 6 h, 24 h). 503 também pausa.
- **Decidido:** qualquer produto; IA sem teto com botão; pausa mais rígida para proteger o IP. Ver a tabela.
- **Testado:** 83 testes, `tsc` e `eslint` passam. Reclassificação rodada no banco: 410 ofertas com categoria por regra, 61 para a IA, 70 posts de cupom viraram 92 cupons. Vitrine conferida no navegador do app (categorias e busca "tv até 3000 mais barato" = 16 de 347). A tela Cupons não foi exercitada no navegador: outro app (`lp-guadalupe-casas-altas`) também escuta na porta 3000 e o `localhost` cai nele.
- **Pendente:** reiniciar o worker para valer tudo (categorias e cupons novos, análises, radar, pausas). `AI_MAX_CHAMADAS_DIA` no `.env` não é mais lido. Preço de post às vezes errado (ex.: Smart TV LG 55" a R$ 100).
- **Próximo passo:** reiniciar o worker, olhar o radar e as análises na Vitrine e ajustar as categorias com o que a IA classificar.
- **Como testar:** `pnpm test`; reinicie o worker; abra a Vitrine e digite "tv até 2000 frete grátis"; abra `/cupons`; no cabeçalho, "Chamar IA agora" e veja as barras de 5 h e semana.


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
