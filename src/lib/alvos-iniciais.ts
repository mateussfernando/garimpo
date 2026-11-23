// Os Alvos com que cada conta começa: uma cópia dos de src/config/alvos.ts, que a pessoa muda na tela Alvos.
// A cópia que o dono não editou acompanha o código (worker/pipeline.ts, ensureSeed); a editada ou apagada é dele.
import { ALVOS_V0 } from "@/config/alvos";
import { prisma } from "@/lib/db/prisma";

/** Dá a uma conta a cópia dos Alvos iniciais. O que ela já tem com o mesmo nome fica como está. */
export async function darAlvosIniciais(userId: string): Promise<number> {
  const r = await prisma.alvo.createMany({
    data: ALVOS_V0.map((a) => ({ ownerId: userId, slug: a.slug, name: a.name, terms: a.terms, exclusions: a.exclusions })),
    skipDuplicates: true,
  });
  return r.count;
}

/** Contas sem nenhum Alvo (nem apagado): as criadas antes de cada um ter os seus. */
export async function contasSemAlvos(): Promise<string[]> {
  return (await prisma.user.findMany({ where: { alvos: { none: {} } }, select: { id: true } })).map((u) => u.id);
}
