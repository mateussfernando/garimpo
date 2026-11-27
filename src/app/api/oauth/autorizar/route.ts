import { conferirPedido, emitirCodigo, origemDe, recusado } from "@/lib/mcp/oauth";
import { exigir } from "@/lib/sessao";

// O botão da tela de consentimento (/oauth/autorizar). Só com sessão e vindo do próprio site (exigir confere a origem):
// outro site não consegue "permitir" por você. O pedido é conferido de novo aqui, nunca confiando no formulário.
export async function POST(request: Request) {
  const eu = await exigir(undefined, request);
  if (eu instanceof Response) return eu;
  const form = await request.formData().catch(() => null);
  if (!form) return Response.json({ erro: "pedido inválido" }, { status: 400 });
  const p = new URLSearchParams();
  for (const k of ["client_id", "redirect_uri", "response_type", "code_challenge", "code_challenge_method", "state", "scope", "resource"]) {
    const v = form.get(k);
    if (typeof v === "string" && v) p.set(k, v);
  }
  const origem = origemDe(request);
  const c = await conferirPedido(p, origem);
  if (!c.ok) return c.voltar ? Response.redirect(c.url, 303) : Response.json({ erro: c.erro }, { status: 400 });
  const destino = form.get("decisao") === "permitir" ? await emitirCodigo(c.cliente.id, eu.id, c.pedido, origem) : recusado(c.pedido, origem);
  return Response.redirect(destino, 303);
}
