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
| Fontes e Alvos | Descobertos sozinhos. O usuário só confirma e nunca digita configuração. Vale para os grupos do Telegram; os Alvos mudaram em 11/11 e as Fontes ganharam tipos configuráveis em 12/11 (linhas abaixo). |
| Fontes configuráveis (12/11, 14:30) | A pedido do usuário, a tela Fontes adiciona fontes de três tipos genéricos: feed RSS, página de ofertas (dados em `__NEXT_DATA__` ou JSON-LD) e busca em loja VTEX (parcelas e juros por cartão). Cada uma tem intervalo (mínimo por tipo, coleta educada), Testar, editar, ler agora e apagar. Quem abre os sites é sempre o worker: o botão Testar só pede por `pg_notify` (canal `garimpo_fontes`). As fontes do código e do Telegram continuam só com confirmar e pausar. Sugestões e canais vêm da pesquisa de `docs/fontes-novas.md`. |
| Alvos configuráveis (11/11, 17:55) | A pedido do usuário, os Alvos se ajustam na tela Alvos: criar, editar nome, termos e exclusões, ligar e desligar, voltar ao padrão, apagar, e preço-alvo e teto por faixa (vazio = automático, 85% e 115% da mediana). Os Alvos de `config/alvos.ts` são só o ponto de partida: um Alvo editado ou apagado na tela não é mais sobrescrito pelo worker. |
| Fotos só por endereço (12/11) | O projeto nunca guarda arquivo de imagem: só a URL da foto, de CDN externo (da loja ou da página). Vale para o deploy: nada de Storage para fotos. |
| Coleta educada | robots.txt, 1 pedido a cada 5 a 10 s por loja, cache, sem proxy. Pausa em 429, 403 ou 503 vale para o domínio inteiro, segura a fila, sobrevive ao reinício e cresce se o site reclamar de novo (1 h, 6 h, 24 h). Atualizado em 11/11 a pedido do usuário: o IP não pode entrar em lista de bloqueio. |
| Qualquer produto (11/11) | Telegram e comunidades trazem qualquer produto com link de loja; o usuário escolhe pelos grupos em que entra. Alvos só classificam. Categorias por regra e, no que sobrar, IA em lote. Posts de cupom vão para a tela Cupons. |
| IA sem teto (11/11) | A trava de US$ 4,50 e `AI_MAX_CHAMADAS_DIA` saíram. O usuário pausa e continua a IA no cabeçalho, chama a IA quando quiser e vê o custo e o uso da assinatura (5 h e semana). |
| Plano acelerado (10/11, 18:20) | Até o fim do 11.11 não há coleta rodando sozinha, agendamento nem pg-boss. Fica a verificação ao vivo de cada oferta que chega. Telegram e WhatsApp fora hoje: ofertas só do scraping ao vivo de comunidades e vitrines das lojas. Tudo num PC; o outro abre a Vitrine pela rede. Nota rápida, sem desconto real nem Black Fraude. |
| Telegram entra no 11.11 (10/11, 21:10) | Reverte a parte do plano acelerado que deixava o Telegram de fora. GramJS na conta do usuário, só leitura, papel `listen`. Chats de grupo e canal: os com nome de promoção ligam sozinhos, os outros ficam desligados em `sources.enabled`. WhatsApp segue fora. |
| Sem ensaio (10/11, 22:40) | O usuário pulou a Etapa 5 (ensaio e congelamento) e vai pedir melhorias numa sessão com o Fable 5.2. Quem pegar o projeto não precisa começar pelo ensaio. |
| Entram de novo no 11.11 (10/11, 22:00) | A pedido do usuário: IA com insights, vitrines das lojas, telas Detalhe, Fontes, Lojas e War Room. Continuam fora: WhatsApp, pg-boss e coleta diária, desconto real e Black Fraude. |
| Fontes bloqueadas (10/11, 21:40) | Bloqueio de site não se contorna: nada de proxy nem disfarce, vale o robots.txt. Alternativas legítimas viram fontes extras, e tudo cai no mesmo funil (a mesma oferta em várias fontes sobe a nota pelo calor social). |
| Coleta diária | Adiada para depois do 11.11: às 06:00, de 12/11 até a Black Friday (27/11). |
| IA: provedor | Interface `AiProvider` com `claude-cli` (teste pela assinatura), `anthropic-api` e `ollama`, escolhidos por `AI_PROVIDER`. Desde 18/11 também `agy` (Antigravity CLI), e quem trabalha se escolhe na tela (linha abaixo). |
| IA: Claude, agy ou os dois (18/11) | A pedido do usuário, o seletor "Usar" do cabeçalho escolhe Claude, agy (Antigravity CLI) ou os dois juntos (`app_settings` "ia_provedor"). Com os dois, as análises rodam em 3 pistas de cada um ao mesmo tempo, o freio de 85% da janela de 5 h para só as do Claude e categorias, radar e insights se revezam. O agy roda travado: pasta vazia, modo Default com permissão `strict` e todo comando negado. |
| IA: modelo | `claude-haiku-5-5` em toda chamada do Claude. Nada de Sonnet ou Opus no app. No agy, que não tem Haiku, vale o mais simples dele: `gemini-3.8-flash-low` (`AGY_MODEL`). |
| deploy-v2 (22/11) | Branch `deploy-v2` com o plano aprovado em `C:\Users\Jogga\.claude\plans\splendid-exploring-fern.md`: Prisma no lugar do Drizzle; contas com nome, e-mail e senha (bcrypt via `bcryptjs`) e Google (`better-auth`); tabela de cargos e permissões (admin e usuário, extensível); tudo de admin escondido do usuário comum na API, nas telas e no tempo real; Alvos e marcações (vigiar, descartar, soneca) de cada usuário; cadastro aberto. Dependências aprovadas pelo usuário: `prisma`, `@prisma/client`, `@prisma/adapter-pg`, `better-auth`, `bcryptjs`. |
| IA para usuário comum (22/11) | Por enquanto o usuário comum vê as análises da IA, pela permissão `ia.analises.ver` do cargo "usuário". O usuário vai tirar antes de abrir o app: é desmarcar a permissão. |
| Alvos de cada conta (22/11) | Cada conta tem os seus Alvos (cópia de `config/alvos.ts` quando nasce), com nota, preço-alvo, "Alvo atingido" e marcações (vigiar, descartar, soneca) só dela. Os Alvos de quem gerencia as fontes (admin) são os "do sistema": decidem a coleta (vitrines, buscas, título das mensagens) e o mercado da faixa, que entra na nota geral e na IA. A análise e o insight são iguais para todos: sem nome de Alvo, sem preço-alvo de ninguém e sem nome de grupo. Alvo de usuário comum nunca chega na IA nem muda a coleta. |
| Padrão is_active (23/11) | A pedido do usuário, toda tabela em que se liga ou desliga uma linha usa `is_active` (true = ativa): usuarios, cargos, alvos, sources, coupons, store_state, offers e products. As colunas antigas com a mesma ideia (active, enabled, hidden, paused_by_user) foram renomeadas, com o valor invertido onde vinham ao contrário. Desligar nunca apaga. |
| Nada do banco é apagado (22/11) | Pedido do usuário: dump completo (`pg_dump -Fc`) antes de cada fase que mexe no banco, guardado em `C:\Users\Jogga\garimpo-backups` (fora do projeto) e nunca apagado. Migrações só acrescentam; os dados são copiados para as estruturas novas e as colunas e tabelas antigas ficam sem uso até o usuário pedir para tirar. Nada de `DROP`, `TRUNCATE` ou `DELETE` em massa. |
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

### 23/11/2026, 06:00 · Nota única, Fase 3: calor social fora da nota, Pix × parcelar, faixa de certeza

