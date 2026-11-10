# 8. Coleta diária, camadas e sugestões

Implemente worker/collect: (1) comunidades (Pelando, Promobit, Achados do TB, fórum do Hardmob) lendo a página de ofertas recentes ou o RSS a cada 30 min; (2) vitrines de ofertas das lojas de config/stores.ts duas vezes por dia; (3) busca dirigida de cada Alvo nas lojas uma vez por dia, agendada pelo pg-boss às 6h e repetida ao ligar o PC se o horário passou. Tudo segue as regras de coleta educada do CLAUDE.md. Crie também as abas Lojas e Fontes e sugestões: a lista inicial do doc, mais as lojas e os convites (chat.whatsapp.com, whatsapp.com/channel, t.me) descobertos nas mensagens, ordenados por menções de fontes que acertam.
Pronto quando: a coleta das 6h grava price_points sem nenhum 429 e as abas mostram as sugestões com a contagem de menções.
