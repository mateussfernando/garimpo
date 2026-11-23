import { z } from "zod";
import type { FonteKind } from "@/config/fontes";
import { CMD_CHANNEL, NOTIFY_CHANNEL, pool } from "@/lib/db";
import { prisma } from "@/lib/db/prisma";
import { json } from "@/lib/db/types";
import { checkFonte, urlOfFonte } from "@/lib/fontes";
import { exigir } from "@/lib/sessao";

// Confirmar liga a fonte; pausar e ignorar desligam; retomar e desfazer voltam ao estado de sugestão ou confirmada.
// As fontes da tela (feed, página de ofertas, busca VTEX) também se editam, leem agora e se apagam.
const Body = z.discriminatedUnion("acao", [
  z.object({ acao: z.enum(["confirmar", "ignorar", "pausar", "retomar", "desfazer", "ler_agora"]) }),
  z.object({
    acao: z.literal("editar"),
    name: z.string().trim().min(2, "dê um nome à fonte").max(60),
    config: z.unknown(),
    intervalMin: z.number().int().max(24 * 60).nullable(),
  }),
]);

const GENERIC = ["feed", "pagina", "vtex"];

async function notifyAll() {
  // O worker relê a lista de grupos e a Vitrine atualiza o cabeçalho.
  await pool.query("select pg_notify($1, '{}')", [CMD_CHANNEL]);
  await pool.query("select pg_notify($1, $2)", [NOTIFY_CHANNEL, JSON.stringify({ type: "source" })]);
}

async function find(idText: string) {
  const id = Number(idText);
  if (!Number.isInteger(id)) return null;
  const s = await prisma.source.findUnique({ where: { id } });
  return s && !s.deletedAt ? s : null;
}

export async function PATCH(request: Request, ctx: RouteContext<"/api/fontes/[id]">) {
  const eu = await exigir("fontes.gerenciar", request);
  if (eu instanceof Response) return eu;
  const src = await find((await ctx.params).id);
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!src) return Response.json({ erro: "fonte não encontrada" }, { status: 404 });
  if (!parsed.success) return Response.json({ erro: parsed.error.issues[0]?.message ?? "pedido inválido" }, { status: 400 });
  const b = parsed.data;
  if (b.acao === "editar" || b.acao === "ler_agora") {
    if (!GENERIC.includes(src.kind)) return Response.json({ erro: "esta fonte não é configurável" }, { status: 400 });
    if (b.acao === "ler_agora") {
      await prisma.source.update({ where: { id: src.id }, data: { lastRunAt: null } });
    } else if (b.acao === "editar") {
      const kind = src.kind as FonteKind;
      const c = checkFonte(kind, b.config, b.intervalMin);
      if ("erro" in c) return Response.json({ erro: c.erro }, { status: 400 });
      // Mudou a configuração: lê de novo no próximo minuto.
      await prisma.source.update({
        where: { id: src.id },
        data: { name: b.name, config: json(c.config), url: urlOfFonte(kind, c.config), intervalMin: b.intervalMin, lastRunAt: null },
      });
    }
    await notifyAll();
    return Response.json({ ok: true });
  }
  const set = {
    confirmar: { isActive: true, decision: "confirmada" },
    retomar: { isActive: true, decision: "confirmada" },
    pausar: { isActive: false, decision: "pausada" },
    ignorar: { isActive: false, decision: "ignorada" },
    desfazer: { isActive: false, decision: null },
  }[b.acao];
  await prisma.source.update({ where: { id: src.id }, data: set });
  await notifyAll();
  return Response.json({ ok: true });
}

// Apagar: só as fontes da tela. A fonte some e para de ser lida; as ofertas que ela trouxe ficam.
export async function DELETE(request: Request, ctx: RouteContext<"/api/fontes/[id]">) {
  const eu = await exigir("fontes.gerenciar", request);
  if (eu instanceof Response) return eu;
  const src = await find((await ctx.params).id);
  if (!src) return Response.json({ erro: "fonte não encontrada" }, { status: 404 });
  if (!GENERIC.includes(src.kind)) return Response.json({ erro: "fontes do código e do Telegram só se pausam" }, { status: 400 });
  await prisma.source.update({ where: { id: src.id }, data: { isActive: false, deletedAt: new Date() } });
  await notifyAll();
  return Response.json({ ok: true });
}
