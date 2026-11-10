# Etapas do Garimpo (plano acelerado)

**Mudou em 10/11, às 18:20:** sai a coleta que fica rodando sozinha no PC e fica a verificação ao vivo de cada oferta que chega. Telegram e WhatsApp ficam fora hoje: as ofertas vêm do scraping ao vivo das comunidades e das vitrines de ofertas das lojas. Tudo roda num PC só, e o outro abre a Vitrine pela rede. Siga uma etapa por vez. Cada uma termina com o "Pronto quando" cumprido, um commit e uma entrada no `DIARIO-DE-BORDO.md`.

| # | Etapa | Prompt | Janela | Status |
| --- | --- | --- | --- | --- |
| 1 | Fundação enxuta (cria o repositório) | `prompts/hoje/01` | 10/11, 18:30 às 19:15 | [x] código pronto |
| 2 | Ofertas ao vivo e Parser | `prompts/hoje/02` | 10/11, 19:15 às 20:30 | [x] código pronto, falta conferir com os sites |
| 3 | Verificação ao vivo e Alvos | `prompts/hoje/03` | 10/11, 20:30 às 21:30 | [x] código pronto, falta conferir com as lojas |
| 4 | Vitrine ao vivo e Nota rápida | `prompts/hoje/04` | 10/11, 21:30 às 22:30 | [x] código pronto |
| 5 | Ensaio e congelamento | nenhum | 10/11, 22:30 às 23:45 | [ ] |
| 6 | Operação do 11.11 | nenhum | 11/11 | [ ] |
| 7 | Depois do 11.11 | `prompts/01` a `08` | 12/11 a 26/11 | [ ] |

**Agora (18:50):** as Etapas 1 a 4 foram adiantadas e o código está pronto. Falta rodar no seu PC: `pnpm install`, `pnpm db:push`, `pnpm dev` e `pnpm fontes:debug` para conferir as comunidades de verdade. Veja o `README.md`.

**Linha de corte, às 21:30:** se a Etapa 3 não estiver pronta, deixe as ofertas "não verificadas" e vá direto para a Vitrine. Ofertas ao vivo, Parser e Vitrine já resolvem o 11.11.

**Plano B, agora:** cadastre os Alvos como Alertas de Desejos no Pelando. Se algo quebrar, eles avisam no site e por e-mail.

## 1. Fundação enxuta

- Banco `garimpo` no PostgreSQL do PC de 16 GB, testado no DBeaver.
- Copie o `.env.example` para `.env`.
- Rode `prompts/hoje/01-fundacao-enxuta.md`.
- **Pronto quando:** `pnpm dev` abre localhost:3000, o worker loga "worker ok" e as tabelas aparecem no DBeaver.

## 2. Ofertas ao vivo e Parser

- Rode `prompts/hoje/02-ofertas-ao-vivo-e-parser.md`. Ele lê Pelando, Promobit, o fórum do Hardmob e as vitrines de ofertas das lojas, só com o app aberto.
- **Pronto quando:** um post novo no Pelando ou no Promobit vira uma linha em `offers` em até 10 min, e o parser acerta pelo menos 80% das fixtures.

## 3. Verificação ao vivo e Alvos

- Rode `prompts/hoje/03-verificacao-ao-vivo-e-alvos.md`. A verificação acontece só quando uma oferta chega e é educada com cada loja.
- **Pronto quando:** um link amzn.to vindo de um post vira um produto com preço verificado e foto, ligado ao Alvo certo.

## 4. Vitrine ao vivo e Nota rápida

- Rode `prompts/hoje/04-vitrine-ao-vivo.md`, seguindo `design/Main.dc.html` e `design/tokens.md`.
- **Pronto quando:** uma oferta nova entra na Vitrine sem recarregar, com foto, nota e Comprar, e o outro PC vê a mesma Vitrine pela rede.

## 5. Ensaio e congelamento

- **22:30:** meia hora com tráfego real, ajustando os termos dos Alvos e o corte da nota.
- **23:00:** congelar. Dali em diante, só correção.
- **23:45:** Vitrine aberta nos dois PCs e a coleta ao vivo conferida.

## 6. Operação do 11.11

- Compre pela Vitrine e anote cada compra.
- No fim do dia, escreva no diário o que funcionou e o que falhou.

## 7. Depois do 11.11 (12/11 a 26/11)

Volta o plano completo, nos `prompts/01` a `08`:
- Escuta do Telegram (o WhatsApp segue fora);
- coleta diária às 06:00 com pg-boss e o PC de 8 GB na fila;
- desconto real com histórico e Black Fraude;
- IA com trava e o job de insights;
- War Room e as telas de Fontes e Lojas;
- tudo pronto antes da Black Friday, em 27/11.
