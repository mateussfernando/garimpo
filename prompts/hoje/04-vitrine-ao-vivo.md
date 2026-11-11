# Hoje 4. Vitrine ao vivo e Nota rápida

Crie a página / como Vitrine, seguindo design/Main.dc.html e design/tokens.md. Ela tem:
- a faixa de Alvos atingidos, os filtros por Alvo e o filtro "Só frete grátis";
- cards com foto, total no cartão e parcela;
- selos de frete grátis, com juros, verificado há X min, não verificado e sem histórico;
- a nota e o botão Comprar, que abre o link limpo numa aba nova.

A Vitrine é ao vivo por SSE: o worker chama pg_notify e app/api/stream/route.ts (runtime nodejs) faz LISTEN.
Nota rápida de hoje: N = 100 x (0,45 A + 0,25 C + 0,20 F + 0,10 S), em que:
- A é o encaixe no Alvo (1 no preço-alvo, 0 no teto);
- C é a confiança da loja (1 loja própria, 0,6 marketplace, 0,2 desconhecida);
- F é o frete (1 grátis, 0,5 até 5% do preço, 0 acima);
- S é o número de fontes distintas em 15 min dividido por 4, com teto 1.

O desconto real e o selo Black Fraude ficam para depois do 11.11, porque precisam de histórico.
Atalhos: J/K para navegar, Enter para comprar, W para vigiar e X para descartar.
Se sobrar tempo: as mensagens que o parser não entendeu vão em lote para o claude-cli, com claude-haiku-5-5.
Pronto quando: uma oferta nova entra na Vitrine sem recarregar, com foto, nota e Comprar.