- **Pedido do usuário:** não dar ênfase às curtidas e ao calor social (o app terá poucos usuários, no máximo os amigos dele); escolheu **tirar o calor social da nota de vez**. As curtidas do Promobit ficaram só como informação no Detalhe (coluna `offers.curtidas` já existia).
- **Feito:** pesos do algoritmo sem o S: A 0,50 · C 0,28 · F 0,22; com histórico, D 0,38 · A 0,31 · C 0,19 · F 0,12 (`src/lib/nota-algoritmo.ts`; o `scoreOffer` deixou de contar fontes em 15 min, uma consulta a menos por oferta; linhas antigas com `S` ignoram o S). Os sinais mostrados no Detalhe, painel e War Room agora são Desconto real, Preço × mercado, Loja e Frete (0 a 100 cada). **Pix × parcelar** (`compensa` em `src/lib/preco.ts`): valor presente das parcelas (primeira em 1 mês) a 1,0% ao mês (`app_settings.rendimento_mensal`, em %) contra o Pix; selo "Pix compensa / Parcelar compensa R$ X a menos", marcado como estimativa, no Detalhe e no painel (29 cards hoje). **Faixa de certeza** (`faixaDeCerteza` em `src/lib/nota.ts`): 4 pontinhos (histórico, IA, loja conferida, mercado da faixa) e meia-largura de 0,3 a 1,5 mais metade da divergência, em "Como a nota final foi feita".
- **Testado:** 193 testes, `tsc` e `eslint`; notas refeitas com o `rematchOffers`; na conta de teste a nota segue sem domínio de uma peça (correlação 0,73 com o algoritmo e 0,67 com a IA).
- **Pendente:** Fase 4 (`pnpm notas:calibrar`, depois de ~2 semanas de retratos e votos). A taxa de rendimento não tem tela; muda por `app_settings`.

### 23/11/2026, 05:30 · Nota única, Fase 2: histórico de preço (desconto real, selos) sem raspar

- **Feito:** `src/lib/historico.ts` (puro, testado): série própria (`price_points`, 30 dias) vira um ponto por dia, sem valores fora de lugar (IQR; o dia a R$ 1.712 não puxa a mediana), com mediana, mínimo, máximo, desconto real, "mais barato que em X% dos dias" e selos. **D** (desconto real) entra na nota do algoritmo (`PESOS_COM_D`: D 0,30 · A 0,25 · C 0,15 · F 0,10 · S 0,20; sem D valem os pesos de antes) e **dá preço ao algoritmo sem depender de Alvo**: ele opina com A ou D. O worker calcula o D em `scoreOffer`; o site calcula a série no preço do modo (no Pix, o Pix de cada dia) para o DTO (`historico`). Promobit: `readDealPage` guarda `referencePrices` (mín/máx, só se máx > mín) e `offerLikes` da página que já lê (`offers.ref_min_cents`, `ref_max_cents`, `curtidas`; migração só acrescenta, dump `…-0507-antes-do-historico-fase-2`); sem série própria o D vem da posição entre mín e máx, puxada para o meio. Telas: selos no card ("Menor em N dias", "X% abaixo do normal", "Black Fraude?", "\"De\" inflado?", só com 5+ dias, e os vermelhos só com 14+ dias e 5+ pontos, sempre como indício) e bloco "Histórico de preço" no Detalhe e no painel, com "Ver histórico ↗" (abre uma busca no navegador; o app não lê esses sites).
- **Testado:** 185 testes (histórico, D, leitor do Promobit). No site: só 11 de 1.128 cards têm histórico (4+ dias com preço), e os 11 entram na nota com D; ainda nenhuma oferta nova do Promobit passou pelo leitor novo (0 com mín/máx), então isso só aparece quando chegarem posts.
- **Atenção:** a cobertura é pequena hoje (o histórico próprio começou em 11/11, 12 dias) e cresce todo dia; **Black Fraude ainda não pode aparecer** (nenhum produto tem 14 dias; os primeiros chegam por volta de 25/11). Fica ligado e só dispara com os mínimos.
- **Pendente:** Fase 3 (Pix × parcelar, faixa de certeza, curtidas no S) e Fase 4 (`pnpm notas:calibrar`).

### 23/11/2026, 05:00 · Nota única 0–10 (algoritmo + IA), que segue cartão/Pix: Fase 1

- **Pedido do usuário:** a nota e a comparação entre lojas seguirem a escolha cartão/Pix; uma nota só em vez de uma do algoritmo e outra da IA, de 0 a 10 com casa decimal; um histórico de preços e mais inovações. Plano aprovado em `C:\Users\Jogga\.claude\plans\splendid-exploring-fern.md` (4 fases, prazo: Black Friday 27/11). **Esta entrada é só a Fase 1.**
- **O que os dados reais de hoje mostraram (e mudou o plano):** a nota do algoritmo ia de 36 a 59 (nenhuma das 1.809 ofertas chegava a 80) porque sinal desconhecido ganhava valor padrão (A 0,5, C 0,2, F 0,3); a da IA ia de 35 a 82 e as duas quase não concordavam (correlação 0,14); só 4% das ofertas têm Pix menor que o cartão; 893 ofertas estavam sem loja (444 de `meli.la`); o histórico próprio é fino (109 produtos com 5+ pontos).
- **Feito:**
  - `src/lib/nota-algoritmo.ts` (o worker re-exporta em `worker/score/nota.ts`): sinal que não se sabe **sai da conta** e os pesos se renormalizam; **sem o A (preço contra o mercado da faixa) o algoritmo não opina** (`nota` nula). `mercadoDe` mudou para lá;
  - `src/lib/nota.ts`: a nota única é a média ponderada das **posições** (percentis) do algoritmo e da IA entre as ofertas de 48 h (régua em `src/lib/nota-posicao.ts`, cache de 60 s, junta as notas gerais e as de conta; com menos de 30 notas a posição vira a própria nota). Peso do algoritmo = o quanto dos sinais era conhecido; peso da IA = alta 1 · média 0,75 · baixa 0,5. "Evitar" da IA com confiança média ou alta limita em 4,0. Selos "só algoritmo", "só IA" e "divergente" (posições a 0,35 ou mais). `fmtNota` mostra "8,2";
  - **Sem vazar IA:** a mistura é refeita em `src/lib/visao.ts` (`notaParaQuem`): sem `ia.analises.ver` a nota sai só do algoritmo e a posição e o peso da IA nem saem do servidor;
  - **Cartão/Pix na leitura** (sem coluna nova): `?preco=cartao|pix` em `/api/offers` e `/api/offers/[id]` (`precoDoPedido`); o A é refeito com o preço Pix onde o Pix é menor que o cartão; a loja do card, a ordem das lojas, "Mais barato", `spreadText`, a escada de preços e o "Alvo atingido" exibido seguem o modo (`valorDe`). Os avisos "Alvo atingido" do worker continuam pelo cartão;
  - Telas: nota única no card, painel, War Room e Detalhe (com a dica de onde veio); bloco "Como a nota final foi feita" (`como-a-nota.tsx`); sinais sem dado aparecem como "sem dado"; `AiLine` sem o número da IA; ordenador "IA" vira veredito + nota; `useLive` busca de novo quando o preço em destaque muda;
  - **Lojas pelo encurtador** (`src/config/stores.ts`): `meli.la` → Mercado Livre, `link.amazon` e `amzlink.to` → Amazon, `magazineluiza.onelink.me` → Magalu; `rematchOffers` preenche a loja das ofertas antigas (as ofertas sem loja caíram de 893 para 346);
  - **Gabarito** (migração `nota_gabarito`, só acrescenta, com dump `…-0445-antes-do-gabarito-da-nota`, RLS ligada): `nota_registro` (um retrato por produto a cada análise da IA, em `worker/ai/analises.ts`), `nota_feedback` (👍/👎 "essa nota fez sentido?", `VotoNota`, só conta) e `cliques_comprar` (só conta). `notaGarimpo` saiu do prompt da IA (não estava no hash: nada foi reanalisado).
