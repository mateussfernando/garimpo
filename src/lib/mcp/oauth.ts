// Servidor OAuth 2.1 do MCP (27/11), para o claude.ai e outros clientes entrarem no /api/mcp com login e consentimento.
// Segue a especificação de autorização do MCP: metadados do recurso (RFC 9728) e do servidor (RFC 8414), registro
// dinâmico de cliente (RFC 7591), código de autorização só com PKCE S256 e tokens de renovação que trocam a cada uso.
// Feito no app, sem dependência nova. Códigos e tokens guardam só o hash SHA-256 (tabelas oauth_*).
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/db/prisma";
import { hashDaChave } from "@/lib/mcp/chaves";

export const ESCOPO = "garimpo";
const CODIGO_MS = 5 * 60_000;
export const ACESSO_S = 3600;
const RENOVACAO_MS = 30 * 24 * 3_600_000;

/**
 * A origem pela qual o cliente chegou (localhost, rede de casa ou o site publicado): emissor e endereços saem dela.
 * Do cabeçalho Host (na Vercel, x-forwarded-*), não do request.url: no next dev ele vem como 0.0.0.0.
 */
export function origemDe(request: Request | Headers): string {
  const h = request instanceof Headers ? request : request.headers;
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!host) return new URL((request as Request).url).origin;
  const proto = h.get("x-forwarded-proto")?.split(",")[0].trim() ?? (request instanceof Headers ? "http" : new URL(request.url).protocol.replace(":", ""));
  return `${proto}://${host}`;
}
export const recursoDe = (origem: string) => `${origem}/api/mcp`;

export function metadadosRecurso(origem: string) {
  return { resource: recursoDe(origem), authorization_servers: [origem], scopes_supported: [ESCOPO], bearer_methods_supported: ["header"], resource_name: "Garimpo" };
}

