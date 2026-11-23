// Categoria por IA, em lote: só para as ofertas que as regras de src/config/categories.ts não souberam classificar.
// Uma chamada por lote de até 50 títulos, sempre pela trava de gasto (budget.ts). O site só lê a coluna `category`.
import { z } from "zod";
import { CATEGORIES, CATEGORY_SLUGS, OTHER_CATEGORY } from "@/config/categories";
import { prisma } from "@/lib/db/prisma";
import { NA_VITRINE } from "@/lib/db/types";
import { DIA, atras } from "@/lib/tempo";
import { notify } from "../pipeline";
import { guardedCall } from "./budget";
import { pickProvider } from "./index";
import { AiBudgetError } from "./types";
const BATCH = 50;

const ResultSchema = z.object({
  itens: z.array(z.object({ id: z.number().int(), categoria: z.enum(CATEGORY_SLUGS) })),
});

const SYSTEM = [
  "Você classifica ofertas de lojas brasileiras numa categoria de produto.",
  "Receberá linhas no formato id|título. Para cada id, escolha UMA categoria pelo slug da lista.",
  "O título pode ser uma chamada de efeito ou trazer só o modelo (ex.: 'M5 (16 GB / 512 GB) (13\")' é um MacBook, logo informatica).",
  `Use "${OTHER_CATEGORY.slug}" quando não der para saber o produto ou quando nenhuma categoria servir.`,
  "Categorias: " + CATEGORIES.map((c) => `${c.slug} (${c.name})`).join(", ") + ".",
].join(" ");

/** Uma passada: classifica até `batches` lotes de ofertas sem categoria. Devolve quantas ganharam categoria. */
export async function runCategorias(batches = 2): Promise<{ classificadas: number; lotes: number }> {
  let classificadas = 0;
  let lotes = 0;
  for (let b = 0; b < batches; b++) {
    const rows = await prisma.offer.findMany({
      where: { kind: "produto", category: null, categorySource: null, dismissed: false, ...NA_VITRINE, createdAt: { gte: atras(7 * DIA) } },
      select: { id: true, title: true },
      orderBy: { createdAt: "desc" },
      take: BATCH,
    });
    if (!rows.length) break;
    lotes++;
    let data: z.infer<typeof ResultSchema>;
    try {
      // Com Claude e agy ligados, os lotes se revezam entre os dois.
      ({ data } = await guardedCall(await pickProvider(), {
        purpose: "categoria",
        system: SYSTEM,
        prompt: rows.map((r) => `${r.id}|${r.title.replace(/\s+/g, " ").slice(0, 160)}`).join("\n"),
        schema: ResultSchema,
      }));
    } catch (err) {
      if (err instanceof AiBudgetError) console.warn(`[ia] categorias paradas: ${err.message}`);
      else console.error("[ia] erro nas categorias:", (err as Error).message);
      break;
    }
    const ids = new Set(rows.map((r) => r.id));
    const answered = new Set<number>();
    for (const item of data.itens) {
      if (!ids.has(item.id) || answered.has(item.id)) continue;
      answered.add(item.id);
      await prisma.offer.updateMany({ where: { id: item.id, categorySource: null }, data: { category: item.categoria, categorySource: "ia" } });
      if (item.categoria !== OTHER_CATEGORY.slug) classificadas++;
    }
    // O que a IA não devolveu fica em "Outros", para não ir de novo no próximo lote.
    const missing = [...ids].filter((id) => !answered.has(id));
    if (missing.length) {
      await prisma.offer.updateMany({ where: { id: { in: missing }, categorySource: null }, data: { category: OTHER_CATEGORY.slug, categorySource: "ia" } });
    }
  }
  if (lotes) await notify({ type: "offer" });
  return { classificadas, lotes };
}
