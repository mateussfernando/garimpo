# Comunidades, agregadores e páginas de "ofertas" de sites de tecnologia (Brasil, 11/11/2026)

Método: em 11/11/2026, entre 17h e 21h (horário de Brasília), cada robots.txt, listagem e feed abaixo foi baixado com `curl` simples, sem navegador, sem login e sem proxy. O User-Agent era genérico, `Mozilla/5.0 (compatible; deal-research-check/1.0)`, e não o `GarimpoBot/0.1` do app, que não foi testado. Cada domínio recebeu de 1 a 4 requisições, com pausa entre elas. "Server-rendered" quer dizer que título e preço da oferta aparecem no HTML cru, em `__NEXT_DATA__` ou em JSON-LD. As citações de robots.txt são trechos literais dos arquivos baixados nesse dia.

## 1. A fonte existe e está ativa em novembro de 2026?

### Takeaway
Estão ativas, com ofertas datadas de 11/11/2026: Pechinchou, Boletando, Nerd Ofertas, Promotop, Hardware Barato, Canaltech Ofertas, Ofertas Adrenaline/Mundo Conectado, Tecnoblog Achados, Hardware.com.br "Hardware Indica", Olhar Digital (posts de seleção de ofertas), TecMundo (agora dentro do Estadão), TudoCelular, Zoom e Buscapé. Não servem como fonte de ofertas: Promoforum (o domínio não resolve), ofertas.top (outro negócio), a categoria de ofertas da comunidade Tecnoblog (parada desde 2025), Clube do Hardware e Guia do PC (não têm seção de ofertas).

