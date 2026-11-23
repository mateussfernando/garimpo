"use client";

import { AvisoConta } from "./conta-aviso";
import { PrecoPopup, PrecoSync } from "./preco";

/** O que vale em toda página: a escolha de preço (junção conta/navegador e popup) e o aviso "crie uma conta". */
export function Globais() {
  return (
    <>
      <PrecoSync />
      <PrecoPopup />
      <AvisoConta />
    </>
  );
}
