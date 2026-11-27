import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { conferirPedido, origemDe } from "@/lib/mcp/oauth";
import { getUser } from "@/lib/sessao";

// Tela de consentimento do OAuth do MCP: o claude.ai (ou outro cliente) pede para usar o Garimpo com a sua conta.
// Sem sessão, o proxy (e a checagem abaixo) manda entrar e volta para cá. O botão posta em /api/oauth/autorizar,
// que confere tudo de novo e devolve o código ao cliente.

const CAMPOS = ["client_id", "redirect_uri", "response_type", "code_challenge", "code_challenge_method", "state", "scope", "resource"] as const;

export default function Page({ searchParams }: PageProps<"/oauth/autorizar">) {
  return (
    <Suspense fallback={null}>
      <Consentir searchParams={searchParams} />
    </Suspense>
  );
}

async function Consentir({ searchParams }: { searchParams: PageProps<"/oauth/autorizar">["searchParams"] }) {
  const sp = await searchParams;
  const p = new URLSearchParams();
  for (const k of CAMPOS) {
    const v = sp[k];
    if (typeof v === "string" && v) p.set(k, v);
  }
  const eu = await getUser();
  if (!eu) redirect(`/?entrar=1&de=${encodeURIComponent(`/oauth/autorizar?${p}`)}`);
  const origem = origemDe(await headers());
  const c = await conferirPedido(p, origem);
  if (!c.ok) {
    if (c.voltar) redirect(c.url);
    return (
      <Cartao titulo="Pedido de acesso inválido">
        <p className="text-sm text-muted">{c.erro} Volte ao aplicativo que pediu o acesso e tente conectar de novo.</p>
        <Link href="/" className="mx-auto flex h-10 items-center rounded-[10px] border border-control px-4 text-[13px] font-medium text-ink-2 hover:text-ink">
          Voltar para a Vitrine
        </Link>
      </Cartao>
    );
  }
  const destino = new URL(c.pedido.redirectUri).host;
  return (
    <Cartao titulo={`${c.cliente.nome} quer usar o Garimpo`}>
      <p className="text-sm text-muted">
        Com a sua conta <strong className="text-ink">{eu.name}</strong> ({eu.cargo.nome}). Depois de permitir, você volta para <strong className="text-ink">{destino}</strong>.
      </p>
      <ul className="flex flex-col gap-1.5 text-left text-sm text-ink-2">
        <li>• Buscar e ver ofertas, cupons e os seus Alvos</li>
        <li>• Vigiar, descartar e adiar ofertas, e criar e editar Alvos</li>
        <li>• O que o seu cargo permite no Painel, na janela da Vitrine e na IA</li>
        <li className="text-muted">Nada é apagado. O acesso dura até ser desligado no PC do Garimpo (pnpm mcp:chave listar e desligar).</li>
      </ul>
      <form method="post" action="/api/oauth/autorizar" className="flex gap-2">
        {[...p.entries()].map(([k, v]) => (
          <input key={k} type="hidden" name={k} value={v} />
        ))}
        <button type="submit" name="decisao" value="recusar" className="h-11 flex-1 rounded-[10px] border border-control text-[14px] font-medium text-ink-2 hover:text-ink">
          Recusar
        </button>
        <button type="submit" name="decisao" value="permitir" className="h-11 flex-1 rounded-[10px] border border-ink bg-ink text-[14px] font-medium text-bg">
          Permitir
        </button>
      </form>
    </Cartao>
  );
}

function Cartao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <main className="grid min-h-[70vh] place-items-center px-4">
      <div className="flex w-full max-w-md flex-col gap-4 rounded-2xl border border-card-line bg-surface p-6 text-center">
        <h1 className="text-lg font-semibold">{titulo}</h1>
        {children}
      </div>
    </main>
  );
}
