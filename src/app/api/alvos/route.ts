import { connection } from "next/server";
import { db, schema } from "@/lib/db";
import { AlvoInput, getAlvos, newSlug, tellWorker } from "@/lib/alvos";

export async function GET() {
  await connection();
  return Response.json(await getAlvos(), { headers: { "Cache-Control": "no-store" } });
}

// Alvo novo criado na tela Alvos. O worker reclassifica as ofertas dos últimos 7 dias com ele.
export async function POST(request: Request) {
  const parsed = AlvoInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ erro: parsed.error.issues[0]?.message ?? "pedido inválido" }, { status: 400 });
  const { name, terms, exclusions } = parsed.data;
  const [row] = await db
    .insert(schema.alvos)
    .values({ slug: await newSlug(name), name, terms, exclusions, origin: "usuario", editedAt: new Date() })
    .returning({ id: schema.alvos.id });
  await tellWorker({ acao: "rematch" });
  return Response.json({ ok: true, id: row.id });
}
