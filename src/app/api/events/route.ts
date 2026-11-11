import { desc } from "drizzle-orm";
import { connection } from "next/server";
import { STORES } from "@/config/stores";
import { db, schema } from "@/lib/db";
import { cleanTitle } from "@/lib/offers";

export type EventDTO = {
  id: number;
  type: "nova" | "preco" | "esgotou" | "alvo" | "canal";
  offerId: number | null;
  title: string;
  store: string | null;
  from: number | null;
  to: number | null;
  target: number | null;
  band: string | null;
  at: string;
};

// Últimos acontecimentos da faixa "Ao vivo". O worker grava; a tela só lê.
export async function GET() {
  await connection();
  const rows = await db.select().from(schema.events).orderBy(desc(schema.events.id)).limit(60);
  const out: EventDTO[] = rows.map((e) => ({
    id: e.id,
    type: e.type as EventDTO["type"],
    offerId: e.offerId,
    title: cleanTitle(e.title),
    store: STORES.find((s) => s.slug === e.detail?.store)?.name ?? null,
    from: e.detail?.from ?? null,
    to: e.detail?.to ?? null,
    target: e.detail?.target ?? null,
    band: e.detail?.band ?? null,
    at: e.at.toISOString(),
  }));
  return Response.json(out, { headers: { "Cache-Control": "no-store" } });
}
