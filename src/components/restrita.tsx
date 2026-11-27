import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import type { Permissao } from "@/config/permissoes";
import { getUser, pode } from "@/lib/sessao";

/**
 * Tela que exige uma permissão, conferida NO SERVIDOR (revisão de segurança, 26/11): sem a permissão, o conteúdo da tela
 * nem é montado nem vai na resposta. Antes a conferência era só no navegador: a tela não mostrava, mas o servidor
 * mandava a página igual. Os dados continuam barrados também nas rotas da API (exigir()), que respondem 401/403.
 * Fica dentro de um <Suspense> porque ler a sessão é coisa do pedido (Cache Components). Vai em cada página, não no
 * layout: o layout não roda de novo quando se navega entre as abas.
 */
export function Restrita({ perm, children }: { perm: Permissao; children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <Conferir perm={perm}>{children}</Conferir>
    </Suspense>
  );
}

async function Conferir({ perm, children }: { perm: Permissao; children: React.ReactNode }) {
  const eu = await getUser();
  // Cookie vencido, conta apagada ou desativada: volta para a Vitrine com o popup de entrar.
  if (!eu) redirect("/?entrar=1");
  if (!pode(eu, perm)) {
    return (
      <main className="grid min-h-[60vh] place-items-center px-4">
        <div className="flex max-w-sm flex-col gap-3 rounded-2xl border border-card-line bg-surface p-6 text-center">
          <h1 className="text-lg font-semibold">Esta tela não está liberada para você</h1>
          <p className="text-sm text-muted">Seu cargo ({eu.cargo.nome}) não tem acesso a ela.</p>
          <Link href="/" className="mx-auto flex h-10 items-center rounded-[10px] border border-control px-4 text-[13px] font-medium text-ink-2 hover:text-ink">
            Voltar para a Vitrine
          </Link>
        </div>
      </main>
    );
  }
  return <>{children}</>;
}
