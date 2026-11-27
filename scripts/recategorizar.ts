// pnpm tsx scripts/recategorizar.ts <slug> [--aplicar]
// Depois de criar ou mudar uma categoria em src/config/categories.ts: acha as ofertas de produto cujo título, pelas
// regras de hoje, cai em <slug> e ainda estão em outra categoria. Sem --aplicar só conta (nada muda no banco).
// Com --aplicar troca só a coluna category (category_source = "regra") dessas ofertas. Não apaga nada.
import "dotenv/config";
import { categorize } from "../worker/match/category";
import { CATEGORIES } from "../src/config/categories";
import { prisma } from "../src/lib/db/prisma";

const slug = process.argv[2];
const aplicar = process.argv.includes("--aplicar");
if (!slug || !CATEGORIES.some((c) => c.slug === slug)) {
  console.error(`Uso: pnpm tsx scripts/recategorizar.ts <slug> [--aplicar]  (slugs: ${CATEGORIES.map((c) => c.slug).join(", ")})`);
  process.exit(1);
}

async function main() {
  const ofertas = await prisma.offer.findMany({
    where: { kind: "produto", NOT: { category: slug } },
    select: { id: true, title: true, category: true },
  });
  const mudar = ofertas.filter((o) => o.title && categorize(o.title) === slug);
  const deOnde = new Map<string, number>();
  for (const o of mudar) deOnde.set(o.category ?? "(sem)", (deOnde.get(o.category ?? "(sem)") ?? 0) + 1);
  console.log(`${mudar.length} ofertas vão para "${slug}" (de ${ofertas.length} conferidas):`, Object.fromEntries(deOnde));
  for (const o of mudar.slice(0, 8)) console.log(`  ${o.category ?? "(sem)"} -> ${slug}: ${o.title.slice(0, 80)}`);

  if (aplicar && mudar.length) {
    const ids = mudar.map((o) => o.id);
    let feitas = 0;
    for (let i = 0; i < ids.length; i += 500) {
      const r = await prisma.offer.updateMany({ where: { id: { in: ids.slice(i, i + 500) } }, data: { category: slug, categorySource: "regra" } });
      feitas += r.count;
    }
    console.log(`aplicado: ${feitas} ofertas agora em "${slug}"`);
  } else if (mudar.length) {
    console.log("Nada mudou. Rode de novo com --aplicar para gravar.");
  }
  await prisma.$disconnect();
}

void main();
