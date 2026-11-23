import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { exigir } from "@/lib/sessao";

// Ignorar um convite achado nas mensagens (o app nunca entra em grupo sozinho).
const Body = z.object({ link: z.string().min(3).max(200) });

export async function PATCH(request: Request) {
  const eu = await exigir("fontes.gerenciar", request);
  if (eu instanceof Response) return eu;
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ erro: "pedido inválido" }, { status: 400 });
  await prisma.invite.updateMany({ where: { link: parsed.data.link }, data: { dismissed: true } });
  return Response.json({ ok: true });
}
