# Como rodar o Garimpo

Guia para subir o app no seu PC (Windows) e deixá-lo ligado durante o 11.11. Os comandos rodam na pasta do projeto.

## 1. O que precisa estar instalado

- **Node 22 ou mais novo** e o **pnpm** (`corepack enable` liga o pnpm).
- **PostgreSQL** rodando, com um banco chamado `garimpo`. Dá para criar pelo DBeaver.
- **Claude Code** (`claude`), só se você for usar a IA pela sua assinatura.

## 2. Primeira vez

1. Instale as dependências:

   ```bash
   pnpm install
   ```

2. Copie `.env.example` para `.env` e preencha. O `.env` nunca vai para o Git.

   | Variável | O que colocar |
   | --- | --- |
   | `DATABASE_URL` | `postgres://usuario:senha@localhost:5432/garimpo` |
   | `WORKER_ROLES` | `listen,collect,verify,ai` (Telegram, coleta, verificação e IA) |
   | `TELEGRAM_API_ID` e `TELEGRAM_API_HASH` | Crie em https://my.telegram.org, em "API development tools" |
   | `TELEGRAM_SESSION` | Sai do passo 4 abaixo |
   | `AI_PROVIDER` | `claude-cli` (usa a sua assinatura) |
   | `CLAUDE_CODE_OAUTH_TOKEN` | Sai do passo 5 abaixo |
   | `ANTHROPIC_API_KEY` | Deixe vazio com o `claude-cli`. Se ficar preenchido, a cobrança vai para a API |

3. Crie as tabelas:

   ```bash
   pnpm db:push
   ```

4. Faça o login do Telegram (uma vez só). O comando pede o telefone com DDI, o código que chega no app e a senha em duas etapas, se você tiver. No fim ele imprime a linha `TELEGRAM_SESSION=...`: cole no `.env`. Ela vale como a senha da conta.

   ```bash
   pnpm telegram:login
   ```

5. Gere o token da IA (uma vez só). Ele abre o navegador para você autorizar e imprime um token: cole em `CLAUDE_CODE_OAUTH_TOKEN`.

   ```bash
   claude setup-token
   ```

## 3. Subir o app

São dois processos, cada um num terminal próprio. Os dois precisam ficar abertos.

**Terminal 1, o site:**

```bash
pnpm dev:web
```

**Terminal 2, o worker** (Telegram, coleta, verificação e IA):

```bash
pnpm worker:run
```

Abra http://localhost:3000. De outro aparelho da rede de casa, abra `http://<IP deste PC>:3000` (libere a porta 3000 no firewall do Windows, só para a rede local).

Por que dois terminais e não o `pnpm dev`: o `pnpm dev` reinicia o worker a cada arquivo salvo, e cada reinício reconecta no Telegram. O `pnpm worker:run` só reinicia quando você manda.

## 4. Como saber que está funcionando

No terminal do worker devem aparecer, nesta ordem:

- `[alvos] N ofertas reclassificadas...`
- `worker ok · papéis: listen, collect, verify, ai`
- `[telegram] escutando N grupos/canais`
- uma linha por canal: `[telegram] <canal>: 30 lidas das últimas 24 h, X com link de loja, Y nos Alvos, Z ofertas`
- `[coleta] pelando: 20 posts, ...` (e Promobit, Gatry, Hardmob)
- `[vitrine] kabum-vitrine: ... produtos, ... em oferta nos Alvos`

Na tela:

- **Vitrine** (`/`): o indicador "Ao vivo" no canto e os cards com preço no cartão, Pix e faixa.
- **Fontes** (`/fontes`): "Telegram: Conectado · só leitura" e, em cada canal, os contadores do dia e a hora da última mensagem.
- **Lojas** (`/lojas`): a saúde de cada loja.
- **War Room** (`/war-room`): uma oferta por vez, pelo teclado.

## 5. No dia do 11.11

- Deixe os dois terminais abertos e o PC **sem dormir** (Configurações do Windows > Sistema > Energia > Suspender: "Nunca" enquanto ligado na tomada).
- Entre nos canais de `docs/canais-telegram.md`. Cada canal em que você entra aparece sozinho na tela Fontes em até 1 minuto.
- Atalhos na Vitrine: `J` e `K` navegam, `Enter` compra, `W` vigia, `X` descarta.

## 6. Parar e reiniciar

- Para parar: `Ctrl+C` em cada terminal.
- Mudou o `.env`? Pare e suba os dois de novo: ele só é lido na subida.
- Atualizou o código do worker? Reinicie só o terminal 2. O site recarrega sozinho.

## 7. Comandos úteis

| Comando | O que faz |
| --- | --- |
| `pnpm test` | Roda os testes (parser, Alvos, faixas, leitores de loja, Telegram) |
| `pnpm typecheck` e `pnpm lint` | Confere tipos e estilo |
| `pnpm simular` | Põe 10 ofertas de exemplo na Vitrine. `pnpm simular --limpar` apaga |
| `pnpm ia:insights` | Uma passada da IA, para testar o token |
| `pnpm fontes:debug` | Lê cada comunidade uma vez e mostra quantos posts achou |
| `pnpm vitrines:debug` | Lê as categorias do KaBuM! uma vez, sem gravar |
| `pnpm db:push` | Atualiza as tabelas depois de mudança no banco |

## 8. Se der problema

| Sintoma | O que fazer |
| --- | --- |
| `Falta DATABASE_URL no .env` | Preencha a `DATABASE_URL` e suba de novo |
| `não existe a coluna ...` | Rode `pnpm db:push` |
| `Another next dev server is already running` | Já existe um site aberto. Feche o outro terminal ou encerre o processo indicado na mensagem |
| `[telegram] falta TELEGRAM_SESSION` | Rode `pnpm telegram:login` e cole a sessão no `.env` |
| `[telegram] a sessão não vale mais` | Rode `pnpm telegram:login` de novo |
| Canal com "0 com link de loja" | O worker imprime `links sem loja conhecida: ...`. Esses sites precisam entrar em `src/config/stores.ts` |
| `[ia] ... Falta CLAUDE_CODE_OAUTH_TOKEN` | Rode `claude setup-token` e cole o token no `.env` |
| `[pausa] <loja> respondeu 429/403` | A loja pediu pausa. O app espera 1 hora sozinho e não insiste |
| Oferta "Não verificada" | A loja bloqueia robôs ou a página falhou. O preço mostrado é o do post |
| Vitrine em "Reconectando" | O site caiu ou o banco parou. Veja o terminal 1 |

O estado do projeto e o que falta fazer estão em `DIARIO-DE-BORDO.md` e `ETAPAS.md`.
