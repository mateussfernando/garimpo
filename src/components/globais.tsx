"use client";

import { Suspense } from "react";
import { AvisoConta } from "./conta-aviso";
import { PrecoPopup, PrecoSync } from "./preco";
import { Presenca } from "./presenca";
import { TemaSync } from "./tema";

/** O que vale em toda página: a escolha de preço (junção conta/navegador e popup), o aviso "crie uma conta" e o "estou aqui" do Painel. */
export function Globais({ google }: { google: boolean }) {
  return (
    <>
      <TemaSync />
      <PrecoSync />
      <PrecoPopup />
      <AvisoConta google={google} />
      {/* usePathname só existe na hora do pedido: sem o Suspense, o build de produção não pré-monta as páginas. */}
      <Suspense fallback={null}>
        <Presenca />
      </Suspense>
    </>
  );
}
