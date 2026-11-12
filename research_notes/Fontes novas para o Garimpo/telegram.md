# Canais de ofertas no Telegram (Brasil): verificação nas páginas públicas do t.me, 12/11/2026

Método: leitura de https://t.me/s/<handle> (prévia pública, mostra os ~20 posts mais recentes) e, quando não há prévia, de https://t.me/<handle>. Contagem de domínios feita só nos links dentro do texto desses ~20 posts. Datas em UTC, tiradas do atributo `datetime` do post, lidas em 12/11/2026 por volta das 16:40 UTC. Nada foi aberto com login; nenhum canal foi seguido. "Pix" aparece nos posts só como forma de pagamento com desconto ("R$ X no Pix"), não como pedido de PIX para o canal. Nenhum dos canais lidos mostrou "VIP pago", assinatura paga ou domínio de loja falso nos posts vistos.

## 1. Quais canais novos (ainda não seguidos) foram verificados e valem entrar à mão?

### Takeaway
Os canais novos verificados com mais foco em tecnologia são Achados do Tecnoblog (@achadosdotb) e o grupo Canaltech Ofertas (@ctofertas). Os gerais e ativos são Pechinchou (@pechinchou) e Cupom Online (@cupomonline). Os de nicho são MM Ofertas (@mmofertas, Apple) e PromoImporta (@Promoimporta, AliExpress). Todos tinham posts de 11 ou 12/11/2026. Nenhum canal oficial de loja (Pichau, Terabyte, Waz, Redragon, Fast Shop) foi encontrado.

### Cited Findings

| Handle | Título no t.me | Inscritos | Post mais recente | Foco | Links nos posts | Alertas |
|---|---|---|---|---|---|---|
| achadosdotb | Achados do Tecnoblog \| Ofertas de Tecnologia | 17.3K subscribers | 2026-11-12 14:55 UTC | tecnologia (celular, eletrônicos) | só o redirecionador próprio tecno.click (20 links), mais tecnoblog.net (3) | nenhum |
| ctofertas | Canaltech Ofertas \| Tecnologia | 102 328 members (é grupo, não canal) | não visível (sem prévia t.me/s) | tecnologia, gamer | não visível | nenhum; link oficial no site do Canaltech |
| pechinchou | [CANAL] Pechinchou Promoções | 68K subscribers | 2026-11-12 16:33 UTC | geral | só o redirecionador próprio pechin.co (20 de 20) | nenhum |
| cupomonline | Cupom Online Promoções | 28.6K subscribers | 2026-11-12 16:37 UTC | geral (inclui hardware, ex.: gabinete gamer) | diretos: s.shopee.com.br (13), meli.la (5); mais o redirecionador cupom.cc (7) | nenhum; posts marcados #publi |
| Promoimporta | [CANAL] PromoImporta 💥 | 21.8K subscribers | 2026-11-12 16:04 UTC | importados AliExpress (inclui CPU, ex.: Ryzen 3 3300X) | diretos: s.click.aliexpress.com (25), a.aliexpress.com (3); 24 links t.me internos | nenhum; canal irmão do PromoTop |
| mmofertas | MM Ofertas | 4.96K subscribers | 2026-11-12 15:16 UTC | Apple | quase só o redirecionador mcmgz.in (16), mais magazineluiza.onelink.me, tiny.cc, tidd.ly | nenhum; avisa que recebe comissão |

