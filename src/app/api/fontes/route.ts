import { connection } from "next/server";
import { z } from "zod";
import { SUGESTOES } from "@/config/fontes";
import { NOTIFY_CHANNEL, db, pool, schema } from "@/lib/db";
import { checkFonte, getFontes, newSourceSlug, urlOfFonte } from "@/lib/fontes";

export async function GET() {
  await connection();
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
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ erro: parsed.error.issues[0]?.message ?? "pedido inválido" }, { status: 400 });
  const b = parsed.data;
  let row: typeof schema.sources.$inferInsert;
  if ("sugestao" in b) {
    const s = SUGESTOES.find((x) => x.slug === b.sugestao);
    if (!s) return Response.json({ erro: "sugestão não encontrada" }, { status: 404 });
    const c = checkFonte(s.kind, s.config, null);
    if ("erro" in c) return Response.json({ erro: c.erro }, { status: 400 });
    row = { slug: s.slug, kind: s.kind, name: s.name, url: urlOfFonte(s.kind, c.config), config: c.config, origin: "usuario", decision: "confirmada" };
  } else {
    const c = checkFonte(b.kind, b.config, b.intervalMin);
    if ("erro" in c) return Response.json({ erro: c.erro }, { status: 400 });
    row = { slug: await newSourceSlug(b.name), kind: b.kind, name: b.name, url: urlOfFonte(b.kind, c.config), config: c.config, intervalMin: b.intervalMin, origin: "usuario", decision: "confirmada" };
  }
  const [r] = await db.insert(schema.sources).values({ ...row, enabled: true }).onConflictDoNothing().returning({ id: schema.sources.id });
  if (!r) return Response.json({ erro: "essa fonte já existe" }, { status: 409 });
  await pool.query("select pg_notify($1, $2)", [NOTIFY_CHANNEL, JSON.stringify({ type: "source" })]);
  return Response.json({ ok: true, id: r.id });
}
