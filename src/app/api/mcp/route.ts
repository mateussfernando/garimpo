import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { connection } from "next/server";
import { usuarioDaChave } from "@/lib/mcp/chaves";
import { servidorGarimpo } from "@/lib/mcp/servidor";

// MCP do Garimpo pela internet (Streamable HTTP, sem sessão guardada): cada pedido traz a chave de acesso
// (`Authorization: Bearer gmp_...`, criada com `pnpm mcp:chave criar`) e roda com as permissões do dono dela.
// Sem cookie: o proxy deixa passar (src/proxy.ts) e a chave é a única porta. Nada de CSRF: navegador não manda Bearer sozinho.
async function atender(request: Request): Promise<Response> {
  await connection();
  const eu = await usuarioDaChave(request.headers.get("authorization"));
  if (!eu) {
    return Response.json(
      { jsonrpc: "2.0", error: { code: -32001, message: "Chave de acesso do Garimpo ausente, errada ou desligada" }, id: null },
      { status: 401, headers: { "WWW-Authenticate": 'Bearer realm="garimpo"' } },
    );
  }
  const server = servidorGarimpo(eu);
  const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
  await server.connect(transport);
  try {
    return await transport.handleRequest(request);
  } finally {
    // Sem sessão: o servidor deste pedido acaba com ele (a resposta já está pronta, em JSON).
    void server.close();
  }
}

export const POST = atender;
export const GET = atender;
export const DELETE = atender;
