import { z } from "zod";
import { ALVOS_V0 } from "@/config/alvos";
import { prisma } from "@/lib/db/prisma";
import { AlvoInput, FaixaInput, tellWorker } from "@/lib/alvos";
import { effectiveTargets } from "../../../../../worker/match/alvos";
import { exigir } from "@/lib/sessao";

const Body = z.discriminatedUnion("acao", [
  AlvoInput.extend({ acao: z.literal("editar") }),
  z.object({ acao: z.enum(["ligar", "desligar", "padrao"]) }),
  FaixaInput.extend({ acao: z.literal("faixa") }),
]);

async function find(idText: string) {
  const id = Number(idText);
  if (!Number.isInteger(id)) return null;
  const row = await prisma.alvo.findFirst({ where: { id, deletedAt: null } });
  return row ?? null;
}

export async function PATCH(request: Request, ctx: RouteContext<"/api/alvos/[id]">) {
  const eu = await exigir("alvos.proprios", request);
  if (eu instanceof Response) return eu;
  const alvo = await find((await ctx.params).id);
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!alvo) return Response.json({ erro: "Alvo não encontrado" }, { status: 404 });
  if (!parsed.success) return Response.json({ erro: parsed.error.issues[0]?.message ?? "pedido inválido" }, { status: 400 });
  const b = parsed.data;

  if (b.acao === "faixa") {
    if (b.manualTargetCents != null && b.manualCeilingCents != null && b.manualCeilingCents <= b.manualTargetCents) {
      return Response.json({ erro: "o teto precisa ser maior que o preço-alvo" }, { status: 400 });
    }
    const ref = await prisma.alvoRef.findUnique({ where: { alvoId_bandKey: { alvoId: alvo.id, bandKey: b.bandKey } } });
    // Alvo sem faixas próprias ainda sem ofertas: a faixa "Geral" nasce aqui, para o preço-alvo já valer.
    if (!ref && b.bandKey !== "geral") return Response.json({ erro: "faixa não encontrada" }, { status: 404 });
    const autoT = ref?.medianCents != null && ref.n >= 5 ? Math.round(ref.medianCents * 0.85) : null;
    const autoC = ref?.medianCents != null && ref.n >= 5 ? Math.round(ref.medianCents * 1.15) : null;
    const manual = { manualTargetCents: b.manualTargetCents, manualCeilingCents: b.manualCeilingCents };
    const t = effectiveTargets({ targetCents: autoT, ceilingCents: autoC }, manual);
    await prisma.alvoRef.upsert({
      where: { alvoId_bandKey: { alvoId: alvo.id, bandKey: b.bandKey } },
      create: { alvoId: alvo.id, bandKey: b.bandKey, label: "Geral", ...manual, ...t },
      update: { ...manual, ...t, updatedAt: new Date() },
    });
    await tellWorker({ acao: "faixa", alvoId: alvo.id, bandKey: b.bandKey });
    return Response.json({ ok: true });
  }

  if (b.acao === "editar") {
    await prisma.alvo.update({ where: { id: alvo.id }, data: { name: b.name, terms: b.terms, exclusions: b.exclusions, editedAt: new Date() } });
  } else if (b.acao === "padrao") {
    const seed = ALVOS_V0.find((a) => a.slug === alvo.slug);
    if (!seed) return Response.json({ erro: "este Alvo não tem padrão" }, { status: 400 });
    // Volta aos termos do código e deixa o worker atualizar de novo quando config/alvos.ts mudar.
    await prisma.alvo.update({ where: { id: alvo.id }, data: { name: seed.name, terms: seed.terms, exclusions: seed.exclusions, editedAt: null } });
  } else {
    await prisma.alvo.update({ where: { id: alvo.id }, data: { active: b.acao === "ligar" } });
  }
  await tellWorker({ acao: "rematch" });
  return Response.json({ ok: true });
}

// Apagar = some da tela e das ofertas, e não volta quando o worker sobe. O histórico de preços fica no banco.
export async function DELETE(request: Request, ctx: RouteContext<"/api/alvos/[id]">) {
  const eu = await exigir("alvos.proprios", request);
  if (eu instanceof Response) return eu;
  const alvo = await find((await ctx.params).id);
  if (!alvo) return Response.json({ erro: "Alvo não encontrado" }, { status: 404 });
  await prisma.alvo.update({ where: { id: alvo.id }, data: { active: false, deletedAt: new Date() } });
  await tellWorker({ acao: "rematch" });
  return Response.json({ ok: true });
}
