"use client";

import { useEffect, useState } from "react";
import type { Permissao } from "@/config/permissoes";
import type { PrecoPref } from "@/lib/preco";

/**
 * Quem está usando o site (de /api/me): a pessoa logada ou o visitante (id null, com as permissões do cargo "Visitante").
 * `precoPreferido` vem do banco para quem tem conta; o visitante guarda a escolha no navegador (src/components/preco.tsx).
 */
export type Me = {
  id: number | null;
  visitante: boolean;
  name: string;
  email: string;
  image: string | null;
  cargo: { id: number; slug: string; nome: string };
  permissoes: Permissao[];
  precoPreferido: PrecoPref | null;
};

let mePromise: Promise<Me | null> | null = null;

/** Uma busca de /api/me por carregamento de página, compartilhada por todos que perguntam. */
export function obterMe(): Promise<Me | null> {
  mePromise ??= fetch("/api/me", { cache: "no-store" })
    .then((r) => {
      // O cargo Visitante não pode ver nada (site fechado para quem não tem conta): vai para a tela de entrar.
      if (r.status === 401 && !location.pathname.startsWith("/entrar")) {
        const de = location.pathname === "/" ? "" : `?de=${encodeURIComponent(location.pathname + location.search)}`;
        location.replace(`/entrar${de}`);
      }
      return r.ok ? (r.json() as Promise<Me>) : null;
    })
    .catch(() => null);
  return mePromise;
}

/** Depois de mudar algo de quem sou (escolha de preço, cargo...), a próxima leitura busca de novo. */
export function esquecerMe() {
  mePromise = null;
}

export function useMe(): Me | null {
  const [me, setMe] = useState<Me | null>(null);
  useEffect(() => {
    let vivo = true;
    void obterMe().then((m) => vivo && setMe(m));
    return () => {
      vivo = false;
    };
  }, []);
  return me;
}

export const podeVer = (me: Me | null, p: Permissao) => !!me?.permissoes.includes(p);
