import { connection } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { AlvoInput, getAlvos, newSlug, tellWorker } from "@/lib/alvos";
import { exigir } from "@/lib/sessao";

export async function GET() {
  await connection();
  const eu = await exigir("alvos.proprios");
  if (eu instanceof Response) return eu;
  return Response.json(await getAlvos(), { headers: { "Cache-Control": "no-store" } });
}

// Alvo novo criado na tela Alvos. O worker reclassifica as ofertas dos últimos 7 dias com ele.
export async function POST(request: Request) {
  const eu = await exigir("alvos.proprios", request);
  if (eu instanceof Response) return eu;
  const parsed = AlvoInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ erro: parsed.error.issues[0]?.message ?? "pedido inválido" }, { status: 400 });
  const { name, terms, exclusions } = parsed.data;
  const row = await prisma.alvo.create({
    data: { slug: await newSlug(name), name, terms, exclusions, origin: "usuario", editedAt: new Date() },
    select: { id: true },
  });
  await tellWorker({ acao: "rematch" });
  return Response.json({ ok: true, id: row.id });
}
