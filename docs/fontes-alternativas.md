# Fontes alternativas: APIs, outros sites e buscadores (pesquisa de 10/11/2026)

Regra do projeto: o robots.txt manda e bloqueio não se contorna (sem proxy, sem disfarce de navegador, sem driblar captcha). Esta pesquisa procurou caminhos legítimos quando um site bloqueia. Tudo que entra vira oferta pelo mesmo funil (`ingestRaw` → verificação na loja → nota), então a mesma oferta vista em várias fontes sobe a nota pelo calor social. É o "combo".

## O que entrou no app

| Fonte | Como | Estado |
| --- | --- | --- |
| Pelando e Promobit | páginas públicas, coleta educada | funciona; o link do Pelando é um redirecionador que o app agora decodifica localmente |
| Gatry | página inicial pública, sem robots.txt | funciona |
| Telegram | Escuta só leitura (GramJS), filtro por nome do grupo e por Alvo | funciona; lista de canais para entrar em `docs/canais-telegram.md` |
| KaBuM! (vitrine) | páginas de categoria que trazem os produtos no HTML: monitores, mousepads e webcams | funciona; 29 monitores, 45 mousepads e 9 webcams em oferta na leitura de teste |

## O que testei e deixei de fora

| Caminho | Resultado | Decisão |
| --- | --- | --- |
| Hardmob (fórum) | 403 para o app (proteção anti-robô) | fica pausado. Entre no grupo "hardMOB Promoções no Telegram" (link dentro do tópico do fórum): a Escuta cobre |
| Pichau, Terabyte, Magalu, Casas Bahia | 403 para a vitrine de ofertas | não contornar. Essas lojas só são conferidas quando uma oferta chega por outra fonte |
| Mercado Livre (vitrine `/ofertas`) | manda para uma tela de verificação de conta | não contornar |
| Mercado Livre (API pública de busca) | 403 sem token (`PolicyAgent`) | ver "Precisa de você" |
| Amazon `/deals` | redireciona para `/blackfriday` e é toda em JavaScript | sem dados no HTML |
| KaBuM!: mouses, teclados, SSDs e headsets | a página é uma casca; a lista vem de uma API interna do site (host com 403 no robots.txt) | não usar API interna sem documentação |
| RSS do Pelando e do Promobit | 404 | não existe |
| Buscadores como fonte de preço | a API do Bing foi aposentada (agosto de 2025, segundo a maioria das fontes); Google e Brave não confirmei preço nem acesso | não raspar página de resultados (viola os termos e é frágil) |

## Precisa de você (cadastro seu, com a sua conta)

1. **Mercado Livre API.** O endpoint `sites/MLB/search` aceita busca por produto com `Authorization: Bearer`. Crie um app grátis em developers.mercadolivre.com.br, gere o token e eu ligo uma fonte "Mercado Livre (API oficial)" por termo de Alvo. É o único buscador de preço oficial e gratuito que achei para uma loja grande.
2. **Lomadee e Awin (afiliados).** Têm API de ofertas por palavra-chave e por anunciante. Exigem conta de afiliado e aprovação nas lojas; um relato de terceiros fala em 10 pedidos por minuto na Lomadee (confirme na documentação oficial). Só vale se você já é afiliado.
3. **Brave Search API ou similares.** Servem para descobrir páginas de promoção, não preço. Não confirmei os planos e preços; veja no site do provedor antes de assinar. Pago, fora do plano de hoje.

## Como achar mais fontes sem raspar

- O app guarda convites `t.me` e `chat.whatsapp.com` vistos nas mensagens (tela **Fontes**, "Convites encontrados") com a contagem de menções. Quanto mais fontes citam um canal, mais ele merece entrada.
- Canais oficiais de loja anunciam relâmpagos primeiro (ex.: `t.me/ofertaskabum`). Entre sempre pelo link do site oficial.