Fontes por linha:
- @achadosdotb: título, inscritos, data e domínios — [t.me/s/achadosdotb](https://t.me/s/achadosdotb). O último post visto foi o Galaxy Z Flip 7 por R$ 4.499,10 no Pix, com link tecno.click para o Mercado Livre — [t.me/s/achadosdotb](https://t.me/s/achadosdotb)
- @ctofertas: é um grupo com 102 328 members, sem prévia pública. A descrição fala em ofertas "garimpadas pela equipe do Canaltech" — [t.me/ctofertas](https://t.me/ctofertas). O artigo do próprio Canaltech linka t.me/ctofertas (e t.me/Canaltech_Oficial) — [Canaltech](https://canaltech.com.br/mercado/quem-e-gamer-encontra-os-melhores-precos-no-canaltech-ofertas-saiba-como-entrar-207126/)
- @pechinchou: título, inscritos, data e domínios — [t.me/s/pechinchou](https://t.me/s/pechinchou). O site pechinchou.com.br linka t.me/pechinchou — [pechinchou.com.br](https://pechinchou.com.br)
- @cupomonline: título, inscritos, data e domínios — [t.me/s/cupomonline](https://t.me/s/cupomonline). O site cupomonline.com.br linka t.me/cupomonline (e também um convite privado t.me/+xjCi3Bnzs_BhZDMx, não checado) — [cupomonline.com.br](https://www.cupomonline.com.br/)
- @Promoimporta: título, inscritos, data e domínios. A descrição aponta para t.me/promotop e t.me/promotopgrupo — [t.me/s/Promoimporta](https://t.me/s/Promoimporta). A descrição do PromoTop chama @Promoimporta de "Promoções da China" — [t.me/s/promotop](https://t.me/s/promotop)
- @mmofertas: título, inscritos, data e domínios. A descrição cita o MacMagazine e a comissão — [t.me/s/mmofertas](https://t.me/s/mmofertas)

### Inferences
- Para o parser do Garimpo, Cupom Online e PromoImporta são os mais fáceis, porque usam links diretos de loja (Shopee, meli.la, AliExpress). Achados do TB, Pechinchou e MM Ofertas exigem seguir o redirecionador próprio (tecno.click, pechin.co, mcmgz.in) para saber a loja e o domínio. Isso depende da regra de domínio suspeito em config/stores.ts e da coleta educada.
- O Canaltech Ofertas é um grupo, não um canal. A Escuta com GramJS lê grupos do mesmo jeito, mas pode haver conversa misturada com as ofertas. Isso não foi verificado.
- O foco "tecnologia" do Achados do TB, nos posts vistos, é mais celular e eletrônicos do que peças de PC.

### Gaps
- @ctofertas: sem prévia pública, então não foi possível ver a data do último post nem os domínios dos links.
- Só os ~20 posts mais recentes de cada canal foram lidos. Alertas de golpe em posts antigos não foram descartados.

## 2. Quais candidatos já são seguidos, são o mesmo canal ou não são o que parecem?

### Takeaway
t.me/promotop é o "[CANAL] PromoTop" que o usuário já segue. t.me/nerdofertas é, muito provavelmente, o "NERD OFERTAS" já seguido. t.me/promobit NÃO é o Promobit: é o canal "OFERTAS PC GAMER PEÇAS HARDWARE", já seguido pelo usuário, e quem opera é a rede do Nerd Ofertas.

### Cited Findings
- t.me/promotop: título "[CANAL] PromoTop 💥", 111K subscribers, post mais recente em 2026-11-12 16:31 UTC. Foco geral, com links diretos meli.la (9), link.amazon (4), s.shopee.com.br (3), mercadolivre.com (2) e o redirecionador i.promotop.net (3). Título igual ao canal já seguido, então deve ser excluído — [t.me/s/promotop](https://t.me/s/promotop)
- t.me/nerdofertas: título "NERD OFERTAS 🤓 Super Ofertas e Cupons", 130K subscribers, post mais recente em 2026-11-12 16:24 UTC. Links mistos: nerdofertas.com (redirecionador, 14), meli.la (13), nerdcupons.com (5), s.shopee.com.br (5), link.amazon (3), amzn.to (1). A descrição cita @NerdCupons, um canal só de cupons — [t.me/s/nerdofertas](https://t.me/s/nerdofertas). O site nerdofertas.com linka exatamente t.me/nerdofertas — [nerdofertas.com](https://nerdofertas.com)
- t.me/promobit: título "OFERTAS PC GAMER PEÇAS HARDWARE", 16.2K subscribers, post mais recente em 2026-11-12 16:33 UTC. Foco hardware e periféricos. Links: nerdofertas.com (20), ofertou.ai (9), meli.la (7), link.amazon (2). A descrição aponta para @chinasuperofertas e @compramosnachina, e cada post termina com "Mais grupos de ofertas e cupons: https://nerdofertas.com/t" — [t.me/s/promobit](https://t.me/s/promobit)
- A página de grupos do Nerd Ofertas tem um "Grupo PC Gamer — Ofertas de Hardware, Placa de Vídeo e Periféricos", com link pelo redirecionador ofertou.ai/e/ofertas-pc-tg — [nerdofertas.com/grupos/pc-gamer](https://nerdofertas.com/grupos/pc-gamer), [nerdofertas.com/t](https://nerdofertas.com/t)
- t.me/Hardware_barato é um grupo pequeno, "Hardwarebarato.com", com 77 members e sem prévia. A descrição divulga um comparador de preços (hardwarebarato.com), não posta ofertas — [t.me/Hardware_barato](https://t.me/Hardware_barato)
- O KaBuM! confirma t.me/ofertaskabum como seu grupo oficial (já seguido) — [kabum.com.br/hotsite/telegram](https://www.kabum.com.br/hotsite/telegram) (via resultado de busca, página não aberta)

### Inferences
- O "NERD OFERTAS" já seguido (id privado) quase certamente é o @nerdofertas: o título é igual e é o único handle que o site linka. Não há outro handle público do Nerd Ofertas para tecnologia além do canal PC Gamer, que é o @promobit.
- @promobit usa a marca de outro site de ofertas (Promobit) num canal de terceiros. O conteúdo parece normal (links meli.la e Amazon), mas o handle engana. Vale registrar no app que @promobit ≠ Promobit, para não atribuir as ofertas ao Promobit.

### Gaps
- Não deu para confirmar pelo t.me que o "NERD OFERTAS" de id privado é o mesmo @nerdofertas, porque o id do usuário não aparece na prévia pública.
- "mmpromo" (já seguido) não foi checado, então não se sabe se é diferente do @mmofertas (MacMagazine).

## 3. Lojas oficiais e sites de ofertas: há canal oficial no Telegram?

### Takeaway
Nenhum canal oficial de loja foi encontrado. Os handles óbvios (pichau, terabyteshop, gatry, hardmob) não são canais nem grupos públicos. As homes de Waz, Redragon, Fast Shop, Gatry, Pelando e Hardware.com.br não têm link t.me.

### Cited Findings
- t.me/pichau, t.me/terabyteshop, t.me/gatry e t.me/hardmob mostram só a página genérica "you can contact @… right away", sem título, sem contagem de membros e sem prévia. Não são canais nem grupos públicos — [t.me/pichau](https://t.me/pichau), [t.me/terabyteshop](https://t.me/terabyteshop), [t.me/gatry](https://t.me/gatry), [t.me/hardmob](https://t.me/hardmob)
- O HTML das homes de waz.com.br, redragon.com.br, fastshop.com.br, gatry.com, pelando.com.br e hardware.com.br não tem nenhuma URL t.me — [Waz](https://www.waz.com.br), [Redragon](https://www.redragon.com.br), [Fast Shop](https://www.fastshop.com.br), [Gatry](https://www.gatry.com), [Pelando](https://www.pelando.com.br), [Hardware.com.br](https://www.hardware.com.br/)
- pichau.com.br e terabyteshop.com.br responderam 403 ao pedido automático (não foi insistido) — [Pichau](https://www.pichau.com.br), [Terabyte](https://www.terabyteshop.com.br)
- A home do Olhar Digital linka só t.me/OlharDigitalNoticias (notícias), e não um canal de ofertas — [olhardigital.com.br](https://olhardigital.com.br/)

### Inferences
- As lojas de hardware do Brasil parecem não manter canal público próprio no Telegram, com exceção do KaBuM!, que já é seguido. As ofertas delas chegam pelos canais de curadoria.

### Gaps
- Não foram checados (o teto de ~35 buscas acabou antes): Amazon BR ofertas, Mercado Livre, Magalu, Logitech BR, Dell BR, um canal de ofertas do Olhar Digital (se existir) e o canal oficial do Pelando (t.me/pelando NÃO é o Pelando, como avisado; não foi aberto).
- Pichau e Terabyte: o site bloqueou o acesso automático, então não se sabe se o rodapé deles linka algum Telegram.
- O redirecionador ofertou.ai/e/ofertas-pc-tg não revelou o handle de destino sem JavaScript. A ligação com @promobit é uma inferência (título e rodapé dos posts), não um link visto.

## 4. Busca aberta: outros canais de hardware ou periféricos

### Takeaway
As buscas na web em português trouxeram quase só o que já se sabia (KaBuM!, Canaltech, Achados do TB, ofertasbenevides, este já seguido) e várias listas em espanhol. Nenhum canal novo de hardware foi achado por busca.

### Cited Findings
- Duas buscas ("canal telegram ofertas hardware periféricos t.me" e "t.me canal promoções pc gamer hardware brasil telegram") trouxeram KaBuM! (t.me/ofertaskabum), Canaltech Ofertas, Achados do TB e um Google Doc que cita t.me/ofertasbenevides (já seguido). O resto eram canais espanhóis (3DJuegos, Compradicción, Applesfera) — [Canaltech](https://canaltech.com.br/mercado/quem-e-gamer-encontra-os-melhores-precos-no-canaltech-ofertas-saiba-como-entrar-207126/), [kabum.com.br/hotsite/telegram](https://www.kabum.com.br/hotsite/telegram)
- O Cupom Online (achado por busca) tem canal público ativo; ver a tabela da seção 1 — [t.me/s/cupomonline](https://t.me/s/cupomonline)

### Inferences
- Para achar mais canais de hardware, o caminho mais produtivo seria seguir as descrições dos canais (ex.: @chinasuperofertas e @compramosnachina, citados pelo @promobit; @NerdCupons) e não a busca na web. Nenhum deles foi verificado.

### Gaps
- Não verificados (só citados em descrições ou sites): @chinasuperofertas, @compramosnachina, @NerdCupons, @promotopgrupo (grupo de conversa do PromoTop), @Canaltech_Oficial (notícias) e o convite privado t.me/+xjCi3Bnzs_BhZDMx do Cupom Online.
