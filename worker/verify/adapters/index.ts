import { amazon } from "./amazon";
import { kabum } from "./kabum";
import type { Adapter } from "./types";

// Leitor exato por loja. Loja sem leitor próprio cai no caminho genérico (JSON-LD e texto) de verify.ts.
// O Mercado Livre não tem leitor: a loja pede verificação de conta a robôs, e bloqueio não se contorna.
const ADAPTERS: Record<string, Adapter> = { kabum, amazon };

export function adapterFor(storeSlug: string): Adapter | null {
  return ADAPTERS[storeSlug] ?? null;
}

export type { StoreData } from "./types";
