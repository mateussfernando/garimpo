import { CORS, metadadosRecurso, metadadosServidor, origemDe } from "@/lib/mcp/oauth";

// Metadados do OAuth do MCP. Os endereços públicos são os da especificação, reescritos para cá no next.config.ts:
//   /.well-known/oauth-protected-resource[/api/mcp]  -> servidor  (RFC 9728: de quem é o /api/mcp)
//   /.well-known/oauth-authorization-server          -> recurso   (RFC 8414: onde entrar e trocar o código)
export async function GET(request: Request, ctx: RouteContext<"/api/oauth/meta/[tipo]">) {
  const { tipo } = await ctx.params;
  const origem = origemDe(request);
  const dados = tipo === "recurso" ? metadadosRecurso(origem) : tipo === "servidor" ? metadadosServidor(origem) : null;
  if (!dados) return Response.json({ erro: "não existe" }, { status: 404, headers: CORS });
  return Response.json(dados, { headers: { ...CORS, "Cache-Control": "no-store" } });
}

export const OPTIONS = () => new Response(null, { status: 204, headers: CORS });
