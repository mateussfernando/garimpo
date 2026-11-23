import { z } from "zod";
import { STORES } from "@/config/stores";
import { NOTIFY_CHANNEL, pool } from "@/lib/db";
import { prisma } from "@/lib/db/prisma";
import { exigir } from "@/lib/sessao";

// Pausar ou retomar a verificação de uma loja de config/stores.ts.
const Body = z.object({ paused: z.boolean() });

export async function PATCH(request: Request, ctx: RouteContext<"/api/lojas/[slug]">) {
  const eu = await exigir("lojas.gerenciar", request);
  if (eu instanceof Response) return eu;
  const { slug } = await ctx.params;
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success || !STORES.some((s) => s.slug === slug)) return Response.json({ erro: "pedido inválido" }, { status: 400 });
  await prisma.storeState.upsert({
    where: { slug },
    create: { slug, isActive: !parsed.data.paused },
    update: { isActive: !parsed.data.paused, updatedAt: new Date() },
  });
  await pool.query("select pg_notify($1, $2)", [NOTIFY_CHANNEL, JSON.stringify({ type: "store", slug })]);
  return Response.json({ ok: true });
}