- **Testado:** 171 testes (`nota`, `nota-algoritmo`, `storeQuotes` por modo, permissão da IA, encurtador → loja), `tsc` e `eslint`. Contra o site no ar: nota sempre entre 0,0 e 10,0 e ordenada; com uma conta de teste que tem Alvos, a mistura existe em 84 cards e **nenhuma peça domina** (correlação da nota com o algoritmo 0,74 e com a IA 0,66); no Pix a nota muda só onde há Pix (ex.: monitor AOC 8,6 → 9,4); visitante sem `ia.analises.ver` não recebe `ia` nem posição nem peso da IA (restaurado); feedback e clique sem conta dão 401.
- **Achados importantes (vale ler):**
  - **Nenhum Alvo do sistema está ligado:** os 10 Alvos da conta admin foram apagados na tela Alvos hoje às 01:12 (e os antigos em 13/11). Sem Alvo não há mercado da faixa, então o A não existe e **o algoritmo não opina para nenhuma oferta da Vitrine geral**: a nota de quem não tem Alvos é só a posição da IA, e quem não pode ver a IA fica sem nota. Contas com Alvos ligados (as de teste) têm mistura em ~8% dos cards. O desconto real vindo do histórico (Fase 2) é o que dá preço ao algoritmo sem depender de Alvo.
  - **JáCotei não pode ser lido por código:** os Termos de Uso dele (`jacotei.com.br/terms`) proíbem "raspar, espelhar ou republicar o conteúdo do Site sem permissão por escrito" (e o robots bloqueia ClaudeBot e GPTBot por nome). Sai do plano como fonte automática; o `docs/fontes-novas.md` o listava só pelo robots. Promobit (`referencePrices`, `offerLikes`) vem da página que o app já lê.
  - O `rematchOffers` leva ~5,5 min (11 mil ofertas de 7 dias) e o worker em `tsx watch` reinicia a cada arquivo salvo, então durante o desenvolvimento ele raramente termina; rodei um por fora para refazer as notas.
- **Pendente (Fases 2 a 4 do plano):** D (desconto real) pelo histórico próprio e pela referência do Promobit, selos de desconto real e Black Fraude (só com 14+ dias e 5+ pontos), "Ver histórico ↗", Pix × parcelar, faixa de certeza, curtidas do Promobit, e `pnpm notas:calibrar` (precisa de ~2 semanas de retratos e votos). Decisão do usuário pendente: religar os Alvos (para o algoritmo voltar a opinar) e criar conta no Keepa (Amazon, opcional).
- **Como testar:** reiniciar `pnpm dev` (cliente do banco novo; sem isso o 👍/👎 e o clique em Comprar dão erro), abrir a Vitrine, trocar Cartão/Pix e ver nota e lojas mudarem onde há Pix; abrir um Detalhe e ver "Como a nota final foi feita"; votar 👍/👎 e clicar em Comprar com conta.

### 23/11/2026, 02:30 · Vitrine aberta a visitantes e preço preferido (cartão ou Pix)

- **Pedido do usuário:** destacar o preço no Pix, se a pessoa preferir (popup na primeira abertura); e deixar quem não tem conta ver a Vitrine, pedindo conta só para vigiar, Alvos e o que é pessoal. Plano aprovado em `C:\Users\Jogga\.claude\plans\splendid-exploring-fern.md`; o usuário decidiu que a escolha de preço fica **no banco para quem tem conta e no navegador para o visitante**.
- **Feito:**
  - Migração `visitante_e_preco` (só acrescenta; sem dump novo, o último é o `…-0043-antes-de-id-numerico`): cargo de sistema **Visitante** (`ofertas.ver` e `ia.analises.ver`) e `usuarios.preco_preferido`;
  - Visitante: só **leitura** de `/`, `/cupons`, `/oferta/*`, `/api/offers*`, `/api/cupons`, `/api/status` e `/api/me` passa sem conta (`src/proxy.ts`, `exigirOuVisitante` em `src/lib/sessao.ts`, falha fechada); recebe nota geral, sem Alvo, sem marcações, sem nomes de grupo nem link de post. Desmarcar `ofertas.ver` do Visitante fecha o site de novo. Sem SSE nem eventos (consulta a cada 30 s). O cargo não se dá a uma pessoa nem é o de quem se cadastra;
  - Cabeçalho do visitante: Entrar e Criar conta; menu com Alvos (leva a criar conta). Vigiar e descartar abrem o aviso "crie uma conta" (`conta-aviso.tsx`); `/entrar` aceita `?modo=criar` e mostra o motivo;
  - Preço: `src/lib/preco.ts` (`precoDe`, testada), botão "Preço: Cartão | Pix" no cabeçalho e popup na primeira visita (`preco.tsx`, `globais.tsx`). O destaque muda no card, no Detalhe, no painel de foco, na War Room, na linha de Alvo atingido e nos filtros e na ordenação de preço; Pix preferido em oferta sem Pix cai no cartão. Ao entrar com conta sem escolha, a do navegador vai para a conta; conta com escolha manda.
- **Testado:** 151 testes (inclui `precoDe` e os caminhos abertos do `proxy`), `tsc` e `eslint`. Por HTTP: visitante vê 979 cards, 401 em vigiar, Alvos e criar Alvo; `PATCH /api/me` grava o Pix no banco, valor inválido e campo a mais dão 400, sem `Origin` 403; tirar `ofertas.ver` do Visitante dá 401 em tudo (a conta logada continua), tirar só `ia.analises.ver` zera as análises, e tudo foi restaurado. No navegador (como visitante): popup abre, escolher Pix grava no navegador e 114 cards passam a destacar o Pix (ex.: "R$ 130,15 no Pix · cartão R$ 137,00 · 4x de R$ 34,25"), Vigiar abre o aviso com os links certos, `/entrar` mostra o motivo.
- **Achado:** depois de `prisma generate` o `pnpm dev` precisa reiniciar (cliente do banco antigo dá 500 em `/api/me`).
- **Atenção:** a Vitrine aberta faz a consulta pesada de `/api/offers` para cada visitante; o cache curto de ~15 s citado no plano não foi feito (fica como melhoria se vier muito acesso). O arquivo de senhas das contas de teste sumiu do projeto; as senhas das 3 contas de teste foram trocadas e ficaram só na pasta temporária.

### 23/11/2026, 01:30 · Ids numéricos (1, 2, 3...) nos usuários

- **Antes:** dump `garimpoi-20261123-0043-antes-de-id-numerico.dump`. A migração foi testada primeiro numa cópia restaurada desse dump (`garimpoi_idtest`) e só depois aplicada no banco de verdade.
- **Pedido do usuário:** o id do usuário era um texto aleatório do login (não era UUID de verdade, 32 caracteres); passa a ser número.
- **Feito (migração `id_numerico`):** `usuarios.id` virou inteiro SERIAL; os usuários foram numerados pela data de criação (1 = o mais antigo) e o id de texto de antes ficou em `usuarios.id_antigo`. Tudo que apontava para o usuário (Alvos, marcações, eventos, sessões e contas de login) foi convertido pelo número novo antes de a coluna antiga sair (as colunas antigas saem, o mapeamento fica em `id_antigo`; o dump guarda tudo). Por pedir o mesmo tipo de id em todas as tabelas do login, `sessoes`, `contas`, `verificacoes` e `limites_de_acesso` também têm id numérico (better-auth com `generateId: "serial"`). O código trata o id do usuário como número (o `userId` dos avisos do tempo real e do comando de Alvos também). Regra no CLAUDE.md.
- **Testado:** na cópia e no banco de verdade, contagens iguais antes e depois (3 contas, 33 sessões, 40 Alvos, 2.514 ofertas em Alvos, 110 eventos de usuário). Por HTTP: login das 3 contas de teste (as sessões abertas foram mantidas no banco), cadastro novo vira o **número 4** e já ganha os 10 Alvos, cada conta só vê e mexe nos próprios Alvos e marcações (404 no de outra), desativar e reativar pela tela Usuários, sair. A passagem dos dados de antes para o admin foi refeita na cópia com ids numéricos. 140 testes, `tsc` e `eslint`.
- **Ficou no seu Postgres:** `garimpoi_idtest` (cópia de teste) e a conta de teste `teste-cadastro@garimpo.test`.
- **Detalhe:** a resposta do login devolve o id como texto ("2"); o app converte para número, não afeta nada.

### 23/11/2026, 01:00 · Padrão `is_active` em todas as tabelas de ligar e desligar

