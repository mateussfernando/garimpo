// Tipos dos campos JSON do banco (antes ficavam no schema do Drizzle). O Prisma devolve JsonValue;
// a leitura passa por `asJson<T>()` e a gravação de null numa coluna Json opcional por `jsonOrNull()`.
import { Prisma } from "@/generated/prisma/client";

/** Contadores do dia de uma fonte ao vivo (Telegram). `lastId` é a última mensagem já lida, para não ler duas vezes. */
export type SourceStats = { day: string; read: number; withLink: number; touched: number; offers: number; lastId: number };

/** Especificações tiradas do título, sem IA. Servem para comparar só produtos da mesma faixa. */
export type OfferSpecs = {
  inches?: number;
  res?: "hd" | "fhd" | "qhd" | "4k";
  ultrawide?: boolean;
  hz?: number;
  gb?: number;
  nvme?: boolean;
  wireless?: boolean;
  mechanical?: boolean;
  size?: "pequeno" | "medio" | "grande" | "estendido";
};

/** O que só algumas lojas informam na página do produto. */
export type OfferExtra = {
  /** Cartão em 1x, quando a loja dá desconto nessa forma. */
  card1xCents?: number;
  card1xDiscountPct?: number;
  /** Fim da oferta (ISO) e unidades restantes, quando a loja informa. */
  endsAt?: string;
  stockLeft?: number;
  campaign?: string;
  couponNote?: string;
  images?: string[];
  brand?: string;
  rating?: number;
  ratingCount?: number;
};

/** Detalhe de um acontecimento da faixa "Ao vivo". */
export type EventDetail = { from?: number; to?: number; store?: string | null; source?: string; band?: string; target?: number };

/** Lê um campo JSON do banco já no tipo do app. */
export function asJson<T>(value: Prisma.JsonValue | null | undefined): T {
  return value as unknown as T;
}

/**
 * Oferta que está na Vitrine: ativa e, se tem produto, com o produto ativo (is_active). Um admin tira uma oferta ou um
 * produto inteiro (todas as lojas) da Vitrine de todos; aí ela também sai da conferência, da IA e do radar.
 */
export const NA_VITRINE = { isActive: true, NOT: { product: { is: { isActive: false } } } } satisfies Prisma.OfferWhereInput;

/** Valor para gravar numa coluna JSON que aceita null: o Prisma pede `Prisma.DbNull` em vez de null. */
export function jsonOrNull<T>(value: T | null | undefined): Prisma.InputJsonValue | typeof Prisma.DbNull {
  return value == null ? Prisma.DbNull : (value as unknown as Prisma.InputJsonValue);
}

/** Valor para gravar numa coluna JSON obrigatória. */
export function json<T>(value: T): Prisma.InputJsonValue {
  return value as unknown as Prisma.InputJsonValue;
}

/** Linha de `alvos` com termos e exclusões já como listas (no banco são JSON). */
export function alvoFromDb<T extends { terms: Prisma.JsonValue; exclusions: Prisma.JsonValue }>(a: T): Omit<T, "terms" | "exclusions"> & { terms: string[]; exclusions: string[] } {
  return { ...a, terms: asJson<string[]>(a.terms) ?? [], exclusions: asJson<string[]>(a.exclusions) ?? [] };
}
