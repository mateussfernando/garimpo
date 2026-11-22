import { z } from "zod";
import { prisma } from "@/lib/db/prisma";

// Ignorar um convite achado nas mensagens (o app nunca entra em grupo sozinho).
const Body = z.object({ link: z.string().min(3).max(200) });

export async function PATCH(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ erro: "pedido inválido" }, { status: 400 });
  await prisma.invite.updateMany({ where: { link: parsed.data.link }, data: { dismissed: true } });
  return Response.json({ ok: true });
}