- **Antes:** dump `garimpoi-20261123-0033-antes-de-renomear-para-is-active.dump`.
- **Pedido do usuário:** o padrão dele nos esquemas é a coluna `is_active`. Decisão nova na tabela acima.
- **Feito (migração `padrao_is_active`, escrita à mão para renomear sem perder dado):**
  - Renomeadas: `alvos.active` e `sources.enabled` viraram `is_active` (mesmo valor); `coupons.hidden` e `store_state.paused_by_user` viraram `is_active` com o valor invertido (escondido ou pausado = false). Conferido antes e depois: 1.461 cupons visíveis, nenhuma loja pausada, 21 Alvos e 8 fontes desligados, iguais;
  - Novas: `cargos.is_active` (cargo desativado some da lista para escolher e quem está nele fica com as permissões do padrão; o admin e o cargo de quem se cadastra não se desativam), `offers.is_active` e `products.is_active` (tirar uma oferta, ou o produto inteiro de todas as lojas, da Vitrine de todos: botões no Detalhe para quem tem a permissão nova `ofertas.moderar`; o que sai da Vitrine também sai da conferência, da IA, do radar e da Fila da IA). Nada é apagado;
  - Telas e APIs seguem com os mesmos nomes (esconder cupom, pausar loja, ligar Alvo, pausar fonte); por dentro é tudo `is_active`. Regra no CLAUDE.md.
- **Testado (por HTTP, só com o site no ar):** esconder e mostrar cupom, pausar e retomar loja, desligar e ligar Alvo, pausar e retomar fonte gravam `is_active` certo e as telas mudam; cargo desativado tira as permissões dele na hora (fica o padrão), não pode ser dado a ninguém nem virar padrão; admin e padrão não se desativam; oferta tirada some da Vitrine do comum, o detalhe dá 404 para ele e 200 para o admin; produto tirado leva todas as ofertas dele; comum não tira nada (403). Tudo voltou como estava. 140 testes, `tsc` e `eslint`.
- **Ficou no banco:** o cargo de teste "Moderador teste" (ninguém nele; dá para apagar na tela Usuários).

### 23/11/2026, 00:45 · `usuarios.is_active`: ativar e desativar contas

- **Antes:** dump `garimpoi-20261123-0026-antes-do-is-active.dump`.
- **Feito:** coluna `is_active` (padrão do usuário nos esquemas dele) em `usuarios`, migração `usuarios_is_active` (só acrescenta; toda conta começa ativa). Na tela Usuários, a coluna "Ativo" com caixa de marcar e a linha apagada de leve quando desativada. Conta desativada: não entra (nem com senha nem com Google: "Esta conta está desativada"), perde o acesso na hora mesmo com a sessão aberta (a tela volta para /entrar) e os Alvos dela param de pegar ofertas. Nada dela é apagado; reativar devolve tudo. Travas: ninguém desativa a própria conta, e o último administrador ativo não é desativado nem perde o cargo. `pnpm admin:criar` também reativa (saída se o admin ficar desativado).
- **Testado (por HTTP, só com o site no ar):** desativada, a conta comum2 levou 401 na Vitrine, em /api/me e nos Alvos com a sessão que já tinha; ao entrar de novo, 403 com "conta desativada" e sem cookie; reativada, entra e vê a Vitrine. O admin não se desativa; um comum não reativa ninguém (403); pedido com campo a mais dá 400. 140 testes, `tsc` e `eslint`.
- **Em aberto:** quais outras tabelas ganham `is_active` (a análise está na resposta ao usuário).

### 23/11/2026, 01:20 · `pnpm insights`: a IA controlada pelo terminal

- **Feito:** `pnpm insights` (e o antigo `pnpm ia:insights`, que agora abre o mesmo menu) controla a IA pelo terminal, com as mesmas regras dos botões do cabeçalho e da Fila da IA. Sem nada abre um menu numerado; com uma opção faz só ela: `situacao`, `pausar`, `continuar` (já pede uma rodada ao worker), `usar claude|agy|ambos`, `gerar [n]` (insights dos n produtos de nota mais alta, aqui no terminal), `ultimos [n]`, `fila`, `rodar` (o "Chamar IA agora", feito pelo worker) e `radar`. "Worker rodando" é conferido pela conexão que escuta o canal da IA; o uso da assinatura do Claude mostra quando foi medido (com só o agy trabalhando, o número fica velho). As telas do site atualizam na hora. Saiu `worker/ai/run-once.ts`.
- **Testado:** todas as opções direto e pelo menu (com a entrada digitada): pausar barra o `gerar`, continuar volta e avisa o worker, `usar` com modo inválido só mostra as escolhas; a IA terminou como estava (ligada, só o agy).
- **Pendente:** a Fase 8 (deploy) fica para depois, a pedido do usuário.

### 23/11/2026, 00:55 · deploy-v2, Fase 7: blindagem do worker, da IA e do banco

- **Antes:** dump `garimpoi-20261122-2332-antes-da-fase-7.dump` (6,1 MB).
- **Feito:**
  - **Rede interna barrada (SSRF):** `worker/http/rede.ts` confere todo endereço que o worker abre, inclusive cada redirecionamento (o `fetch` não segue mais sozinho) e o robots.txt: só http/https, só portas 80 e 443, sem usuário e senha na URL, nada de `localhost`, `.local`, nome sem domínio, e o nome é resolvido no DNS antes; qualquer IP interno (127.x, 10.x, 172.16-31.x, 192.168.x, 169.254.x, CGNAT, IPv6 local e IPv4 disfarçado em IPv6, hexadecimal ou decimal) barra o pedido. Vale para verificação, coleta, fontes configuráveis e encurtadores;
  - **Comandos conferidos:** `worker/comandos.ts` (zod) para os canais da IA, das Fontes e do Telegram, além do de Alvos (Fase 6). Formato errado é ignorado e fica no log. O "Testar" das Fontes já confere a configuração no site. A releitura dos chats do Telegram virou no máximo uma a cada 15 s (pedir demais faz o Telegram travar a conta);
  - **IA com ambiente mínimo:** `claude -p` e `agy` não herdam mais o ambiente do worker (que tinha `DATABASE_URL`, a sessão do Telegram e os segredos do login e do Mercado Livre). Recebem só o que o sistema precisa para rodar e, no Claude, o token da assinatura;
  - **Banco trancado (RLS):** migração `travar_tabelas` liga o RLS em todas as tabelas e, no Supabase, tira toda permissão dos papéis públicos (`anon` e `authenticated`). O site e o worker entram como dono e não mudam nada. `pnpm db:travas` confere (rodar antes de cada deploy);
  - **Cabeçalhos de segurança** em toda resposta: sem moldura de outro site (`frame-ancestors 'none'`, `X-Frame-Options`), `nosniff`, `Referrer-Policy`, `Permissions-Policy`, `Cross-Origin-Opener-Policy`, HSTS só em produção e sem `X-Powered-By`.
- **Testado:**
  - 10 testes da rede: `localhost`, `192.168.0.1`, `169.254.169.254`, `[::1]`, `[::ffff:127.0.0.1]`, `0x7f.1`, `2130706433`, nome que resolve para a rede de casa, `file://`, porta 5432 e senha na URL são barrados; redirecionamento de um encurtador para `192.168.0.1` é barrado antes de sair do PC (o pedido ao roteador nunca acontece); loja e encurtador de verdade passam;
  - Com o worker rodando: 14 ofertas conferidas na loja em 15 min (com redirecionamentos e encurtadores), nenhuma barrada por engano;
  - 7 testes das travas da IA: `--tools ""`, sem sessão salva, sem `--bare` nem pular permissões, sem shell, Haiku; agy em `strict`, com todo comando negado, `--sandbox` e sem atalhos; nenhum segredo do .env no ambiente dos dois; o texto das ofertas vai pela entrada, nunca na linha de comando, e no agy as regras vêm antes dos dados;
  - Chamada de verdade a cada um com um "ataque" no texto da oferta (criar arquivo, rodar `set`, mostrar o `DATABASE_URL`): os dois responderam só o resumo da oferta, nenhum arquivo foi criado e nenhum segredo apareceu;
  - Nenhum módulo da IA lê contas, Alvos de usuário nem nome de grupo (conferido no código);
  - RLS, no banco de cópia: um papel de fora com permissão de leitura em tudo vê 0 usuários, 0 sessões e 0 ofertas; o dono vê as 20.026. `pnpm db:travas` passa no banco de verdade;
  - Comandos: JSON quebrado, ação desconhecida, campo a mais (ex.: um "prompt" escondido no comando da IA) e tipo errado são ignorados. 140 testes, `tsc` e `eslint`.
