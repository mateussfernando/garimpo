import { Suspense } from "react";
import { Detalhe } from "@/components/detalhe";

export const metadata = { title: "Garimpo · Detalhe" };

// O id só existe na hora do pedido: a casca é estática e o conteúdo vem ao vivo.
async function Content(props: PageProps<"/oferta/[id]">) {
  const { id } = await props.params;
  return <Detalhe id={Number(id)} />;
}

export default function Page(props: PageProps<"/oferta/[id]">) {
  return (
    <Suspense fallback={<p className="p-8 text-sm text-muted">Carregando…</p>}>
      <Content {...props} />
    </Suspense>
  );
}
