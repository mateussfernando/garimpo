# Lojas brasileiras: páginas de ofertas, categorias de periféricos e APIs públicas (leitura educada por HTTP simples, novembro de 2026)

Método: em 11/11/2026, perto de 21h (horário de Brasília), cada robots.txt e cada página foi baixado uma vez com `curl`. O User-Agent foi o fixo do app (`GarimpoBot/0.1 (app pessoal de ofertas; coleta educada)`, de `worker/http/polite.ts`). Não houve login, cookie, proxy nem troca de UA. Os pedidos foram feitos em rodízio, então cada domínio recebeu no máximo 1 pedido a cada ~7 s e no máximo 4 pedidos no total. Toda linha "verificado direto" abaixo vem desse teste. A fonte é a própria URL testada.

## 1. URLs exatas das listagens de ofertas e das categorias de periféricos

### Takeaway
As URLs abaixo responderam com produtos no HTML ou no JSON: KaBuM! (só algumas categorias), Amazon (/deals cai em /blackfriday, mais a busca /s?k=), Carrefour (/categoria/informatica e /colecao/{id}), Americanas (/computadores-e-informatica), Waz (/perifericos), Kalunga (/busca/{termo}/1 e /depto/informatica/2), Logitech Store, Patoloco e Dell (/pt-br/shop/deals). Em Waz, Fast Shop e Americanas, a API pública de catálogo da VTEX (`/api/catalog_system/pub/products/search`) devolve JSON com preço e parcelas.