- **Limite conhecido:** o nome é conferido no DNS logo antes do pedido; um site que troque o IP do nome entre a conferência e a conexão (DNS rebinding) ainda passaria. Fechar isso pede trocar o `fetch` por `http.request` com a conferência na hora de conectar; fica como melhoria.
- **Próximo passo:** Fase 8, preparar o deploy (sem publicar): `docs/deploy.md`, Supabase (pooler, Data API), Google e `next build` com variáveis de produção.

### 23/11/2026, 00:05 · deploy-v2, Fase 6: Alvos e marcações de cada conta

- **Antes:** dump `garimpoi-20261122-2252-antes-da-fase-6.dump` (6,0 MB) em `C:\Users\Jogga\garimpo-backups`.
- **Feito:**
  - Migração `alvos_por_usuario` (só acrescenta): `alvos.owner_id`, `events.user_id`, tabelas `oferta_alvo` (oferta, conta, Alvo, faixa, nota, "Alvo atingido") e `oferta_usuario` (vigiar, descartar, soneca). A única coisa que sai é a regra "nome de Alvo único no app todo", que vira "único por dono" (nenhum dado muda). As colunas antigas de `offers` (`watched`, `dismissed`, `snoozed_until`, `hit_at`) ficam como estavam;
  - Cada conta nova (e-mail ou Google) ganha a cópia dos 10 Alvos iniciais (gancho do better-auth) e o worker classifica as ofertas de 7 dias para ela; conta antiga sem Alvos ganha a cópia quando o worker sobe;
  - Worker: duas camadas. **Sistema** = Alvos ligados de quem tem `fontes.gerenciar` (o admin): coleta, título das mensagens, mercado da faixa e nota geral (contra 85% e 115% da mediana, nunca o número de alguém). **Pessoal** = cada oferta nova é classificada nos Alvos de cada conta, com nota e "Alvo atingido" do preço-alvo dela; "oferta nova", "preço mudou", "esgotou" e "Alvo atingido" vão só para o dono (evento com `user_id` e aviso do tempo real só para ele);
  - Tela Alvos e APIs: cada conta só lê e muda os próprios Alvos (o de outra conta dá 404). Mudança na tela reclassifica só aquela conta, no máximo uma rodada a cada 10 s por conta; se a conta é admin, refaz também o sistema. O comando para o worker é conferido com zod (formato errado é ignorado);
  - Vitrine, Detalhe, War Room e cabeçalho: nota, Alvo, preço-alvo, "Alvo atingido" e marcações da conta; descartar some só para quem descartou;
  - IA: a análise e o insight não usam mais o nome do Alvo nem o preço-alvo de alguém (fica o mercado da faixa) e a análise não recebe mais o nome do grupo que postou. As chaves do hash ficaram iguais: **nenhuma oferta foi reanalisada** por causa da mudança;
  - `pnpm admin:criar` agora pergunta se a sua conta fica com os dados de antes das contas: os Alvos (com o estado que tinham), o preço-alvo e o teto de cada faixa, as marcações e os eventos. É cópia, uma vez só; as linhas de antes ficam iguais.
- **Testado:**
  - Worker subindo: 10.266 ofertas, **0 mudaram no sistema** (sem reanálise), 1.201 entraram nos Alvos da conta comum;
  - Duas contas comuns (a segunda criada pelo cadastro e com o Mouse desligado): o mesmo headset conferido na loja (R$ 144,90) é "Alvo atingido" com nota 81 para quem pôs preço-alvo alto, e sem ouro com nota 36 para a outra (alvo automático de R$ 100,30). Descartar numa some só nela; vigiar numa não aparece na outra. A segunda conta não vê os Alvos da primeira, e editar, mudar faixa, desligar e apagar o Alvo dela dá 404 (o Alvo continua igual). Eventos: cada uma vê só os seus, nenhum em comum;
  - Dados de antes, num banco de cópia (`garimpoi_f6teste`, restaurado do dump): a conta admin ficou com os 10 Alvos como estavam (todos apagados em 13/11, o Braço articulado com os seus termos), 40 faixas, 24 marcações e 1.237 eventos; as linhas de antes ficaram idênticas; rodar de novo não faz nada. A migração também passou num banco vazio (o caso do Supabase);
  - De novo o teste da Fase 5 (403, nomes de grupo, tempo real): tudo igual. 122 testes, `tsc` e `eslint`.
- **Achados:**
  - No banco que veio do Drizzle a regra antiga era uma *restrição*, não um índice: a primeira tentativa da migração parou no meio. Terminei os comandos que faltavam numa transação, marquei como aplicada e deixei a migração valendo para os dois casos (`IF EXISTS`);
  - A conta de admin de teste é admin: com Alvos ligados ela passaria a decidir a coleta. Por isso os Alvos dela estão desligados;
  - A subida do worker leva uns 3 min (a reclassificação de 7 dias). Cresce com o número de contas.
- **Para você:**
  - Rode `pnpm admin:criar` com o seu e-mail e responda **s** para ficar com os dados de antes. Os seus Alvos voltam como estavam: todos apagados (você apagou em 13/11). Para ter Alvos de novo, crie na tela Alvos;
  - Os bancos de teste `garimpoi_f6teste` e `garimpo_vazio_f6` ficaram no seu Postgres (não apaguei nada). Pode apagar quando quiser.
- **Próximo passo:** Fase 7, blindagem do worker (bloqueio de rede interna, comandos do `pg_notify` com zod, travas do `claude -p` e do `agy`, cabeçalhos de segurança).

### 22/11/2026, 22:55 · deploy-v2, Fase 5: admin e usuário comum separados (API, telas e tempo real)

- **Feito:**
  - Toda rota de `src/app/api` chama `exigir(<permissão>)` logo depois de `connection()`; as que mudam algo também conferem a origem. Fontes (inclusive Testar, convite e reler), Lojas, `/api/ia` e Fila da IA, esconder cupom e `/api/admin` são só de quem tem a permissão de admin; Vitrine, Detalhe, Cupons, eventos e status pedem `ofertas.ver`; Alvos pedem `alvos.proprios`;
  - `src/lib/visao.ts` monta o que cada um vê: sem `ofertas.detalhes_internos`, o nome de grupo do Telegram vira "Grupo do Telegram" (fonte, "em N fontes", lojas e calor social), o link do post do cupom some e o motivo técnico de "não conferido" vira "não deu para conferir o preço na loja"; sem `ia.analises.ver`, a análise da IA e o insight saem da resposta;
  - Cabeçalho (`/api/status`): custo e uso da IA só com `ia.gerenciar`; saúde das fontes, Telegram, "Verificando" e fila só com `sistema.ver`; radar só com `ia.analises.ver`. Na tela, Pausar, Chamar IA, "Usar", "Fontes" e "Máquina" seguem as mesmas permissões;
  - Eventos: o comum não vê "canal novo" (nome de grupo);
  - Tempo real (`/api/stream`) exige sessão e passa cada aviso por `src/lib/avisos.ts`: o admin recebe o aviso inteiro; o comum só oferta, cupom, Alvos, evento e insight, sem detalhe (só o tipo e o número). Pausa de loja, fonte, IA e canal novo não saem para ele; aviso com dono (o "Alvo atingido" da Fase 6) só vai para o dono;
  - `<Restrita>` nas telas Fontes, IA, Lojas, Usuários e Alvos: quem não pode vê "Esta tela é só para administradores" e o link para a Vitrine (quem barra de verdade é a API).