export function metadadosServidor(origem: string) {
  return {
    issuer: origem,
    authorization_endpoint: `${origem}/oauth/autorizar`,
    token_endpoint: `${origem}/api/oauth/token`,
    registration_endpoint: `${origem}/api/oauth/registrar`,
    scopes_supported: [ESCOPO],
    response_types_supported: ["code"],
    response_modes_supported: ["query"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["none", "client_secret_post", "client_secret_basic"],
  };
}

/** Para onde o código pode voltar: https, ou http só no próprio computador (localhost). Nada de fragmento (#). */
export function redirectValido(uri: string): boolean {
  try {
    const u = new URL(uri);
    if (u.hash || u.username || u.password) return false;
    if (u.protocol === "https:") return true;
    return u.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(u.hostname);
  } catch {
    return false;
  }
}

const aleatorio = (prefixo = "") => prefixo + randomBytes(32).toString("base64url");
const iguais = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

// ---------- Registro dinâmico (RFC 7591) ----------

export type Registro = { redirect_uris?: unknown; client_name?: unknown; token_endpoint_auth_method?: unknown; grant_types?: unknown; response_types?: unknown };

export async function registrarCliente(r: Registro): Promise<{ ok: true; dados: Record<string, unknown> } | { ok: false; erro: string; descricao: string }> {
  const uris = Array.isArray(r.redirect_uris) ? r.redirect_uris.filter((u): u is string => typeof u === "string") : [];
  if (!uris.length || uris.length > 10 || !uris.every(redirectValido)) {
    return { ok: false, erro: "invalid_redirect_uri", descricao: "redirect_uris: de 1 a 10 endereços https (ou http://localhost)" };
  }
  const metodo = typeof r.token_endpoint_auth_method === "string" ? r.token_endpoint_auth_method : "client_secret_basic";
  if (!["none", "client_secret_post", "client_secret_basic"].includes(metodo)) {
    return { ok: false, erro: "invalid_client_metadata", descricao: "token_endpoint_auth_method não suportado" };
  }
  const nome = (typeof r.client_name === "string" ? r.client_name : "").trim().slice(0, 80) || "Cliente MCP";
  const clientId = aleatorio("gmc_");
  const segredo = metodo === "none" ? null : aleatorio("gms_");
  await prisma.oauthCliente.create({ data: { clientId, segredoHash: segredo ? hashDaChave(segredo) : null, authMetodo: metodo, nome, redirectUris: uris } });
  return {
    ok: true,
    dados: {
      client_id: clientId,
      ...(segredo ? { client_secret: segredo, client_secret_expires_at: 0 } : {}),
      client_id_issued_at: Math.floor(Date.now() / 1000),
      client_name: nome,
      redirect_uris: uris,
      token_endpoint_auth_method: metodo,
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
    },
  };
}

/** O cliente ativo com este id, se o redirect_uri for exatamente um dos registrados. */
export async function clienteComRedirect(clientId: string, redirectUri: string) {
  const c = await prisma.oauthCliente.findUnique({ where: { clientId } });
  return c?.isActive && c.redirectUris.includes(redirectUri) ? c : null;
}

// ---------- Autorização ----------

export type PedidoAutorizacao = { clientId: string; redirectUri: string; state: string | null; desafio: string; escopo: string; recurso: string | null };

/** Confere o pedido do /oauth/autorizar. `voltar` = dá para devolver o erro ao cliente (redirect conhecido). */
export async function conferirPedido(p: URLSearchParams, origem: string) {
  const clientId = p.get("client_id") ?? "";
  const redirectUri = p.get("redirect_uri") ?? "";
  const cliente = clientId && redirectUri ? await clienteComRedirect(clientId, redirectUri) : null;
  if (!cliente) return { ok: false as const, voltar: false as const, erro: "Cliente ou endereço de retorno desconhecido." };
  const state = p.get("state");
  const falha = (erro: string, descricao: string) => ({ ok: false as const, voltar: true as const, erro: descricao, url: erroParaCliente(redirectUri, erro, descricao, state, origem) });
  if (p.get("response_type") !== "code") return falha("unsupported_response_type", "só response_type=code");
  const desafio = p.get("code_challenge") ?? "";
  if (p.get("code_challenge_method") !== "S256" || !/^[A-Za-z0-9_-]{43}$/.test(desafio)) return falha("invalid_request", "PKCE S256 obrigatório");
  const recurso = p.get("resource");
  if (recurso && recurso.replace(/\/$/, "") !== recursoDe(origem)) return falha("invalid_target", "resource não é este servidor");
  const escopo = (p.get("scope") ?? ESCOPO).split(/\s+/).filter(Boolean);
  if (escopo.some((e) => e !== ESCOPO)) return falha("invalid_scope", `escopo aceito: ${ESCOPO}`);
  const pedido: PedidoAutorizacao = { clientId, redirectUri, state, desafio, escopo: ESCOPO, recurso };
  return { ok: true as const, cliente, pedido };
}

function erroParaCliente(redirectUri: string, erro: string, descricao: string, state: string | null, origem: string) {
  const u = new URL(redirectUri);
  u.searchParams.set("error", erro);
  u.searchParams.set("error_description", descricao);
  if (state) u.searchParams.set("state", state);
  u.searchParams.set("iss", origem);
  return u.toString();
}

/** A pessoa permitiu: código de uso único, 5 minutos, preso ao cliente, ao retorno e ao desafio PKCE. */
export async function emitirCodigo(clienteId: number, userId: number, p: PedidoAutorizacao, origem: string): Promise<string> {
  const codigo = aleatorio();
  await prisma.oauthCodigo.create({
    data: { hash: hashDaChave(codigo), clienteId, userId, redirectUri: p.redirectUri, desafio: p.desafio, escopo: p.escopo, expiraEm: new Date(Date.now() + CODIGO_MS) },
  });
  const u = new URL(p.redirectUri);
  u.searchParams.set("code", codigo);
  if (p.state) u.searchParams.set("state", p.state);
  u.searchParams.set("iss", origem);
  return u.toString();
}

export const recusado = (p: PedidoAutorizacao, origem: string) => erroParaCliente(p.redirectUri, "access_denied", "a pessoa recusou", p.state, origem);

// ---------- Token ----------

type ErroToken = { erro: string; descricao: string; status?: number };
type Tokens = { access_token: string; token_type: "Bearer"; expires_in: number; refresh_token: string; scope: string };

/** Quem é o cliente no /token: client_id (corpo ou Basic) e, se for confidencial, o segredo certo. */
async function autenticarCliente(corpo: URLSearchParams, authorization: string | null) {
  let clientId = corpo.get("client_id");
  let segredo = corpo.get("client_secret");
  const basic = /^Basic\s+(\S+)$/i.exec(authorization ?? "");
  if (basic) {
    const [id, s] = Buffer.from(basic[1], "base64").toString("utf8").split(":");
    clientId = decodeURIComponent(id ?? "");
    segredo = decodeURIComponent(s ?? "");
  }
  if (!clientId) return null;
  const c = await prisma.oauthCliente.findUnique({ where: { clientId } });
  if (!c?.isActive) return null;
  if (c.segredoHash && !(segredo && iguais(hashDaChave(segredo), c.segredoHash))) return null;
  return c;
}

async function emitirTokens(clienteId: number, userId: number, escopo: string): Promise<Tokens> {
  const acesso = aleatorio("gma_");
  const renovacao = aleatorio("gmr_");
  const agora = Date.now();
  await prisma.oauthToken.createMany({
    data: [
      { hash: hashDaChave(acesso), tipo: "acesso", clienteId, userId, escopo, expiraEm: new Date(agora + ACESSO_S * 1000) },
      { hash: hashDaChave(renovacao), tipo: "renovacao", clienteId, userId, escopo, expiraEm: new Date(agora + RENOVACAO_MS) },
    ],
  });
  return { access_token: acesso, token_type: "Bearer", expires_in: ACESSO_S, refresh_token: renovacao, scope: escopo };
}

const pkceOk = (verificador: string, desafio: string) =>
  /^[A-Za-z0-9._~-]{43,128}$/.test(verificador) && iguais(createHash("sha256").update(verificador).digest("base64url"), desafio);

export async function trocarToken(corpo: URLSearchParams, authorization: string | null): Promise<Tokens | ErroToken> {
  const cliente = await autenticarCliente(corpo, authorization);
  if (!cliente) return { erro: "invalid_client", descricao: "cliente desconhecido ou segredo errado", status: 401 };
  const tipo = corpo.get("grant_type");

  if (tipo === "authorization_code") {
    const codigo = corpo.get("code") ?? "";
    const row = codigo ? await prisma.oauthCodigo.findUnique({ where: { hash: hashDaChave(codigo) } }) : null;
    if (!row || row.clienteId !== cliente.id || row.redirectUri !== corpo.get("redirect_uri")) return { erro: "invalid_grant", descricao: "código inválido" };
    // Uso único, gravado antes de emitir: duas trocas ao mesmo tempo, só uma passa (updateMany com usadoEm nulo).
    const marcado = await prisma.oauthCodigo.updateMany({ where: { id: row.id, usadoEm: null, expiraEm: { gt: new Date() } }, data: { usadoEm: new Date() } });
    if (!marcado.count) {
      // Código reaproveitado: derruba os tokens que ele gerou (RFC 6749, 10.5).
      if (row.usadoEm) await prisma.oauthToken.updateMany({ where: { clienteId: cliente.id, userId: row.userId, criadoEm: { gte: row.criadoEm } }, data: { isActive: false } });
      return { erro: "invalid_grant", descricao: "código vencido ou já usado" };
    }
    if (!pkceOk(corpo.get("code_verifier") ?? "", row.desafio)) return { erro: "invalid_grant", descricao: "code_verifier não confere" };
    return emitirTokens(cliente.id, row.userId, row.escopo);
  }

  if (tipo === "refresh_token") {
    const token = corpo.get("refresh_token") ?? "";
    const row = token.startsWith("gmr_") ? await prisma.oauthToken.findUnique({ where: { hash: hashDaChave(token) } }) : null;
    if (!row || row.tipo !== "renovacao" || row.clienteId !== cliente.id) return { erro: "invalid_grant", descricao: "refresh_token inválido" };
    // Troca a cada uso: o usado sai de vez. Se alguém tentar de novo com ele, todos os tokens desse cliente e conta caem.
    const marcado = await prisma.oauthToken.updateMany({ where: { id: row.id, isActive: true, usadoEm: null, expiraEm: { gt: new Date() } }, data: { usadoEm: new Date(), isActive: false } });
    if (!marcado.count) {
      if (row.usadoEm) await prisma.oauthToken.updateMany({ where: { clienteId: cliente.id, userId: row.userId }, data: { isActive: false } });
      return { erro: "invalid_grant", descricao: "refresh_token vencido ou já usado" };
    }
    const dono = await prisma.user.findUnique({ where: { id: row.userId }, select: { isActive: true } });
    if (!dono?.isActive) return { erro: "invalid_grant", descricao: "conta desativada" };
    return emitirTokens(cliente.id, row.userId, row.escopo);
  }

  return { erro: "unsupported_grant_type", descricao: "use authorization_code ou refresh_token" };
}

/** O dono de um token de acesso válido (gma_...); null = não existe, venceu ou foi derrubado. */
export async function donoDoToken(token: string): Promise<number | null> {
  if (!/^gma_[A-Za-z0-9_-]{43}$/.test(token)) return null;
  const row = await prisma.oauthToken.findUnique({ where: { hash: hashDaChave(token) }, include: { cliente: { select: { isActive: true } } } });
  if (!row || row.tipo !== "acesso" || !row.isActive || !row.cliente.isActive || row.expiraEm <= new Date()) return null;
  return row.userId;
}

/** CORS das rotas públicas do OAuth (metadados, registro e token): clientes no navegador também usam. Sem cookie nenhum. */
export const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type, Authorization, MCP-Protocol-Version" };