### Cited Findings
**KaBuM!**
- `https://www.kabum.com.br/ofertas/ofertadodia` redireciona para `/ofertas/ofertasdodia`. A página traz `__NEXT_DATA__`, mas `dataOfferServer.data` vem vazio (`"data": []`, `"amount": 0`). Os produtos das ofertas são carregados no navegador. Verificado direto: [kabum.com.br/ofertas/ofertasdodia](https://www.kabum.com.br/ofertas/ofertasdodia)
- `https://www.kabum.com.br/ofertas/blackfriday` também volta com HTML de ~13 KB e nenhum preço. Verificado direto: [kabum.com.br/ofertas/blackfriday](https://www.kabum.com.br/ofertas/blackfriday)
- A home de ofertas aponta para outra campanha, `/ofertas/agoraoununca`, que não foi testada. Verificado direto: [kabum.com.br/ofertas/ofertasdodia](https://www.kabum.com.br/ofertas/ofertasdodia)
- `/perifericos/mouse` e `/perifericos/headset` continuam sem produtos no HTML. O `pageProps.data` só traz os parâmetros da busca que o navegador vai fazer (`page_size: 60`, `sort: most_searched`, `payload_data: products_all_filters`). Verificado direto: [kabum.com.br/perifericos/mouse](https://www.kabum.com.br/perifericos/mouse), [kabum.com.br/perifericos/headset](https://www.kabum.com.br/perifericos/headset)
- MUDOU desde a última checagem: `/hardware/ssd-2-5` agora vem com 60 produtos em `__NEXT_DATA__` (`catalogServer.data`), `totalItemsCount` 989 em 17 páginas. A raiz `/hardware` também vem com produtos (`priceWithDiscount` presente). Verificado direto: [kabum.com.br/hardware/ssd-2-5](https://www.kabum.com.br/hardware/ssd-2-5), [kabum.com.br/hardware](https://www.kabum.com.br/hardware)

**Amazon.com.br**
- `https://www.amazon.com.br/deals` responde 302 com `Location: /blackfriday`. `/gp/goldbox` também termina em `/blackfriday`, que é a página "Black Friday 2026 | Amazon.com.br". Verificado direto: [amazon.com.br/deals](https://www.amazon.com.br/deals), [amazon.com.br/gp/goldbox](https://www.amazon.com.br/gp/goldbox)
- Para periféricos, a busca `https://www.amazon.com.br/s?k=mouse+sem+fio` traz 48 resultados com `data-asin`. Verificado direto: [amazon.com.br/s?k=mouse+sem+fio](https://www.amazon.com.br/s?k=mouse+sem+fio)

**Carrefour**
- A home tem links para `/categoria/informatica`, `/wl/black-friday` e coleções VTEX de 11.11, como `/colecao/29819?map=productClusterIds&order=OrderByTopSaleDESC` (rótulo interno "11.11_informatica_3p") e `/colecao/29447?...` ("11.11_ofertas_1p"). Também há uma coleção de informática "esquenta-black", `/colecao/29847?...order=OrderByBestDiscountDESC`. Verificado direto: [carrefour.com.br](https://www.carrefour.com.br/)
- `https://www.carrefour.com.br/categoria/informatica` traz 13 cards de produto renderizados no servidor, com links `/produto/...`. Verificado direto: [carrefour.com.br/categoria/informatica](https://www.carrefour.com.br/categoria/informatica)

**Americanas**
- A home tem links para `/especial/black-friday`, `/computadores-e-informatica` e `/especial/cliente-a/cartao-de-credito/ofertas`. Verificado direto: [americanas.com.br](https://www.americanas.com.br/)
- `/computadores-e-informatica` traz produtos em `__NEXT_DATA__` (~624 KB). `/especial/black-friday` quase não tem preços no HTML: 4 ocorrências de "R$". Verificado direto: [americanas.com.br/computadores-e-informatica](https://www.americanas.com.br/computadores-e-informatica), [americanas.com.br/especial/black-friday](https://www.americanas.com.br/especial/black-friday)

**Waz**
- `https://www.waz.com.br/perifericos` traz um JSON-LD `ItemList` com 12 itens. Verificado direto: [waz.com.br/perifericos](https://www.waz.com.br/perifericos)
- A API `https://www.waz.com.br/api/catalog_system/pub/products/search?ft=mouse&_from=0&_to=1` responde 206. O cabeçalho `resources: 0-1/1573` indica 1.573 resultados para "mouse". Verificado direto: [waz.com.br API](https://www.waz.com.br/api/catalog_system/pub/products/search?ft=mouse&_from=0&_to=1)

**Fast Shop**
- `www.fastshop.com.br` redireciona para `https://site.fastshop.com.br/`, que é Next.js com VTEX. A prateleira "Ofertas Imperdíveis | Até 10x sem juros" é configurada como `productClusterIds` 550 e é carregada no navegador. Verificado direto: [site.fastshop.com.br](https://site.fastshop.com.br/)
- A API `https://site.fastshop.com.br/api/catalog_system/pub/products/search?ft=mouse&_from=0&_to=1` responde 206 com JSON. Verificado direto: [site.fastshop.com.br API](https://site.fastshop.com.br/api/catalog_system/pub/products/search?ft=mouse&_from=0&_to=1)

**Kalunga**
- `https://www.kalunga.com.br/busca/mouse/1` traz 60 links `/prod/...` e `results_count: 356`. `https://www.kalunga.com.br/depto/informatica/2` também é renderizado no servidor. Verificado direto: [kalunga.com.br/busca/mouse/1](https://www.kalunga.com.br/busca/mouse/1), [kalunga.com.br/depto/informatica/2](https://www.kalunga.com.br/depto/informatica/2)

**Logitech Store BR**
- A home `https://www.logitechstore.com.br/` (Magento) tem 32 blocos `product-item-info`. As categorias são `/gaming`, `/dia-a-dia`, `/acessorios`, `/astro`, `/bluemic`, `/kits-especiais` e `/caixas-de-som`, e a campanha fica em `/campanhas/blackfriday`. Verificado direto: [logitechstore.com.br](https://www.logitechstore.com.br/)

**Patoloco**
- `https://patoloco.com.br/` (o www redireciona para cá) se apresenta como "O melhor da Informática Gamer". A home tem 68 blocos `price-new`/`price-old`. Verificado direto: [patoloco.com.br](https://patoloco.com.br/)

**Dell**
- `https://www.dell.com/pt-br/shop/deals` redireciona para `/pt-br/shop/deals/dc` ("Melhores Ofertas: Notebooks, PCs e Acessórios"). A página tem 31 links `/apd/` de acessórios e preços como "R$ 619,01". Verificado direto: [dell.com/pt-br/shop/deals/dc](https://www.dell.com/pt-br/shop/deals/dc)

**Mercado Livre**
- `https://www.mercadolivre.com.br/ofertas`, `/ofertas/ofertas-do-dia` e `https://lista.mercadolivre.com.br/mouse-gamer` redirecionam todas para `/gz/account-verification?go=...`, ou seja, verificação de conta. Verificado direto: [mercadolivre.com.br/ofertas](https://www.mercadolivre.com.br/ofertas)

**Shopee**
- `https://shopee.com.br/flash_sale` responde 200, mas é um shell de JS de ~200 KB sem nenhum "R$". Verificado direto: [shopee.com.br/flash_sale](https://shopee.com.br/flash_sale)

### Inferences
- Nas lojas VTEX (Waz, Fast Shop, Americanas e, na arquitetura, Carrefour), a API `catalog_system/pub` substitui a página de categoria com vantagem. Ela aceita busca por termo (`ft=`) e paginação por `_from`/`_to`.
- Na KaBuM!, vale testar categoria por categoria. A mesma loja entrega SSD e Hardware prontos e Mouse e Headset vazios. Pode haver outras categorias que hoje vêm renderizadas.

### Gaps
- Não testei URLs de categoria de periféricos da Logitech Store (só a home), da Patoloco (só a home) e da Dell (só a página de deals).
- Não descobri a URL de "ofertas do dia" de Magalu, Casas Bahia, Terabyte e Pichau por teste, porque o bloqueio vem antes. Os caminhos `/selecao/ofertasdodia/` (Magalu) e `/promocoes` (Terabyte) foram tentados e deram 403.
- Não achei site para "Studio Gamer". `www.studiogamer.com.br` não respondeu, e a busca na web pelo nome só trouxe Pichau, Terabyte, KaBuM! e Razer, nenhuma loja chamada Studio Gamer.

## 2. Regras do robots.txt que valem para esses caminhos

### Takeaway
Pelo robots.txt, quase todos permitem as páginas de categoria para `User-agent: *`. O GarimpoBot cai nesse grupo, porque os bloqueios por nome atingem ClaudeBot, GPTBot e outros bots de IA. Há quatro exceções: o Mercado Livre proíbe `/ofertas?` (com query) e `/gz/`, e o `api.mercadolibre.com` proíbe tudo (`Disallow: /`); a Pichau proíbe qualquer URL com query (`/*?*`) e `/api/`; o Terabyte, a Magalu, a Casas Bahia, a Lenovo e a Mega Mamute nem entregam o robots.txt (403).

### Cited Findings
- **KaBuM!** (`User-agent: *`): `Disallow: /destaques`, `Disallow: /lancamentos`, `Disallow: /busca/*?`, `Disallow: *?query=*`, `Disallow: *sort=price`, `Disallow: *sort=-price`, `Disallow: *sort=most_searched`, `Disallow: /*ordem`. Não proíbe `/ofertas/` nem as categorias. Sem crawl-delay. Verificado direto: [kabum.com.br/robots.txt](https://www.kabum.com.br/robots.txt)
- **Pichau**: `Allow: /`, `Disallow: /api/`, `Disallow: /*?*`, `Disallow: /checkout`, `Disallow: /preview`. Sem crawl-delay. Verificado direto: [pichau.com.br/robots.txt](https://www.pichau.com.br/robots.txt)
- **Terabyte**: o próprio `/robots.txt` volta 403 com o desafio do Cloudflare ("Just a moment...", `Cf-Mitigated: challenge`). Verificado direto: [terabyteshop.com.br/robots.txt](https://www.terabyteshop.com.br/robots.txt)
- **Amazon.com.br** (`User-agent: *`): `Allow: /gp/goldbox`, `Allow: /s?`, `Allow: /s/`, `Allow: /*/dp/`, `Allow: /gp/product/`. Os bloqueios de `*` são `/gp/cart`, `/gp/flex`, `/-/`, `/gp/aw/shoppingAids/` e páginas de reviews/ranking. `/deals` e `/blackfriday` não aparecem, então não estão proibidos. Grupos com `Disallow: /`: EtaoSpider, GPTBot, CCBot, PerplexityBot, Google-Extended, ClaudeBot, Bytespider, Scrapy, Diffbot, entre outros. Verificado direto: [amazon.com.br/robots.txt](https://www.amazon.com.br/robots.txt)
- **Mercado Livre** (`User-agent: *`): `Disallow: /ofertas?`, `Disallow: /gz/`, `Disallow: /mais-vendidos/MLB`, `Disallow: /recommendations*`, `Disallow: /*.js`, `Disallow: /afiliados/item/`. ClaudeBot, Claude-User, GPTBot, ChatGPT-User, Amazonbot e PerplexityBot têm `Disallow: /`. O Bingbot tem `Crawl-delay: 5`. Verificado direto: [mercadolivre.com.br/robots.txt](https://www.mercadolivre.com.br/robots.txt)
- **lista.mercadolivre.com.br**: o mesmo bloqueio para bots de IA, mais vários filtros proibidos (`*_Discount_`, `/*_BestSellers_`, `/*_OrderId_`...). Verificado direto: [lista.mercadolivre.com.br/robots.txt](https://lista.mercadolivre.com.br/robots.txt)
- **api.mercadolibre.com**: `User-agent: *` com `Disallow: /`. Verificado direto: [api.mercadolibre.com/robots.txt](https://api.mercadolibre.com/robots.txt)
- **Magalu**: `/robots.txt` volta 403 do Akamai ("Não é possível acessar a página (Erro 403)", `X-SEC-TRIGGERED: 3990011`). Verificado direto: [magazineluiza.com.br/robots.txt](https://www.magazineluiza.com.br/robots.txt)
- **Casas Bahia**: `/robots.txt` volta 403 do Akamai ("Ops! Algo deu errado"). Verificado direto: [casasbahia.com.br/robots.txt](https://www.casasbahia.com.br/robots.txt)
- **Carrefour** (`User-agent: *`): `Allow: /`, `Disallow: /busca/`, `Disallow: /quick-view/*`, `Disallow: /espiar/*`, `Disallow: /checkout/*`. Não proíbe `/api/` nem `map=`. Verificado direto: [carrefour.com.br/robots.txt](https://www.carrefour.com.br/robots.txt)
- **Americanas** (`User-agent: *`): `Allow: /`, `Disallow: /*-cl/$`, `/carrinho/*`, `/checkout/*`, `/quick-view/*`, `/espiar/*`. Comentários no arquivo: "Allow AI search and agent use" (OAI-SearchBot, ChatGPT-User, PerplexityBot...) e "Disallow AI training data collection" (GPTBot, CCBot, Google-Extended). Não proíbe `/api/`. Verificado direto: [americanas.com.br/robots.txt](https://www.americanas.com.br/robots.txt)
- **Waz** (`User-agent:*`): `Disallow: /*map=*`, `/*productClusterIds*`, `/*?order=*`, `/*=OrderBy*`, `/*?PS=*`, `/busca?*`, `/*specificationFilter*`, `Allow:/`. Não proíbe `/api/`. Verificado direto: [waz.com.br/robots.txt](https://www.waz.com.br/robots.txt)
- **Fast Shop**: `www.fastshop.com.br/robots.txt` só proíbe `/web/checkout`. O host real, `site.fastshop.com.br/robots.txt`, proíbe `/busca/`, `/buscapagina/`, `/account/`, `/checkout/`, `/quick-view/` e `/espiar/`, e não proíbe `/api/`. Verificado direto: [fastshop.com.br/robots.txt](https://www.fastshop.com.br/robots.txt), [site.fastshop.com.br/robots.txt](https://site.fastshop.com.br/robots.txt)
- **Kalunga**: `Allow: /`. Os bloqueios são `/login`, `/carrinho`, `/cotacoes`, `/news`, `/anuncios`, `/buscaindisponivel` e outros. Busca e departamento estão liberados. Verificado direto: [kalunga.com.br/robots.txt](https://www.kalunga.com.br/robots.txt)
- **Logitech Store BR**: `Disallow: /catalogsearch/`, `/catalog/product/view/`, `/catalog/category/view/`, `/*?dir=desc`, `/*?limit=all`, `Allow: /`. Verificado direto: [logitechstore.com.br/robots.txt](https://www.logitechstore.com.br/robots.txt)
- **Logitech global** (`logitech.com`): proíbe `/api/`, `/content/`, `/*/cart` e `/*/checkout`. Verificado direto: [logitech.com/robots.txt](https://www.logitech.com/robots.txt)
- **Patoloco**: `Allow: /*`. Os bloqueios são `/admin`, `/ajax`, `/boleto`, `/cron`, `/includes`, `/integracao` e `/pagseguro`. Verificado direto: [patoloco.com.br/robots.txt](https://patoloco.com.br/robots.txt)
- **Gigantec**: `Disallow: /checkout/`, `/customer/`, `/search/`, `/catalogsearch/`, `/*?srsltid=`. Verificado direto: [gigantec.com.br/robots.txt](https://www.gigantec.com.br/robots.txt)
- **Dell** (`User-agent: *`, trecho pt-br): `Disallow: /pt-br/outlet/*?`, `Allow: /pt-br*/lp/`. O arquivo tem ~29 KB. Verificado direto: [dell.com/robots.txt](https://www.dell.com/robots.txt)
- **Lenovo**: `/robots.txt` volta 403 "Access Denied" do Akamai. Verificado direto: [lenovo.com/robots.txt](https://www.lenovo.com/robots.txt)
- **Shopee** (`User-Agent:*`): `Crawl-delay:1`, `Disallow: /cart/`, `/checkout/`, `/user/`, `/daily_discover/`, `/top_products`, `/search*searchPrefill`, `*utm_source=an_`. `/flash_sale` não aparece, então não está proibido. Verificado direto: [shopee.com.br/robots.txt](https://shopee.com.br/robots.txt)
- **AliExpress** (`pt.aliexpress.com`, `User-agent: *`): `Disallow: /items/*`, `/search/*`, `/product/*`, `/productdetail/*`, `/api/*`, `/i/api/*`, `/*store/sale-items/*`. `Allow: /wholesale.html$`, `Allow: /wholesale-page-*.html`. Verificado direto: [pt.aliexpress.com/robots.txt](https://pt.aliexpress.com/robots.txt)
- **Mega Mamute**: `/robots.txt` volta 403 com a página "Loja em manutenção" (Varnish, `X-Status-Code: 403`). Verificado direto: [megamamute.com.br/robots.txt](https://www.megamamute.com.br/robots.txt)

### Inferences
- O único crawl-delay explícito para `*` é o da Shopee (1 s). O ritmo do Garimpo, 5-10 s por domínio, já fica acima dele e do `Crawl-delay: 5` que o Mercado Livre pede ao Bingbot.
- Na Waz, a API VTEX pode ser usada com `ft=` ou `fq=C:` (categoria). Filtros com `productClusterIds`, `map=` ou `O=OrderBy...` casam com os Disallow do robots.txt e devem ficar de fora. Isso impede ordenar por "maior desconto" no servidor (`O=OrderByBestDiscountDESC`): a ordenação tem que ser feita no app.
- Pela regra "ler robots.txt" do próprio Garimpo, o `Disallow: /` do api.mercadolibre.com já tira a API do Mercado Livre do jogo, mesmo antes da questão do token.

### Gaps
- O robots.txt de Magalu, Casas Bahia, Terabyte e Lenovo não pôde ser lido. O GarimpoBot deve tratar isso como "não verificado / não ler", nunca como "liberado".

## 3. Os dados do produto (título, preço, "10x sem juros", imagem, URL) estão no HTML, no JSON-LD ou em JSON embutido?

### Takeaway
Os dados vêm completos sem JavaScript em: KaBuM! (só SSD e Hardware, via `__NEXT_DATA__`), Amazon (/blackfriday tem JSON embutido; a busca é HTML), API VTEX (Waz, Fast Shop, Americanas, com parcelas e juros por número de parcelas), Americanas (`__NEXT_DATA__` de categoria), Carrefour (HTML de categoria), Waz (JSON-LD `ItemList`/`AggregateOffer`), Kalunga (dataLayer GA4 + HTML), Logitech Store (`data-price-amount`), Patoloco (HTML) e Dell (HTML). Ficam só no JS: ofertas do dia e mouse/headset da KaBuM!, flash sale da Shopee e a prateleira de ofertas da Fast Shop (que a API VTEX cobre).

### Cited Findings
- **KaBuM! (SSD)**: cada item de `catalogServer.data` traz `code`, `name`, `friendlyName`, `sellerName`, `price` (182.34), `priceWithDiscount` (154.99, Pix), `oldPrice`, `maxInstallment` ("7x de R$ 26,04"), `discountPercentage`, `available`, `offer`, `thumbnail`, `stamps` e `flags`. Aparecem itens de marketplace de terceiros na listagem (ex.: `"sellerName":"Hadesinfo"`). O JSON-LD só tem `CollectionPage` e `FAQPage`, sem `Product`. Verificado direto: [kabum.com.br/hardware/ssd-2-5](https://www.kabum.com.br/hardware/ssd-2-5)
- **Amazon /blackfriday**: o JSON embutido traz, por oferta, `"price":{"priceToPay":{"label":"Preço da Oferta:","price":"3999.9"},"basisPrice":{"label":"De:","price":"4599.9"}}`, `dealBadge` ("13% off") e imagens `m.media-amazon.com`. São 51 `asin` únicos, 28 `dealBadge` e 123 links `/dp/` únicos. Não há texto de parcelas ("sem juros" aparece 0 vezes). Verificado direto: [amazon.com.br/blackfriday](https://www.amazon.com.br/blackfriday)
- **Amazon busca**: 48 cards `data-asin` com preço em `a-offscreen` ("R$ 55,90") e parcelas no texto ("em até 3x de R$ 20,31 sem juros"). Verificado direto: [amazon.com.br/s?k=mouse+sem+fio](https://www.amazon.com.br/s?k=mouse+sem+fio)
- **API VTEX (Waz)**: o JSON traz `productName`, `link`, `brand`, `items[].images[].imageUrl` e `items[].sellers[].commertialOffer` com `Price`, `ListPrice`, `PriceWithoutDiscount`, `AvailableQuantity` e `Installments[]` (`NumberOfInstallments`, `Value`, `InterestRate`, `TotalValuePlusInterestRate`). Exemplo: SpaceMouse a R$ 2.477,64 em 10x de 247,76 com `InterestRate` 0. Cabeçalho `X-VTEX-ApiCache-Time: 300`. Verificado direto: [waz.com.br API](https://www.waz.com.br/api/catalog_system/pub/products/search?ft=mouse&_from=0&_to=1)
- **API VTEX (Americanas)**: o mesmo formato. O primeiro resultado era de seller terceiro ("Loja iPlace"), com `Price` 29.0, `ListPrice` 31.9 e 12x de 2,71 com `InterestRate` 1.84 (com juros). Verificado direto: [americanas.com.br API](https://www.americanas.com.br/api/catalog_system/pub/products/search?ft=mouse&_from=0&_to=1)
- **API VTEX (Fast Shop)**: o mesmo formato. Exemplo: mouse WLMouse com `Price` 1381.91 e `ListPrice` 1869.0. Verificado direto: [site.fastshop.com.br API](https://site.fastshop.com.br/api/catalog_system/pub/products/search?ft=mouse&_from=0&_to=1)
- **Americanas categoria**: `__NEXT_DATA__` com `offers.lowPrice`, `listPrice`, `price` e `commertialOffer.Installments` (ex.: "American Express 3 vezes sem juros" com `InterestRate: 0`). "sem juros" aparece 630 vezes. Verificado direto: [americanas.com.br/computadores-e-informatica](https://www.americanas.com.br/computadores-e-informatica)
- **Carrefour categoria**: cards em HTML com "De: R$ 1.499,90" e "ou R$ 1.399,90 em 12x sem juros nos Cartões Carrefour". O link é `/produto/...` e não há JSON-LD. Verificado direto: [carrefour.com.br/categoria/informatica](https://www.carrefour.com.br/categoria/informatica)
- **Waz /perifericos**: JSON-LD `ItemList` com 12 `Product` e `offers` `AggregateOffer` (`lowPrice` 209.99, `highPrice` 247.05, `priceCurrency` BRL, `availability` InStock). Verificado direto: [waz.com.br/perifericos](https://www.waz.com.br/perifericos)
- **Kalunga busca**: o dataLayer GA4 `ecommerce.items` traz `item_id`, `item_name`, `item_brand` e `price` (ex.: 28.5). O HTML traz 60 links `/prod/`, imagem em `https://img.kalunga.com.br/fotosdeprodutos/{id}.jpg` e parcelas "3x de R$ 99,97". Não há JSON-LD. Verificado direto: [kalunga.com.br/busca/mouse/1](https://www.kalunga.com.br/busca/mouse/1)
- **Logitech Store**: blocos `product-item-info` com `data-price-amount="1599.9"` e texto "10x sem juros". Verificado direto: [logitechstore.com.br](https://www.logitechstore.com.br/)
- **Patoloco**: blocos `price-old`/`price-new` em HTML (ex.: placa RTX 5070 Ti com "de" R$ 10.140,00). Não há JSON-LD. Verificado direto: [patoloco.com.br](https://patoloco.com.br/)
- **Dell**: preços em HTML ("R$ 619,01", "R$ 539,00") e 31 links de acessório `/apd/`. Não há JSON-LD. Verificado direto: [dell.com/pt-br/shop/deals/dc](https://www.dell.com/pt-br/shop/deals/dc)
- **AliExpress home**: há preços em HTML ("R$580", "R$3.700") e 32 `productId`. Verificado direto: [pt.aliexpress.com](https://pt.aliexpress.com/)
- **Shopee /flash_sale**: nenhum preço no HTML. Verificado direto: [shopee.com.br/flash_sale](https://shopee.com.br/flash_sale)

### Inferences
- Na KaBuM!, `maxInstallment` (7 × 26,04 = 182,28) bate com `price` (182,34), e `priceWithDiscount` é o preço Pix. Isso confirma a nota de `worker/collect/vitrines.ts`: o "total no cartão" sai das parcelas. A listagem mistura sellers, então é preciso filtrar `sellerName == "KaBuM!"`, como o app já faz.
- A API VTEX é a fonte mais alinhada com a regra de preço do Garimpo. Para cada `PaymentSystemName` de cartão, basta pegar o maior `NumberOfInstallments` com `InterestRate == 0`; o total é `TotalValuePlusInterestRate`. O à vista é `Price`. O "de" é `ListPrice`.
- Na Americanas é preciso filtrar o seller, porque é marketplace. A própria resposta traz `sellerName`.
- No Carrefour, o "12x sem juros" vale "nos Cartões Carrefour". Não é parcela genérica de qualquer cartão, então a selagem precisa refletir isso.
- Na Amazon, a página de deals não traz parcelas. Para o "maior número de parcelas sem juros" seria preciso abrir o produto, ou cruzar com a busca, que mostra "em até 3x".

### Gaps
- Não confirmei se a página de deals/blackfriday da Amazon tem filtro por categoria de periféricos via URL. Não testei para não fazer mais pedidos.
- Não confirmei os limites da API VTEX (`_to - _from` máximo, que costuma ser 50) contra a documentação oficial da VTEX.
- Não identifiquei o sellerId da própria Americanas (1P) para o filtro.

## 4. Desafio Cloudflare/Akamai/PerimeterX para cliente HTTP simples

### Takeaway
Com o UA honesto do Garimpo, Pichau e Terabyte caem no desafio do Cloudflare. Magalu, Casas Bahia e Lenovo caem no 403 do Akamai, a Gigantec num desafio JS próprio e o Mercado Livre na verificação de conta. A API de busca do Carrefour deu 429 de cara. KaBuM!, Amazon (nesses 3 pedidos), Americanas, Waz, Fast Shop, Kalunga, Logitech Store, Patoloco, Dell, Shopee (shell) e AliExpress responderam 200.

### Cited Findings
- **Pichau**: `/perifericos/mouse` e `/` voltam 403 "Just a moment..." com `Cf-Mitigated: challenge`. O robots.txt foi entregue com 200. Verificado direto: [pichau.com.br/perifericos/mouse](https://www.pichau.com.br/perifericos/mouse)
- **Terabyte**: `/promocoes` e até o `/robots.txt` voltam 403 com `Cf-Mitigated: challenge`. Verificado direto: [terabyteshop.com.br/promocoes](https://www.terabyteshop.com.br/promocoes)
- **Magalu**: `/selecao/ofertasdodia/` volta 403 do Akamai com `X-SEC-TRIGGERED: 3990011`. Verificado direto: [magazineluiza.com.br/selecao/ofertasdodia/](https://www.magazineluiza.com.br/selecao/ofertasdodia/)
- **Casas Bahia**: a home volta 403 com "Reference ID" do Akamai. Verificado direto: [casasbahia.com.br](https://www.casasbahia.com.br/)
- **Lenovo**: `/br/pt/ofertas/` volta 403 com "Access Denied" do AkamaiGHost. Verificado direto: [lenovo.com/br/pt/ofertas/](https://www.lenovo.com/br/pt/ofertas/)
- **Gigantec**: a home volta 200, mas o corpo é "Verificação de Segurança ... Por favor, habilite JavaScript para acessar este site", com `challengeToken`. Verificado direto: [gigantec.com.br](https://www.gigantec.com.br/)
- **Mercado Livre**: as páginas redirecionam para `/gz/account-verification` (caminho proibido no próprio robots.txt). A API responde 403. Verificado direto: [mercadolivre.com.br/ofertas](https://www.mercadolivre.com.br/ofertas)
- **Carrefour**: `/api/catalog_system/pub/products/search` volta 403 do Cloudflare com corpo vazio. `/api/io/_v/api/intelligent-search/product_search/?query=mouse&count=2` volta 429 "Too Many Requests" sem `Retry-After`, no primeiro pedido àquele caminho e ~20 s depois de um 200 na home. A home e `/categoria/informatica` responderam 200. Verificado direto: [carrefour.com.br API](https://www.carrefour.com.br/api/catalog_system/pub/products/search?ft=mouse%20gamer&_from=0&_to=1)
- **Mega Mamute**: home e robots voltam 403 "Loja em manutenção". Verificado direto: [megamamute.com.br](https://www.megamamute.com.br/)
- **Submarino**: `submarino.com.br` responde 301 para `www.submarino.com.br`, que não resolve no DNS ("Could not resolve host"). Verificado direto: [submarino.com.br](https://submarino.com.br/)
- A Americanas anunciou o fim dos sites Submarino e Shoptime, integrados à Americanas.com. — [Tecnoblog](https://tecnoblog.net/noticias/submarino-e-shoptime-deixarao-de-existir-e-serao-integrados-a-americanas/); [Mercado & Consumo, 02/07/2024](https://mercadoeconsumo.com.br/02/07/2024/ecommerce/americanas-anuncia-fim-dos-sites-submarino-e-shoptime-e-integra-operacoes/amp/)
- **Girafa**: `www.girafa.com.br` e `girafa.com.br` não responderam (curl código 000) em 11/11/2026. Um site de reputação descreve a Girafa como loja de tecnologia com atualização em 7/6/2026 e reputação "RUIM". — Verificado direto (falha); [siteconfiavel.com.br](https://www.siteconfiavel.com.br/site/girafa-com-br)
- **Amazon**: nos 3 pedidos (/deals, /gp/goldbox, /s?k=), nenhum captcha ou "api-services-support" apareceu no corpo. Verificado direto: [amazon.com.br/s?k=mouse+sem+fio](https://www.amazon.com.br/s?k=mouse+sem+fio)
- A Amazon tem bloqueado agentes automatizados e coleta de avaliações, alegando violação das Condições de Uso sobre coleta de dados. — [Fast Company Brasil](https://fastcompanybrasil.com/ia/amazon-bloqueia-avaliacoes-clientes-bots/); [Tecnoblog](https://tecnoblog.net/noticias/amazon-bloqueia-agente-de-ia-da-meta-que-faz-compras-sozinho/)
- As Condições de Uso da Amazon proíbem "data mining, robots, or similar data gathering and extraction tools". A fonte é secundária e reproduz a versão em inglês. — [Conduct Atlas](https://conductatlas.com/platform/amazon/amazon-conditions-of-use/provision/CA-P-018441/prohibition-on-data-mining-and-scraping-tools/)

### Inferences
- Pela regra do Garimpo ("nunca insistir num site que pediu para parar"), o 429 do Carrefour na API já dispararia a pausa de 1 h no domínio inteiro. Isso derrubaria também as páginas de categoria, que funcionam. Se o Carrefour entrar, deve ser só por `/categoria/...` e `/colecao/...`, sem tocar em `/api/`.
- O desafio JS (Cloudflare, Gigantec) e o 403 do Akamai não se contornam. Essas lojas continuam só na verificação de ofertas que chegam por outra fonte, e mesmo ali vão dar "não verificado".
- Na Amazon, o HTML é técnico-legível e o robots.txt permite `/s?` e `/gp/goldbox`, mas as Condições de Uso proíbem robôs. O risco é de termos, não técnico.

### Gaps
- De propósito, não testei se os bloqueios são por UA (bot declarado) ou por IP/TLS. Trocar o UA para se passar por navegador seria contornar o anti-bot.
- Não sei se a Amazon passa a servir captcha com uso contínuo a 1 pedido a cada 5-10 s. Foram só 3 pedidos.

## 5. Feeds ou APIs públicos e oficiais (afiliados e lojas) e as credenciais que pedem

### Takeaway
Nenhuma API oficial de loja grande é aberta e grátis sem cadastro em 2026. A PA-API 5 da Amazon foi aposentada; a Creators API pede conta de Associado aprovada com 10 vendas qualificadas nos últimos 30 dias. A API de busca do Mercado Livre agora pede token OAuth (403 sem ele) e o robots.txt dela proíbe tudo. Shopee, Awin e Lomadee pedem cadastro de afiliado aprovado. A única exceção prática são os endpoints públicos `catalog_system/pub` das lojas VTEX, que funcionam sem credencial.

### Cited Findings
- **Amazon PA-API 5**: "has been deprecated and is being replaced by the Creators API". Quem ainda chama a PA-API 5 recebe HTTP 403 `AccessDeniedException`. — [Amazon Associates, PA-API v5 deprecation](https://affiliate-program.amazon.com/creatorsapi/docs/en-us/paapiv5-deprecation)
- **Creators API, elegibilidade**: exige conta de Associates com aceite final e pelo menos 10 vendas qualificadas nos últimos 30 dias. O acesso é perdido após 30 dias seguidos sem vendas qualificadas. — [Amazon, Register for Creators API](https://affiliate-program.amazon.com/creatorsapi/docs/en-us/onboarding/register-for-creators-api); [Amazon, Creators API intro](https://affiliate-program.amazon.com/creatorsapi/docs/en-us/introduction) (via resultado de busca; o texto completo dessas páginas não foi aberto)
- **Creators API, autenticação e datas**: usa OAuth 2.0, sem as chaves AWS da PA-API. A desativação da PA-API 5 é citada como 30/04/2026, com o endpoint aposentado em 15/05/2026. As fontes são de terceiros e divergem; a página oficial aberta não traz datas. — [DEV Community](https://dev.to/th3nate/amazon-pa-api-v5-is-shutting-down-april-30-2026-here-is-what-changes-at-the-auth-layer-22ek); [Keywordrush](https://www.keywordrush.com/blog/?p=245)
- **Mercado Livre**: sem token, `GET https://api.mercadolibre.com/sites/MLB/search?q=mouse%20gamer&limit=2` volta 403 `{"message":"forbidden","error":"forbidden","status":403}`. `GET /sites/MLB` volta 403 `{"blocked_by":"PolicyAgent","code":"PA_UNAUTHORIZED_RESULT_FROM_POLICIES"}`. Verificado direto: [api.mercadolibre.com/sites/MLB](https://api.mercadolibre.com/sites/MLB)
- A documentação oficial "Itens e buscas" mostra a busca `/sites/$SITE_ID/search?q=` sempre com `Authorization: Bearer $ACCESS_TOKEN`. — [developers.mercadolivre.com.br, Itens e buscas](https://developers.mercadolivre.com.br/pt-br/itens-e-buscas); [Items & searches (EN)](https://developers.mercadolivre.com.br/en_us/items-and-searches)
- Uma fonte de terceiros afirma que `/sites/{site}/search`, `/items/{id}` e `/users/{id}` eram públicos e passaram a dar 403 sem autenticação em 2025. Isso é coerente com o teste direto. — [AnythingMCP](https://anythingmcp.com/es/guides/mercado-libre-to-mcp)
- **Shopee Affiliate Open API**: GraphQL em `open-api.affiliate.shopee.com.br/graphql` (consulta `productOfferV2`). Pede App ID e App Secret do painel de afiliado, após aprovação manual em affiliate.shopee.com.br (~5-15 dias), com assinatura SHA256 de AppID + timestamp + payload + secret. As fontes são de terceiros. — [gregojoao/shopee-affiliate (GitHub)](https://github.com/gregojoao/shopee-affiliate); [Apify, Shopee Affiliate Products](https://apify.com/viralanalyzer/shopee-affiliate-products)
- **Awin**: o programa de afiliados da KaBuM! roda pela Awin e aceita pessoa física maior de 18. — [kabum.com.br/hotsite/afiliados](https://kabum.com.br/hotsite/afiliados/); [Awin, perfil do anunciante 17729](https://ui.awin.com/merchant-profile/17729)
- A Awin entrega feeds de produto (JSON Lines) via Publisher Product API, com token de autenticação, ou por um link do "Create-a-Feed", com até 5 downloads simultâneos. — [Awin, Product Feed Publisher Guide](https://help.awin.com/developers/docs/product-feed-publisher-guide-intro); [Awin, Product Data Feed FAQ](https://success.awin.com/articles/en_US/Knowledge/Product-Data-Feed-FAQ)
- **Lomadee**: a API de ofertas pede `sourceId` e token ("Credenciais de API" no perfil). Uma fonte de terceiros cita um limite de 10 pedidos por minuto. — [npm lomadee](https://www.npmjs.com/package/lomadee); [Content Egg, Lomadee Products](https://ce-docs.keywordrush.com/modules/affiliate/lomadeeproducts)
- **VTEX público**: a API `catalog_system/pub` respondeu sem credencial em Waz, Fast Shop e Americanas, e deu 403 no Carrefour. Verificado direto: [waz.com.br API](https://www.waz.com.br/api/catalog_system/pub/products/search?ft=mouse&_from=0&_to=1)

### Inferences
- Para um app pessoal sem vendas de afiliado, a Creators API da Amazon fica fora de alcance na prática, por causa da exigência de 10 vendas em 30 dias.
- A API do Mercado Livre pediria registrar uma aplicação e fazer OAuth com a conta do usuário. Mesmo assim, o robots.txt do host da API diz `Disallow: /`, o que bate de frente com a regra do Garimpo. O mais coerente é deixar o ML só para as ofertas que chegam por comunidade e Telegram.
- O feed da Awin (KaBuM!) seria um caminho limpo para pegar o catálogo inteiro, incluindo mouse e headset, que hoje não vêm no HTML. Mas pede cadastro de publisher aprovado, e isso vai contra o "o usuário só confirma, nunca digita config".

### Gaps
- Não pesquisei Magalu Parceiro (Magazine Você), Mercado Livre Afiliados, AliExpress Portals/Affiliate API nem Rakuten Advertising BR, e não sei se oferecem feed.
- Não confirmei se Pichau, Terabyte ou Patoloco têm programa na Awin, Lomadee ou outra rede com feed.
- A Awin é grátis para publisher? E os feeds da KaBuM! estão liberados? Nenhum dos dois foi confirmado.
- O texto completo da página oficial de registro da Creators API não foi aberto, só o trecho da busca.

## 6. Rótulo de viabilidade por loja

### Takeaway
"Dá hoje com HTTP simples": KaBuM! (só categorias já renderizadas, agora incluindo SSD), Waz, Fast Shop e Americanas (API VTEX ou `__NEXT_DATA__`), Carrefour (só páginas de categoria, nunca `/api/`), Kalunga, Logitech Store, Patoloco e Dell. A Amazon também é legível, mas com risco nas Condições de Uso. Pichau, Terabyte, Magalu, Casas Bahia, Lenovo, Gigantec e Mercado Livre estão bloqueados. Submarino morreu, Mega Mamute está em manutenção, Girafa não respondeu e Studio Gamer não foi encontrada.

### Cited Findings
| Loja | Listagem testada | robots.txt para `*` | Dados sem JS | Anti-bot | Rótulo |
|---|---|---|---|---|---|
| KaBuM! | `/hardware/ssd-2-5`, `/hardware` (60 produtos em `__NEXT_DATA__`); `/ofertas/ofertasdodia`, `/ofertas/blackfriday`, `/perifericos/mouse`, `/perifericos/headset` vazios ([kabum](https://www.kabum.com.br/hardware/ssd-2-5)) | permite; proíbe `sort=price`, `/destaques` ([robots](https://www.kabum.com.br/robots.txt)) | sim, por categoria | não | dá hoje com HTTP simples (parcial); ofertas do dia, mouse e headset: precisa de navegador/JS |
| Pichau | `/perifericos/mouse` ([pichau](https://www.pichau.com.br/perifericos/mouse)) | permite, sem `?` e `/api/` ([robots](https://www.pichau.com.br/robots.txt)) | não testável | Cloudflare challenge | bloqueado por anti-bot |
| Terabyte | `/promocoes` ([terabyte](https://www.terabyteshop.com.br/promocoes)) | ilegível (403) | não testável | Cloudflare challenge até no robots | bloqueado por anti-bot |
| Amazon.com.br | `/deals` → `/blackfriday` (51 ASIN em JSON); `/s?k=` (48 cards) ([amazon](https://www.amazon.com.br/s?k=mouse+sem+fio)) | permite `/s?`, `/gp/goldbox`; `/deals` não proibido ([robots](https://www.amazon.com.br/robots.txt)) | sim | nenhum nos 3 pedidos | dá hoje com HTTP simples, mas as Condições de Uso proíbem robôs ([Conduct Atlas](https://conductatlas.com/platform/amazon/amazon-conditions-of-use/provision/CA-P-018441/prohibition-on-data-mining-and-scraping-tools/)); API: pago/precisa de cadastro (10 vendas/30 dias) |
| Mercado Livre | `/ofertas`, `lista.` → verificação de conta ([ML](https://www.mercadolivre.com.br/ofertas)) | proíbe `/ofertas?`, `/gz/`; API `Disallow: /` ([robots API](https://api.mercadolibre.com/robots.txt)) | não | verificação de conta; API 403 sem token | bloqueado por robots/anti-bot; API: precisa de cadastro (OAuth) |
| Magalu | `/selecao/ofertasdodia/` ([magalu](https://www.magazineluiza.com.br/selecao/ofertasdodia/)) | ilegível (403) | não testável | Akamai 403 | bloqueado por anti-bot |
| Casas Bahia | home ([cb](https://www.casasbahia.com.br/)) | ilegível (403) | não testável | Akamai 403 | bloqueado por anti-bot |
| Carrefour | `/categoria/informatica` (13 cards), `/colecao/29819` (11.11 informática) ([carrefour](https://www.carrefour.com.br/categoria/informatica)) | permite; proíbe `/busca/` ([robots](https://www.carrefour.com.br/robots.txt)) | sim (HTML) | API 403/429 | dá hoje com HTTP simples (só páginas, sem `/api/`) |
| Americanas | `/computadores-e-informatica` (`__NEXT_DATA__`); API VTEX ([americanas](https://www.americanas.com.br/computadores-e-informatica)) | permite; `/api/` não proibido ([robots](https://www.americanas.com.br/robots.txt)) | sim | não | dá hoje com HTTP simples (filtrar seller: é marketplace) |
| Waz | `/perifericos` (JSON-LD); API VTEX ([waz](https://www.waz.com.br/perifericos)) | permite; proíbe `map=`, `productClusterIds`, `OrderBy` ([robots](https://www.waz.com.br/robots.txt)) | sim | não | dá hoje com HTTP simples |
| Fast Shop | API VTEX em `site.fastshop.com.br` ([fast](https://site.fastshop.com.br/api/catalog_system/pub/products/search?ft=mouse&_from=0&_to=1)) | permite; proíbe `/busca/` ([robots](https://site.fastshop.com.br/robots.txt)) | sim (API); prateleiras da home só JS | não | dá hoje com HTTP simples (via API VTEX) |
| Kalunga | `/busca/mouse/1`, `/depto/informatica/2` ([kalunga](https://www.kalunga.com.br/busca/mouse/1)) | permite ([robots](https://www.kalunga.com.br/robots.txt)) | sim (dataLayer + HTML) | não | dá hoje com HTTP simples |
| Logitech Store BR | home (32 produtos) ([logi](https://www.logitechstore.com.br/)) | permite; proíbe `/catalogsearch/` ([robots](https://www.logitechstore.com.br/robots.txt)) | sim | Cloudflare sem desafio | dá hoje com HTTP simples |
| Patoloco | home (68 preços) ([pato](https://patoloco.com.br/)) | permite ([robots](https://patoloco.com.br/robots.txt)) | sim (HTML) | não | dá hoje com HTTP simples |
| Dell BR | `/pt-br/shop/deals/dc` ([dell](https://www.dell.com/pt-br/shop/deals/dc)) | permite; proíbe `/pt-br/outlet/*?` ([robots](https://www.dell.com/robots.txt)) | sim (HTML) | não | dá hoje com HTTP simples |
| Lenovo BR | `/br/pt/ofertas/` ([lenovo](https://www.lenovo.com/br/pt/ofertas/)) | ilegível (403) | não testável | Akamai 403 | bloqueado por anti-bot |
| Gigantec | home ([gigantec](https://www.gigantec.com.br/)) | permite ([robots](https://www.gigantec.com.br/robots.txt)) | não | desafio JS próprio | precisa de navegador/JS |
| Shopee | `/flash_sale` ([shopee](https://shopee.com.br/flash_sale)) | permite, `Crawl-delay:1` ([robots](https://shopee.com.br/robots.txt)) | não (shell JS) | — | precisa de navegador/JS; API de afiliado: precisa de cadastro |
| AliExpress | home ([ali](https://pt.aliexpress.com/)) | proíbe `/item*`, `/search/*`, `/api/*` ([robots](https://pt.aliexpress.com/robots.txt)) | parcial (home) | não na home | não avaliado a fundo |
| Submarino | `www.` não resolve ([sub](https://submarino.com.br/)) | — | — | — | morto (integrado à Americanas, [Tecnoblog](https://tecnoblog.net/noticias/submarino-e-shoptime-deixarao-de-existir-e-serao-integrados-a-americanas/)) |
| Mega Mamute | home ([mega](https://www.megamamute.com.br/)) | ilegível (403 manutenção) | — | — | fora do ar ("Loja em manutenção") |
| Girafa | sem resposta | — | — | — | não verificado (sem conexão) |
| Studio Gamer | domínio não encontrado | — | — | — | não verificado |

### Inferences
- O maior ganho rápido para o Garimpo seria um adaptador VTEX genérico, porque o mesmo código atende Waz, Fast Shop e Americanas com preço, "de", imagem, link e parcelas com juros explícitos. Um parser de `__NEXT_DATA__` da Americanas ou de JSON-LD da Waz serviria de reserva.
- O segundo ganho seria ampliar a vitrine da KaBuM! com `/hardware/ssd-2-5` (e conferir as outras categorias uma a uma). Mouse, teclado e headset continuam fora.
- Kalunga, Logitech Store, Patoloco e Dell dão para ler, mas cada uma pede um parser de HTML próprio. A Kalunga tem um atalho: o dataLayer GA4 em JSON.
- Para entrar na Vitrine principal, essas lojas novas teriam de ser adicionadas a `src/config/stores.ts`. Domínio fora dessa lista é tratado como suspeito.

### Gaps
- Esses rótulos são do teste de 11/11/2026 à noite, com poucos pedidos por site. Anti-bot pode mudar com volume ou horário, principalmente na Amazon e no Carrefour.
- A Girafa não respondeu a conexão, e não confirmei se a loja fechou. A Studio Gamer não teve domínio identificado.