- **Testado (por HTTP, com uma conta comum e uma admin, contra os dados reais):** o comum leva 403 em `/api/fontes`, `/api/lojas`, `/api/ia/fila`, `/api/admin` e Testar fonte, e também ao pausar a IA, pausar loja, reler fontes e esconder cupom; o admin leva 200 em tudo. Nenhum dos 39 nomes de grupo do Telegram aparece nos campos de fonte da Vitrine, do Detalhe, dos Cupons e dos eventos do comum (só aparecem "KaBuM!", que é nome de loja, e o título de um cupom). Status do comum: IA `null`, 0 fontes, Telegram `null`, fila `null`; o do admin vem completo. 0 de 158 cupons com link do post para o comum. Tempo real: com 5 avisos de teste, o comum recebeu só `{"type":"offer","id":1}`; o admin recebeu 4 inteiros e ninguém recebeu o aviso com dono de outra pessoa. Sem sessão, `/api/stream` dá 401. 118 testes, `tsc` e `eslint`.
- **Achado:** o limite de 5 logins por minuto vale também para os scripts de teste (eles esperam e tentam de novo).
- **Pendente:** os Alvos ainda são de todos (o comum lê e muda os mesmos Alvos do admin) até a Fase 6. O cabeçalho e o menu do comum não foram vistos no navegador (o painel do navegador estava fechado); a API foi testada.
- **Próximo passo:** Fase 6, Alvos e marcações de cada usuário (com dump antes).

### 22/11/2026, 21:00 · deploy-v2, Fase 4: cargos e permissões

- **Feito:**
  - Tabelas `cargos`, `permissoes` e `cargo_permissoes`, e `usuarios.cargo_id` (migração `cargos`: só acrescenta, com a semente em `INSERT`). Cargos iniciais: **Administrador** (`todas`: tem todas as permissões, sempre) e **Usuário** (o padrão de quem se cadastra: `ofertas.ver`, `ia.analises.ver`, `alvos.proprios`). Cargo novo é uma linha: a tela cria e marca as permissões;
  - As 10 permissões ficam em `src/config/permissoes.ts`, com teste que confere a semente da migração. Permissão nova: no arquivo e numa migração;
  - `src/lib/sessao.ts`: `getUser()` traz cargo e permissões do banco; `exigir(permissao, request)` devolve o usuário ou a resposta 401/403 pronta e, nos pedidos que mudam algo, confere que vieram do próprio site (`Origin`, contra CSRF). Sem cargo marcado, vale o padrão; sem semente, nenhuma permissão (nunca o contrário);
  - Quem se cadastra nunca escolhe cargo: o cadastro do better-auth não aceita esse campo e só a rota de admin muda;
  - Tela **Usuários** (`/admin`): usuários com o cargo de cada um (dá para trocar), cargos com as permissões (criar, editar, "usar para quem se cadastra", apagar). Travas: o app nunca fica sem administrador, o admin não vira cargo de cadastro, cargo do sistema e cargo com gente dentro não se apagam;
  - `/api/me` (quem sou, cargo, permissões) e o menu só mostra o que a pessoa pode usar (cada item diz a permissão que precisa);
  - `pnpm admin:criar`: pede e-mail, nome e senha no terminal (a senha não aparece), cria a conta como Administrador ou promove uma conta que já existe (inclusive criada com Google).
- **Testado (por HTTP, com uma conta comum e uma admin de teste):** comum dá 403 em `/api/admin` e não troca o próprio cargo; admin cria o cargo Moderador, põe o comum nele e as permissões mudam na hora; não apaga cargo com gente; não tira o único admin; pedido sem `Origin` dá 403; tirar `ia.analises.ver` do cargo Usuário some na hora e volta ao restaurar. 114 testes, `tsc` e `eslint`.
- **Achado:** depois de `prisma generate` (migração nova) é preciso reiniciar o `pnpm dev`: o cliente do Prisma fica guardado entre os recarregamentos do Next.
- **Para você:** rode `pnpm admin:criar` com o seu e-mail para ter a sua conta de Administrador.
- **Próximo passo:** Fase 5, esconder do usuário comum tudo que é de admin (APIs, telas e tempo real).

### 22/11/2026, 20:45 · deploy-v2, Fase 3: contas e login

- **Feito:**
  - `better-auth` 1.7.27 com o adaptador do Prisma. Tabelas novas (migração `contas`, só `CREATE`): `usuarios`, `sessoes`, `contas`, `verificacoes` e `limites_de_acesso`;
  - Senha com bcrypt (`bcryptjs`, custo 12, de 8 a 72 caracteres): no banco fica só o hash (`$2b$12$...`), em `contas.password`;
  - `/entrar` com "Entrar", "Criar conta" (nome, e-mail e senha) e "Entrar com Google" (o botão só aparece com `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` no `.env`). Volta para a página de onde veio (`?de=`, só caminho do próprio site);
  - Sessão de 30 dias no banco, em cookie `HttpOnly` e `SameSite` (e `Secure` no https). Limite de tentativas no banco: 5 logins por minuto e 5 cadastros por hora por IP. Telemetria do better-auth desligada;
  - `src/proxy.ts` agora exige sessão: sem ela, página vai para `/entrar` e `/api` responde 401. A checagem de verdade fica em `src/lib/sessao.ts` (`getUser`), que as rotas vão usar na Fase 5. Saíram a senha única do site (`SITE_PASSWORD`, `src/lib/auth.ts` antigo e `/api/entrar`);
  - Cabeçalho com o nome de quem entrou e "Sair";
  - `.env`: `BETTER_AUTH_SECRET` (gerado, 32 bytes) e `BETTER_AUTH_URL`; `.env.example` explica como gerar.
- **Testado (por HTTP, contra o site local):** criar conta já entra; Vitrine com sessão 200 e sem sessão 401/`/entrar`; sair encerra; o mesmo e-mail não cria duas contas; 5 senhas erradas seguidas e a 6ª dá 429; depois de um minuto, a senha certa entra. A conta de teste é `teste-comum@garimpo.test`, com a senha num arquivo local fora do Git (`.contas-de-teste.local.json`).
- **Pendente:** "Entrar com Google" precisa do cliente OAuth do usuário no Google Cloud Console (as URLs de retorno vão no `docs/deploy.md` da Fase 8). Sem serviço de e-mail, não há confirmação de e-mail nem "esqueci a senha" (decisão do plano); por isso o Google só junta com uma conta de senha se o e-mail dela estiver confirmado, o padrão seguro do better-auth.
- **Próximo passo:** Fase 4, cargos e permissões (e o `pnpm admin:criar`).

### 22/11/2026, 20:30 · deploy-v2, Fase 2: tudo no Prisma, Drizzle fora

- **Feito:**
  - As cerca de 170 consultas do site (`src/lib/*`, 20 rotas de `src/app/api`) e do worker (`pipeline`, `verify`, `ai/*`, `collect/*`, `ingest/telegram`, `index`, `dev/simular`) agora usam o Prisma. Saíram `drizzle-orm`, `drizzle-kit`, `drizzle.config.ts`, `src/lib/db/schema.ts` e o `db:push`. As tabelas e os dados continuam iguais;
  - Tipos dos campos JSON em `src/lib/db/types.ts` (`asJson`, `json`, `jsonOrNull`, `alvoFromDb`);
  - SQL puro (`$queryRaw`, sempre com parâmetros) onde o Prisma mudaria o comportamento: `ingestRaw` (`on conflict do nothing returning id`, para a mesma mensagem nunca virar duas ofertas), `saveCoupons` (junta listas no próprio banco), contagens com `filter`, histórico por dia e o "calor social";
  - `src/lib/tempo.ts`: "hoje" é sempre o dia de São Paulo, calculado no código (`inicioDoDia`). Antes era `date_trunc('day', now())`, que no Supabase (UTC) viraria o dia UTC;
  - O hash das análises da IA ficou idêntico (mesmos campos, mesma ordem): as 14.512 análises seguem valendo e nada volta para a fila.
