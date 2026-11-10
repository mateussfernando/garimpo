# 3. Parser BR

Crie worker/pipeline/parse.ts: de cada mensagem, extraia o total no cartão em centavos (parcelas x valor), o número de parcelas e se têm juros, o preço à vista, o preço "de", o frete (grátis ou valor), cupom, URLs, loja pelo domínio e flags (relâmpago). Gere fixtures/messages a partir das primeiras 200 mensagens de raw_messages, com o gabarito rotulado uma vez pelo Haiku, e escreva testes Vitest para cada uma.
Pronto quando: pelo menos 90% das fixtures passam e as que falham estão listadas com o motivo.
