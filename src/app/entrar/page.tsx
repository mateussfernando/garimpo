import { Suspense } from "react";
import { Entrar } from "@/components/entrar";
import { googleEnabled } from "@/lib/auth";

export const metadata = { title: "Garimpo · Entrar" };

// O formulário lê ?de= (para onde voltar), então fica atrás de um Suspense.
export default function Page() {
  return (
    <Suspense fallback={null}>
      <Entrar google={googleEnabled()} />
    </Suspense>
  );
}