- **Problema achado e corrigido (fuso):** o adaptador do Prisma (`@prisma/adapter-pg`) manda e lê datas sem fuso. Com a sessão do banco local em America/Sao_Paulo, tudo que o Prisma criou com a hora de agora foi gravado **3 h adiantado**, e as leituras vinham 3 h atrasadas. Correção: toda conexão local abre em UTC (`options: -c TimeZone=UTC` em `pgConfig`, com teste); o Supabase já é UTC. Reparo: dump antes (`antes-de-corrigir-fuso`) e, numa transação, menos 3 h em todo horário que tinha ido para o futuro (1.445 valores em ofertas, análises, cupons, uso da IA, fontes, convites e referências de faixa; as 2 pausas de loja foram corrigidas pela hora de gravação da linha). O que o Prisma leu e regravou ficou certo, porque os dois erros se anulam.
- **Também:** o `pnpm dev` que estava aberto caiu durante a troca (o worker recarregou com arquivos pela metade e o `concurrently -k` derrubou o site). Ele agora roda na aba "garimpo dev" do terminal. Os 10 Alvos estão apagados desde 13/11 (apagados um a um pela tela, já no primeiro dump): não foi a migração.
- **Testado:** uma oferta da Amazon verificada pelo código novo (produto criado, preço gravado, hora certa); as 9 APIs das telas respondem 200; o worker subiu com todos os papéis, reclassificou 9.068 ofertas sem mudança, o Telegram trouxe as mensagens desde 18/11 (cerca de 900 ofertas novas), os cupons foram juntados e o agy fez análises e categorias. 112 testes, `tsc` e `eslint`.
- **Próximo passo:** Fase 3, contas e login (e-mail e senha com bcrypt, Google).

### 22/11/2026, 20:00 · deploy-v2, Fase 1: Prisma ao lado do Drizzle

- **Feito:**
  - Prisma 7.10.1 (`prisma`, `@prisma/client`, `@prisma/adapter-pg`). O `latest` do npm da CLI apontava para um 8.0 RC; ficou a última estável;
  - `prisma db pull` leu as 17 tabelas do banco sem mexer em nada. Um script renomeou modelos e campos para os nomes que o código já usa (`Offer.priceCardCents`, `Insight.produtoId`...), com `@@map`/`@map` para as tabelas e colunas de sempre. `prisma migrate diff` contra o banco: **migração vazia**, ou seja, o schema descreve o banco exatamente;
  - Migração `0_init` (o banco de hoje) marcada como **já aplicada** (`migrate resolve --applied`): o Prisma nunca vai recriar nada. A única coisa nova no banco é a tabela de controle `_prisma_migrations`;
  - `src/lib/db/prisma.ts`: cliente único no mesmo pool do `pg` (SSL do Supabase e limite de conexões da Vercel continuam valendo). O cliente é gerado em `src/generated/prisma` (fora do Git, `postinstall: prisma generate`);
  - `pnpm db:backup [rótulo]` (`scripts/db-backup.mjs`): dump em `~/garimpo-backups`, senha por variável de ambiente e nunca apaga nada. Mais `db:generate`, `db:migrate`, `db:deploy`, `db:studio`.
- **Testado:** contagem de ofertas e a última oferta (com fonte e análise pela relação) iguais no Drizzle e no Prisma (18.853); `prisma migrate status` em dia; 109 testes, `tsc` e `eslint`.
- **Dump:** `garimpoi-20261122-2257-fase1-antes-do-prisma.dump` (o nome ainda saiu em UTC; o script agora usa hora local).
- **Próximo passo:** Fase 2, trocar as consultas do Drizzle pelo Prisma módulo a módulo e tirar o Drizzle.

### 22/11/2026, 19:55 · deploy-v2, Fase 0: dump, branch e base

- **Pedido:** preparar o deploy com Prisma, login (senha e Google), cargos, separação admin x usuário comum, Alvos por usuário e revisão das travas do `claude -p`. O plano foi aprovado com a regra de não apagar nada do banco.
- **Feito:**
  - Dump completo do banco `garimpoi` em `C:\Users\Jogga\garimpo-backups\garimpoi-20261122-1952-antes-deploy-v2.dump` (5,6 MB; o caminho do último fica em `ULTIMO.txt`). Restaurado no banco `garimpoi_copia`: as 17 tabelas com as mesmas contagens (18.853 ofertas, 14.512 análises, 3.164 preços, 2.115 registros de uso da IA). A cópia fica como segunda garantia;
  - Branch `deploy-v2` saindo de `feat/deploy-supabase` (que tem o commit Claude + agy);
  - O trabalho sem commit da outra sessão (de 12/11: SSL para banco remoto, senha única do site, telas, relatório de fontes) virou um commit separado (`3d3a882`), com 109 testes e `tsc` passando.
- **Decisões:** três linhas novas na tabela (deploy-v2, IA para usuário comum, nada do banco é apagado).
- **Próximo passo:** Fase 1, Prisma ao lado do Drizzle (`prisma db pull` no banco atual, sem mexer nos dados).
- **Como restaurar, se precisar:** `pg_restore --no-owner -d <banco vazio> <arquivo .dump>` com o `pg_restore` de `PG_BIN`.

### 18/11/2026, 18:50 · IA: escolher Claude, agy ou os dois juntos

- **Pedido:** usar também o Antigravity CLI (`agy`), podendo escolher qual IA trabalha e usar as duas juntas.
- **Investigado:** o `agy` 1.5.11 tem `-p`, `--output-format stream-json`, `--json-schema` e prompt por stdin (`{"event":"user","message":{"content":"..."}}`). Não tem Haiku: os modelos são Gemini 3.8 Flash (low/medium/high), Claude Sonnet 4.6, Opus 4.6 e GPT-OSS 120B. Não informa custo nem cota. Não tem `--system-prompt` nem como deixar de salvar a conversa.
- **Risco achado e travado:** no `-p` o agy roda em modo Auto e aprova as próprias ferramentas. No teste, ele criou arquivo e rodou comando sem pedir. Com `--settings {"agentMode":"","toolPermission":"strict","permissions":{"deny":["command(*)"]}}`, escrever arquivo, rodar comando e abrir URL são negados na hora e a chamada termina vazia (vira erro). A busca do próprio agy (`search_web`) não tem regra que bloqueie; os prompts só levam ofertas públicas.
- **Feito:**
  - **Provedor `agy`** (`worker/ai/providers/agy.ts`): pasta vazia em `%TEMP%/garimpo-agy`, as configurações travadas acima, instruções no começo da mensagem com aviso de que os dados não são pedidos, JSON pelo `--json-schema` e apagar a conversa do histórico do agy depois de cada chamada (uns 400 KB cada);
  - **Escolha** (`app_settings` "ia_provedor", `src/lib/ai-usage.ts`): "claude", "agy" ou "ambos". Sem escolha salva, vale o Claude (ou `AI_PROVIDER=agy` no `.env`). O worker lê a escolha a cada rodada; não precisa reiniciar;
  - **Pistas mistas** (`worker/ai/analises.ts`): cada pista fica presa a um provedor, 3 do Claude (`AI_PARALLEL`) e 3 do agy (`AGY_PARALLEL`). O freio de 85% da janela de 5 h para só as do Claude; pausa para todas; erro para só a pista dele. O limite de lotes por rodada cresce com o número de provedores;
  - **Trabalhos de uma chamada** (categorias, radar, insights): `pickProvider()` reveza entre os dois e vai para o agy quando o Claude está no freio;
  - **Registro de uso:** `ai_usage` grava provedor e modelo de cada chamada; o agy entra com custo 0 (vai pela conta do Antigravity);
  - **Tela:** seletor "Usar" no cabeçalho (Claude, agy (Antigravity), Claude + agy), "N no agy hoje" ao lado do custo e a frase da Fila da IA dizendo quem trabalha e quantos lotes rodam juntos.
- **Medido:** um lote real de 12 ofertas em 14 s pelo agy (uns 25 s pelo Claude); 3 lotes juntos (36 produtos) em 17 s, cerca de 127 produtos por minuto, contra uns 47 pelo Claude. Cada chamada leva uns 11 mil tokens de entrada, 10 mil deles do próprio agente.
- **Testado:** 109 testes, `tsc` e `eslint`; 3 lotes em paralelo pelo provedor (36 análises válidas, histórico do agy sem conversa nova); oferta maliciosa pedindo para criar arquivo e rodar `whoami` (ignorada, pasta vazia); seletor na tela gravando "ambos", e o worker lendo os dois e revezando.
- **Pendente:**
  - A IA estava pausada por você, então nenhuma rodada real com os dois rodou ainda. Ao clicar em Continuar, as pistas do Claude e do agy andam juntas;
  - A janela **semanal** do Claude estava em 90%, e o freio só olha a de 5 h: com "Claude + agy", as pistas do Claude continuam gastando a semana. Se quiser poupar, escolha só "agy" até a semana zerar;
  - O cabeçalho não mostra a cota do agy, porque ele não informa.
