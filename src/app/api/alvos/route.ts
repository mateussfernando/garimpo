import { connection } from "next/server";
import { criarAlvo } from "@/lib/acoes";
import { AlvoInput, getAlvos } from "@/lib/alvos";
import { exigir } from "@/lib/sessao";

export async function GET() {
  await connection();
  const eu = await exigir("alvos.proprios");
  if (eu instanceof Response) return eu;
  return Response.json(await getAlvos(eu.id), { headers: { "Cache-Control": "no-store" } });
}

// Alvo novo da conta, criado na tela Alvos. O worker reclassifica as ofertas dos últimos 7 dias nos Alvos dela.
export async function POST(request: Request) {
  const eu = await exigir("alvos.proprios", request);
  if (eu instanceof Response) return eu;
  const parsed = AlvoInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ erro: parsed.error.issues[0]?.message ?? "pedido inválido" }, { status: 400 });
  return Response.json({ ok: true, id: await criarAlvo(eu.id, parsed.data) });
}
