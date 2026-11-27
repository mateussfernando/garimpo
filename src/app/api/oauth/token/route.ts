import { CORS, trocarToken } from "@/lib/mcp/oauth";

// Troca do código (com PKCE) por tokens, e renovação. Corpo application/x-www-form-urlencoded (RFC 6749).
export async function POST(request: Request) {
  const texto = await request.text().catch(() => "");
  const corpo = new URLSearchParams(texto);
  const r = await trocarToken(corpo, request.headers.get("authorization"));
  const cab = { ...CORS, "Cache-Control": "no-store", Pragma: "no-cache" };
  if ("erro" in r) return Response.json({ error: r.erro, error_description: r.descricao }, { status: r.status ?? 400, headers: cab });
  return Response.json(r, { headers: cab });
}

export const OPTIONS = () => new Response(null, { status: 204, headers: CORS });
