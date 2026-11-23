"use client";

import { AvisoConta } from "./conta-aviso";
import { PrecoPopup, PrecoSync } from "./preco";
import { TemaSync } from "./tema";

/** O que vale em toda página: a escolha de preço (junção conta/navegador e popup) e o aviso "crie uma conta". */
export function Globais({ google }: { google: boolean }) {
  return (
    <>
      <TemaSync />
      <PrecoSync />
      <PrecoPopup />
      <AvisoConta google={google} />
    </>
  );
}
