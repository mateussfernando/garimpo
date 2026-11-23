import { connection } from "next/server";
import { z } from "zod";
import { SUGESTOES } from "@/config/fontes";
import { Prisma } from "@/generated/prisma/client";
import { NOTIFY_CHANNEL, pool } from "@/lib/db";
import { prisma } from "@/lib/db/prisma";
import { json } from "@/lib/db/types";
import { checkFonte, getFontes, newSourceSlug, urlOfFonte } from "@/lib/fontes";
import { exigir } from "@/lib/sessao";

export async function GET() {
  await connection();
  const eu = await exigir("fontes.gerenciar");
  if (eu instanceof Response) return eu;
  return Response.json(await getFontes(), { headers: { "Cache-Control": "no-store" } });
}

const Body = z.union([
  z.object({ sugestao: z.string().min(1) }),
  z.object({
    kind: z.enum(["feed", "pagina", "vtex"]),
    name: z.string().trim().min(2, "dê um nome à fonte").max(60),
    config: z.unknown(),
    intervalMin: z.number().int().max(24 * 60).nullable().default(null),
  }),
]);

// Fonte nova: uma sugestão da pesquisa (um clique) ou uma criada por você. Entra ligada; o worker lê no próximo minuto.
export async function POST(request: Request) {
  const eu = await exigir("fontes.gerenciar", request);
  if (eu instanceof Response) return eu;
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ erro: parsed.error.issues[0]?.message ?? "pedido inválido" }, { status: 400 });
  const b = parsed.data;
  let row: Prisma.SourceCreateInput;
  if ("sugestao" in b) {
    const s = SUGESTOES.find((x) => x.slug === b.sugestao);
    if (!s) return Response.json({ erro: "sugestão não encontrada" }, { status: 404 });
    const c = checkFonte(s.kind, s.config, null);
    if ("erro" in c) return Response.json({ erro: c.erro }, { status: 400 });
    row = { slug: s.slug, kind: s.kind, name: s.name, url: urlOfFonte(s.kind, c.config), config: json(c.config), origin: "usuario", decision: "confirmada" };
  } else {
    const c = checkFonte(b.kind, b.config, b.intervalMin);
    if ("erro" in c) return Response.json({ erro: c.erro }, { status: 400 });
    row = { slug: await newSourceSlug(b.name), kind: b.kind, name: b.name, url: urlOfFonte(b.kind, c.config), config: json(c.config), intervalMin: b.intervalMin, origin: "usuario", decision: "confirmada" };
  }
  let r: { id: number };
  try {
    r = await prisma.source.create({ data: { ...row, isActive: true }, select: { id: true } });
  } catch (e) {
    // Slug repetido (a mesma sugestão duas vezes): igual ao "on conflict do nothing" de antes.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return Response.json({ erro: "essa fonte já existe" }, { status: 409 });
    throw e;
  }
  await pool.query("select pg_notify($1, $2)", [NOTIFY_CHANNEL, JSON.stringify({ type: "source" })]);
  return Response.json({ ok: true, id: r.id });
}
