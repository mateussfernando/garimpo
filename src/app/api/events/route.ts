import { connection } from "next/server";
import { STORES } from "@/config/stores";
import { prisma } from "@/lib/db/prisma";
import { asJson, type EventDetail } from "@/lib/db/types";
import { cleanTitle } from "@/lib/offers";
import { exigir, pode } from "@/lib/sessao";

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
  const eu = await exigir("ofertas.ver");
  if (eu instanceof Response) return eu;
  // Os acontecimentos da conta (Alvos dela) e, para quem vê o sistema, o "canal novo" (grupo do Telegram achado).
  const sistema = pode(eu, "sistema.ver");
  const rows = (
    await prisma.event.findMany({
      where: { OR: [{ userId: eu.id }, ...(sistema ? [{ userId: null, type: "canal" }] : [])] },
      orderBy: { id: "desc" },
      take: 60,
    })
  ).map((e) => ({ ...e, detail: asJson<EventDetail | null>(e.detail) }));
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
