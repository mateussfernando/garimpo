# Deploy do Garimpo: Vercel + Supabase + worker neste PC

## Como fica

```
 celular / qualquer PC ──► Vercel (o site, Next.js)  ──┐
                                                        ├──► Supabase (o banco Postgres, São Paulo)
 este PC ──► worker (Telegram, conferência, IA) ───────┘
```

- **Vercel** roda só o site. Ele nunca lê o Telegram, nunca chama a IA e nunca abre loja.
- **Supabase** guarda o banco (hoje 68 MB; o plano grátis vai até 500 MB).
- **O worker continua neste PC**, igual a hoje: Telegram (só leitura), conferência educada, `claude -p` e `agy`. Só muda o banco para o qual ele escreve. Sem o worker ligado o site abre, mas não entra oferta nova.
- Segredos do worker (`TELEGRAM_SESSION`, `CLAUDE_CODE_OAUTH_TOKEN`...) **nunca** vão para a Vercel.

> Nunca cole senha, URL do banco ou chave no chat. Elas vão só no `.env` deste PC e nas telas da Vercel e do Supabase.

## Passo 0. Antes de começar (neste PC)

1. Tudo commitado e enviado ao GitHub (`git status` limpo, branch `main` no `origin`).
2. Conferir que o build de produção passa: `pnpm build`.
3. Backup do banco local: `pnpm db:backup antes-do-deploy` (vai para `~/garimpo-backups`).

## Passo 1. Criar o banco no Supabase

1. Entre em https://supabase.com e crie a conta (pode ser com o GitHub).
2. **New project**:
   - **Name:** `garimpo`
   - **Database Password:** clique em **Generate a password**. Prefira uma senha só com letras e números (símbolos precisam ser codificados na URL). Guarde no seu gerenciador de senhas.
   - **Region:** `South America (São Paulo)`.
   - **Plan:** Free.
3. Espere o projeto ficar pronto (1 a 2 minutos).
4. Clique em **Connect** (no topo do projeto). Na aba de connection string, copie duas URLs e troque `[YOUR-PASSWORD]` pela senha:
   - **Session pooler** (porta **5432**): `postgresql://postgres.<ref>:SENHA@aws-1-sa-east-1.pooler.supabase.com:5432/postgres`
     Serve para o worker, para as migrações, para a cópia dos dados e para o tempo real do site.
   - **Transaction pooler** (porta **6543**): `postgresql://postgres.<ref>:SENHA@aws-1-sa-east-1.pooler.supabase.com:6543/postgres`
     Serve só para as consultas do site na Vercel.
   A "Direct connection" (`db.<ref>.supabase.co`) não serve: no plano grátis ela é só IPv6. O Session e o Transaction pooler têm o mesmo endereço e o mesmo usuário: só a porta muda. O servidor (`aws-0` ou `aws-1`) é o que o botão **Connect** mostra.
5. Opcional, mais seguro: em **Project Settings → Data API**, desligue a Data API. O Garimpo não usa, e as tabelas já ficam trancadas para ela de qualquer jeito (RLS e `pnpm db:travas`).

## Passo 2. Criar as tabelas no Supabase

No `.env` deste PC, acrescente uma linha (não troque o `DATABASE_URL` ainda):

```
SUPABASE_URL=<a URL do Session pooler, porta 5432>
```

No PowerShell, na pasta do projeto, rode as migrações apontando para o Supabase só neste comando:

```powershell
$env:DATABASE_URL = (Select-String -Path .env -Pattern '^SUPABASE_URL=(.*)$').Matches[0].Groups[1].Value; pnpm db:deploy; pnpm db:travas; Remove-Item Env:DATABASE_URL
```

Tem que terminar com todas as migrações de `prisma/migrations` aplicadas (14 em 27/11) e "Tudo trancado: RLS em todas as tabelas e nenhuma permissão para anon/authenticated".

## Passo 3. Copiar os dados deste PC para o Supabase

1. **Pare o worker** (feche o terminal do `pnpm worker`/`pnpm dev`). Sem isso, o que entrar durante a cópia fica só no banco local.
2. Rode:

```powershell
pnpm db:copiar-supabase
```

O script (`scripts/supabase-copiar.mjs`):
- para sem mexer em nada se o Supabase já tiver ofertas ou usuários;
- faz um dump só dos dados em `~/garimpo-backups/garimpo-dados-...-para-supabase.dump`, sem as sessões de login (todo mundo entra de novo no site novo);
- troca os cargos e permissões de fábrica pelos seus e restaura tudo numa transação só;
- mostra uma tabela com a contagem de linhas nos dois bancos. Tem que terminar com "pronto: o Supabase tem os mesmos dados deste PC".

## Passo 4. Ligar o worker no Supabase

No `.env` deste PC:

```
# DATABASE_URL=postgres://...@localhost:5432/...   <- a antiga, comentada (é a volta, se precisar)
DATABASE_URL=<a URL do Session pooler, porta 5432>
```

