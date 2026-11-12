# Fontes brasileiras de histórico e comparação de preços para o Garimpo (situação em 11/11/2026)

Nota de método: robots.txt, páginas de oferta e páginas de produto foram lidos direto em 11/11/2026, com no máximo uma requisição por domínio a cada 2 a 7 s e User-Agent fixo próprio. As páginas de produto do Zoom e do Buscapé **não** foram abertas: o robots.txt dos dois bloqueia "ClaudeBot" e "Claude-User" no site inteiro, e a ferramenta de leitura desta pesquisa se identifica assim. O que está escrito sobre esses dois vem de resultados de busca e do robots.txt. Nenhum login, nenhuma conta criada, nenhum contorno de anti-bot.

## 1. Quais fontes cobrem lojas brasileiras (Amazon BR, KaBuM!, Pichau, Terabyte, Mercado Livre, Magalu) em 2026?

### Takeaway
Três fontes têm histórico de verdade e cobertura brasileira confirmada em 2026. O JáCotei cobre Amazon, Mercado Livre, Shopee e redes de afiliados, com histórico desde abril de 2026. O Hardware Barato cobre só placas de vídeo e processadores, e tem KaBuM!, Pichau, Terabyte, Amazon, Magalu e Mercado Livre na página. O Keepa cobre só a Amazon BR (locale BR) e é pago. O Promobit dá só o menor e o maior preço de referência por oferta. Pelando, Google Shopping (price insights) e Méliuz não têm histórico para o consumidor brasileiro.

