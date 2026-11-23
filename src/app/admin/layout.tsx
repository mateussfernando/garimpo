import { AdminShell } from "@/components/admin-shell";

// A área Admin (Painel, Fontes, Lojas, Fila da IA, Usuários) tem o cabeçalho do app e as abas de administração.
export default function Layout({ children }: LayoutProps<"/admin">) {
  return <AdminShell>{children}</AdminShell>;
}
