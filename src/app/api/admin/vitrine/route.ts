import { connection } from "next/server";
import { z } from "zod";
import { ATALHOS_JANELA, JANELA_KEY, JANELA_MAX, JANELA_MIN } from "@/config/janela";
import { prisma } from "@/lib/db/prisma";
import { NA_VITRINE } from "@/lib/db/types";
import { getJanelaHoras } from "@/lib/janela";
import { exigir } from "@/lib/sessao";
import { setSetting } from "@/lib/settings";

// Janela da Vitrine: de quantas horas para trás as ofertas aparecem para todos. Mudar é de quem modera a Vitrine.
export async function GET() {
  await connection();
  const eu = await exigir("ofertas.moderar");
  if (eu instanceof Response) return eu;
  // Quantas ofertas cada atalho traria agora: com o worker parado, "24 h" pode deixar a Vitrine vazia.
  const contagem = Object.fromEntries(
    await Promise.all(
      ATALHOS_JANELA.map(async (h) => [h, await prisma.offer.count({ where: { kind: "produto", ...NA_VITRINE, createdAt: { gte: new Date(Date.now() - h * 3_600_000) } } })] as const),
    ),
  );
  return Response.json({ horas: await getJanelaHoras(), contagem }, { headers: { "Cache-Control": "no-store" } });
}

const Body = z.object({ horas: z.number().int().min(JANELA_MIN).max(JANELA_MAX) }).strict();

export async function PATCH(request: Request) {
  const eu = await exigir("ofertas.moderar", request);
  if (eu instanceof Response) return eu;
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ erro: `escolha de ${JANELA_MIN} a ${JANELA_MAX} horas` }, { status: 400 });
  await setSetting(JANELA_KEY, parsed.data.horas);
  return Response.json({ ok: true, horas: parsed.data.horas });
}
