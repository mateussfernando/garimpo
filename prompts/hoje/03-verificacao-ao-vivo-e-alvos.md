# Hoje 3. Verificação ao vivo e Alvos

Implemente o worker/verify. Para cada oferta nova:
- desencurte o link (no máximo 5 saltos, com cache) e tire os parâmetros de rastreio;
- extraia o ID do produto (ASIN, MLB ou o ID da loja);
- abra a página uma vez e leia preço, parcelas, frete e foto do JSON-LD ou das metatags;
- grave o resultado em price_points.

A coleta é educada: lê o robots.txt, usa uma fila em memória por domínio com 5 a 10 s entre pedidos, cache de 10 min, pausa de 1 h em 429 ou 403, User-Agent fixo, sem proxy e sem Playwright hoje. Se a verificação falhar, a oferta fica "não verificada".
Crie também os Alvos v0 na tabela alvos (braço articulado, mouse, teclado, monitor, SSD e acessórios), com termos e exclusões, sem pedir nada ao usuário. Ligue cada oferta ao Alvo que bater. O preço-alvo é 85% da mediana das ofertas daquele Alvo vistas até agora; até juntar 5 ofertas, o Alvo fica "sem referência".
Pronto quando: um link amzn.to vindo de um post vira um produto com preço verificado e foto, ligado ao Alvo certo.
