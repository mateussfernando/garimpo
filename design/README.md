# Design do Garimpo

As 5 telas aprovadas. No canvas ao vivo dá para clicar em tudo: https://claude.ai/artifact/KpCmQB2sKdW9GvHR9Z7MD2

| Arquivo | Tela | O que a tela precisa ter |
| --- | --- | --- |
| `Main.dc.html` | Vitrine (home) | Faixa de Alvos atingidos, filtros por Alvo com contagem, "Só frete grátis", cards com nota, total no cartão, parcela, mini gráfico, selos, Comprar, vigiar e descartar |
| `Detalhe.dc.html` | Detalhe do produto | Fotos, kit de compra, histórico de 30 dias com alvo e mediana (tooltip e modo tabela), "Por que nota 71", escada de preços, calor social e cupons |
| `WarRoom.dc.html` | War Room | Uma oferta por vez, decisão pelo teclado (Enter, W, S, X, J/K, Esc), fila ao lado, contagem do relâmpago e aviso a cada decisão |
| `Fontes.dc.html` | Fontes e sugestões | Grupos e canais achados sozinhos, Confirmar/Ignorar/Pausar, taxa de acerto, sugestões para entrar e alerta de link de convite |
| `Lojas.dc.html` | Lojas | Lojas vigiadas, como cada uma é coletada, saúde (pausa por 429), lojas sugeridas e regras de coleta educada |

`canvas.json` só guarda a posição das telas no canvas.

## Como ler os arquivos

- Cada `.dc.html` é HTML com estilo inline. O `<script type="text/x-dc">` no fim tem o `renderVals()`, com os dados de exemplo e as regras de estado.
- `{{nome}}` é um valor que vem do `renderVals()`. `<sc-for>` repete um trecho, `<sc-if>` mostra ou esconde, e `onClick="{{fn}}"` é um handler.
- O `support.js` é o runtime do canvas e não vem junto, então os arquivos não abrem sozinhos no navegador. Para ver as telas renderizadas, use o link do canvas.
- Para implementar, traduza para componentes React com Tailwind e shadcn/ui, usando os tokens de `tokens.md`. Não copie o HTML nem os estilos inline.

## O que é exemplo e o que é regra

- **Exemplo:** nomes entre colchetes, como [Grupo de promoções 1], marcam os grupos reais. Produtos, preços, notas, horários e contagens são dados de exemplo, coerentes com a fórmula da Nota.
- **Regra:** layout, hierarquia, textos da interface, cor por significado, estados (vazio, descartado, pausado, aguardando), alvos de toque de 44 px e atalhos.
- **Imagens:** os ícones de traço são marcadores. No app, a foto vem da página da loja, no mesmo enquadramento 4:3, com o fundo pontilhado enquanto carrega.
