import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/lib/db";

// Ignorar um convite achado nas mensagens (o app nunca entra em grupo sozinho).
const Body = z.object({ link: z.string().min(3).max(200) });

export async function PATCH(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ erro: "pedido inválido" }, { status: 400 });
  await db.update(schema.invites).set({ dismissed: true }).where(eq(schema.invites.link, parsed.data.link));
  return Response.json({ ok: true });
}