### Cited Findings
- **JáCotei** (relançado): "Os preços vêm dos catálogos oficiais das lojas parceiras (Amazon, Mercado Livre, Shopee e redes de afiliados, entre outras)". O sistema guarda um registro com data e valor a cada mudança de preço, e são "milhões de registros acumulados desde abril de 2026". — [JáCotei, Como acompanhamos preços](https://jacotei.com.br/como-acompanhamos-precos)
- JáCotei: o selo "menor preço em 90 dias" só aparece com pelo menos 3 registros na janela, pelo menos 14 dias de histórico, variação real de 2% ou mais no período e o preço de hoje igual ao menor dos 90 dias. — [JáCotei, Como acompanhamos preços](https://jacotei.com.br/como-acompanhamos-precos)
- Matéria antiga do JáCotei (versão anterior do site) descrevia um selo "Desconto Real" para o menor preço dos últimos seis meses. — [Canaltech](https://canaltech.com.br/black-friday/levantamento-do-jacotei-mostra-comportamento-de-precos-antes-da-black-friday-200480/)
- **Hardware Barato**: página de modelo (ex.: RTX 4070 Ti) com histórico de 29/04/2025 a 11/11/2026, preço à vista e parcelado por dia e loja, menor preço registrado, maior preço, média de 30 dias e menor preço de 90 dias (R$ 5.299,00 na kabum em 28 e 29/10/2026). As lojas da tabela diária incluem inpower, mercado-livre, performance-solutions, fgtec, magazine-luiza, shopee e kabum. O HTML também cita amazon (27 vezes), kabum (15), pichau (5) e terabyte (3). — [Hardware Barato, RTX 4070 Ti](https://hardwarebarato.com/produtos/placas-de-video/rtx-4070-ti)
- Hardware Barato só tem sitemaps de placas de vídeo e de processadores, o que indica um catálogo limitado a essas duas categorias. — [Hardware Barato robots.txt](https://www.hardwarebarato.com/robots.txt)
- **Keepa**: o enum AmazonLocale da API oficial vai de 0 a 12 (RESERVED, US, GB, DE, FR, JP, CA, RESERVED2, IT, ES, IN, MX, BR), e **BR = 12**. — [keepacom/api_backend, AmazonLocale.java](https://raw.githubusercontent.com/keepacom/api_backend/master/src/main/java/com/keepa/api/backend/structs/AmazonLocale.java)
- A extensão do Keepa lista amazon.com.br entre os domínios suportados (.com, .co.uk, .de, .fr, .co.jp, .ca, .it, .es, .in, .com.mx, .com.br). — [Keepa no Firefox Add-ons](https://addons.mozilla.org/pt-BR/android/addon/keepa/)
- Um guia brasileiro diz que o gráfico e a mínima histórica do Keepa são grátis na extensão, aparecem sozinhos na página do produto da Amazon Brasil e não pedem cadastro. — [Olhar Digital, 21/10/2024](https://olhardigital.com.br/2024/10/21/dicas-e-tutoriais/como-usar-extensao-keepa-para-economizar-na-amazon/)
- **Buscapé**: a página de produto tem uma aba "Histórico de Preços", um gráfico de 40 dias ou 6 meses segundo o próprio Buscapé. Um artigo de 2025 diz que o período chega a 1 ano. — [Buscapé, Como usar o Histórico de Preços](https://www.buscape.com.br/landing-page/historico-de-precos-buscape); [Buscapé, Histórico de Preços](https://www.buscape.com.br/busca-explica/conteudo/historico-de-precos-do-buscape) (lidos só pelos trechos da busca)
- **Zoom**: tem extensão que mostra histórico de preços das maiores lojas virtuais brasileiras, e as páginas citam uma comparação dos "últimos 40 dias". — resultados de busca sobre [Zoom, Como saber se um desconto é real](https://www.zoom.com.br/direito-do-consumidor/deumzoom/como-saber-se-um-desconto-e-real-ou-fraude-bkp) (lido só pelo trecho)
- **Promobit**: cada página de oferta traz `referencePrices` (preço atual, menor, maior e uma "zona" de preço) no JSON da página. A oferta de exemplo, do Mercado Livre, mostrava `{"price": 32, "maxPrice": 35.97, "minPrice": 29.05, "zonePrice": 2}`. — [Promobit, oferta 2887552](https://www.promobit.com.br/oferta/creatina-100-pura-120-capsulas-2887552/)
- O Promobit pertence ao Méliuz, que o comprou antes de comprar o Melhor Plano. — [Startups.com.br](https://startups.com.br/noticias/duas-na-sequencia-depois-da-promobit-meliuz-anuncia-compra-da-melhor-plano/)
- **Pelando**: o único tópico encontrado sobre histórico de preços é um pedido da comunidade (data "03 jul", ano não informado). Nele a equipe diz que acompanhar produtos por scraper seria caro e que "as principais lojas não permitem que façamos via extensão". Não achei um recurso de histórico lançado. — [Pelando, tópico](https://www.pelando.com.br/t/historico-de-precos-disponivel-no-site-do-pelando-3df9)
- **Google Shopping price insights** (histórico e "preço baixo, típico ou alto"): a ajuda oficial diz que o recurso está disponível para usuários nos EUA. — [Google, Get price insights](https://support.google.com/faqs/answer/10675605)
- No Brasil, o Google Shopping só ganhou aviso de queda de preço, que é um recurso diferente do histórico. — [Tecnoblog](https://tecnoblog.net/377287/google-shopping-agora-avisa-sobre-reducoes-no-preco-de-produtos/)
- **Méliuz**: a extensão se descreve como "Cashback e cupons em suas compras", sem menção a histórico de preços. — [Méliuz no Firefox Add-ons](https://addons.mozilla.org/mt/firefox/addon/meliuz/versions/)
- **Mercado Livre (API oficial)**: só há preço atual. `GET /items/$ITEM_ID/prices` traz os tipos de preço vigentes, `/items/$ITEM_ID/sale_price` traz o preço de venda atual, e o tópico de notificação `items_prices` avisa quando o preço muda. Não achei endpoint de histórico. A página brasileira foi atualizada em 26/02/2026. — [Mercado Livre Developers, API de preços](https://developers.mercadolivre.com.br/pt-br/api-de-precos)
- O Idec recomenda Buscapé, Zoom e Promobit para conferir histórico, e consumidor.gov.br e Reclame Aqui para checar a loja. — [Idec](https://idec.org.br/fique-de-olho/saiba-como-aproveitar-promocoes-da-melhor-forma)
- A Black Friday 2026 é em 27/11. — [Gazeta SP](https://www.gazetasp.com.br/economia/black-friday-2026-varejo-fisico-e-e-commerce-adiantam-ofertas-antes-da-data-oficial-de-27-de-novembro/)

### Inferences
- Para os Alvos de hardware do usuário (KaBuM!, Pichau, Terabyte), o Hardware Barato é a fonte externa com melhor cobertura das lojas de hardware, mas só para GPUs e CPUs. O JáCotei cobre melhor Amazon e Mercado Livre. O Keepa é o mais profundo para a Amazon BR.
- Zoom e Buscapé parecem rodar na mesma plataforma: os robots.txt são quase iguais (mesmos `Allow: /psc/*/*/*`, mesmos bloqueios de `/zpgo` e `/lead*`, mesma lista de bots de IA). Isso combina com o grupo único citado na tarefa, mas não achei uma fonte de 2026 que confirme a estrutura societária.
- O JáCotei só tem histórico desde abril de 2026, então tem no máximo uns 7 meses. Isso basta para "menor preço em 90 dias", mas não para comparar com a Black Friday de 2025.

### Gaps
- **CamelCamelCamel**: camelcamelcamel.com respondeu 403 à leitura. Não confirmei se ele suporta a Amazon Brasil (pela memória, não suporta, mas isso não foi verificado).
- **Baixou (baixou.com.br), comparadores do Tecmundo e do Canaltech, "Preço da Hora", sites tipo Idealo no Brasil**: nenhuma fonte de 2025 ou 2026 apareceu nas buscas. "Preço da Hora" não foi encontrado; o único nome parecido era a extensão "Valor da Hora", que não tem relação com isso.
- Se o JáCotei cobre KaBuM!, Pichau ou Terabyte: a página dele não cita essas lojas, e não verifiquei com produtos de hardware.
- A janela do `referencePrices` do Promobit (30, 90 dias?) e o que significa `zonePrice` (1, 2, 3...) não estão documentados.
- O Pelando não mostra histórico. O tópico não tem ano, então não dá para garantir que o recurso nunca saiu, só que não o encontrei.

## 2. Onde o dado de histórico está (só o gráfico, JSON na página, API) e o que o robots.txt diz

### Takeaway
O JáCotei põe a série inteira (`points: [{date, priceCents}]`) no payload do Next.js na página do produto. O Promobit põe min e max no `__NEXT_DATA__` da página de oferta. O Hardware Barato entrega uma tabela `<table>` já no HTML do servidor. Os três estão liberados pelo robots.txt para um User-Agent genérico, e em nenhum dos três a busca interna pode ser usada (no Hardware Barato, que não tem busca bloqueada, as rotas `/api/` e `/_next/` estão vetadas). No Zoom e no Buscapé, a página de produto não está vetada para `*`, mas a busca (`?q=`) e os endpoints `/ajax/` estão. Não pude verificar onde fica o histórico deles.

### Cited Findings
- **JáCotei, página de produto**: o HTML traz, dentro de `self.__next_f.push(...)`, um bloco `"blockId":"naper.price-history"` com `{"points":[{"date":"2026-08-14","priceCents":71205},{"date":"2026-08-18","priceCents":70500}, ... {"date":"2026-11-10","priceCents":85010}],"currencyCode":"BRL","locale":"pt-BR"}`, com 26 pontos de 14/08 a 10/11/2026. O JSON-LD `Product`/`Offer` traz o preço atual (`"price":850.1,"priceCurrency":"BRL"`). — [JáCotei, Redmi A5](https://jacotei.com.br/smartphone-xiaomi-redmi-a5-64gb-3gb-ram-3gb-de-ram-extendida-b0fh5p2gpb/p)
- Na mesma série há um ponto fora da curva: `{"date":"2026-09-04","priceCents":171205}`, mais que o dobro dos vizinhos (~R$ 740). — [JáCotei, Redmi A5](https://jacotei.com.br/smartphone-xiaomi-redmi-a5-64gb-3gb-ram-3gb-de-ram-extendida-b0fh5p2gpb/p)
- **JáCotei robots.txt** (`User-agent: *`): `Allow: /`, com `Disallow: /api/`, `/go/`, `/out/`, `/o/`, `/search$`, `/search?`, `/busca$`, `/busca?`, `/busca/`, `/favorites`, `/history$`, `/history?` (o histórico de navegação do usuário, não o de preços), `/login`, `/account` e parâmetros de filtro (`/*filter=`, `/*sort=`, `/*seller=`, `/*priceMin=`...). Páginas de produto `/<slug>/p` não estão vetadas. `GPTBot`, `ClaudeBot`, `CCBot` e outros têm `Disallow: /`. O sitemap fica em `https://jacotei.com.br/sitemap.xml`. — [JáCotei robots.txt](https://jacotei.com.br/robots.txt)
- O sitemap do JáCotei é um índice com 32 entradas, entre elas `sitemap-products.xml`, que lista URLs de produto `/<slug>/p`. — [JáCotei sitemap](https://jacotei.com.br/sitemap.xml); [sitemap-products](https://jacotei.com.br/sitemap-products.xml)
- **Promobit, página de oferta**: o `<script id="__NEXT_DATA__">` tem `props.pageProps.serverOffer.referencePrices = {"price": 32, "maxPrice": 35.97, "minPrice": 29.05, "zonePrice": 2}`, além de `offerId`, `aliasId` (105977), `storeDomain` ("mercadolivre.com.br"), `offerPrice`, `offerOldPrice`, `offerStatusName` ("FINISHED"), `isStoreVerified` e `isStoreCnpjValid`. Não há série de pontos. — [Promobit, oferta 2887552](https://www.promobit.com.br/oferta/creatina-100-pura-120-capsulas-2887552/)
- **Promobit robots.txt** (`User-agent: *`): `Disallow: /buscar/*`, `/buscar*`, `/api/*`, `/usuario/*`, `/promocoes/selecao/*` (com exceção de `Allow: /promocoes/selecao/doubleeleven/`), `/oferta/check/*`, `/v2*`. `/oferta/<slug>/` não está vetado. Sem Crawl-delay. — [Promobit robots.txt](https://www.promobit.com.br/robots.txt)
- **Hardware Barato**: a página de modelo tem 2 `<table>` no HTML do servidor, com linhas como `<td>R$ 6.659,90</td><td>inpower</td>`. O gráfico carrega por JS ("Carregando histórico de preços…"), mas a tabela já vem pronta. — [Hardware Barato, RTX 4070 Ti](https://hardwarebarato.com/produtos/placas-de-video/rtx-4070-ti)
- **Hardware Barato robots.txt**: um só grupo `User-agent: *` com `Disallow: /l/`, `/api/`, `/_next/`, `/manifest.json` e os endpoints de imagem. `/produtos/` não está vetado. Os sitemaps são `/sitemap.xml`, `/produtos/placas-de-video/sitemap.xml` e `/produtos/processadores/sitemap.xml`. — [Hardware Barato robots.txt](https://www.hardwarebarato.com/robots.txt)
- **Zoom robots.txt** (atualizado em "Maio de 2026"): para `*`, `Disallow: /ajax/tracker`, `/ajax/pricealert`, `/ajax/ajaxservice`, `/dynamic-resource/*`, `/zpgo`, `/lead*`, `*unavailable`, `*onlyBestDeals`, `*/loja`, `/*/compare`, `*?q=`, `/conta/*`. Há um bloco com o comentário "Bloqueio de Scrapers de Inteligencia Artificial (Protecao do catalogo e dados de preco)" que dá `Disallow: /` a GPTBot, ChatGPT-User, OAI-SearchBot, ClaudeBot, Claude-User, Google-Extended, PerplexityBot, Anthropic-AI e Amazonbot. Os sitemaps são de categorias, buscas, landing pages, lojas e artigos, sem sitemap de produtos. — [Zoom robots.txt](https://www.zoom.com.br/robots.txt)
- **Buscapé robots.txt**: mesma estrutura do Zoom. Para `*`, bloqueia endpoints `/ajax/`, `/zpgo`, `/responsive/`, `/lead`, `/loja`, comparação, busca `?q=` e áreas de conta. Os mesmos bots de IA (incluindo ClaudeBot e Claude-User) têm o site inteiro vetado. — [Buscapé robots.txt](https://www.buscape.com.br/robots.txt)
- **Pelando robots.txt**: `User-agent: *` com `Allow: /` e `Disallow: /postar`, `/meus-alertas`, `/promocoes-salvas`, `/configuracoes`, `/cashback`, `/atendimento`, `/meu-perfil`. Baiduspider, PetalBot, ManusBot, DataForSeoBot, AhrefsBot, SemrushBot e DotBot têm o site inteiro vetado. — [Pelando robots.txt](https://www.pelando.com.br/robots.txt)
- **Keepa (API)**: o dado vem por API paga com token. Opções como `offers`, `stock`, `buybox`, `rating`, `stats` ou forçar atualização fazem uma consulta custar mais de 1 token por ASIN. — [keepaapi docs, Product query](https://keepaapi.readthedocs.io/en/latest/product_query.html)
- **Mercado Livre**: não há histórico por API. Dá para montar o próprio histórico assinando `items_prices` e chamando `/prices`. — [Mercado Livre Developers](https://developers.mercadolivre.com.br/pt-br/api-de-precos)

### Inferences
- No JáCotei, `priceCents` já vem em centavos inteiros, como o Garimpo guarda. Mas a série é do produto e não diz a loja nem se o preço é à vista ou parcelado. Ela serve como referência de "preço de mercado", não como total no cartão.
- No JáCotei, a descoberta tem que ir pelo sitemap, porque `/busca` e `/search` estão vetados. Um índice local (sitemap baixado com cache de 12 h, como na coleta diária) resolve isso sem bater na busca.
- O Promobit já é fonte do Garimpo. O `referencePrices` vem de graça nas páginas `/oferta/` que o app já lê, sem requisição extra.
- Zoom e Buscapé: o grupo `*` não veta páginas de produto, então o User-Agent fixo do Garimpo, que não é um dos bots listados, está tecnicamente liberado. Mas o comentário "Proteção do catálogo e dados de preço" mostra a intenção de proteger justamente esse dado. O mais provável é que o gráfico venha de um endpoint `/ajax/` ou `/dynamic-resource/`, ambos vetados. Isso é inferência, não foi verificado.
- O ponto fora da curva do JáCotei mostra que o Garimpo precisa filtrar outliers (mediana ou corte por desvio) antes de chamar algo de "menor preço" ou "preço inflado".

### Gaps
- Não vi o HTML de produto do Zoom nem do Buscapé, porque respeitei o veto a Claude-User. Não sei se o histórico está no HTML, num JSON embutido ou num endpoint `/ajax/`.
- Não sei quantos pontos o JáCotei expõe por produto (todo o histórico desde abril ou só uma janela), nem se ele expõe série por loja. No exemplo apareceram 26 pontos de agosto a novembro.
- Hardware Barato: a tabela parece ter um preço por dia (a melhor oferta), não uma série por loja. Isso é leitura da página, sem documentação.

## 3. Termos de uso, acesso automatizado e anti-bot

### Takeaway
Nenhuma das fontes lidas tem um termo de uso que proíba, de forma explícita e verificada, a leitura educada. Também nenhuma oferece API pública. JáCotei, Promobit, Pelando e Hardware Barato liberam páginas de produto ou oferta para User-Agent genérico. Zoom e Buscapé declaram no robots.txt que querem proteger os dados de preço de raspadores de IA. O Keepa exige conta paga.

### Cited Findings
- JáCotei: diz ser um comparador que recebe comissão de afiliado e que "a página de checkout da loja parceira é sempre a fonte da verdade". Trata selos e gráficos "como evidência de tendência, não como promessa". A página não fala de uso automatizado. — [JáCotei, Como acompanhamos preços](https://jacotei.com.br/como-acompanhamos-precos)
- JáCotei veta GPTBot, ClaudeBot, Applebot-Extended, meta-externalagent, Bytespider e CCBot no site inteiro, mas não veta o grupo `*`. — [JáCotei robots.txt](https://jacotei.com.br/robots.txt)
- Zoom e Buscapé vetam bots de IA no site inteiro, com a justificativa "Protecao do catalogo e dados de preco". — [Zoom robots.txt](https://www.zoom.com.br/robots.txt); [Buscapé robots.txt](https://www.buscape.com.br/robots.txt)
- Nos trechos acessíveis dos Termos de Uso do Buscapé, a busca não encontrou cláusula expressa contra robôs ou raspagem. Os trechos falam de intermediação, responsabilidade das lojas e Cashback, mas o documento inteiro não foi lido. — [Buscapé, Termos de Uso](https://www.buscape.com.br/termos-de-uso)
- O Buscapé tem histórico de litígio contra scraping: desde 2013 acusa o Google, no Cade, de extrair avaliações do Buscapé e do Bondfaro. — [Tecnoblog](https://tecnoblog.net/noticias/cade-arquiva-segunda-denuncia-do-buscape-contra-google/)
- A equipe do Pelando diz que "as principais lojas não permitem" extrair preço via extensão e que scraping de produtos seria caro. — [Pelando, tópico](https://www.pelando.com.br/t/historico-de-precos-disponivel-no-site-do-pelando-3df9)
- Nas leituras desta pesquisa, as páginas de JáCotei, Promobit, Pelando e Hardware Barato responderam 200 a um curl simples com User-Agent fixo, sem desafio de JS. O camelcamelcamel.com respondeu 403 à ferramenta de leitura. — leitura direta: [JáCotei](https://jacotei.com.br/), [Promobit](https://www.promobit.com.br/oferta/creatina-100-pura-120-capsulas-2887552/), [Pelando](https://www.pelando.com.br/), [Hardware Barato](https://hardwarebarato.com/produtos/placas-de-video/rtx-4070-ti), [camelcamelcamel](https://camelcamelcamel.com/)

### Inferences
- Se o Garimpo for usar JáCotei e Hardware Barato, ele lê uma página de produto por oferta verificada, com cache de 10 min a 12 h e a pausa por domínio que já existe. É o mesmo padrão "coleta educada" que já vale para Pelando e Promobit.
- Para Zoom e Buscapé, o caminho mais conservador é não usar até alguém ler os termos completos. Mesmo liberados para `*`, eles disseram com todas as letras que protegem o dado de preço.
- Criar conta e pagar no Keepa é algo que o usuário faz por conta própria. O Garimpo só usaria a chave dele.

### Gaps
- Não li os termos de uso completos de JáCotei, Hardware Barato, Promobit, Pelando, Zoom ou Keepa. Nenhum foi aberto, por falta de tempo e de chamadas.
- Não sei se Hardware Barato e JáCotei têm rate limit ou anti-bot que dispare em uso contínuo. Só foram feitas de 1 a 3 requisições por domínio.

## 4. Custo

### Takeaway
JáCotei, Hardware Barato, Promobit (min/max) e a API de preço atual do Mercado Livre não custam nada. O Keepa API é o único pago que serve, a partir de cerca de €49/mês por 20 tokens/min (1 token por produto), sem plano grátis. A extensão do Keepa é grátis, mas não serve ao Garimpo.

### Cited Findings
- Keepa API: só pago, sem plano grátis. A entrada é de cerca de €49/mês por 20 tokens/min, e os tokens não usados expiram em 60 min. Uma consulta de produto custa 1 token por ASIN, uma busca de produto custa 10 tokens por página e deals custam 5 tokens. As fontes divergem sobre os planos do meio e do topo (ex.: 1.000 tokens/min por €1.499 contra 2.000 por €2.499). — [RevenueGeeks, Keepa API (julho de 2026)](https://revenuegeeks.com/software/keepa/api); [RevenueGeeks, Keepa pricing](https://revenuegeeks.com/keepa-pricing/)
- A assinatura de consumidor do Keepa custa cerca de €29/mês, segundo uma fonte de terceiros. Um artigo mais antigo dá €19, provavelmente desatualizado. — [RevenueGeeks, Keepa pricing](https://revenuegeeks.com/keepa-pricing/)
- Opções extras (`offers`, `stats`, `buybox`...) aumentam o custo em tokens por ASIN. — [keepaapi docs](https://keepaapi.readthedocs.io/en/latest/product_query.html)
- A extensão do Keepa mostra gráfico e mínima histórica de graça na Amazon BR. — [Olhar Digital](https://olhardigital.com.br/2024/10/21/dicas-e-tutoriais/como-usar-extensao-keepa-para-economizar-na-amazon/)
- JáCotei: "sem cadastro, sem custo extra" para o usuário. — [JáCotei, Como acompanhamos preços](https://jacotei.com.br/como-acompanhamos-precos)

### Inferences
- €49/mês sai na faixa de R$ 300/mês (câmbio não verificado). Para um app pessoal que só checa as ofertas que chegam, 20 tokens/min (uns 28 mil produtos por dia) sobram muito. O custo é o plano mínimo, não o volume.

### Gaps
- Não consegui abrir a página oficial de preços do Keepa (é um app em JS). Os valores vêm de terceiros e precisam ser conferidos em keepa.com antes de pagar.
- Não verifiquei se a API do Mercado Livre exige token OAuth de aplicativo para `/items/{id}/prices` em 2026.

## 5. Rótulo de viabilidade por fonte

### Takeaway
"Dá hoje com HTTP simples": JáCotei (série completa), Hardware Barato (só GPUs e CPUs) e Promobit (min e max, nas páginas que o app já lê). "Pago": Keepa. Zoom e Buscapé ficam "não verificado", e o mais provável é que precisem de JS ou de endpoint vetado. Google price insights, Pelando, Méliuz e CamelCamelCamel não servem ou não foram verificados.

### Cited Findings
| Fonte | Lojas BR | Onde está o dado | robots.txt (UA genérico) | Custo | Rótulo |
|---|---|---|---|---|---|
| JáCotei | Amazon, Mercado Livre, Shopee e afiliados ([fonte](https://jacotei.com.br/como-acompanhamos-precos)) | `points[{date, priceCents}]` no payload Next.js da página `/<slug>/p` ([fonte](https://jacotei.com.br/smartphone-xiaomi-redmi-a5-64gb-3gb-ram-3gb-de-ram-extendida-b0fh5p2gpb/p)) | Produto liberado; `/busca`, `/search`, `/api/` vetados ([fonte](https://jacotei.com.br/robots.txt)) | Grátis | **Dá hoje com HTTP simples** |
| Hardware Barato | KaBuM!, Pichau, Terabyte, Amazon, Magalu, ML, Shopee e outras, só GPU e CPU ([fonte](https://hardwarebarato.com/produtos/placas-de-video/rtx-4070-ti)) | `<table>` no HTML do servidor | `/produtos/` liberado; `/api/`, `/_next/` vetados ([fonte](https://www.hardwarebarato.com/robots.txt)) | Grátis | **Dá hoje com HTTP simples** (nicho) |
| Promobit | As lojas das ofertas | `serverOffer.referencePrices` no `__NEXT_DATA__` de `/oferta/` ([fonte](https://www.promobit.com.br/oferta/creatina-100-pura-120-capsulas-2887552/)) | `/oferta/` liberado; `/buscar`, `/api/` vetados ([fonte](https://www.promobit.com.br/robots.txt)) | Grátis | **Dá hoje com HTTP simples** (só min e max) |
| Keepa | Só Amazon BR (locale 12) ([fonte](https://raw.githubusercontent.com/keepacom/api_backend/master/src/main/java/com/keepa/api/backend/structs/AmazonLocale.java)) | API JSON com token | n/a (API) | ~€49/mês ([fonte](https://revenuegeeks.com/software/keepa/api)) | **Pago** |
| Zoom / Buscapé | Grandes lojas BR (busca) | Gráfico na página; local exato não verificado | Produto liberado; `?q=`, `/ajax/*` vetados; bots de IA vetados ([Zoom](https://www.zoom.com.br/robots.txt), [Buscapé](https://www.buscape.com.br/robots.txt)) | Grátis | **Não verificado** (provável JS ou endpoint vetado) |
| Mercado Livre API | Só ML | Só preço atual (`/prices`) ([fonte](https://developers.mercadolivre.com.br/pt-br/api-de-precos)) | n/a (API) | Grátis | Sem histórico (o app grava o seu) |
| Google price insights | — | Só EUA ([fonte](https://support.google.com/faqs/answer/10675605)) | — | — | **Indisponível no BR** |
| Pelando | — | Sem recurso de histórico ([fonte](https://www.pelando.com.br/t/historico-de-precos-disponivel-no-site-do-pelando-3df9)) | `/` liberado | — | Não se aplica |
| Méliuz | — | Extensão de cashback e cupons ([fonte](https://addons.mozilla.org/mt/firefox/addon/meliuz/versions/)) | — | — | Não se aplica |
| CamelCamelCamel | Não verificado | — | 403 na leitura ([fonte](https://camelcamelcamel.com/)) | — | Não verificado |
| Procon-SP "Evite esses sites" | Lista de lojas, não de preços | Página do Procon-SP ([fonte](https://olhardigital.com.br/curiosidades/?p=38643)) | Não verificado | Grátis | Serve para domínio suspeito, não para histórico |

- Procon-SP: a lista "Evite esses Sites e Perfis Digitais" fica em procon.sp.gov.br. A inclusão acontece quando o fornecedor não responde às notificações de forma reiterada ou não pode ser localizado. Um endereço antigo é `sistemas.procon.sp.gov.br/evitesite/list/evitesites.php`. As contagens citadas pela imprensa variam (78, 323, 419) conforme o ano. — [Olhar Digital](https://olhardigital.com.br/curiosidades/?p=38643); [j1diario](https://j1diario.com.br/?p=53032); [Procon-SP, Portaria Normativa nº 3/2026](https://www.procon.sp.gov.br/wp-content/uploads/2026/10/PORTARIA_NORMATIVA_N__3_2026__DE_25_DE_SETEMBRO_DE_2026.pdf)
- Só extensão: "SetupBarato — Histórico e melhor preço" existe como extensão do Chrome. Não foi avaliada. — [Chrome Web Store](https://chromewebstore.google.com/detail/ahelhopmjjdggifjdpiblkamhkgbccji)

### Inferences
- O arranjo mais barato e mais fiel às regras do Garimpo é: (1) o próprio `price_points` como fonte principal; (2) o JáCotei como segunda opinião de "preço de mercado" para Amazon, ML e Shopee; (3) o Hardware Barato para GPUs e CPUs nas lojas de hardware; (4) o `referencePrices` do Promobit grátis nas ofertas que já chegam de lá. O Keepa só entra se o usuário aceitar pagar e criar a conta ele mesmo.
- Os critérios do selo do JáCotei (≥3 registros, ≥14 dias, variação ≥2%, preço de hoje = mínimo de 90 dias) são uma regra determinística pronta que o Garimpo pode copiar para o próprio selo "desconto real" sobre `price_points`.
- A lista do Procon-SP serve para o "domínio suspeito" do Garimpo, não para o histórico.

### Gaps
- O formato atual da lista do Procon-SP (HTML, CSV ou PDF) não foi verificado, nem se o robots dela permite leitura.
- Não verifiquei listas "Black Fraude" do Reclame Aqui nem do Procon em 2026 como fonte estruturada. Só achei a recomendação do Idec de consultar o Reclame Aqui manualmente ([Idec](https://idec.org.br/fique-de-olho/saiba-como-aproveitar-promocoes-da-melhor-forma)).

## 6. Como casar a oferta do Garimpo com o produto da fonte (EAN/GTIN, ASIN, MLB, título)

### Takeaway
O ASIN funciona no Keepa (direto) e em parte do JáCotei (alguns slugs terminam no ASIN). Nenhuma das fontes gratuitas lidas expõe EAN/GTIN. Para o resto, o casamento tem que ser por título, contra um índice local feito com os sitemaps, porque a busca interna é vetada pelo robots em JáCotei, Promobit, Zoom e Buscapé.

### Cited Findings
- Os slugs de produto do JáCotei às vezes terminam no ASIN da Amazon em minúsculas, por exemplo `.../smartphone-xiaomi-redmi-a5-64gb-...-b0fh5p2gpb/p` e `.../capa-...-redmi-note-11-...-b09wbry25m/p`. Outros não têm ASIN, como `.../notebook-asus-vivobook-go-15-amd-ryzen-5-7520u-8gb-256gb-ssd-.../p`. — [JáCotei, categoria Xiaomi](https://jacotei.com.br/smartphones/_xiaomi); [JáCotei sitemap-products](https://jacotei.com.br/sitemap-products.xml)
- O JSON-LD de produto do JáCotei traz `name`, `brand` e `offers.price`. Não vi `gtin13` nem `ean`. — [JáCotei, Redmi A5](https://jacotei.com.br/smartphone-xiaomi-redmi-a5-64gb-3gb-ram-3gb-de-ram-extendida-b0fh5p2gpb/p)
- O Hardware Barato não tem EAN, GTIN nem part number. Identifica o produto pelo nome e pelo slug do modelo (ex.: `/produtos/placas-de-video/rtx-4070-ti`). — [Hardware Barato](https://hardwarebarato.com/produtos/placas-de-video/rtx-4070-ti)
- O Promobit identifica por `offerId`, `aliasId` (agrupador) e `offerKeywords`/`mostRelevantKeyword`, sem EAN. — [Promobit, oferta 2887552](https://www.promobit.com.br/oferta/creatina-100-pura-120-capsulas-2887552/)
- O Keepa consulta por ASIN no locale BR (12), a 1 token por ASIN. — [AmazonLocale.java](https://raw.githubusercontent.com/keepacom/api_backend/master/src/main/java/com/keepa/api/backend/structs/AmazonLocale.java); [RevenueGeeks](https://revenuegeeks.com/software/keepa/api)
- O Mercado Livre consulta por ITEM_ID (MLB...) em `/items/$ITEM_ID/prices`. — [Mercado Livre Developers](https://developers.mercadolivre.com.br/pt-br/api-de-precos)
- Busca vetada pelo robots: JáCotei (`/busca`, `/search`), Promobit (`/buscar*`), Zoom e Buscapé (`*?q=`). — [JáCotei](https://jacotei.com.br/robots.txt); [Promobit](https://www.promobit.com.br/robots.txt); [Zoom](https://www.zoom.com.br/robots.txt); [Buscapé](https://www.buscape.com.br/robots.txt)

### Inferences
- Ordem de casamento sugerida: (1) ASIN da URL da Amazon (`/dp/XXXXXXXXXX`) contra o Keepa ou o sufixo do slug do JáCotei; (2) MLB contra a API do ML para preço atual; (3) para KaBuM!, Pichau e Terabyte em GPUs e CPUs, o modelo normalizado (ex.: "rtx 4070 ti") contra o slug do Hardware Barato; (4) título normalizado contra o índice de `sitemap-products.xml` do JáCotei, baixado com cache longo. O índice exige casamento por título, e esse é o tipo de caso em que o Garimpo já usa IA em lote como fallback.
- O Hardware Barato agrupa por modelo de chip, não por SKU (a página "RTX 4070 Ti" mistura placas de marcas diferentes). Serve para dizer "o mercado de RTX 4070 Ti está em X", não para o histórico exato daquela placa.

### Gaps
- Não confirmei se o JáCotei põe MLB ou outro id de loja nos slugs de produtos que vêm do Mercado Livre ou da Shopee.
- Não sei quantas URLs tem o `sitemap-products.xml` do JáCotei (quantidade de páginas e tamanho), o que define se o índice local é viável.
- Não sei como Zoom e Buscapé identificam produtos (EAN na página?), porque as páginas de produto não foram abertas.