Ligue o worker de novo (`pnpm worker`). Em 1 a 2 minutos o Telegram volta a ler e as ofertas novas vão para o Supabase. O site local (`pnpm dev:web`) passa a mostrar o banco do Supabase também.

> O worker precisa do modo **sessão** (5432): ele usa LISTEN para receber os comandos do site.

> Ao ligar, o worker **não** reclassifica mais as ofertas de 7 dias (no Supabase são milhares de idas e voltas de ~70 ms: horas com o Telegram parado). Depois de mudar o parser ou `config/alvos.ts`, ligue uma vez com `REMATCH_AO_LIGAR=1` no `.env`.

## Passo 5. Publicar o site na Vercel

1. Entre em https://vercel.com com o GitHub.
2. **Add New → Project → Import** o repositório `garimpo`.
3. **Framework:** Next.js (detecta sozinho). **Root Directory:** `./`. Build e install ficam no padrão (o `pnpm` vem do `packageManager` do `package.json`).
4. **Environment Variables** (marque Production e Preview):

| Nome | Valor |
|---|---|
| `DATABASE_URL` | URL do **Transaction pooler** (porta 6543) |
| `DATABASE_LISTEN_URL` | URL do **Session pooler** (porta 5432) |
| `BETTER_AUTH_SECRET` | um segredo novo: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` |
| `BETTER_AUTH_URL` | por enquanto `https://garimpo.vercel.app` (acerta no passo 6) |
| `GOOGLE_CLIENT_ID` | o mesmo do `.env` (opcional: sem ele, o botão do Google some) |
| `GOOGLE_CLIENT_SECRET` | o mesmo do `.env` (opcional) |
| `AI_PROVIDER` | `claude-cli` (só para o site mostrar o nome certo) |

   **Não** ponha: `TELEGRAM_*`, `CLAUDE_CODE_OAUTH_TOKEN`, `ANTHROPIC_API_KEY`, `WORKER_ROLES`, `PORT`, `PG_BIN`, `SUPABASE_URL`.
5. **Deploy.** Espere o build (uns 2 a 4 minutos).
6. Em **Settings → Functions → Function Region**, escolha **São Paulo, Brazil (gru1)**, perto do banco, e faça **Redeploy**.
7. A Vercel publica em produção o branch padrão do GitHub (`main`).

## Passo 6. Acertar o endereço do login

1. Veja o endereço final em **Settings → Domains** (ex.: `https://garimpo-xyz.vercel.app`).
2. Troque `BETTER_AUTH_URL` na Vercel por ele, sem barra no fim, e faça **Redeploy**.
3. **Google** (se usar): no Google Cloud Console → APIs e serviços → Credenciais → o seu ID do cliente OAuth:
   - **Origens JavaScript autorizadas:** acrescente `https://garimpo-xyz.vercel.app`
   - **URIs de redirecionamento autorizados:** acrescente `https://garimpo-xyz.vercel.app/api/auth/callback/google`
   - Deixe as de `localhost` também (o site local continua funcionando).

## Passo 7. Conferir

- Abra o endereço da Vercel: a Vitrine aparece para visitante.
- Entre com a sua conta (e-mail e senha de sempre: as contas vieram na cópia; só as sessões não).
- **Admin → Painel:** ofertas chegando, "Acessos" contando você, Telegram "Conectado".
- Deixe a Vitrine aberta: uma oferta nova aparece sozinha ("Ao vivo"), sinal de que o tempo real (LISTEN no modo sessão) funciona.
- No celular, fora do Wi-Fi de casa: abre e entra igual.
- Neste PC: `pnpm db:travas` com o `DATABASE_URL` do Supabase continua "Tudo trancado".

## Se der errado (voltar)

- O banco local continua intacto. Volte o `DATABASE_URL` do `.env` para a linha antiga e religue o worker: tudo volta a ser como antes do deploy (as ofertas que entraram só no Supabase ficam lá).
- Na Vercel, **Deployments → (um deploy antigo) → Promote to Production** volta o site.

## Cuidados

- **Supabase grátis pausa** o projeto depois de 7 dias sem uso. Com o worker ligado isso não acontece; se ficar mais de uma semana desligado, entre no painel do Supabase e clique em **Restore**.
- **Limite de 500 MB:** o Painel do Supabase mostra o tamanho. Hoje são 68 MB; `raw_messages` é a maior.
- **Vercel Hobby** é para uso pessoal e não comercial.
- **Backups:** `pnpm db:backup` com o `DATABASE_URL` do Supabase faz o dump de lá (o plano grátis não guarda backups para você baixar).
- **Migrações novas:** sempre `pnpm db:backup` antes e `pnpm db:deploy` com o `DATABASE_URL` do Supabase (modo sessão). Depois, `pnpm db:travas`.
