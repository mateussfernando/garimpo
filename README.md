# Garimpo

App pessoal que acha ofertas do 11.11 para os seus Alvos (braço articulado, mouse, teclado, monitor, SSD e acessórios), com preço no cartão. Plano acelerado: as ofertas vêm do scraping ao vivo das comunidades, só com o app aberto.

## Rodar no seu PC (Windows)

O passo a passo completo, com Telegram, IA e solução de problemas, está em [docs/como-rodar.md](docs/como-rodar.md).

1. Tenha Node 22 ou mais novo, o pnpm (`corepack enable`) e o PostgreSQL com um banco `garimpo` (dá para criar no DBeaver).
2. `pnpm install`
3. Copie `.env.example` para `.env` e preencha a `DATABASE_URL`.
4. `pnpm db:push` cria as tabelas.
5. `pnpm dev` sobe o site e o worker juntos. Abra http://localhost:3000.
   - Para ver a Vitrine de outro aparelho da rede, abra `http://<IP deste PC>:3000` (libere a porta 3000 no firewall do Windows, só para a rede local).

## Comandos

| Comando | O que faz |
| --- | --- |
| `pnpm dev` | Site e worker juntos. A coleta roda a cada 10 min e a verificação a cada 10 s, só enquanto estiver aberto. |
| `pnpm simular` | Põe 10 ofertas de exemplo na Vitrine, para ver tudo funcionando e ensaiar. `pnpm simular --limpar` apaga. |
| `pnpm telegram:login` | Login único na sua conta do Telegram. Imprime a sessão para colar em `TELEGRAM_SESSION` no `.env`. Depois ponha `listen` em `WORKER_ROLES`. |
| `pnpm ia:insights` | Uma passada do job de insights com o provedor de `AI_PROVIDER`. Precisa de `CLAUDE_CODE_OAUTH_TOKEN` (`claude setup-token`) ou de `ANTHROPIC_API_KEY`. |
| `pnpm vitrines:debug` | Lê as páginas de categoria das lojas uma vez e mostra o que o parser achou, sem gravar. |
| `pnpm fontes:debug` | Baixa a lista de cada comunidade uma vez, salva o HTML em `.garimpo/debug/` e mostra quantos posts achou. |
| `pnpm test` | Testes do parser, dos Alvos, da Nota e da extração. |
| `pnpm db:push` | Cria ou atualiza as tabelas. |

## Se uma comunidade mostrar 0 posts

O padrão dos links de cada site fica em `worker/collect/communities-config.ts`. Rode `pnpm fontes:debug` e mande para o Claude Code o HTML salvo em `.garimpo/debug/`, pedindo para ajustar o padrão. O robots.txt sempre manda: se o Fórum do Hardmob passar a bloquear robôs, ele aparece como bloqueado e fica de fora.

## Como funciona

1. **Coleta** (`worker/collect`): lê a lista de ofertas recentes de cada comunidade e abre só os posts cujo título toca um Alvo.
2. **Parser** (`worker/parse`): tira do texto o total no cartão, parcelas, juros, preço à vista, frete e cupom, em centavos.
3. **Verificação** (`worker/verify`): segue o link até a loja, tira o rastreio e confere preço, parcelas e foto na página.
4. **Nota** (`worker/score`): Nota rápida = 100 × (0,45 Alvo + 0,25 loja + 0,20 frete + 0,10 fontes).
5. **Vitrine** (`src/components/vitrine.tsx`): recebe avisos ao vivo do banco (`pg_notify` e SSE).

Toda requisição passa por `worker/http/polite.ts`:
- respeita o robots.txt;
- espera de 5 a 10 s entre pedidos ao mesmo domínio;
- guarda um cache de 10 min;
- pausa 1 h num 429 ou 403;
- usa um User-Agent fixo e não passa por proxy.

## Documentos

- `DIARIO-DE-BORDO.md`: onde o projeto está, as decisões e o registro de cada sessão. Toda sessão começa por aqui.
- `ETAPAS.md`: as etapas do plano acelerado e o que vem depois do 11.11.
- `CLAUDE.md`: as regras para o Claude Code.
- `docs/garimpo.md`: o plano completo.
- `design/`: as telas.
- `prompts/`: os prompts de construção.
