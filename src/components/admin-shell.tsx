"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Permissao } from "@/config/permissoes";
import { AppHeader, PERMISSOES_ADMIN, podeVer, useMe, useStatus } from "./shell";

// A área Admin: o cabeçalho do app e as abas de administração. Cada aba aparece só com a permissão dela; quem barra de
// verdade são as rotas da API (exigir()).
const ABAS: { href: string; rotulo: string; perm: Permissao }[] = [
  { href: "/admin", rotulo: "Painel", perm: "sistema.ver" },
  { href: "/admin/fontes", rotulo: "Fontes", perm: "fontes.gerenciar" },
  { href: "/admin/lojas", rotulo: "Lojas", perm: "lojas.gerenciar" },
  { href: "/admin/ia", rotulo: "Fila da IA", perm: "ia.gerenciar" },
  { href: "/admin/usuarios", rotulo: "Usuários", perm: "usuarios.gerenciar" },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const me = useMe();
  const { live } = useStatus();
  const caminho = usePathname();
  const abas = ABAS.filter((a) => podeVer(me, a.perm));
  const ativa = (href: string) => (href === "/admin" ? caminho === "/admin" : caminho.startsWith(href));
  const pode = PERMISSOES_ADMIN.some((p) => podeVer(me, p));
  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader active="admin" live={live} />
      <div className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col gap-6 px-4 pb-10 pt-6 sm:px-8 lg:flex-row lg:gap-8">
        {me && pode && (
          <nav aria-label="Administração" className="flex flex-none gap-1 overflow-x-auto lg:w-48 lg:flex-col lg:overflow-visible">
            <span className="hidden px-3 pb-2 text-[11px] uppercase tracking-[0.06em] text-label lg:block">Admin</span>
            {abas.map((a) => (
              <Link
                key={a.href}
                href={a.href}
                aria-current={ativa(a.href) ? "page" : undefined}
                className={`flex min-h-10 flex-none items-center rounded-[10px] px-3 text-sm font-medium ${ativa(a.href) ? "bg-active text-ink" : "text-ink-2 hover:text-ink"}`}
              >
                {a.rotulo}
              </Link>
            ))}
          </nav>
        )}
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