- **Como testar:** no cabeçalho, "Usar: Claude + agy" e Continuar. Na Fila da IA, a frase diz "3 pelo Claude e 3 pelo agy". No banco, `select provider, model, count(*) from ai_usage where created_at > now() - interval '1 hour' group by 1, 2`.

### 12/11/2026, 16:20 · Fotos: só o endereço (CDN externo), nunca arquivo de imagem

- **Pedido do usuário:** o projeto nunca guarda arquivo de imagem; só o endereço da foto, de CDN externo, para não ocupar espaço do banco nem do deploy (Supabase grátis: 500 MB).
- **Feito:** retirado o download das fotos do Telegram da entrada das 15:20 (`telegram-fotos.ts`, `lib/fotos.ts` e a rota `/api/foto` saíram; o código nunca chegou a rodar, então nenhum arquivo foi baixado nem a pasta `.garimpo/fotos` existiu). Ficaram só as partes que usam endereço: a foto da página da Amazon na conferência e a foto de outra cópia do mesmo produto no card.
- **Medido:** os endereços de foto ocupam cerca de 240 KB no banco (ofertas, produtos e histórico), de 20 MB no total.
- **Decisão (nova linha na tabela):** `image_url` guarda só URL. Oferta do Telegram sem foto na loja fica sem imagem. Sem Storage de fotos no deploy.

### 12/11/2026, 15:20 · Radar da IA minimizável e foto para as ofertas sem imagem

- **Pedido:** minimizar o Radar da IA, e as ofertas que vêm sem imagem ganharem uma foto ("do Google ou de algum lugar").
- **Feito:**
  - **Radar da IA:** botão Minimizar/Mostrar. Minimizado, vira uma linha só com a manchete; a escolha fica lembrada no navegador;
  - **Foto do Telegram:** 95% das ofertas sem foto eram do Telegram, que gravava `imageUrl: null` sempre. Agora o worker baixa a foto da própria mensagem (anexada ou da prévia do link), em tamanho médio, para `.garimpo/fotos/` (fora do git), e o site serve por `/api/foto/<nome>.jpg`. A foto da loja, quando a conferência acha, continua valendo mais;
  - **Fotos antigas:** 2 min depois de o worker subir, ele relê as mensagens das ofertas do Telegram dos últimos 4 dias sem foto (100 por pedido, uma foto a cada 250 ms) e baixa as fotos;
  - **Amazon:** a página não tem og:image nem foto no JSON-LD; a conferência agora lê `data-old-hires`, `"hiRes"` ou `#landingImage`;
  - **Grupo do mesmo produto:** se a melhor oferta não tem foto, o card usa a de outra cópia.
- **Decisões:** nada de buscar imagem no Google: o robots.txt dele proíbe robôs na busca, e uma foto achada pelo nome pode ser de outro produto. Usar a foto da mensagem é somente leitura, na conta do usuário.
- **Testado:** 109 testes (1 novo, foto da Amazon), `tsc` e `eslint`; Radar minimizado e lembrado depois de recarregar, no navegador. O download das fotos do Telegram NÃO foi testado: abrir uma segunda conexão com a mesma sessão enquanto o worker roda pode derrubar a sessão.
- **Pendente:** reiniciar o worker (`pnpm worker`) e conferir no log "[telegram] fotos: N ofertas antigas ganharam a foto da mensagem". Shopee e AliExpress fora do Telegram continuam sem foto quando a loja bloqueia a conferência.
- **Como testar:** `pnpm worker`, espere 2 min, recarregue a Vitrine: os cards do Telegram passam a ter foto.

### 12/11/2026, 14:30 · Pesquisa de fontes novas e fontes configuráveis na tela Fontes

- **Pedido:** "faça uma pesquisa profunda de fontes que eu posso adicionar e que sejam possiveis" e "depois crie uma tela de fontes configuraveis tambem".
- **Pesquisa** (`docs/fontes-novas.md`; notas em `research_notes/`): comunidades, lojas, histórico de preço e Telegram, conferidos em 11 e 12/11 com HTTP simples e o robots.txt de cada site.
  - **Dá hoje:** Pechinchou (`__NEXT_DATA__` com link direto da loja), busca VTEX pública de Waz, Fast Shop e Americanas (parcelas e juros por cartão), Hardware Barato (JSON-LD), feeds do Hardware.com.br, Tecnoblog e Olhar Digital, e a categoria de SSD do KaBuM!;
  - **Fechado:** Mercado Livre, Amazon (Condições de Uso), Pichau, Terabyte, Magalu, Casas Bahia, Zoom/Buscapé e Reddit;
  - **Telegram:** três canais novos conferidos no t.me (@ctofertas, @cupomonline, @Promoimporta). `t.me/promobit` não é o Promobit;
  - **Histórico:** o JáCotei tem a série de preços na página do produto, e a regra do selo dele pede 14 dias de base. Por isso os preços das lojas já começam a ser gravados.
- **Feito:**
  - **Tela Fontes:** botão "Adicionar fonte" com três tipos (feed RSS, página de ofertas e busca em loja VTEX), nome, intervalo (vazio = padrão; mínimo por tipo), Testar, Salvar e Cancelar. Nas fontes da tela: Editar, Ler agora e Apagar com confirmação. Seções "Sugeridas pela pesquisa" (Adicionar e Testar com um clique) e "Canais do Telegram para entrar" (links do t.me; você entra pelo app);
  - **Banco:** `sources.config`, `sources.origin`, `sources.interval_min` e `sources.deleted_at` (`db:push` aplicado);
  - **Worker:** `collect/genericas-parse.ts` (leitores sem rede: `parseFeed`, `parseDataPage`, `parseVtex`) e `collect/genericas.ts` (coleta a cada minuto, cada fonte no seu intervalo; Testar pelo canal `garimpo_fontes`, resultado em `app_settings.fonte_teste`). Na VTEX, total no cartão = maior parcela sem juros (Fast Shop só tem 1x sem juros: vale o preço cheio);
  - **Vitrines:** `ingestStoreProducts` agora serve ao KaBuM! e à VTEX, e grava o preço dos produtos dos seus Alvos em `price_points` (um ponto a cada 6 h ou quando o preço muda). A vitrine do KaBuM! ganhou a página de SSDs;
  - **Lojas e encurtadores:** Waz e Fast Shop em `config/stores.ts`; `influenciadormagalu.com.br` no Magalu; `pechin.co`, `cupom.cc`, `mcmgz.in`, `tiny.cc`, `canalte.ch` e `tecno.click` nos encurtadores.
- **Decisões:** fontes configuráveis (nova linha na tabela). Nenhuma sugestão foi ligada sozinha: você escolhe na tela. O site nunca abre o site de uma fonte, nem no Testar.
- **Testado:** 108 testes (8 novos dos leitores), `tsc` e `eslint`. Com um script de uma vez só: Pechinchou trouxe 40 ofertas com link de loja, a Waz 24 produtos com parcelas e o feed do Hardware.com.br 50 posts. No navegador: criar uma fonte de feed, intervalo abaixo do mínimo bloqueado, editar o filtro, erros de endereço sem https, de loja fora do `stores.ts` e de apagar fonte do código; criar, "ler agora" e apagar pela API. Um clique errado no navegador (painel escondido) adicionou a Pechinchou sem querer: ela nunca foi lida e foi removida, junto com as fontes de teste. O Testar ponta a ponta (site → worker → site) depende do worker novo; o lado do worker foi conferido pelo script.
- **Pendente:**
  - O worker em execução (desde 13:39 de 12/11, sem watch) não tem o código novo: as fontes adicionadas só são lidas, e o Testar só responde, depois de reiniciar com `pnpm worker`;
  - Americanas pela VTEX precisa do nome do vendedor próprio (não confirmado); Hardware Barato não foi testado na página de promoções;
  - O selo "desconto real" usando o histórico (regra do JáCotei, `referencePrices` do Promobit) fica para depois.
- **Como testar:** `pnpm worker`, abra `/fontes`, clique em Testar numa sugestão, depois em Adicionar; em até um minuto a fonte é lida e o status mostra quantas ofertas entraram.

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
