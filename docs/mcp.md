# MCP do Garimpo

O Garimpo fala o protocolo MCP: o Claude consegue buscar ofertas, ver detalhes, cupons, Alvos e o Painel, e mudar o básico (marcar ofertas, criar e editar Alvos, janela da Vitrine, IA). As ferramentas ficam em `src/lib/mcp/servidor.ts` e usam as mesmas permissões e o mesmo filtro de visão do site.

## Ferramentas

| Ferramenta | O que faz | Permissão |
|---|---|---|
| `buscar_ofertas` | Ofertas da Vitrine com filtros (busca, categoria, loja, preço máximo, Alvo atingido, vigiadas) | `ofertas.ver` |
| `ver_oferta` | Detalhe: histórico de preço, outras lojas, de onde veio, análise da IA | `ofertas.ver` |
| `listar_cupons` | Cupons dos últimos 3 dias | `ofertas.ver` |
| `status_garimpo` | Ofertas de hoje, Alvos, radar; fontes e fila para quem vê o sistema | `ofertas.ver` |
| `listar_alvos` | Os seus Alvos, com faixas e preço-alvo | `alvos.proprios` |
| `painel_admin` | Os números do Painel e os acessos ao site | `sistema.ver` |
| `marcar_oferta` | Vigiar, descartar ou soneca (só na sua conta) | `ofertas.ver` |
| `criar_alvo` / `editar_alvo` | Criar, editar, ligar e desligar Alvos seus | `alvos.proprios` |
| `janela_vitrine` | Ver ou mudar de quantas horas a Vitrine mostra (para todos) | `ofertas.moderar` |
| `controlar_ia` | Pausar, continuar ou "Chamar IA agora" (o worker faz) | `ia.gerenciar` |

Nada apaga dados: descartar e desligar só escondem.

## Neste PC (Claude Code)

O `.mcp.json` do projeto já registra o servidor `garimpo`. Ao abrir o Claude Code na pasta do projeto, aprove o servidor quando ele perguntar. Ele roda `scripts/mcp.ts` por stdio e lê o banco do `DATABASE_URL` do `.env`.

- Conta usada: `GARIMPO_MCP_EMAIL` no `.env`; sem ela, o único admin ativo.
- Para testar à mão: `pnpm mcp` (fica esperando o protocolo no stdin; Ctrl+C sai).

## Pela internet (`/api/mcp`)

O site atende MCP em `https://<site>/api/mcp` (Streamable HTTP). Cada pedido precisa de uma chave de acesso no cabeçalho `Authorization: Bearer gmp_...` e roda com as permissões da conta dona dela.

Criar, listar e desligar chaves (neste PC, com o `.env` apontando para o banco do site):

```powershell
pnpm mcp:chave criar <e-mail da conta> "Claude Code do notebook"
```

```powershell
pnpm mcp:chave listar
```

```powershell
pnpm mcp:chave desligar <id>
```

A chave aparece uma vez; o banco guarda só o hash (`chaves_mcp`). Desligada, para na hora.

Ligar no Claude Code de outro PC:

```powershell
claude mcp add --transport http garimpo https://<site>/api/mcp --header "Authorization: Bearer <a chave>"
```

## No claude.ai (conector com login OAuth)

Só funciona com o site publicado (https), porque o claude.ai precisa alcançar o endereço.

1. No claude.ai: **Configurações → Conectores → Adicionar conector personalizado**.
2. Nome: `Garimpo`. URL: `https://<site>/api/mcp`. Deixe Client ID e segredo vazios (o claude.ai se registra sozinho).
3. Clique em **Conectar**. Abre o Garimpo: entre com a sua conta, se pedir, e clique em **Permitir**.
4. Pronto: o claude.ai usa as ferramentas com as permissões da sua conta.

Como funciona (`src/lib/mcp/oauth.ts`, sem dependência nova):
- `/api/mcp` sem token responde 401 apontando para `/.well-known/oauth-protected-resource/api/mcp`, que aponta para `/.well-known/oauth-authorization-server`.
- O cliente se registra em `/api/oauth/registrar` (retorno só https ou `http://localhost`), manda a pessoa para `/oauth/autorizar` (tela de consentimento, com login) e troca o código em `/api/oauth/token`.
- Só PKCE S256. Código de 5 minutos e de uso único; token de acesso `gma_` de 1 hora; renovação `gmr_` de 30 dias que troca a cada uso. Código ou renovação usados duas vezes derrubam os tokens daquele app.
- Códigos e tokens guardam só o hash (`oauth_clientes`, `oauth_codigos`, `oauth_tokens`).
- Cortar o acesso: `pnpm mcp:chave listar` mostra os apps que entraram pelo OAuth, e `pnpm mcp:chave desligar oauth:<id>` corta um app com todos os tokens dele.
