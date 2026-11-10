// pnpm simular            -> põe ofertas de exemplo na fonte "demo" (para ver a Vitrine e ensaiar)
// pnpm simular --limpar   -> apaga tudo o que veio da fonte "demo"
import "dotenv/config";
import { eq, inArray } from "drizzle-orm";
import { storeForUrl } from "@/config/stores";
import { db, pool, schema } from "@/lib/db";
import { ensureSeed, ingestRaw, scoreOffer } from "../pipeline";

const { sources, rawMessages, offers } = schema;

const EXEMPLOS = [
  ["Mouse Gamer Logitech G305 Lightspeed sem fio", "R$ 249,90 em 10x de R$ 24,99 sem juros | Frete grátis", "https://www.kabum.com.br/produto/111111/mouse-g305"],
  ["Mouse sem fio leve 26 mil DPI 63 g", "R$ 229,90 em 10x de R$ 22,99 sem juros. Frete grátis", "https://www.pichau.com.br/mouse-leve-63g"],
  ["Mouse Gamer Redragon Cobra", "R$ 119,90 em 5x de R$ 23,98 sem juros", "https://www.terabyteshop.com.br/produto/222222/mouse-cobra"],
  ["Mouse Logitech MX Master 3S", "R$ 549,90 em 10x de R$ 54,99 sem juros frete grátis", "https://www.amazon.com.br/dp/B0B11LJ69K"],
  ["Mouse Razer DeathAdder Essential", "R$ 139,90 no cartão", "https://www.kabum.com.br/produto/333333/deathadder"],
  ["Mouse gamer sem fio 2.4G", "R$ 99,90 em 3x de R$ 33,30 sem juros frete grátis", "https://www.mercadolivre.com.br/mouse/p/MLB123456789"],
  ["Braço Articulado a Gás para Monitor 17 a 32", "R$ 179,90 em 5x de R$ 35,98 sem juros. Frete grátis", "https://www.kabum.com.br/produto/444444/braco"],
  ["Teclado Mecânico TKL ABNT2 Switch Linear", "R$ 299,90 ou 10x de R$ 29,99. Cupom TECLA10", "https://www.terabyteshop.com.br/produto/555555/teclado"],
  ["SSD NVMe 1TB Gen4 com DRAM", "de R$ 599,00 por R$ 429,90 em 12x de R$ 35,83 sem juros", "https://www.amazon.com.br/dp/B0CHGT1KFJ"],
  ["Headset sem fio 2.4 GHz", "12x de R$ 46,90 com juros", "https://www.magazineluiza.com.br/headset/p/abc123def/"],
] as const;

async function main() {
  await ensureSeed();
  if (process.argv.includes("--limpar")) {
    const [demo] = await db.select().from(sources).where(eq(sources.slug, "demo"));
    if (demo) {
      const raws = await db.select({ id: rawMessages.id }).from(rawMessages).where(eq(rawMessages.sourceId, demo.id));
      if (raws.length) {
        await db.delete(offers).where(inArray(offers.rawMessageId, raws.map((r) => r.id)));
        await db.delete(rawMessages).where(eq(rawMessages.sourceId, demo.id));
      }
      await db.delete(sources).where(eq(sources.id, demo.id));
    }
    console.log("Demo apagada.");
    return;
  }
  const [demo] = await db
    .insert(sources)
    .values({ slug: "demo", kind: "demo", name: "Demo", url: "local" })
    .onConflictDoUpdate({ target: sources.slug, set: { name: "Demo" } })
    .returning();
  const ids: number[] = [];
  for (const [title, price, url] of EXEMPLOS) {
    const id = await ingestRaw({
      sourceId: demo.id,
      externalId: `demo:${url}:${Date.now()}`,
      title,
      text: `${title}\n${price}`,
      url,
      outboundUrl: null, // demo não abre as lojas
      imageUrl: null,
      storeName: storeForUrl(url)?.name ?? null,
    });
    if (id) ids.push(id);
  }
  // Com 5+ mouses, o Alvo ganha referência: recalcula a nota de todos.
  for (const id of ids) await scoreOffer(id);
  console.log(`${ids.length} ofertas de exemplo na Vitrine (fonte "Demo"). Apague com: pnpm simular --limpar`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
