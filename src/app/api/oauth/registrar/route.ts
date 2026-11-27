import { CORS, registrarCliente, type Registro } from "@/lib/mcp/oauth";

// Registro dinâmico de cliente OAuth (RFC 7591): o claude.ai se registra sozinho antes do primeiro login.
// Registrar não dá acesso a nada: a pessoa ainda precisa entrar e permitir na tela de consentimento.
// Freio simples por servidor: no máximo 60 registros por hora.
let janela = { hora: 0, n: 0 };

export async function POST(request: Request) {
  const hora = Math.floor(Date.now() / 3_600_000);
  if (janela.hora !== hora) janela = { hora, n: 0 };
  if (++janela.n > 60) return Response.json({ error: "temporarily_unavailable" }, { status: 429, headers: CORS });
  const corpo = (await request.json().catch(() => null)) as Registro | null;
  if (!corpo || typeof corpo !== "object") return Response.json({ error: "invalid_client_metadata" }, { status: 400, headers: CORS });
  const r = await registrarCliente(corpo);
  if (!r.ok) return Response.json({ error: r.erro, error_description: r.descricao }, { status: 400, headers: CORS });
  return Response.json(r.dados, { status: 201, headers: { ...CORS, "Cache-Control": "no-store" } });
}

export const OPTIONS = () => new Response(null, { status: 204, headers: CORS });
