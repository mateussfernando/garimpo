"use client";

import Link from "next/link";
import type { Permissao } from "@/config/permissoes";
import { podeVer, useMe } from "./shell";

/**
 * Tela que exige uma permissão. Só evita mostrar uma tela quebrada: quem barra de verdade é a rota da API (exigir()),
 * que responde 403 para quem não pode.
 */
export function Restrita({ perm, children }: { perm: Permissao; children: React.ReactNode }) {
  const me = useMe();
  if (!me) return null;
  if (!podeVer(me, perm)) {
    return (
      <main className="grid min-h-screen place-items-center px-4">
        <div className="flex max-w-sm flex-col gap-3 rounded-2xl border border-card-line bg-surface p-6 text-center">
          <h1 className="text-lg font-semibold">Esta tela é só para administradores</h1>
          <p className="text-sm text-muted">Seu cargo ({me.cargo.nome}) não tem acesso a ela.</p>
          <Link href="/" className="mx-auto flex h-10 items-center rounded-[10px] border border-control px-4 text-[13px] font-medium text-ink-2 hover:text-ink">
            Voltar para a Vitrine
          </Link>
        </div>
      </main>
    );
  }
  return <>{children}</>;
}
