# Tokens visuais do Garimpo

Tema escuro único, com cara de terminal de pregão. A cor tem significado: ouro é só para "Alvo atingido".

## Cores

| Papel | Valor | Onde |
| --- | --- | --- |
| Fundo | `#0B0C0E` | página (War Room: `#08090B`) |
| Superfície | `#121418` | cards e seções |
| Superfície funda | `#0F1114` | faixa de status, área da foto, caixas internas |
| Superfície ativa | `#1A1D22` | item de menu ativo, selo neutro |
| Pílula | `#1C2026` | nota e loja sobre a foto |
| Divisória | `#1F2329` | linhas de tabela e cabeçalho |
| Borda de card | `#22262D` | cards |
| Borda de controle | `#2C313A` | botões secundários, chips, inputs |
| Texto de número | `#F4F5F6` | preços e notas |
| Texto principal | `#ECEDEE` | títulos e corpo; também o botão Comprar (fundo) |
| Texto secundário | `#C9CDD3` / `#B4BAC2` | descrições |
| Texto apagado | `#9BA1A9` / `#8E949C` | rótulos e legendas |
| Ouro (accent) | `#F5B83D`, texto em cima `#1A1404` | só "Alvo atingido": selo, faixa, botão Comprar da oferta no alvo, linha do alvo no gráfico |
| Verde (bom) | texto `#7BEAA8`, fundo `rgba(61,220,132,0.12)`, borda `rgba(61,220,132,0.35)`, ponto `#3DDC84` | frete grátis, desconto real, fonte confirmada, status ok |
| Vermelho (ruim) | texto `#FF9A9A`, fundo `rgba(255,107,107,0.12)`, borda `rgba(255,107,107,0.4)`, linha `#FF8A8A` | Black Fraude, com juros, cupom expirado |
| Laranja (pausa) | ponto `#FF8F5A`, borda de alerta `rgba(255,143,90,0.45)`, texto `#FFB48F` | loja pausada por 429, link de convite desconhecido |

Cor nunca vem sozinha: todo selo e todo ponto de status têm texto do lado.

## Tipografia

- **Geist** para a interface e **Geist Mono** para preço, nota, contagem e hora, sempre com `tabular-nums`.
- **Preço:** 26 px no card, 48 px no Detalhe e 76 px na War Room, peso 600, `letter-spacing` negativo.
- **Títulos:** h1 de 30 px, h2 de 15 a 18 px.
- **Rótulos de métrica:** 11 px, caixa alta, `letter-spacing: 0.06em`.

## Forma e espaço

- **Raio:** cards de 14 a 16 px, controles de 10 a 12 px, pílulas e chips de 999 px.
- **Toque:** todo botão e link tem pelo menos 44 px de altura.
- **Foto:** enquadramento 4:3 com fundo pontilhado (`radial-gradient(rgba(255,255,255,0.07) 1px, transparent 1px)`, 14 px) enquanto carrega.
- **Foco:** contorno de 2 px em `#ECEDEE` no `:focus-visible`.
- **Cabeçalho:** a linha de navegação mais a faixa de status (contagem do 11.11, orçamento, gasto de IA, fontes, máquinas) aparecem em todas as telas, menos na War Room, que tem a própria barra.
