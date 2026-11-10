# 6. IA com trava

Implemente worker/ai: cliente com orçamento (preços em config/pricing.ts, trava em US$ 4,50), compilador de Alvo (texto em português vira JSON com termos, exclusões, preço-alvo e teto), triagem em lotes de 20 mensagens com o system prompt em cache e o Analista sob demanda. Tudo atrás da interface AiProvider com claude-cli, anthropic-api e ollama (AI_PROVIDER no .env), mais o job de insights da seção de IA do plano.
Pronto quando: a Vitrine mostra o gasto acumulado e uma chamada acima da trava é recusada e o mesmo produto gera insight com claude-cli e com anthropic-api.
