import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { getUser, mesmaOrigem } from "@/lib/sessao";

// "Estou aqui": cada aba aberta e visível avisa ao abrir uma página e a cada minuto (src/components/presenca.tsx).
// Vira uma linha por pessoa por hora na tabela acessos, que só o Painel do admin lê. Sem IP, sem navegador, sem página.
// Aberta a quem não tem conta (src/proxy.ts), então tem freio: só do próprio site, uma vez a cada 45 s por pessoa (o
// "abriu uma página" passa) e no máximo MAX_VISITANTES_NOVOS visitantes novos por hora em cada servidor.

const Body = z.object({ vid: z.string().uuid().nullable().optional(), pagina: z.boolean().default(false) }).strict();

const MAX_VISITANTES_NOVOS = 3000;
const ultimo = new Map<string, number>();
let novos = { hora: 0, n: 0 };

export async function POST(request: Request) {
  if (!mesmaOrigem(request)) return new Response(null, { status: 403 });
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return new Response(null, { status: 400 });
  const eu = await getUser();
  const quem = eu ? `u:${eu.id}` : parsed.data.vid ? `v:${parsed.data.vid}` : null;
  if (!quem) return new Response(null, { status: 204 });

  const agora = Date.now();
  const { pagina } = parsed.data;
  if (!pagina && agora - (ultimo.get(quem) ?? 0) < 45_000) return new Response(null, { status: 204 });
  const hora = new Date(Math.floor(agora / 3_600_000) * 3_600_000);
  if (!eu && !ultimo.has(quem)) {
    if (novos.hora !== hora.getTime()) novos = { hora: hora.getTime(), n: 0 };
    if (++novos.n > MAX_VISITANTES_NOVOS) return new Response(null, { status: 204 });
  }
  ultimo.set(quem, agora);
  // A memória não cresce sem fim: quem sumiu há mais de 1 h sai do mapa.
  if (ultimo.size > 20_000) for (const [k, t] of ultimo) if (agora - t > 3_600_000) ultimo.delete(k);

  await prisma.acesso
    .upsert({
      where: { quem_hora: { quem, hora } },
      create: { quem, userId: eu?.id ?? null, hora, paginas: pagina ? 1 : 0 },
      update: { ultimaEm: new Date(agora), ...(pagina ? { paginas: { increment: 1 } } : {}) },
    })
    .catch(() => undefined);
  return new Response(null, { status: 204 });
}
