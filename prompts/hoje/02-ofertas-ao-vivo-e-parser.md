# Hoje 2. Ofertas ao vivo e Parser

Telegram e WhatsApp ficam fora hoje. As ofertas vêm do scraping ao vivo, que só roda com o app aberto e sem agendamento:
- comunidades: Pelando, Promobit e o Fórum de Promoções do Hardmob, lendo o RSS quando existir ou a página de ofertas recentes, a cada 10 min;
- vitrines de ofertas do dia das lojas de config/stores.ts, a cada 30 min.

Antes de cada site, leia o robots.txt e siga o que ele diz. Use 1 pedido a cada 5 a 10 s por domínio, cache, pausa de 1 h em 429 ou 403, User-Agent fixo e nenhum proxy. Cada fonte vira uma linha em sources, e cada item novo vira uma linha em raw_messages.
Depois, crie o worker/parse: um parser BR em regex que lê total no cartão, parcelas, juros (sim/não), preço à vista, frete, cupom, loja e link, com o preço em centavos. Teste com Vitest nas fixtures/messages, montadas com os primeiros itens coletados.
Pronto quando: um post novo no Pelando ou no Promobit vira uma linha em offers em até 10 min, e o parser acerta pelo menos 80% das fixtures.
