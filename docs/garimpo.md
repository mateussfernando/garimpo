# Garimpo 11.11 — ideação do seu terminal de caça a ofertas

Nov 9, 2026 · @mateus fernando

## Resumo

**Garimpo (nome provisório) é um terminal de ofertas que escuta tudo, desconfia de tudo e só te chama quando é ouro pra você.** No 11.11 o problema não é falta de oferta, é excesso: centenas de mensagens por hora, a maioria fora do seu interesse ou com desconto maquiado.

- **Tese — sinal acima de ruído:** o app reduz o dilúvio às 5–15 ofertas que batem com a sua lista de alvos e prova que são reais (preço verificado ao vivo + histórico).
- **Base sólida sem IA:** regex, dados estruturados das lojas e regras resolvem a maior parte do trabalho. A IA entra só onde rende: transformar seus desejos em regras, desempatar mensagens ambíguas e dar o veredito nas finalistas.
- **Você decide, ele prepara:** nada de compra automática. O app entrega o "kit de compra" pronto: link certo, cupom copiado e o preço no cartão parcelado, com frete grátis em destaque.
- **Prazo real: Nov 10, 2026 às 23h, não quarta.** A campanha já está no ar (AliExpress de 1 a 18/11, cupons da Shopee de 28/10 a 12/11) e o dia 11 é o pico, então o app precisa estar escutando antes da meia-noite. Isso dá cerca de 33 horas de relógio a partir de agora.
- **Bônus:** a Black Friday de 2026 cai em Nov 27, 2026. Do 11.11 até lá, seus dois PCs fazem uma coleta por dia, e essas duas semanas de histórico são exatamente o que desmascara a "Black Fraude".

## Princípios e o que NÃO fazer

Cinco decisões guiam tudo. Se uma feature não serve a elas, fica para a Black Friday.

1. **Determinístico primeiro, IA por último.** Toda mensagem passa por regras antes. Só o que sobra ambíguo vai para a IA, e em lote.
2. **A IA escreve as regras, não roda em loop.** Você descreve o desejo em português, a IA gera uma vez o filtro estruturado, e o filtro roda de graça dali em diante.
3. **Nada chega sem prova.** Toda oferta mostra o status: verificada (preço ao vivo há X min), não verificada ou falhou. O app nunca esconde incerteza.
4. **Velocidade é UX.** Da mensagem no grupo ao card na Vitrine em menos de 15 s, e triagem inteira pelo teclado.
5. **Humano no checkout.** O app prepara tudo, você aperta comprar.

**Fora do escopo nestas 33 horas:**

- Compra automática, quebra de captcha, envio de mensagens no WhatsApp e notificações no celular.
- Docker, Redis, microsserviços, login e deploy. É localhost: um repositório, um PostgreSQL e os seus dois PCs na mesma rede.
- Vinte scrapers. Quatro ou cinco adaptadores de loja bem feitos mais um extrator genérico batem isso.
- Chamar a IA para cada mensagem crua.
- 3D e efeitos que não ajudam a decidir. A beleza vem de densidade, tipografia e movimento com significado.

## Features: o que construir, em que ordem

Comece pelas seis do primeiro bloco: sozinhas, elas já transformam o caos dos grupos num dashboard filtrado, com alerta na própria tela. O resto é o que torna o app absurdo, na ordem em que vale construir.

> Figura no doc original (features do Garimpo · 19 itens em 4 quadrantes): https://claude.ai/artifact/JLuTQZVzfJRim4uEgv5V8N

Os seis do canto de cima à esquerda já dão um app que escuta, filtra e avisa; o canto de baixo à direita espera a Black Friday.

**Faça primeiro** (alto impacto, esforço baixo)

- **Modo Escuta** — lê em tempo real só os grupos e canais que você marcar e guarda cada mensagem crua no banco, para reprocessar quando o parser melhorar.
- **Parser BR** — extrai preço no formato brasileiro (R$ 1.299,90), link, cupom, loja, "no Pix", parcelas e "relâmpago". É regex testado em mensagens reais, sem IA.
- **Desencurtador + identidade** — segue amzn.to, s.shopee e afins até a URL final, extrai o ID do produto (ASIN, código MLB, ID da Kabum) e junta os reposts num cartão só.
- **Alvos** — nascem sozinhos dos interesses que você já disse (eletrônicos, acessórios, mouse, teclado, braço articulado) e do que você vigia, compra ou descarta na Vitrine. Preço-alvo e teto saem do histórico (menor preço e mediana de 30 dias); escrever um Alvo em português fica opcional.
- **Vitrine** — dashboard com foto, preço no cartão e botão de comprar, ordenado pela nota. Alvo atingido sobe para o topo com destaque e som, e nada vai para o celular.
- **Carteira de cupons** — todo cupom citado em qualquer grupo vira um item com loja, regra e status (funcionou, expirou), ligado às ofertas da mesma loja.

**Comece cedo** (alto impacto, esforço alto)

- **Verificação ao vivo + print** — abre a página da loja, confirma preço e estoque e salva um screenshot com data e hora. Serve de prova se a loja não honrar.
- **Detector de Black Fraude** — compara com a mediana e o mínimo do histórico e mostra "desconto real 12% (anunciado 45%)".
- **Nota Garimpo (0–100)** — uma nota única com barra de "por quê", detalhada mais abaixo.
- **Preço no cartão** — o total parcelado sem juros vira o preço principal, ao lado do valor da parcela e do selo de frete grátis. Parcelamento com juros ganha selo vermelho.

**Bônus baratos** (impacto médio, esforço baixo)

- **Calor social** — conta em quantos grupos diferentes a mesma oferta apareceu nos últimos 15 minutos. Curadores independentes repostando juntos é o sinal mais forte de oferta real.
- **Sugestões de fontes e lojas** — cada grupo ganha uma taxa de acerto, e o app sugere canais, listas de transmissão e lojas para seguir, a partir de uma lista inicial e dos convites que aparecem nas mensagens.
- **War Room** — a Vitrine em tela cheia para a madrugada do 11: triagem só no teclado, contagem regressiva e som proporcional à nota.
- **Analista "vale a pena?"** — um botão que manda a finalista para a IA com histórico, alternativas e especificações e devolve um veredito em três linhas.
- **Guardião do orçamento** — teto do dia, gasto acumulado e um aviso quando você vai comprar algo fora dos seus Alvos.

**Para a Black Friday** (impacto menor agora, esforço alto)

