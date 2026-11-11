import { z } from "zod";
import { testAlvo } from "@/lib/alvos";

// "O que este Alvo pegaria?": roda o mesmo casamento do worker nas ofertas dos últimos 7 dias. Sem IA.
const Body = z.object({ id: z.number().int().nullable(), terms: z.array(z.string()).max(30), exclusions: z.array(z.string()).max(30) });

export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ erro: "pedido inválido" }, { status: 400 });
  return Response.json(await testAlvo(parsed.data), { headers: { "Cache-Control": "no-store" } });
}