### Cited Findings
- **Pechinchou**: a listagem `/recentes` tinha 20 promoções criadas entre 17:51 e 18:08 de 11/11/2026, todas com `is_bot: false`. — [pechinchou.com.br/recentes](https://www.pechinchou.com.br/recentes)
- **Boletando**: a home lista posts com `?oferta=272522` a `272551` (monitores LG, mouse Logitech, notebooks). Um post de produto tem `dateModified` 2026-11-11T19:14. — [boletando.com](https://boletando.com/); [post de exemplo](https://boletando.com/monitor-lg-27-fhd-ips-144hz-nativo-1ms-mbr-nvidia-g-sync-amd-freesync-hdr10-99-srgb-27u411b-b/?oferta=272541)
- **Nerd Ofertas**: o domínio .com.br redireciona para nerdofertas.com. `/ofertas` tem ItemList com 21 itens (IDs 15960–16006), marcados "há 36–43 min". O robots.txt cita mudanças feitas em 09/11/2026. — [nerdofertas.com/ofertas](https://nerdofertas.com/ofertas); [robots.txt](https://nerdofertas.com/robots.txt)
- **Promotop** (promotop.net; promotop.com.br não resolve): o feed tem 10 itens, o mais recente de "Wed, 11 Nov 2026 19:58:29 +0000". O `<title>` da página ainda diz "Melhores Ofertas 2024". — [promotop.net/ofertas](https://promotop.net/ofertas/); [feed](https://promotop.net/feed/)
- **Hardware Barato** (hardwarebarato.com): a página "Promoções verificadas de hardware" mostra 17 datas 2026-11-11 no HTML e 11 produtos em JSON-LD: SSD NVMe, Ryzen, placas de vídeo e monitor. — [hardwarebarato.com/produtos/promocoes](https://www.hardwarebarato.com/produtos/promocoes)
- **Canaltech Ofertas** fica num subdomínio. `canaltech.com.br/ofertas/` dá 404, e as ofertas estão em `ofertas.canaltech.com.br`, com cards marcados "26m" e uma Live da Black Friday marcada para 26/11/2026. — [ofertas.canaltech.com.br](https://ofertas.canaltech.com.br/); [canaltech.com.br/ofertas/ (404)](https://canaltech.com.br/ofertas/)
- **Ofertas Adrenaline/Mundo Conectado**: o subdomínio `ofertas.adrenaline.com.br` (título "Ofertas Adrenaline/Mundo Conectado") tem 20 cards com preço e data 2026-11-11. — [ofertas.adrenaline.com.br](https://ofertas.adrenaline.com.br/)
- **Mundo Conectado**: `/ofertas` redireciona para `linkmc.click/ofertas`, uma página de links para o Telegram `t.me/ofertasmundoconectado`, WhatsApp e redes. Não lista ofertas. — [mundoconectado.com.br/ofertas](https://www.mundoconectado.com.br/ofertas)
- **Adrenaline**: `www.adrenaline.com.br/ofertas/perifericos/` é um "Arquivo de Periféricos" de taxonomia, sem preços (1 ocorrência de "R$"). As ofertas de verdade ficam no subdomínio. — [adrenaline.com.br/ofertas/perifericos/](https://www.adrenaline.com.br/ofertas/perifericos/)
- **Tecnoblog Achados**: dos 50 itens do feed principal (09/11 17:19 a 11/11 20:34 UTC), 26 são `/achados/`, como "Galaxy S26 volta a cair... no 11.11 do Magalu". — [tecnoblog.net/feed/](https://tecnoblog.net/feed/)
- **Comunidade Tecnoblog**: a categoria "Ofertas e Promoções" (Discourse) só tem 3 tópicos, e o último é de 2025-09-30. Está morta. — [tecnoblog.net/comunidade/c/achados/20.json](https://tecnoblog.net/comunidade/c/achados/20.json)
- **Hardware.com.br "Hardware Indica"**: o feed tem 50 itens de 02/11 a 11/11/2026, 3 a 6 por dia. — [hardware-indica/feed/](https://www.hardware.com.br/hardware-indica/feed/)
- **Olhar Digital**: `/reviews/feed/` tem 10 posts de 11/11/2026 (17:51–20:51 UTC) do tipo "...em promoção na Amazon". — [olhardigital.com.br/reviews/feed/](https://olhardigital.com.br/reviews/feed/)
- **TecMundo** agora fica no Estadão: `www.tecmundo.com.br` redireciona para `www.estadao.com.br/tecmundo/`. O "Guia de compras" tem 32 datas 2026-11-11 e 21 de 2026-11-10. — [estadao.com.br/tecmundo/guia-de-compras/](https://www.estadao.com.br/tecmundo/guia-de-compras/)
- **TudoCelular**: o feed tem 20 itens de 11/11/2026, misturando notícias e ofertas ("Smart TV 4K de 144 Hz por R$ 2.279!..."). — [tudocelular.com/feed/](https://www.tudocelular.com/feed/)
- **Zoom / Buscapé**: `/ofertas` mostra cards "DealOfferCard" com preço ("Apple iPhone 16 (128 GB)... R$ 4.549,00, Menor preço via Amazon"). Os dois robots.txt dizem "Ultima atualizacao: Maio de 2026". — [zoom.com.br/ofertas](https://www.zoom.com.br/ofertas); [buscape.com.br/ofertas](https://www.buscape.com.br/ofertas)
- **Méliuz / Cuponomia**: estão ativos como sites de cupom e cashback. A página da KaBuM! na Cuponomia tem o título "Cupom KaBuM! | Até 55% de desconto - Novembro 2026". — [cuponomia.com.br/desconto/kabum](https://www.cuponomia.com.br/desconto/kabum); [meliuz.com.br/cupom](https://www.meliuz.com.br/cupom)
- **Promoforum**: `www.promoforum.com.br` e `promoforum.com.br` falharam no DNS (curl 000), e a busca web não achou o site. — [busca](https://www.promobit.com.br/forum/manual-de-boas-praticas-e-regras-para-o-forum-7183/) (o resultado mais próximo foi o fórum do Promobit)
- **ofertas.top**: é um site Wix chamado "Autopass Ofertas", sem preços no HTML. Não é agregador de ofertas. — [ofertas.top](https://www.ofertas.top/)
- **Ofertas Gamer** (ofertasgamer.com.br): um app Next.js (App Router) com links "/mais-curtidos" e "/categoria/cupom", mas sem nenhum "R$" no HTML. Não deu para confirmar a atividade. — [ofertasgamer.com.br](https://www.ofertasgamer.com.br/)
- **Clube do Hardware**: o índice `/forums/` não tem nenhum subfórum com "promo", "oferta" ou "barato" no link. Os fóruns da home são técnicos (fontes, placas-mãe, placas de vídeo). — [clubedohardware.com.br/forums/](https://www.clubedohardware.com.br/forums/)
- **Guia do PC**: é um blog de notícias, que só tem a tag `/tag/black-friday`. — [guiadopc.com.br](https://guiadopc.com.br/)
- **Gatry**: `gatry.com/` redireciona para `/promocoes`, com o título "A Melhor Comunidade de Promoções, Cupons e Ofertas do Brasil". — [gatry.com](https://gatry.com/promocoes)

### Inferences
- O 11.11 de 2026 está em pleno curso nas fontes de tecnologia. Tecnoblog, Hardware.com.br, Olhar Digital, TudoCelular e Canaltech publicaram posts "11.11" no mesmo dia.
- Várias fontes novas (Nerd Ofertas, Hardware Barato, Promotop) parecem sites de afiliados com publicação automática. Por exemplo, as imagens da Nerd Ofertas vêm de `cdn.botdoafiliado.com`. Não são comunidades com votos e comentários.

### Gaps
- Não deu para confirmar se r/PromocoesBR existe e está ativo, porque o robots.txt do Reddit proíbe tudo (ver Q3). Por isso não busquei o subreddit.
- A atividade da Ofertas Gamer não foi confirmada, porque o HTML não traz conteúdo.
- O "TecMundo Comparador" não foi localizado nem testado.

## 2. URL exata da listagem de ofertas mais novas e existência de RSS/Atom

### Takeaway
Feeds que funcionam e trazem ofertas: Tecnoblog (`/feed/`, misturado com notícias), Hardware.com.br (`/hardware-indica/feed/`, só ofertas), Olhar Digital (`/reviews/feed/`), TudoCelular (`/feed/`, misturado) e TecMundo (feed do Estadão, quase só páginas de cupom). Promotop tem feed, mas o robots.txt proíbe. Pelando, Promobit, Gatry, Pechinchou, Nerd Ofertas, Boletando, Canaltech Ofertas e Hardware Barato não têm feed RSS, então é preciso ler o HTML ou o `__NEXT_DATA__`.

### Cited Findings
- **Pechinchou**: as listagens são `https://www.pechinchou.com.br/recentes` (mais novas) e `/` (filtro "relevant"), ambas na rota Next `/[[...filter]]`. Por categoria: `/categorias/informatica`, `/categorias/eletronicos`, `/categorias/telefonia` etc. `/feed` dá 404. A página 2 é servida pela API `admin2.pechinchou.com.br/api/v2/produto/listar_produtos_por_opcao_cliente_v3/home/?hide_closed=true&page=2`. — [/recentes](https://www.pechinchou.com.br/recentes); [/categorias/informatica](https://www.pechinchou.com.br/categorias/informatica); [/feed 404](https://www.pechinchou.com.br/feed)
- **Boletando**: a listagem é a home `https://boletando.com/`. O `/feed/` retorna HTTP 500, com o corpo do WordPress dizendo "No feed available, please visit our homepage!". O feed de categoria também dá 404. — [boletando.com/feed/](https://boletando.com/feed/); [category feed 404](https://boletando.com/category/informatica/feed/)
- **Nerd Ofertas**: a listagem é `https://nerdofertas.com/ofertas`, com ItemList JSON-LD. `/feed` e `/ofertas/feed` dão 404. — [/ofertas](https://nerdofertas.com/ofertas); [/feed 404](https://nerdofertas.com/feed)
- **Promotop**: a listagem é `https://promotop.net/ofertas/`. O feed `https://promotop.net/feed/` existe (RSS, 10 itens), mas o robots.txt o proíbe (ver Q3). — [listagem](https://promotop.net/ofertas/); [feed](https://promotop.net/feed/)
- **Hardware Barato**: a listagem é `https://www.hardwarebarato.com/produtos/promocoes`. `/feed` dá 404. Há sitemaps por categoria, como `/produtos/placas-de-video/sitemap.xml`. — [promocoes](https://www.hardwarebarato.com/produtos/promocoes); [robots.txt](https://hardwarebarato.com/robots.txt)
- **Canaltech Ofertas**: a listagem é `https://ofertas.canaltech.com.br/`, e `/feed/` dá 404. O sitemap `https://static.canaltech.com.br/smap/ofertas.xml` tem 3.066 URLs, mas 2.953 delas com `lastmod` de 11/11/2026, então o lastmod não indica quando a oferta é nova. O site principal anuncia um RSS no feedburner (`feeds2.feedburner.com/canaltechbr`), com 50 itens, mas todos apontam para canaltech.com.br (notícias). — [ofertas.canaltech.com.br](https://ofertas.canaltech.com.br/); [sitemap ofertas](https://static.canaltech.com.br/smap/ofertas.xml); [feedburner](https://feeds2.feedburner.com/canaltechbr)
- **Ofertas Adrenaline/Mundo Conectado**: a listagem é `https://ofertas.adrenaline.com.br/`, com categorias `/tv`, `/processador` e `/cadeira`. Não achei feed. O Adrenaline tem `/feed/` de notícias. — [ofertas.adrenaline.com.br](https://ofertas.adrenaline.com.br/); [adrenaline.com.br](https://www.adrenaline.com.br/)
- **Mundo Conectado**: `/ofertas/feed/` responde 200, mas com 0 itens. — [feed vazio](https://www.mundoconectado.com.br/ofertas/feed/)
- **Tecnoblog**: a listagem é `https://tecnoblog.net/achados/`, e `/achados/feed/` dá 404. O feed principal `https://tecnoblog.net/feed/` traz 50 itens, 26 deles de `/achados/`, e dá para filtrar pelo path. — [achados](https://tecnoblog.net/achados/); [feed](https://tecnoblog.net/feed/); [achados/feed 404](https://tecnoblog.net/achados/feed/)
- **Hardware.com.br**: listagem em `https://www.hardware.com.br/hardware-indica/` e feed só de ofertas em `https://www.hardware.com.br/hardware-indica/feed/` (50 itens). — [feed](https://www.hardware.com.br/hardware-indica/feed/)
- **Olhar Digital**: o feed geral `https://olhardigital.com.br/feed/` mistura notícias. A categoria `https://olhardigital.com.br/reviews/feed/` concentra os posts "em promoção na Amazon" (10 itens). — [feed geral](https://olhardigital.com.br/feed/); [reviews/feed](https://olhardigital.com.br/reviews/feed/)
- **TecMundo (Estadão)**: a listagem é `https://www.estadao.com.br/tecmundo/guia-de-compras/`. O RSS anunciado é `https://www.estadao.com.br/arc/outboundfeeds/feeds/rss/sections/tecmundo/`, com 20 itens, e os de hoje são quase todos páginas "Cupom Avell | Até 40% off - Novembro 2026", "Cupom Netshoes..." etc. — [guia-de-compras](https://www.estadao.com.br/tecmundo/guia-de-compras/); [RSS](https://www.estadao.com.br/arc/outboundfeeds/feeds/rss/sections/tecmundo/)
- **TudoCelular**: `https://www.tudocelular.com/feed/` tem 20 itens (notícias e ofertas). A listagem `/ofertas/` existe, mas bloqueia (ver Q5). — [feed](https://www.tudocelular.com/feed/)
- **Zoom / Buscapé**: listagens em `https://www.zoom.com.br/ofertas` e `https://www.buscape.com.br/ofertas`, mais `/landing-page/oferta-do-dia-zoom` e `/landing-page/oferta-do-dia-buscape`. Não têm feed. — [zoom/ofertas](https://www.zoom.com.br/ofertas); [buscape/ofertas](https://www.buscape.com.br/ofertas)
- **Pelando**: `/rss` e `/feed` dão 404, mas existe um sitemap em `/sitemaps/sitemap.xml`. — [pelando /rss 404](https://www.pelando.com.br/rss); [robots.txt](https://www.pelando.com.br/robots.txt)
- **Promobit**: `/feed/` e `/rss/` dão 404. O robots.txt libera explicitamente `Allow: /promocoes/selecao/doubleeleven/`, a seleção do 11.11, que fica acessível mesmo com `/promocoes/selecao/*` proibido. — [promobit /feed/ 404](https://www.promobit.com.br/feed/); [robots.txt](https://www.promobit.com.br/robots.txt)
- **Gatry**: `/feed` devolve o HTML da SPA (9,7 KB, título "Gatry"), não um feed. O robots.txt tem `Allow: /v1/`, o que sugere um caminho de API permitido. — [gatry.com/feed](https://gatry.com/feed); [robots.txt](https://gatry.com/robots.txt)
- **Hardmob**: o RSS do vBulletin está proibido: `Disallow: /external.php` e `Disallow: /vbnowrss.php`. — [hardmob robots.txt](https://www.hardmob.com.br/robots.txt)

### Inferences
- Para o Garimpo, o caminho mais limpo por RSS é o feed `hardware-indica` do Hardware.com.br, que só tem ofertas. O `/feed/` do Tecnoblog, filtrado pelo path `/achados/`, vem em segundo. Os dois evitam baixar HTML grande.
- A seleção `/promocoes/selecao/doubleeleven/` do Promobit vale ser testada hoje, porque o robots a libera de propósito.
- No Gatry, `Allow: /v1/` indica uma API pública permitida pelo robots, o que pode ser mais leve que a página. Não examinei os endpoints para não insistir num site que costuma pedir pausa.

### Gaps
- Não identifiquei os endpoints `/v1/` do Gatry.
- Não testei o robots.txt de `admin2.pechinchou.com.br` (o host da paginação). A página 1 por SSR basta para ler a cada 10 min.
- Não procurei um feed por categoria no Estadão ou TecMundo, como um `guia-de-compras` só de ofertas.

## 3. O que diz o robots.txt sobre a listagem (Disallow/Allow, crawl-delay, bloqueios de IA)

### Takeaway
Quase todas as listagens estão liberadas para `User-agent: *`. As exceções que importam:
- Reddit proíbe tudo.
- O feed do Promotop está proibido.
- Os redirecionadores de loja estão proibidos em Tecnoblog (`tecno.click`), Zoom/Buscapé (`/lead*`), Nerd Ofertas (`/o/`), Hardware Barato (`/l/`), Méliuz (`/rastreia/`) e Cuponomia (`/out/`).
- O Guia do PC pede Crawl-Delay de 30 s.

Vários sites bloqueiam nominalmente ClaudeBot, GPTBot e similares. Isso não pega o UA do Garimpo, mas mostra a postura do site.

### Cited Findings
- **Pechinchou**: "User-agent: * / Allow: / / Disallow: /api/* / Disallow: /perfil/configuracao/". — [robots.txt](https://pechinchou.com.br/robots.txt)
- **Boletando**: "Disallow: /author/ ... Disallow: /*?s= ... Disallow: /wp-admin/admin-ajax.php?action=rh_*". A listagem e os posts estão liberados. — [robots.txt](https://boletando.com/robots.txt)
- **Nerd Ofertas**: "Disallow: /api/ ... Disallow: /compraemgrupo/api/ ... Disallow: /o/ ... Disallow: /busca". `/o/` é o redirecionador interno. O arquivo também traz "Content-Signal: ai-train=yes, search=yes, ai-input=yes". — [robots.txt](https://nerdofertas.com/robots.txt)
- **Promotop**: "Disallow: */feed/" e "Disallow: /?s=*". O feed RSS fica proibido e `/ofertas/` liberado. — [robots.txt](https://promotop.net/robots.txt)
- **Hardware Barato**: "Disallow: /l/ / Disallow: /api/ / Disallow: /_next/ ...". — [robots.txt](https://hardwarebarato.com/robots.txt)
- **Canaltech Ofertas**: o subdomínio só tem "User-Agent: *" com Sitemap (sem Disallow) e "User-agent: YandexBot / Disallow: /". No domínio principal: "Disallow: /api/ / Disallow: /rss/ / Allow: /rss/google-assistente/ / Disallow: /deeplink/". O shortener `canalte.ch` tem "User-Agent: * / Disallow: /api/". — [ofertas robots](https://ofertas.canaltech.com.br/robots.txt); [canaltech robots](https://canaltech.com.br/robots.txt); [canalte.ch robots](https://canalte.ch/robots.txt)
- **Ofertas Adrenaline**: `ofertas.adrenaline.com.br/robots.txt` dá 404, ou seja, nenhuma restrição. O `curt.link` dos botões tem "Disallow: /admin/ / Allow: /". — [404](https://ofertas.adrenaline.com.br/robots.txt); [curt.link robots](https://curt.link/robots.txt)
- **Adrenaline e Mundo Conectado** usam o mesmo modelo: "Allow: / / Disallow: /wp-admin/ / Disallow: /reportar-erro / Disallow: */search/" e "Content-Signal: ai-train=yes, search=yes, ai-input=yes". — [adrenaline robots](https://www.adrenaline.com.br/robots.txt); [mundoconectado robots](https://www.mundoconectado.com.br/robots.txt)
- **Tecnoblog**: "Disallow: /loja/ / Disallow: /descontos-* / Disallow: /ml/ / Disallow: /amz/ ... Disallow: /comunidade/c/*.rss". O grupo "Bots LLM" bloqueia Applebot, Bytespider, ClaudeBot e GPTBot. O shortener `tecno.click` tem "User-agent: * / Disallow: /". — [tecnoblog robots](https://tecnoblog.net/robots.txt); [tecno.click robots](https://tecno.click/robots.txt)
- **Hardware.com.br**: "Allow: / / Disallow: /api/ / Disallow: /preview/". Os bots de IA, ClaudeBot incluído, aparecem nominalmente com as mesmas permissões e "Content-Signal: search=yes, ai-input=yes, ai-train=yes". — [robots.txt](https://www.hardware.com.br/robots.txt)
- **Olhar Digital**: o grupo * proíbe "/wp-admin/", "/search/", "/entrar/" e prefixos de idioma. ClaudeBot, Claude-Web, anthropic-ai, GPTBot, ChatGPT-User, PerplexityBot, CCBot etc. levam "Disallow: /". — [robots.txt](https://olhardigital.com.br/robots.txt)
- **Estadão (TecMundo)**: o grupo * proíbe "/feed/$", "/newsletter/", "/ext/" etc. (não a `/tecmundo/`). Para GPTBot, ClaudeBot, anthropic-ai e outros: "Allow: /tecmundo/ / Disallow: /". Em 11/11/2026, `www.tecmundo.com.br/robots.txt` respondia 204, sem conteúdo. — [estadao robots](https://www.estadao.com.br/robots.txt); [tecmundo robots](https://www.tecmundo.com.br/robots.txt)
- **TudoCelular**: "User-Agent: * / Allow: /". — [robots.txt](https://www.tudocelular.com/robots.txt)
- **Zoom e Buscapé** (Mosaico, mesmo arquivo): "Disallow: /lead*", "Disallow: *?q=", "Disallow: */loja", "Disallow: *onlyBestDeals". Num bloco intitulado "Bloqueio de Scrapers de Inteligencia Artificial (Protecao do catalogo e dados de preco)", GPTBot, ClaudeBot, Claude-User, PerplexityBot, Anthropic-AI e Amazonbot levam "Disallow: /". — [zoom robots](https://www.zoom.com.br/robots.txt); [buscape robots](https://www.buscape.com.br/robots.txt)
- **Méliuz**: "Disallow: /json/ / Disallow: /ajax/ ... Disallow: /blog/go/ ... Disallow: /rastreia/". Os bots de IA ficam liberados, com as mesmas regras. — [robots.txt](https://www.meliuz.com.br/robots.txt)
- **Cuponomia**: "Content-Signal: ai-train=no, search=yes, ai-input=yes / Disallow: /coupon/show/ / Disallow: /out/ ... Disallow: /antirobot/answer". — [robots.txt](https://www.cuponomia.com.br/robots.txt)
- **Guia do PC**: "User-agent: * / Crawl-Delay: 30". — [robots.txt](https://www.guiadopc.com.br/robots.txt)
- **Clube do Hardware**: é gerenciado pela Cloudflare, com "User-agent: * / Content-Signal: search=yes,ai-train=no,use=reference / Allow: /" e bloqueio total de ClaudeBot, GPTBot, ChatGPT-User, PerplexityBot etc. — [robots.txt](https://www.clubedohardware.com.br/robots.txt)
- **Hardmob** (já usado): Cloudflare-managed, "Content-Signal: search=yes,ai-train=no,use=reference", com Disallow de "/external.php" e "/vbnowrss.php" e Crawl-delay 15 para GPTBot, bingbot etc. — [robots.txt](https://www.hardmob.com.br/robots.txt)
- **Pelando** (já usado): "User-agent: * / Allow: /" com Disallow para "/postar", "/cashback", "/meu-perfil" etc. O topo bloqueia ManusBot, AhrefsBot e SemrushBot. — [robots.txt](https://www.pelando.com.br/robots.txt)
- **Promobit** (já usado): "Disallow: /buscar*", "/promocoes/selecao/*", "/api/*", "/oferta/check/*", mas "Allow: /promocoes/selecao/doubleeleven/". — [robots.txt](https://www.promobit.com.br/robots.txt)
- **Gatry** (já usado): "Allow: /v1/ / Disallow: /busca ... Disallow: /comentarios / Disallow: /*?". Qualquer URL com query string fica proibida. — [robots.txt](https://gatry.com/robots.txt)
- **Reddit**: "User-agent: * / Disallow: /", tanto em www quanto em old.reddit.com. O comentário remete à "Public Content Policy". — [reddit robots](https://www.reddit.com/robots.txt); [old.reddit robots](https://old.reddit.com/robots.txt)
- **Shorteners**: `amzn.to` (Bitly) tem "User-Agent: * / Disallow:" (tudo liberado). `meli.la/robots.txt` dá 404 ("Id does not exist"). `s.shopee.com.br/robots.txt` cai numa SPA e redireciona para `shope.ee/error_page`. — [amzn.to robots](https://amzn.to/robots.txt); [meli.la robots](https://meli.la/robots.txt)

### Inferences
- O Garimpo usa a IA (Haiku) para classificar ofertas, o que é "ai-input" nos Content-Signals. Hardware.com.br, Adrenaline, Mundo Conectado, Nerd Ofertas e Cuponomia declaram `ai-input=yes`. Clube do Hardware e Hardmob não declaram ai-input (só `use=reference`, `ai-train=no`). Isso pesa pouco, porque o app só manda à IA o título e o preço já extraídos, mas vale registrar.
- Onde o redirecionador é proibido (tecno.click, `/lead`, `/o/`, `/l/`, dpl.pelando), o app deve tratar a oferta como "loja não verificada". Ou então só aproveitar o link quando ele já vem direto no HTML ou JSON-LD.

### Gaps
- Não baixei os robots.txt de `link.amazon`, `s.click.aliexpress.com` e `mercadolivre.com/sec`. Os shorteners da Shopee e do Mercado Livre devolvem SPA ou 404 no robots.txt.

## 4. A listagem é server-rendered (título, preço e link no HTML, `__NEXT_DATA__` ou JSON-LD) ou só JS?

### Takeaway
Todas as fontes novas de ofertas vêm renderizadas no servidor, menos a Ofertas Gamer. A Pechinchou entrega o melhor formato, um `__NEXT_DATA__` com campos estruturados. Nerd Ofertas, Hardware Barato e Boletando trazem JSON-LD `Product` com `offers.url` direto na página da oferta.

### Cited Findings
- **Pechinchou**: `__NEXT_DATA__` → `props.pageProps.promos.results` (20 por página). Os campos incluem `title`, `price`, `old_price`, `store`, `freight` ("Frete Grátis Amazon Prime"), `coupons`, `created_at`, `long_url`, `short_url`, `subcategory`, `lowest_price`, `status` e `is_bot`. Também há `pageProps.coupons.results`, com `coupon`, `discount`, `closes_in` e `long_url`. — [pechinchou.com.br](https://www.pechinchou.com.br/); [/recentes](https://www.pechinchou.com.br/recentes)
- **Nerd Ofertas**: a listagem tem JSON-LD `ItemList` com `url` e `name` (o nome inclui o preço, ex.: "...por R$18,12"). A página da oferta tem JSON-LD `Product` com `offers.url` e a descrição com loja e cupom ("na Mercado Livre com o cupom APROVEITAOFERTA"). Mas o `offers.price` veio errado: "2.28" para "R$ 2.279". — [listagem](https://nerdofertas.com/ofertas); [oferta 15953](https://nerdofertas.com/oferta/15953/smart-tv-tcl-55-qd-mini-led-4k-c6k-google-tv-144hz-r-2-279)
- **Hardware Barato**: tem 11 JSON-LD `Product` na listagem, com `offers.price` (ex.: 1666 BRL), `offers.url`, `seller` (Aliexpress), `category` ("Processadores", "Placas de Vídeo", "Monitores") e `additionalProperty` "Cupom disponível: AEMEGA6". — [promocoes](https://www.hardwarebarato.com/produtos/promocoes)
- **Boletando**: a home é HTML do WordPress (tema Rehub), com 21 ocorrências de "R$". O post da oferta tem JSON-LD `Article` e `Product`, e o link da loja vem no HTML (`amazon.com.br/dp/B0HNXWDXYW?tag=bolm2-20`). — [home](https://boletando.com/); [post](https://boletando.com/monitor-lg-27-fhd-ips-144hz-nativo-1ms-mbr-nvidia-g-sync-amd-freesync-hdr10-99-srgb-27u411b-b/?oferta=272541)
- **Promotop**: a listagem `/ofertas/` é HTML do WordPress, com 212 ocorrências de "R$" e links diretos `meli.la/...` e `link.amazon/...`. — [promotop.net/ofertas](https://promotop.net/ofertas/)
- **Canaltech Ofertas**: Next.js App Router (payload `__next_f`, sem `__NEXT_DATA__`), mas os cards vêm no HTML. Um card mostra: título "Monitor Gamer AOC AGON G4S, 25", 310 Hz..." | "PIX" | "a partir de R$ 989,10 no Pix" | "Amazon" | "26m". A página da oferta tem JSON-LD `Product`, com `offers: []`. — [listagem](https://ofertas.canaltech.com.br/); [oferta](https://ofertas.canaltech.com.br/parcelado-monitor-gamer-aoc-agon-g4s-25-310hz-0-3ms-hdr10-painel-ips-base-ajustavel-25g4s-p-resgate-o-cupom/)
- **Ofertas Adrenaline**: HTML com classes `product-item-name` e `price` ("Cadeira de Escritório Dr. Office Work Pro", "R$ 429,99") e link `curt.link/uhTeb`. — [ofertas.adrenaline.com.br](https://ofertas.adrenaline.com.br/)
- **Zoom / Buscapé**: o `__NEXT_DATA__` só traz `pageProps: {canonical}`, mas o HTML tem os cards `DealOfferCard_*` com nome, preço e "Menor preço via <loja>". — [zoom/ofertas](https://www.zoom.com.br/ofertas)
- **Tecnoblog, Hardware.com.br, Olhar Digital, TudoCelular**: os feeds RSS trazem o corpo do post com preços. O feed hardware-indica tem 76 "R$" em 50 itens, o do Tecnoblog 231 e o do TudoCelular 57. — [tecnoblog feed](https://tecnoblog.net/feed/); [hardware-indica feed](https://www.hardware.com.br/hardware-indica/feed/); [tudocelular feed](https://www.tudocelular.com/feed/)
- **Ofertas Gamer**: Next.js App Router com 13 blocos `self.__next_f` e nenhuma ocorrência de "R$", "preco" ou "price" no HTML. É client-side. — [ofertasgamer.com.br](https://www.ofertasgamer.com.br/); [mais-curtidos](https://www.ofertasgamer.com.br/mais-curtidos)
- **Cuponomia**: as páginas de loja são server-rendered (40 "R$" na da KaBuM!), mas o HTML não tem atributos `data-code` ou `data-coupon`. O código aparece via `/out/<id>?cashbackHash=...#cadastro-pedagio`, que o robots proíbe. — [kabum](https://www.cuponomia.com.br/desconto/kabum)
- **Méliuz**: `/cupom` é server-rendered, com 135 links `/desconto/...` (páginas de loja). — [meliuz.com.br/cupom](https://www.meliuz.com.br/cupom)

### Inferences
- A Pechinchou cabe no parser existente com pouco trabalho. Ela já entrega o preço em reais decimais ("34.99", que vira centavos multiplicando por 100), a loja, o frete e a URL da loja, sem precisar de IA.
- Nerd Ofertas e Hardware Barato também dão para ler sem IA via JSON-LD, mas é preciso validar o preço contra o título, por causa do bug "2.28" da Nerd Ofertas.
- Nenhuma dessas fontes mostra parcelamento ou juros de forma estruturada. O Canaltech mostra "PIX" e "parcelado" no slug ou título, como "parcelado-monitor-gamer...". O total no cartão continua dependendo da verificação na loja.

### Gaps
- Não testei a paginação, como `/page/2/` ou a API do admin2 da Pechinchou.

## 5. Cloudflare challenge / anti-bot contra cliente HTTP simples

### Takeaway
Nenhuma fonte nova mostrou desafio Cloudflare para curl com UA genérico. Pechinchou, Boletando, Nerd Ofertas, Promotop, Hardware Barato, Tecnoblog, Adrenaline e Hardware.com.br estão atrás da Cloudflare, mas responderam 200 com conteúdo completo. A exceção é a TudoCelular: `/ofertas/` devolveu 429 com uma página "Verify" duas vezes, enquanto o feed respondia 200.

### Cited Findings
- Respostas 200 com conteúdo completo e `Server: cloudflare`, na primeira requisição: Pechinchou (306 KB), Boletando (226 KB), Nerd Ofertas (`/ofertas` 153 KB), Promotop (`/ofertas/` 641 KB), Hardware Barato (290 KB), Tecnoblog (`/achados/` 199 KB), Hardware.com.br, Olhar Digital e Clube do Hardware. Nenhuma tinha header `cf-mitigated`. A única marca era `challenge-platform`, o script passivo da Cloudflare, sem bloqueio. — [pechinchou](https://www.pechinchou.com.br/); [boletando](https://boletando.com/); [nerdofertas](https://nerdofertas.com/ofertas); [promotop](https://promotop.net/ofertas/); [hardwarebarato](https://www.hardwarebarato.com/produtos/promocoes)
- **TudoCelular**: `GET /ofertas/` deu `HTTP/1.1 429 Too Many Requests`, `Retry-After: 0`, `Server: Varnish` e título "TudoCelular.com - Verify". Repeti minutos depois e veio 429 de novo. A home e o `/feed/` responderam 200. — [tudocelular.com/ofertas/](https://www.tudocelular.com/ofertas/)
- **Canaltech Ofertas** e **Méliuz** responderam sem header `Server` de CDN conhecido. **Zoom/Buscapé** usam `openresty`, e o **Estadão** `openresty`/`azion`. Todos deram 200. — [ofertas.canaltech.com.br](https://ofertas.canaltech.com.br/); [estadao.com.br/tecmundo/](https://www.estadao.com.br/tecmundo/guia-de-compras/)
- **Cuponomia**: o robots.txt cita `/antirobot/answer` e `/desafio`, sinal de que existe um sistema anti-robô próprio. Mesmo assim, a página `/desconto/kabum` deu 200. — [robots.txt](https://www.cuponomia.com.br/robots.txt)
- **Reddit**: o acesso anônimo aos endpoints `.json` foi desligado em meados de 2026 e devolve 403 para requisições não autenticadas. Os feeds RSS anônimos acabam em 13/11/2026, segundo anúncio de 30/09/2026. O acesso à Data API pública começa a fechar para apps não registrados em 12/01/2027 e fecha de vez em março de 2027. A fonte é secundária: o PPC Land cita posts do r/modnews e r/redditdev sem link direto. — [PPC Land](https://ppc.land/reddit-to-halt-public-data-api-access-in-march-2027-as-14-000-apps-register/); [DEV Community](https://dev.to/tonywangca/why-reddit-blocked-unauthenticated-json-in-2026-and-how-to-still-get-reddit-data-58b9)

### Inferences
- Para curl com UA genérico, o risco anti-bot nas fontes novas é baixo hoje. Mas a Cloudflare pode tratar `GarimpoBot/0.1` de outro jeito, e no pico do 11.11 ou da Black Friday as regras costumam endurecer. A pausa automática do app em 429/403/503 cobre isso.
- A TudoCelular parece ter limite agressivo por caminho. Se entrar, deve ser só pelo `/feed/`.

### Gaps
- Não testei com o User-Agent real do app (`GarimpoBot/0.1 ...`). É recomendável que o próprio app faça um teste único por fonte antes de ligar.
- Não confirmei o 403 do Reddit diretamente, porque o robots.txt proíbe o acesso.

## 6. Cada post dá o link da loja direto ou só por redirecionador (e o redirecionador é proibido)?

### Takeaway
Dão link direto da loja (com tag de afiliado) no HTML ou JSON-LD, sem passar por redirecionador proibido: Pechinchou, Boletando, Promotop, Nerd Ofertas (no JSON-LD da oferta), Hardware Barato (no JSON-LD), Hardware.com.br e Olhar Digital. Dependem de redirecionador: Tecnoblog (`tecno.click`, proibido), Zoom/Buscapé (`/lead`, proibido), Canaltech Ofertas (`canalte.ch/op2/...`, permitido) e Ofertas Adrenaline (`curt.link`, permitido).

### Cited Findings
- **Pechinchou**: `long_url` e `short_url` já são da loja, como `https://www.amazon.com.br/dp/B07XLB46NH?tag=parceiropechi-20`. No Magalu, a URL é `https://www.influenciadormagalu.com.br/dopechinchou/...`, uma vitrine de influenciador do Magalu, não o domínio da loja. Das 20 ofertas da home, 17 eram Amazon, 2 Magazine Luiza e 1 Mercado Livre. — [pechinchou.com.br](https://www.pechinchou.com.br/)
- **Boletando**: o post traz `https://www.amazon.com.br/dp/B0HNXWDXYW?tag=bolm2-20` no HTML. — [post](https://boletando.com/monitor-lg-27-fhd-ips-144hz-nativo-1ms-mbr-nvidia-g-sync-amd-freesync-hdr10-99-srgb-27u411b-b/?oferta=272541)
- **Promotop**: os links externos da listagem são `https://meli.la/2mTXT7m`, `https://link.amazon/B0cyuawqh` etc. São shorteners oficiais do Mercado Livre e da Amazon. — [promotop.net/ofertas](https://promotop.net/ofertas/)
- **Nerd Ofertas**: a página da oferta tem links `https://mercadolivre.com/sec/1gt4QNF` e `https://link.amazon/B0eJSljRx`, e o JSON-LD `offers.url` aponta para `meli.la`. O redirecionador interno `/o/` é proibido. — [oferta](https://nerdofertas.com/oferta/15953/smart-tv-tcl-55-qd-mini-led-4k-c6k-google-tv-144hz-r-2-279); [robots.txt](https://nerdofertas.com/robots.txt)
- **Hardware Barato**: `offers.url` traz shorteners de afiliado. Entre as 11 ofertas, 5 eram `s.click.aliexpress.com`, 4 `s.shopee.com.br`, 1 `meli.la` e 1 `www.amazon.com.br`. O `/l/` interno é proibido. — [promocoes](https://www.hardwarebarato.com/produtos/promocoes); [robots.txt](https://hardwarebarato.com/robots.txt)
- **Tecnoblog Achados**: os itens `/achados/` do feed têm 195 links `tecno.click`. O robots.txt do tecno.click é "Disallow: /", e o Tecnoblog também proíbe `/ml/`, `/amz/` e `/loja/`. — [tecnoblog feed](https://tecnoblog.net/feed/); [tecno.click robots](https://tecno.click/robots.txt)
- **Hardware.com.br**: o feed hardware-indica tem 78 links `amzn.to`, 89 `link.amazon` e 34 `www.amazon.com.br`. O robots.txt do `amzn.to` (Bitly) libera tudo. — [feed](https://www.hardware.com.br/hardware-indica/feed/); [amzn.to robots](https://amzn.to/robots.txt)
- **Olhar Digital**: links diretos `https://www.amazon.com.br/dp/...?tag=olharofertas-20`, 29 deles no `/reviews/feed/`. — [reviews/feed](https://olhardigital.com.br/reviews/feed/); [home](https://olhardigital.com.br/)
- **Canaltech Ofertas**: o botão "Ir para a loja" leva a `https://canalte.ch/op2/6bl9`, cujo robots só proíbe `/api/`. O domínio principal proíbe `/deeplink/`. — [oferta](https://ofertas.canaltech.com.br/parcelado-monitor-gamer-aoc-agon-g4s-25-310hz-0-3ms-hdr10-painel-ips-base-ajustavel-25g4s-p-resgate-o-cupom/); [canalte.ch robots](https://canalte.ch/robots.txt)
- **Ofertas Adrenaline**: links `https://curt.link/uhTeb` (7 na home) e `https://s.shopee.com.br/...` (7). — [ofertas.adrenaline.com.br](https://ofertas.adrenaline.com.br/); [curt.link robots](https://curt.link/robots.txt)
- **Zoom/Buscapé**: o botão vai para `/lead?oid=1447408574&channel=25`, proibido por "Disallow: /lead*". O card mostra a loja ("Menor preço via Amazon"), mas não o link. — [zoom/ofertas](https://www.zoom.com.br/ofertas); [robots.txt](https://www.zoom.com.br/robots.txt)
- **Cuponomia / Méliuz**: os links para a loja passam por `/out/` (Cuponomia) e `/rastreia/` (Méliuz), ambos proibidos. — [cuponomia robots](https://www.cuponomia.com.br/robots.txt); [meliuz robots](https://www.meliuz.com.br/robots.txt)

### Inferences
- O `config/stores.ts` do Garimpo precisa reconhecer os shorteners oficiais das lojas (`meli.la`, `mercadolivre.com/sec`, `link.amazon`, `amzn.to`, `s.shopee.com.br`, `s.click.aliexpress.com`). O mesmo vale para domínios de vitrine como `influenciadormagalu.com.br`. Sem isso, o app trata essas ofertas como "domínio suspeito". Também é preciso decidir se o app segue o redirect do shortener (amzn.to permite; o robots do meli.la e do s.shopee não é um robots.txt válido).
- As ofertas do Tecnoblog Achados e do Zoom/Buscapé só servem como sinal (produto e preço). O app teria de casar com uma oferta de outra fonte ou buscar a loja por conta própria.

### Gaps
- Não segui nenhum redirect até a loja para confirmar o destino final, para não gerar cliques de afiliado.

## 7. Volume (posts/dia) e foco em tecnologia/hardware

### Takeaway
As de maior volume são Pechinchou (cerca de 20 ofertas em 17 min no 11.11, todas as categorias) e Nerd Ofertas (cerca de 46 IDs em menos de 1 h, todas as categorias). Têm mais foco em tech e hardware: Hardware Barato (GPU, CPU, SSD, monitor, volume baixo), Hardware.com.br Hardware Indica (3 a 6 por dia), Tecnoblog Achados (cerca de 12 por dia, celulares e eletrônicos), Canaltech Ofertas (dezenas de cards, eletrônicos) e Ofertas Adrenaline (20 cards, hardware e eletrônicos).

### Cited Findings
- **Pechinchou** `/recentes`: 20 ofertas criadas entre 17:51 e 18:08 de 11/11/2026. A home "relevant" ia de 10/11 11:52 a 11/11 17:48. Tem categorias "informática", "eletrônicos", "telefonia" e "televisão", e a `/categorias/informatica` mostrava placa-mãe ASRock B650M, SSD Pcyes NVMe e placa-mãe Gigabyte B650M, entre 17:40 e 18:02. — [/recentes](https://www.pechinchou.com.br/recentes); [/categorias/informatica](https://www.pechinchou.com.br/categorias/informatica)
- **Nerd Ofertas**: a listagem tinha os IDs 15960–16006 (21–23 itens visíveis), marcados "há 36–43 min". Mistura categorias, como sabonete Johnson's e Smart TV TCL. — [nerdofertas.com/ofertas](https://nerdofertas.com/ofertas)
- **Boletando**: a home mostrava 12 IDs distintos entre 272522 e 272551, entre eles monitores LG UltraGear 24"/27" 144 Hz, mouse Logitech Lift, notebooks e soundbar. Mistura tech com cupons do Mercado Livre. — [boletando.com](https://boletando.com/)
- **Hardware Barato**: 11 produtos em JSON-LD, nas categorias Processadores (5), Outras ofertas, SSD (3), Placas de Vídeo (2) e Monitores (1). — [promocoes](https://www.hardwarebarato.com/produtos/promocoes)
- **Hardware.com.br Hardware Indica**: por dia, foram 3, 6, 5, 6, 6, 3, 3, 6, 6 e 6 posts, de 02/11 a 11/11/2026. Quase tudo Amazon e eletrônicos de consumo (Apple Watch, JBL, Fire TV, Kindle). — [feed](https://www.hardware.com.br/hardware-indica/feed/)
- **Tecnoblog**: 26 posts `/achados/` em cerca de 51 h (09/11 17:19 a 11/11 20:34 UTC), quase todos de celulares e tablets Samsung e Apple. — [feed](https://tecnoblog.net/feed/)
- **Canaltech Ofertas**: a home tinha 52 links de oferta (slugs), incluindo monitor AOC AGON, roteador Huawei, notebook ASUS e PS5. — [ofertas.canaltech.com.br](https://ofertas.canaltech.com.br/)
- **Ofertas Adrenaline/Mundo Conectado**: 20 cards, com categorias como TV, processador e cadeira. — [ofertas.adrenaline.com.br](https://ofertas.adrenaline.com.br/)
- **Olhar Digital** `/reviews/feed/`: 10 posts de seleção em cerca de 3 h no 11.11 (smartwatches, jogos Xbox/PS5, impressoras, roteadores Wi-Fi, tablets). — [reviews/feed](https://olhardigital.com.br/reviews/feed/)
- **TudoCelular**: entre os 20 itens do feed, cerca de metade são ofertas de celular, TV e tablet. — [feed](https://www.tudocelular.com/feed/)
- **Promotop**: 10 itens no feed de 11/11 (o mais recente às 19:58 UTC). Todas as categorias, incluindo "móveis e decoração". — [feed](https://promotop.net/feed/); [busca web](https://promotop.net/moveis-e-decoracao/)

### Inferences
- Pechinchou deve ter centenas de ofertas por dia (cerca de 20 em 17 min no pico do 11.11; o número fora do pico não foi medido). Com leitura a cada 10 min, a página 1 de `/recentes` pode não cobrir tudo no pico. Ler também `/categorias/informatica` aumenta a cobertura de tech.
- Para o foco do usuário (periféricos), as fontes com mais sinal por requisição parecem ser Hardware Barato, Ofertas Adrenaline, Canaltech Ofertas e Pechinchou `/categorias/informatica`. Tecnoblog e Hardware.com.br têm muito celular e Amazon.

### Gaps
- Não medi o volume fora do 11.11. Tudo acima é uma foto de 11/11/2026 à tarde.
- Não confirmei o volume diário de Boletando e Canaltech Ofertas, porque os cards não trazem data absoluta.

## 8. Rótulo de viabilidade por fonte

### Takeaway
Dá hoje com HTTP simples, em ordem de valor para o Garimpo:
1. Pechinchou
2. Hardware Barato
3. Canaltech Ofertas
4. Ofertas Adrenaline/Mundo Conectado
5. Nerd Ofertas
6. Boletando
7. Promotop (só a listagem HTML)
8. Hardware.com.br (RSS)
9. Tecnoblog Achados (RSS, sem link de loja)
10. Olhar Digital (RSS)
11. TecMundo/Estadão
12. Zoom/Buscapé (sem link de loja)

Ofertas Gamer precisa de navegador. Reddit e a listagem `/ofertas/` da TudoCelular estão bloqueados. Méliuz e Cuponomia não servem para ofertas, porque o código e o link ficam atrás de caminhos proibidos. Promoforum, ofertas.top, Clube do Hardware e Guia do PC não são fontes de ofertas.

### Cited Findings (tabela-resumo; as evidências estão nas seções 1–7)

| Fonte | Listagem / feed a usar | Formato | Link da loja | Rótulo |
|---|---|---|---|---|
| Pechinchou | [/recentes](https://www.pechinchou.com.br/recentes), [/categorias/informatica](https://www.pechinchou.com.br/categorias/informatica) | `__NEXT_DATA__` estruturado | direto (Amazon com tag, influenciadormagalu) | dá hoje com HTTP simples |
| Hardware Barato | [/produtos/promocoes](https://www.hardwarebarato.com/produtos/promocoes) | JSON-LD Product com cupom | shorteners oficiais (AliExpress, Shopee, ML) | dá hoje com HTTP simples |
| Canaltech Ofertas | [ofertas.canaltech.com.br](https://ofertas.canaltech.com.br/) | HTML cards; JSON-LD sem offers | canalte.ch/op2 (permitido) | dá hoje com HTTP simples |
| Ofertas Adrenaline/Mundo Conectado | [ofertas.adrenaline.com.br](https://ofertas.adrenaline.com.br/) | HTML cards | curt.link e s.shopee (permitidos) | dá hoje com HTTP simples |
| Nerd Ofertas | [/ofertas](https://nerdofertas.com/ofertas) e a página da oferta | ItemList e Product JSON-LD (preço às vezes errado) | direto na página da oferta; /o/ proibido | dá hoje com HTTP simples (2 requisições por oferta) |
| Boletando | [home](https://boletando.com/) e o post | HTML e JSON-LD Product; sem feed | direto (Amazon com tag) | dá hoje com HTTP simples |
| Promotop | [/ofertas/](https://promotop.net/ofertas/) | HTML WordPress; feed proibido | meli.la e link.amazon | dá hoje com HTTP simples (só HTML) |
| Hardware.com.br | [hardware-indica/feed/](https://www.hardware.com.br/hardware-indica/feed/) | RSS | amzn.to e link.amazon | dá hoje com HTTP simples |
| Tecnoblog Achados | [tecnoblog.net/feed/](https://tecnoblog.net/feed/) filtrando `/achados/` | RSS | tecno.click (proibido) | dá hoje com HTTP simples, mas sem link de loja |
| Olhar Digital | [reviews/feed/](https://olhardigital.com.br/reviews/feed/) | RSS (posts de seleção) | Amazon direto com tag | dá hoje com HTTP simples |
| TecMundo (Estadão) | [guia-de-compras](https://www.estadao.com.br/tecmundo/guia-de-compras/), [RSS](https://www.estadao.com.br/arc/outboundfeeds/feeds/rss/sections/tecmundo/) | HTML e RSS (muitas páginas de cupom) | não verificado | dá hoje com HTTP simples (pouco valor) |
| TudoCelular | [/feed/](https://www.tudocelular.com/feed/) | RSS misto | não verificado | feed: dá; `/ofertas/`: bloqueado por anti-bot (429 Verify) |
| Zoom / Buscapé | [zoom/ofertas](https://www.zoom.com.br/ofertas), [buscape/ofertas](https://www.buscape.com.br/ofertas) | HTML cards | /lead (proibido) | dá com HTTP simples, mas só como sinal de preço |
| Méliuz / Cuponomia | [/cupom](https://www.meliuz.com.br/cupom), [/desconto/kabum](https://www.cuponomia.com.br/desconto/kabum) | HTML | /rastreia e /out (proibidos); código não aparece no HTML da Cuponomia | bloqueado por robots (no que importa) |
| Ofertas Gamer | [ofertasgamer.com.br](https://www.ofertasgamer.com.br/) | só JS | não verificado | precisa de navegador/JS |
| Reddit (r/hardwarebrasil etc.) | não se aplica | não se aplica | não se aplica | bloqueado por robots/anti-bot ([robots](https://www.reddit.com/robots.txt), [PPC Land](https://ppc.land/reddit-to-halt-public-data-api-access-in-march-2027-as-14-000-apps-register/)) |
| Comunidade Tecnoblog | [c/achados/20.json](https://tecnoblog.net/comunidade/c/achados/20.json) | JSON Discourse | não se aplica | inativa desde 2025 |
| Promoforum / ofertas.top / Clube do Hardware / Guia do PC | não se aplica | não se aplica | não se aplica | não é fonte de ofertas ou não existe |
| Melhores caminhos para as já usadas | Promobit [/promocoes/selecao/doubleeleven/](https://www.promobit.com.br/robots.txt) (liberado de propósito); Gatry `/v1/` (liberado no [robots](https://gatry.com/robots.txt)); Pelando, Promobit, Gatry e Hardmob sem RSS utilizável ([hardmob robots](https://www.hardmob.com.br/robots.txt)) | não se aplica | não se aplica | não se aplica |

- Canais do Telegram que estes sites divulgam e que o papel `listen` (GramJS) poderia seguir, sem raspar a web:
  - `t.me/ofertasmundoconectado` ([linkmc.click/ofertas](https://www.mundoconectado.com.br/ofertas))
  - `t.me/Hardware_barato` ([hardwarebarato](https://www.hardwarebarato.com/produtos/promocoes))
  - `t.me/promotop` ([promotop](https://promotop.net/ofertas/))
  - o Telegram da Nerd Ofertas, via `ofertou.ai/e/nerd-ofertas-tg` ([nerdofertas](https://nerdofertas.com/))
  - os links `t.me` dos posts do Tecnoblog Achados ([feed](https://tecnoblog.net/feed/))
  - o Telegram do CT Ofertas ([ofertas.canaltech.com.br](https://ofertas.canaltech.com.br/))

### Inferences
- Pelo plano de hoje (só leitura com o app aberto, a cada cerca de 10 min), o menor esforço com mais ganho seria: Pechinchou `/recentes` mais `/categorias/informatica` (o `__NEXT_DATA__` dispensa IA), Hardware Barato (JSON-LD), Canaltech Ofertas e Ofertas Adrenaline (HTML com preço e loja) e o RSS do Hardware.com.br.
- Seguir pelo Telegram os canais oficiais dessas mesmas fontes evita raspar a web de vez, e o app já tem o papel `listen`.

### Gaps
- Não testei nenhuma fonte com o UA `GarimpoBot/0.1`.
- Não verifiquei a fundo os termos de uso de cada site, só o robots.txt e os Content-Signals.
- Não confirmei a reputação e a confiabilidade de Nerd Ofertas, Promotop e Hardware Barato (sites de afiliado, possivelmente automáticos).