- **Coleta diária** — do 11.11 à Black Friday, os dois PCs passam uma vez por dia pelas lojas e pelos sites de promoção, em camadas e sem forçar nada, e cada passagem vira histórico.
- **Meu Setup** — você cadastra o que já tem (monitor, peso, padrão VESA, slots M.2) e o app marca o que é compatível, além de calcular custo por desempenho (R$ por TB, R$ por Hz).
- **Mapa do mercado** — onde está o desconto real hoje, por categoria e por loja, incluindo quais lojas mais maquiaram preço.
- **Vigia pós-compra** — continua olhando o preço depois da compra e mostra na Vitrine se ele cair dentro dos 7 dias do direito de arrependimento, contados do recebimento ([art. 49 do CDC](https://www.tjdft.jus.br/institucional/imprensa/campanhas-e-produtos/direito-facil/edicao-semanal/direito-ao-arrependimento-de-compra)).

## UX/UI: um terminal de pregão para ofertas

A tela principal é uma vitrine: cards com foto, preço no cartão e botão de comprar, sobre um tema escuro de terminal de pregão. Bonito aqui é denso, rápido e fácil de entender às 3h da manhã.

> Figura no doc original (tela Vitrine · wireframe): https://claude.ai/artifact/JLuTQZVzfJRim4uEgv5V8N

O total no cartão é o maior número do card, com a parcela logo abaixo e os selos de frete e de desconto real; o botão Comprar nunca sai da vista.

**Direção visual**

- **Cor:** fundo quase preto, superfícies em dois tons de grafite e texto claro. Um único destaque, ouro, reservado para "Alvo atingido". Verde marca desconto real e vermelho marca Black Fraude; mais nada é colorido.
- **Tipografia:** Geist na interface e Geist Mono com algarismos tabulares nos preços, para que os números não "dancem" quando mudam. O preço no cartão é o maior elemento do card.
- **Movimento com significado:** oferta nova entra deslizando com um brilho proporcional à nota, e preço que cai faz um tique de cotação. Nada pisca à toa.
- **Som:** um toque discreto para nota acima de 80 e outro, mais marcante, para Alvo atingido. Tudo desligável.

**Telas**

1. **Vitrine (home)** — grade de cards com foto, nome, loja, total no cartão e parcela ("10x de R$ 129,90 sem juros"), selos (frete grátis, desconto real, Black Fraude, verificado há X min), nota e botão Comprar. No topo ficam a faixa de Alvos atingidos, os filtros por Alvo, loja e categoria, e a barra com contagem regressiva, orçamento, gasto de IA e saúde das fontes.
2. **Detalhe do produto** — abre ao clicar no card: escada de preços por loja, histórico com a maquiagem destacada, a barra da nota e os cupons que empilham.
3. **War Room** — a Vitrine em tela cheia, uma oferta por vez, com triagem só no teclado.
4. **Alvos** — os Alvos que o app deduziu, como chips editáveis (obrigatórios, exclusões, preço-alvo e teto), e um campo opcional em linguagem natural para criar outros.
5. **Fontes e sugestões** — grupos, canais e listas de transmissão que você segue, com volume e taxa de acerto, e as sugestões para entrar.
6. **Lojas** — as lojas que o app investiga, com o status da coleta, e as lojas novas que aparecem nos grupos como sugestão.
7. **Cupons** — a carteira por loja, com regra, validade e status.
8. **Compras** — o que você comprou, o total contra o orçamento e o prazo de arrependimento de cada item.

As fotos vêm da própria página do produto (a imagem do JSON-LD ou a og:image) e ficam em cache local, para a Vitrine abrir rápido.

**Atalhos**

| Tecla | Ação |
| --- | --- |
| J / K | Próxima / anterior |
| Enter | Comprar, abrindo o Kit de compra |
| C | Copiar o cupom |
| B | Marcar como comprado |
| X | Descartar |
| S | Soneca de 30 min |
| W | Vigiar o preço |
| Cmd+K | Paleta: adicionar alvo, silenciar grupo, buscar |

**Kit de compra.** Ao apertar Enter, o app copia o cupom, abre o link canônico da loja e mostra o checklist final: o cartão e o número de parcelas sem juros, o lembrete de cashback se você usa e quanto falta para o frete grátis.

**Alertas só na tela.** Nada vai para o celular nem para o WhatsApp. Alvo atingido sobe para a faixa do topo com destaque em ouro e som, e nota acima de 85 ganha um aviso discreto no canto. Com a Vitrine aberta nos dois PCs, os dois mostram o alerta ao mesmo tempo.

**Regras de UX que não se negociam**

- Cada card responde uma pergunta: comprar, vigiar ou descartar, com foto, preço no cartão e botão Comprar sempre visíveis.
- Toda incerteza aparece como selo (verificado há 2 min, não verificado, sem histórico), nunca como spinner infinito.
- Todo número é clicável e explica de onde veio.
- No dia 11 não existe tela de configuração: tudo foi decidido na terça.

## Fontes de ofertas

Cinco camadas, da mais rápida à mais profunda: escuta, comunidades, vitrines das lojas, seus Alvos nas lojas e o histórico. Cada uma pega o que a anterior deixa passar.

| Camada | O que entra | Como entra no app | Frequência |
| --- | --- | --- | --- |
| 1. Escuta | Seus grupos e canais de WhatsApp, listas de transmissão e seu grupo de Telegram | [whatsapp-web.js](https://github.com/wwebjs/whatsapp-web.js) só leitura e [GramJS](https://github.com/gram-js/gramjs), só no PC de 16 GB | Tempo real |
| 2. Comunidades | Pelando, Promobit, Achados do TB e o fórum de Promoções do Hardmob | Página de ofertas recentes, ou RSS quando houver, e os canais deles na Escuta | A cada 30 min |
| 3. Vitrines das lojas | Páginas de ofertas do dia e de Black Friday das lojas da lista | Extrator genérico e um adaptador por loja | 2 vezes por dia |
| 4. Seus Alvos | Busca dirigida de cada Alvo nas lojas principais | Busca da loja, ou a API no Mercado Livre, e a página do produto | 1 vez por dia |
| 5. Histórico | Cada verificação vira um ponto de preço; Keepa para a Amazon | Automático no banco; Keepa pela extensão, com o gráfico na página do produto | Contínuo |

- **WhatsApp:** bibliotecas não oficiais violam os Termos (ver Riscos). No primeiro teste, confirme se as mensagens de Canais chegam. Listas de transmissão chegam como conversa individual do remetente, então marque esses contatos como fonte.
- **Mercado Livre:** a [documentação](https://developers.mercadolivre.com.br/en_us/about-us) manda token OAuth até nos recursos públicos, então trate como obrigatório.
- **Amazon:** a [PA-API foi descontinuada](https://affiliate-program.amazon.com/creatorsapi/docs/en-us/paapiv5-deprecation) e responde 403. A sucessora, Creators API, é para afiliados, então aqui vale a página com cautela e o Keepa.

**Ordem de extração nas lojas**

1. Dados estruturados da página: JSON-LD `Product` e `Offer` e metatags de preço. Quebram muito menos que seletor CSS.
2. API oficial, quando existir e estiver acessível.
3. Seletor CSS específico da loja.
4. Playwright (navegador headless) só para página que precisa de JavaScript.
5. IA por último: o texto limpo da página vai para o Haiku extrair preço e estoque.

Se a loja bloquear, a oferta fica como "não verificada" e o app segue. Nunca tente furar captcha.

**Coleta educada, para o seu IP não ser bloqueado**

1. Antes de visitar um domínio, o worker lê o robots.txt dele e pula o que for proibido.
2. Os dois PCs saem pela mesma internet, então o limite vale por IP, não por PC: uma fila por domínio no pg-boss, uma requisição por vez e intervalo de 5 a 10 s.
3. Cache: a mesma página não é baixada de novo antes de 10 min na verificação, nem antes de 12 h na coleta diária.
4. Pedidos condicionais (ETag e If-Modified-Since) e RSS sempre que existirem.
5. Recebeu 429 ou 403, o domínio pausa por 1 hora, e a pausa dobra a cada repetição.
6. Um User-Agent fixo, sem proxy, sem rodízio de identidade e sem disfarce.
7. A coleta diária roda fora do horário de pico, por exemplo às 6h, com o horário configurável.

**Sugestões de grupos, canais e listas**

- **Você não digita nada.** Na primeira conexão, a Escuta lê a lista de todos os seus chats e canais, no WhatsApp e no Telegram, e marca como fonte sugerida o que tem cara de promoção: nome com promo, oferta, achado, cupom ou desconto, ou mais de 30% das últimas 50 mensagens com preço e link. Você só confirma na aba Fontes.
- Listas de transmissão de lojas chegam como conversa individual, e o mesmo critério pega esses contatos.
- Dali em diante, o worker guarda todo link de convite que aparece nas mensagens (chat.whatsapp.com, whatsapp.com/channel, t.me) e todo encaminhamento vindo de outro canal, com a contagem de menções, e sobe na sugestão quem é citado por fontes que já acertam.
- Você entra manualmente nas novas. O app nunca entra sozinho, porque picos repentinos de atividade estão entre os gatilhos de ban citados pela [comunidade](https://whatsapp.checkleaked.cc/pt/blog/best-open-source-whatsapp-libraries).
- Depois de 24 horas, a taxa de acerto diz se a fonte fica.
- Entre sempre pelo link do site oficial da loja ou da comunidade, nunca por um convite recebido em grupo.

## Lojas e comunidades sugeridas

Estas entram no app como lista inicial das abas Lojas e Fontes, e o app sugere as próximas conforme elas aparecem nos grupos. Para periféricos e hardware, as três especialistas vêm primeiro.

**Lojas para investigar**

| Loja | Por que vale para você | Como o app coleta |
| --- | --- | --- |
| KaBuM! | Forte em monitores e periféricos caros, melhor frete para o Brasil todo e o pós-venda mais estruturado entre as especialistas ([Adoro Cupom](https://adorocupom.com/blog/kabum-terabyte-pichau-qual-loja-gamer-compensa-mais/)) | Vitrine de ofertas e página do produto |
| Pichau | Melhor custo-benefício em periféricos e acessórios de marca própria (Mancer, TGT, Pichau Gaming), e às vezes mais barata em memória e SSD | Vitrine de ofertas e página do produto |
| Terabyte | Costuma ter os menores preços em placa de vídeo e processador | Vitrine de ofertas e página do produto |
| Mercado Livre | Maior e-commerce do país em GMV, com lojas oficiais e muito cupom ([ranking IRTT](https://yav.com.br/blog/maiores-empresas-ecommerce-brasil/)) | API com token OAuth, ou a página |
| Magazine Luiza | Segunda maior em GMV e dona da KaBuM! | Página do produto |
| Shopee | Terceira em GMV. No 11.11 de 2025, superou em 12 horas o volume da Black Friday anterior ([Central do Varejo](https://centraldovarejo.com.br/?p=47149)) | Página; parte dos cupons vale só no app |
| Amazon Brasil | Quarta em GMV, com o histórico do Keepa a favor | Página com cautela |
| AliExpress | Periféricos baratos, com campanha de 11.11 de 1 a 18/11 | Página do produto |
| Casas Bahia, Carrefour e Americanas | Varejo tradicional entre os dez maiores em GMV | Página, com prioridade menor |

**Comunidades e canais para entrar**

| Fonte | Onde entrar | Por que vale |
| --- | --- | --- |
| [Achados do TB](https://tecnoblog.net/noticias/quer-promocao-100-mil-pessoas-ja-seguem-canal-no-whatsapp/) | Canal no WhatsApp e no Telegram, pelo site do Tecnoblog | Curadoria de tecnologia que checa as ofertas antes de publicar |
| [Pelando](https://www.showmetech.com.br/como-usar-o-pelando-para-economizar/) | Site, app e o WhatsApp oficial do Pelando | Votos da comunidade e Alertas de Desejos por palavra-chave |
| Promobit | Site e app; o canal de cupons no Telegram aparece no site deles | Comunidade de ofertas e cupons, útil como segunda opinião |
| [Fórum de Promoções do Hardmob](https://www.hardmob.com.br/forums/407-Promocoes) | Fórum | Comunidade antiga de hardware, boa para erro de preço |
| Canais oficiais das lojas | Só pelo link no site oficial de cada loja | Cupons e relâmpagos que às vezes saem ali primeiro |

## Arquitetura técnica

Um repositório, um PostgreSQL e dois PCs: o Next.js serve a interface e a API, e os workers em TypeScript escutam, coletam, verificam e pontuam. Tudo passa pelo banco.

> Figura no doc original (arquitetura · 2 PCs e 1 banco): https://claude.ai/artifact/JLuTQZVzfJRim4uEgv5V8N

A Escuta e o banco moram no PC de 16 GB; o de 8 GB se conecta pela rede local, divide a fila de verificação e coleta e também abre a Vitrine.

**Por que o worker fica fora do Next.** O cliente de WhatsApp precisa ser um processo único e de vida longa. No `next dev`, o hot reload recarrega módulos e pode abrir duas sessões, e route handlers vivem por requisição. Então o worker roda com `tsx watch`, e o `pnpm dev` sobe os dois com `concurrently`.

**Dois PCs, um banco**

- **PC de 16 GB, o servidor:** PostgreSQL, a Escuta de WhatsApp e Telegram, o Playwright com os prints e a coleta diária. Fica ligado.
- **PC de 8 GB, o ajudante:** um worker leve (verificação por HTTP, sites de promoção e IA em lote) e a Vitrine.
- **Sem trabalho em dobro:** os dois puxam tarefas da mesma fila no Postgres, com o [pg-boss](https://github.com/timgit/pg-boss), e cada worker liga só os papéis do seu `.env` (`WORKER_ROLES`).
- **A Escuta roda num PC só:** duas sessões leriam as mesmas mensagens duas vezes.
- **Banco na rede local:** no PC de 16 GB, ajuste `listen_addresses` no postgresql.conf, libere só a sua rede no pg\_hba.conf e abra a porta 5432 só para ela no firewall. Os dois `.env` usam a mesma `DATABASE_URL`, e o DBeaver conecta do mesmo jeito.

**Pipeline do worker**

1. **Ingestão** — a Escuta grava cada mensagem crua em `raw_messages`.
2. **Pré-filtro** — descarta o que não tem link nem preço e o que não toca nenhum termo dos seus Alvos (busca por dicionário, sem IA).
3. **Parser BR** — total no cartão, parcelas e se têm juros, preço à vista, frete, cupom, loja e flags. O que falhar vai para a fila de IA.
4. **Resolução** — desencurta o link (no máximo 5 saltos, com cache), limpa parâmetros de rastreio, extrai o ID do produto e liga a oferta a um `product`.
5. **Verificação** — fila por domínio compartilhada pelos dois PCs, com uma requisição a cada 5 a 10 s e cache de 10 min. Grava `price_points`, a foto e o print.
6. **Pontuação** — Alvos, histórico, frete, cupons e calor social viram a Nota.
7. **Alerta** — grava um evento e dispara `pg_notify`, e a Vitrine dos dois PCs atualiza na hora.

Fora do tempo real, a **coleta diária** (um agendamento do pg-boss) passa pelas vitrines das lojas e pelos seus Alvos e grava `price_points`. Se o PC estava desligado no horário, ela roda assim que ele liga.

**Tempo real.** O worker grava o evento e chama `pg_notify`. A rota `app/api/stream/route.ts` (runtime Node) fica em `LISTEN` e empurra os eventos por Server-Sent Events. Funciona igual nos dois PCs, sem Redis nem broker.

**Stack**

| Camada | Escolha |
| --- | --- |
| App | [Next.js 16.4](https://nextjs.org/blog) com App Router e TypeScript estrito. Instale a versão com o patch de segurança de novembro, publicado em 3/11/2026 |
| UI | Tailwind CSS v4, shadcn/ui, Motion, cmdk (paleta), Sonner (avisos) e Recharts para os minigráficos |
| Dados | PostgreSQL com Drizzle ORM e o driver `pg`, `DATABASE_URL` no `.env` e inspeção pelo DBeaver |
| Filas | pg-boss no próprio Postgres, com uma fila por domínio e os agendamentos da coleta diária |
| Worker | Node com tsx, um processo por PC, com os papéis ligados por `WORKER_ROLES` |
| Mensageria | whatsapp-web.js (plano B: o [Baileys](https://github.com/WhiskeySockets/Baileys) oficial, com versão fixa) e GramJS |
| Coleta | fetch com cheerio, robots-parser para o robots.txt e Playwright só para páginas que exigem JavaScript |
| Validação | Zod, que também gera o JSON Schema das respostas da IA |
| IA | @anthropic-ai/sdk com `claude-haiku-5-5` |
| Testes | Vitest com fixtures de mensagens reais |

**Tabelas:** `sources`, `raw_messages`, `offers`, `products`, `price_points`, `stores`, `suggestions`, `alvos`, `matches`, `coupons`, `purchases`, `ai_usage` e `events`. Preço sempre em centavos, como inteiro, guardando à parte o total no cartão, a parcela, se tem juros e o frete.

**Estrutura de pastas**

```text
garimpo/
  src/app/            páginas (vitrine, war-room, alvos, fontes, lojas, cupons, compras) e rotas /api
  src/components/     interface
  src/lib/db/         schema Drizzle e conexão PostgreSQL, usados pelo app e pelo worker
  worker/index.ts     liga os papéis de WORKER_ROLES (listen, collect, verify, ai)
  worker/ingest/      whatsapp.ts, telegram.ts
  worker/pipeline/    prefilter, parse, resolve, verify, score, alert
  worker/collect/     coleta diária, comunidades e vitrines das lojas
  worker/stores/      um adaptador por loja e o extrator genérico
  worker/ai/          cliente Claude, orçamento e prompts
  config/             stores.ts (lojas e domínios permitidos), sources.json, pricing.ts
  fixtures/messages/  mensagens reais para os testes
  .env                DATABASE_URL, ANTHROPIC_API_KEY, WORKER_ROLES
```

## Nota Garimpo e detector de Black Fraude

A nota vai de 0 a 100 e é uma soma ponderada de seis sinais, sempre mostrada com o porquê. Antes dela, três filtros duros barram o que nem deve ser pontuado.

**Filtros duros**

- Domínio fora da lista de lojas permitidas: selo "suspeito", sem nota e sem notificação.
- Total no cartão acima do teto do Alvo: sai da Vitrine principal.
- Produto não identificado: selo "revisar" e nota limitada a 50.

**A fórmula**

```latex
N = 100 \times \left( 0{,}35\,D + 0{,}25\,A + 0{,}15\,C + 0{,}10\,F + 0{,}10\,S + 0{,}05\,U \right)
```

| Sinal | Peso | O que mede | Valor de 0 a 1 |
| --- | --- | --- | --- |
| D — desconto real | 35% | Total no cartão contra a mediana de 30 dias | 0 sem desconto, 1 a partir de 40% abaixo da mediana, linear entre os dois |
| A — encaixe no Alvo | 25% | Distância até o preço-alvo | 1 no preço-alvo ou abaixo, 0 no teto, linear entre os dois |
| C — confiança | 15% | Quem vende e entrega | 1 para a própria loja, 0,6 para vendedor bem avaliado de marketplace, 0,2 para vendedor desconhecido |
| F — frete | 10% | Quanto o frete pesa no total | 1 para frete grátis, 0,5 para frete de até 5% do preço, 0 acima disso |
| S — calor social | 10% | Grupos distintos que postaram a oferta em 15 min | Grupos ÷ 4, com teto em 1 |
| U — urgência | 5% | Relâmpago, estoque ou cupom limitados | 1 para relâmpago verificado, 0,5 para cupom limitado, 0 nos demais |

O preço que entra em todos os sinais é o total no cartão no maior número de parcelas sem juros. Se a loja só oferece parcelamento com juros, entra o total com juros, e o card ganha o selo vermelho "com juros".

Os pesos são um ponto de partida. Ajuste na terça à noite olhando as ofertas reais do ensaio.

**Detector de Black Fraude**

Subir o preço dias antes do evento para inflar o desconto é prática conhecida como "metade do dobro" ([Asaas](https://blog.asaas.com/golpes-na-black-friday/)). O detector existe para isso.

- **Desconto real** = (mediana de 30 dias − total no cartão) ÷ mediana de 30 dias. É ele que aparece no cartão, ao lado do desconto anunciado.
- **Maquiagem:** se o preço subiu 15% ou mais nos 30 dias antes do evento e o "desconto" só o devolve ao patamar anterior, o selo é "Black Fraude".
- **"De" fantasma:** se o preço "de" anunciado nunca apareceu no histórico, o selo é "referência inflada".
- **Sem histórico:** com menos de 5 pontos de preço, o app compara com o menor preço atual do mesmo produto em outras lojas e mostra o selo "sem histórico". Para Amazon, o gráfico do Keepa fecha a lacuna na hora.

## IA com US$ 5

Com o Haiku 5.5 a US$ 0,10 por milhão de tokens de entrada e US$ 0,50 de saída ([preços oficiais](https://platform.claude.com/docs/en/docs/about-claude/pricing)), os US$ 5 sobram. O plano abaixo gasta perto de US$ 1,10 e deixa US$ 3,90 de reserva. Como você vai construir no Claude Code com Opus 5.5 no Max, os US$ 5 ficam inteiros para o app.

| Uso | Modelo | Volume estimado | Custo estimado |
| --- | --- | --- | --- |
| Compilar Alvos (texto vira filtro JSON) | Haiku 5.5 | 20 alvos | US$ 0,02 |
| Triagem do que o parser não entendeu | Haiku 5.5, lotes de 20, system prompt em cache | 3.000 mensagens | US$ 0,25 |
| Extrair preço de página difícil | Haiku 5.5 | 200 páginas | US$ 0,10 |
| Analista "vale a pena?" | Haiku 5.5 | 35 análises | US$ 0,07 |
| Busca web no Analista (opcional) | US$ 10 por mil buscas, mais tokens | 40 buscas | US$ 0,60 |
| Briefing por hora no dia 11 | Haiku 5.5 | 24 resumos | US$ 0,05 |

As contas usam o tokenizador novo, que conta cerca de 30% mais tokens que o do Haiku 4.5: mensagem de promoção com uns 250 tokens, system prompt de triagem com 1.500 tokens lido do cache a US$ 0,01 por milhão e uns 80 tokens de saída por mensagem. O medidor do app mostra o valor real. Todas as chamadas usam o Haiku 5.5, também se trocar para a API: o Sonnet 5.5 custa 20 vezes mais por token.

**Onde a IA entra e onde não entra**

- **Entra:** compilar Alvos uma vez, triar em lote o que o parser não entendeu, extrair preço de página difícil, o Analista sob demanda e o briefing.
- **Não entra:** mensagem que o regex já entendeu, casamento com Alvos (quem roda é o filtro compilado) e cálculo da nota.
- **A IA treina as regras:** toda mensagem que a IA precisou ler vira fixture. Na terça à noite, peça ao seu agente para melhorar o regex com esses casos, e a fila de IA encolhe.

**Trava de gastos no código**

- Toda resposta traz `usage`. O `worker/ai/budget.ts` calcula o custo com a tabela de `config/pricing.ts` e grava em `ai_usage`.
- A partir de US$ 4,50 acumulados, novas chamadas são recusadas e o app segue só com regras. O topo da Vitrine mostra o gasto.
- Com crédito pré-pago, o saldo é o teto final. A trava garante que você não chegue a zero no meio do dia 11.

**Pegadinhas do Haiku 5.5** ([guia de migração](https://platform.claude.com/docs/en/models/haiku-5-5/migration-guide))

- Não envie `temperature`, `top_p` nem `top_k`: são mudanças que quebram a chamada.
- Não use prefill: terminar `messages` com um turno do assistente dá erro 400. Para formato, use [structured outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs) (`output_config.format` com JSON Schema).
- O raciocínio adaptativo vem ligado. Para extração, baixe `output_config.effort` e deixe folga em `max_tokens`, porque os tokens de raciocínio contam nele.
- Trate `stop_reason: "refusal"`: o modelo tem classificadores de segurança sem fallback no servidor.
- Mantenha cada prompt abaixo de 100 mil tokens. Acima disso, o preço do Haiku 5.5 sobe cinco vezes.
- O cache só vale para prompts a partir de 512 tokens ([visão geral do modelo](https://platform.claude.com/docs/en/models/haiku-5-5/overview)).

**IA local, opcional.** Com o Haiku 5.5 tão barato, um LLM local só compensa se você quiser rodar sem internet. O que vale localmente são embeddings para agrupar títulos parecidos, com transformers.js e um modelo multilíngue pequeno, sem custo por chamada.

**Provedor trocável: a assinatura no teste**

Para testar, a IA roda pela sua assinatura do Claude Code. O worker chama o `claude -p` oficial no PC com o papel `ai`, só para você, e grava o resultado no Postgres. A chave de API e o Ollama ficam atrás da mesma interface `AiProvider` e entram trocando `AI_PROVIDER` no `.env`.

| `AI_PROVIDER` | Como chama | Quem paga | Quando usar |
| --- | --- | --- | --- |
| `claude-cli` | `claude -p` oficial, saída JSON com `--json-schema` | os limites da sua assinatura Max, os mesmos do Claude Code | teste local, agora |
| `anthropic-api` | `@anthropic-ai/sdk` com `ANTHROPIC_API_KEY` | os US$ 5 ou o crédito mensal de API do Max | Batch e cache de prompt; se outra pessoa usar o site |
| `ollama` | HTTP em `localhost:11434` | ninguém | sem internet ou sem limite sobrando |

**Regras do `claude-cli`**

- Sempre o modelo mais simples: `claude-haiku-5-5` em toda chamada, pela assinatura ou pela API, inclusive compilar Alvos e o Analista. Sonnet e Opus ficam fora do app; no `claude-cli`, isso gasta o mínimo do limite que você usa para programar.
- Binário oficial, sem modificar, logado na sua conta. Para o worker, gere um token com `claude setup-token` e passe em `CLAUDE_CODE_OAUTH_TOKEN` pelo `.env`. Nunca leia esse token para usar direto no SDK: isso é bloqueado.
- Tire `ANTHROPIC_API_KEY` do ambiente do processo filho. No `-p`, a chave sempre vence a assinatura.
- Não use `--bare`: ele ignora o login da assinatura. Rode numa pasta vazia (`.garimpo/ia/`) com `CLAUDE_CONFIG_DIR` próprio, para não carregar `CLAUDE.md`, hooks, plugins e MCP do projeto nem do seu `~/.claude`.
- Flags: `--model claude-haiku-5-5`, `--system-prompt` com as instruções fixas (troca o prompt longo do Claude Code), `--permission-mode dontAsk --permission-prompts none` (nada pede permissão nem trava), `--output-format json --json-schema` com o schema do Zod e `--max-budget-usd` como teto por chamada.
- Leia `structured_output` (pode faltar, então valide com Zod) e grave `total_cost_usd` e `usage` em `ai_usage`. Esse custo é estimativa e não sai do seu saldo, então aqui a trava é `AI_MAX_CHAMADAS_DIA`.
- No Windows, use `spawn` sem shell e mande o prompt pelo stdin. Uma chamada por vez (fila com concorrência 1), timeout de 60 s e retry com backoff em `rate_limit` e `overloaded`.
- O `-p` gasta os mesmos limites de 5 h e semanais que você usa para programar com o Opus. Por isso o hash evita chamada repetida e o job roda logo depois da coleta das 06:00.

**Job de insights: gera uma vez, a Vitrine só lê**

1. O pg-boss roda `insights` logo depois da coleta diária das 06:00, e de hora em hora no 11.11 e na Black Friday.
2. O código calcula as métricas de cada produto no período: mediana de 30 dias, mínimo e máximo, variação %, tendência, outliers e maquiagem. São as mesmas da Nota Garimpo, e a IA nunca recebe preço bruto.
3. Um sha256 das métricas vira `hash_dados`. Se for igual ao do último insight do produto, a IA não é chamada.
4. O provedor recebe as métricas e devolve JSON validado com Zod: resumo, veredito e motivos.
5. O resultado vai para `insights` e o uso para `ai_usage`. A Vitrine e o Detalhe só leem do banco: nenhuma chamada de IA acontece numa requisição do site.

Os números na tela vêm sempre das métricas, nunca do texto da IA. Batch API e cache de prompt só valem no `anthropic-api`; no `claude-cli`, cada chamada é um processo.

```sql
CREATE TABLE insights (
  id          serial PRIMARY KEY,
  produto_id  int  NOT NULL REFERENCES products(id),
  periodo     date NOT NULL,
  hash_dados  text NOT NULL,   -- sha256 das métricas de entrada
  provedor    text NOT NULL,   -- claude-cli | anthropic-api | ollama
  modelo      text NOT NULL,
  insight     jsonb NOT NULL,
  gerado_em   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (produto_id, periodo, hash_dados)
);
```

No projeto, ela vira um `pgTable` no schema do Drizzle, ao lado das outras.

## Plano de 48h

Três blocos de construção até terça às 23h e um dia de operação. Se o relógio apertar, a linha de corte garante o essencial.

> Figura no doc original (plano de construção · 9 a 12/11/2026): https://claude.ai/artifact/JLuTQZVzfJRim4uEgv5V8N

Os três blocos cabem até terça às 23h, com o congelamento às 22h e o 11.11 começando à meia-noite.

**Bloco 1 — segunda, até 23h: escutar e mostrar**

- [ ] Projeto base: Next.js 16.4, TypeScript, Tailwind, shadcn, worker com tsx, PostgreSQL com Drizzle (DATABASE\_URL no .env) e `pnpm dev` subindo os dois.
- [ ] Fixtures automáticas: as primeiras 200 mensagens que a Escuta gravar, com gabarito rotulado uma vez pela IA e conferido por amostragem, vão para `fixtures/messages`. É o conjunto de teste do parser.
- [ ] Modo Escuta com whatsapp-web.js: login por QR, descoberta automática dos grupos e canais de promoção, gravando em `raw_messages`.
- [ ] Parser BR com testes Vitest nas fixtures.
- [ ] Vitrine v0: cards com foto, preço no cartão e botão Comprar, ao vivo.
- [ ] Alvos v0 a partir dos seus interesses, com preço-alvo e teto calculados do histórico.

**Bloco 2 — terça, 8h às 18h: entender e avisar**

- [ ] Desencurtador, IDs canônicos (ASIN, MLB, lojas) e agrupamento de reposts.
- [ ] Alertas na tela: faixa de Alvos atingidos, destaque e som.
- [ ] Verificador educado, com robots.txt e fila por domínio: extrator genérico e adaptadores de Kabum, Pichau, Terabyte e Mercado Livre.
- [ ] `price_points`, Nota v1 e os selos de Black Fraude.
- [ ] Carteira de cupons e calor social.
- [ ] Camada de IA: compilar Alvos, triagem em lote, medidor e trava de gasto.
- [ ] Telegram com GramJS no seu grupo, e o PC de 8 GB entrando na mesma fila do Postgres.

**Bloco 3 — terça, 18h às 23h: polir e ensaiar**

- [ ] Vitrine completa: detalhe do produto, abas, atalhos, Cmd+K e sons.
- [ ] War Room.
- [ ] Ensaio de uma hora com tráfego real e ajuste dos limiares de nota e de alerta.
- [ ] 22h: congelar features. Depois disso, só correção.

**Operação — quarta, 11/11**

- [ ] 23h30 de terça: abrir o War Room e conferir fontes, saldo de IA e alertas nos dois PCs.
- [ ] Usar o Analista só nas finalistas e registrar cada compra.

**Linha de corte.** Escuta, Parser, Alvos e a Vitrine já resolvem o 11.11. Se às 18h de terça só isso estiver pronto, pare de construir e vá para o ensaio.

**Plano B sem código.** Hoje mesmo, cadastre seus Alvos como Alertas de Desejos no Pelando, que avisam no site e por e-mail. É a rede de segurança se algo quebrar.

**Depois do 11.11.** De 12 a 26/11, os dois PCs fazem a coleta diária das lojas e dos seus Alvos, e entram Meu Setup, Mapa do mercado e Vigia pós-compra para a Black Friday.

## Riscos e mitigação

O maior risco não é técnico: é perder a conta do WhatsApp ou instalar um pacote que rouba a sessão. Os dois se evitam com regras simples.

| Risco | O que fazer |
| --- | --- |
| **Restrição ou ban da conta de WhatsApp.** Toda biblioteca não oficial viola os Termos, e o ban é guiado por comportamento: mensagens em massa, picos de atividade, denúncias ([CheckLeaked](https://whatsapp.checkleaked.cc/pt/blog/best-open-source-whatsapp-libraries)) | Só leitura, nunca enviar. Entre em poucos grupos por dia. Se puder, use um segundo número nos mesmos grupos |
| **Pacote npm malicioso.** O `lotusbail`, fork do Baileys com mais de 56 mil downloads, funcionava de verdade e roubava sessão, mensagens e contatos; o aparelho do atacante seguia conectado mesmo depois da desinstalação ([The Register](https://www.theregister.com/2025/12/22/whatsapp_npm_package_message_steal/)) | Instale só o `whatsapp-web.js` ou o `baileys` oficiais, com versão fixa e lockfile, nunca forks "turbinados". Revise os aparelhos conectados no WhatsApp |
| **Links falsos e golpes nos grupos.** Golpistas se passam por lojas e mandam links e cupons falsos ([Asaas](https://blog.asaas.com/golpes-na-black-friday/)) | Lista de domínios permitidos. Domínio desconhecido vira "suspeito", fica fora da Vitrine principal e não é aberto pelo verificador |
| **IP bloqueado pelas lojas.** Os dois PCs saem pelo mesmo IP | robots.txt, uma fila por domínio no pg-boss, 5 a 10 s entre pedidos, cache e pausa de 1 hora em 429 ou 403. Bloqueou, a oferta vira "não verificada" |
| **Parser erra o preço.** "10x de R$ 129,90" precisa virar R$ 1.299,00 no cartão, "1.299,90" não pode virar 1,29 e "com juros" não pode passar por "sem juros" | Fixtures reais com testes, centavos como inteiro e o selo "com juros" sempre que houver dúvida |
| **Duas Escutas ao mesmo tempo** | A Escuta liga só no PC de 16 GB, por `WORKER_ROLES` |
| **Postgres exposto na rede** | Libere a porta 5432 só para a rede local, no pg\_hba.conf e no firewall, com senha forte |
| **Estouro de tokens** | Medidor, trava em US$ 4,50, lotes e cache |
| **Atraso na construção** | Linha de corte às 18h de terça e congelamento às 22h |

## Kit de vibecoding

No Claude Code com Opus 5.5, cole o bloco abaixo na raiz do projeto como `CLAUDE.md` ou dentro do `AGENTS.md`, que o create-next-app já gera desde o [Next.js 16.2](https://nextjs.org/blog). Depois rode os prompts na ordem: cada um termina com um critério de pronto, para o agente saber quando parar. Exporte este doc em Markdown para `docs/garimpo.md` e o agente terá o contexto completo.

```markdown
# Garimpo

App pessoal que roda em localhost nos dois PCs do usuário. Acha as melhores ofertas do 11.11 e da Black Friday para os Alvos dele, que compra no cartão parcelado.

## Arquitetura
- Next.js 16.4 (App Router) + TypeScript estrito + Tailwind v4 + shadcn/ui + Motion.
- PostgreSQL + Drizzle (driver pg) em src/lib/db, compartilhado com o worker. DATABASE_URL no .env.
- worker/ é um processo Node separado (tsx watch), um por PC. WORKER_ROLES liga os papéis: listen, collect, verify, ai.
- Filas e agendamentos com pg-boss no próprio Postgres. Uma fila por domínio, global para os dois PCs.
- Tempo real: o worker chama pg_notify; app/api/stream/route.ts (runtime nodejs) faz LISTEN e SSE.
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
```

**1. Fundação**

```text
Siga o CLAUDE.md. Crie o projeto Garimpo: Next.js 16.4 com App Router, TypeScript, Tailwind e shadcn; pasta worker/ rodando com tsx watch; PostgreSQL com Drizzle (DATABASE_URL no .env) e as tabelas sources, raw_messages, offers, products, price_points, stores, suggestions, alvos, matches, coupons, purchases, ai_usage, insights e events; pg-boss instalado. O script pnpm dev sobe Next e worker juntos com concurrently.
Pronto quando: pnpm dev abre localhost:3000, o worker loga "worker ok" com os papéis de WORKER_ROLES e as tabelas aparecem no DBeaver.
```

**2. Modo Escuta**

```text
Implemente worker/ingest/whatsapp.ts com o whatsapp-web.js oficial (LocalAuth, QR no terminal), ativo só quando WORKER_ROLES inclui listen. Na primeira conexão, liste todos os chats e canais, classifique como fonte sugerida o que tem nome de promoção ou mais de 30% das últimas 50 mensagens com preço e link, salve em sources e escute só as confirmadas na aba Fontes. Grave cada mensagem em raw_messages e emita um evento. Faça o mesmo para o grupo de Telegram em worker/ingest/telegram.ts com GramJS. Somente leitura: nunca envie nada.
Pronto quando: uma mensagem nova num grupo escolhido aparece no banco em menos de 5 s.
```

**3. Parser BR**

```text
Crie worker/pipeline/parse.ts: de cada mensagem, extraia o total no cartão em centavos (parcelas x valor), o número de parcelas e se têm juros, o preço à vista, o preço "de", o frete (grátis ou valor), cupom, URLs, loja pelo domínio e flags (relâmpago). Gere fixtures/messages a partir das primeiras 200 mensagens de raw_messages, com o gabarito rotulado uma vez pelo Haiku, e escreva testes Vitest para cada uma.
Pronto quando: pelo menos 90% das fixtures passam e as que falham estão listadas com o motivo.
```

**4. Vitrine ao vivo**

```text
Crie a página / como Vitrine: grade de cards com foto do produto, nome, loja, total no cartão, parcela, selos (frete grátis, desconto real, Black Fraude, com juros, verificado há X min), nota e botão Comprar; faixa de Alvos atingidos no topo, filtros por Alvo, loja e categoria, e abas para Alvos, Fontes, Lojas, Cupons e Compras. Use o tema do CLAUDE.md, o feed por SSE em app/api/stream e os atalhos J/K/Enter/C/X. As fotos vêm do JSON-LD ou da og:image da página, com cache local.
Pronto quando: ofertas novas entram na Vitrine sem recarregar, com foto e botão Comprar.
```

**5. Identidade, verificação e alertas**

```text
Implemente: desencurtador (segue redirects, no máximo 5 saltos, com cache), IDs canônicos (ASIN, MLB, Kabum, Pichau, Terabyte), agrupamento de reposts, verificador genérico (JSON-LD e metatags de preço) com robots.txt e uma fila pg-boss por domínio compartilhada pelos dois PCs, price_points com foto e print, e o alerta na Vitrine (pg_notify) quando a oferta bate com um Alvo. Nada de notificação no celular.
Pronto quando: um link amzn.to vira um ASIN e um Alvo atingido sobe para a faixa do topo nos dois PCs.
```

**6. IA com trava**

```text
Implemente worker/ai: cliente com orçamento (preços em config/pricing.ts, trava em US$ 4,50), compilador de Alvo (texto em português vira JSON com termos, exclusões, preço-alvo e teto), triagem em lotes de 20 mensagens com o system prompt em cache e o Analista sob demanda. Tudo atrás da interface AiProvider com claude-cli, anthropic-api e ollama (AI_PROVIDER no .env), mais o job de insights da seção de IA do plano.
Pronto quando: a Vitrine mostra o gasto acumulado e uma chamada acima da trava é recusada e o mesmo produto gera insight com claude-cli e com anthropic-api.
```

**7. Nota, Black Fraude e War Room**

```text
Implemente a Nota Garimpo: N = 100 x (0,35 D + 0,25 A + 0,15 C + 0,10 F + 0,10 S + 0,05 U), com D = desconto real do total no cartão contra a mediana de 30 dias (1 a partir de 40%), A = encaixe no Alvo (1 no preço-alvo, 0 no teto), C = confiança da loja, F = frete (1 grátis, 0,5 até 5% do preço, 0 acima), S = grupos distintos em 15 min dividido por 4 (teto 1) e U = urgência. Adicione os selos "sem histórico", "referência inflada", "Black Fraude" e "com juros", a barra de "por quê" no card e a página /war-room em tela cheia.
Pronto quando: cada card mostra nota, motivo e selo, e o War Room funciona sem mouse.
```

**8. Coleta diária, camadas e sugestões**

```text
Implemente worker/collect: (1) comunidades (Pelando, Promobit, Achados do TB, fórum do Hardmob) lendo a página de ofertas recentes ou o RSS a cada 30 min; (2) vitrines de ofertas das lojas de config/stores.ts duas vezes por dia; (3) busca dirigida de cada Alvo nas lojas uma vez por dia, agendada pelo pg-boss às 6h e repetida ao ligar o PC se o horário passou. Tudo segue as regras de coleta educada do CLAUDE.md. Crie também as abas Lojas e Fontes e sugestões: a lista inicial do doc, mais as lojas e os convites (chat.whatsapp.com, whatsapp.com/channel, t.me) descobertos nas mensagens, ordenados por menções de fontes que acertam.
Pronto quando: a coleta das 6h grava price_points sem nenhum 429 e as abas mostram as sugestões com a contagem de menções.
```

## Perguntas em aberto

Alvos e fontes o app descobre sozinho, então só sobraram duas perguntas.

- [ ] Você tem um segundo número para a Escuta?
- [ ] Qual é o orçamento total de compras do dia 11?

## Fontes consultadas

- [Preços da API do Claude](https://platform.claude.com/docs/en/docs/about-claude/pricing)
- [Claude Haiku 5.5: visão geral](https://platform.claude.com/docs/en/models/haiku-5-5/overview)
- [Claude Haiku 5.5: guia de migração](https://platform.claude.com/docs/en/models/haiku-5-5/migration-guide)
- [Structured outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs)
- [Blog do Next.js](https://nextjs.org/blog)
- [Central do Varejo: o 11.11 em 2026](https://centraldovarejo.com.br/?p=47149)
- [Yav: maiores e-commerces do Brasil, ranking IRTT](https://yav.com.br/blog/maiores-empresas-ecommerce-brasil/)
- [Adoro Cupom: KaBuM!, Terabyte ou Pichau em 2026](https://adorocupom.com/blog/kabum-terabyte-pichau-qual-loja-gamer-compensa-mais/)
- [Amazon: descontinuação da PA-API 5](https://affiliate-program.amazon.com/creatorsapi/docs/en-us/paapiv5-deprecation)
- [Mercado Livre Developers](https://developers.mercadolivre.com.br/en_us/about-us)
- [CheckLeaked: bibliotecas de WhatsApp em 2026](https://whatsapp.checkleaked.cc/pt/blog/best-open-source-whatsapp-libraries)
- [The Register: o pacote lotusbail](https://www.theregister.com/2025/12/22/whatsapp_npm_package_message_steal/)
- [Showmetech: como usar o Pelando](https://www.showmetech.com.br/como-usar-o-pelando-para-economizar/)
- [Olhar Digital: a extensão Keepa](https://olhardigital.com.br/2024/10/21/dicas-e-tutoriais/como-usar-extensao-keepa-para-economizar-na-amazon/)
- [Asaas: golpes na Black Friday](https://blog.asaas.com/golpes-na-black-friday/)
- [TJDFT: direito de arrependimento](https://www.tjdft.jus.br/institucional/imprensa/campanhas-e-produtos/direito-facil/edicao-semanal/direito-ao-arrependimento-de-compra)
