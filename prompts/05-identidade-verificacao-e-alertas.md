# 5. Identidade, verificação e alertas

Implemente: desencurtador (segue redirects, no máximo 5 saltos, com cache), IDs canônicos (ASIN, MLB, Kabum, Pichau, Terabyte), agrupamento de reposts, verificador genérico (JSON-LD e metatags de preço) com robots.txt e uma fila pg-boss por domínio compartilhada pelos dois PCs, price_points com foto e print, e o alerta na Vitrine (pg_notify) quando a oferta bate com um Alvo. Nada de notificação no celular.
Pronto quando: um link amzn.to vira um ASIN e um Alvo atingido sobe para a faixa do topo nos dois PCs.
