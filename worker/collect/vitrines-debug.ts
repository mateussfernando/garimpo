// pnpm vitrines:debug  ->  lê cada página de categoria uma vez (coleta educada) e mostra o que o parser achou, sem gravar nada.
import { PausedError, RobotsError, politeFetch } from "../http/polite";
import { isDeal } from "./vitrines";
import { VITRINES } from "./vitrines-config";

async function main() {
  for (const v of VITRINES) {
    console.log(`\n${v.name}`);
    for (const page of v.pages) {
      try {
        const res = await politeFetch(page.url);
        const items = v.parse(res.body);
        console.log(`  ${page.label}: HTTP ${res.status}, ${items.length} produtos, ${items.filter((i) => isDeal(i)).length} em oferta`);
        for (const i of items.filter((x) => isDeal(x)).slice(0, 2)) console.log(`    - ${i.name.slice(0, 70)} | à vista ${i.cashCents ? i.cashCents / 100 : "?"} | de ${i.oldCents ? i.oldCents / 100 : "?"}`);
      } catch (err) {
        if (err instanceof RobotsError) console.log(`  ${page.label}: bloqueada pelo robots.txt`);
        else if (err instanceof PausedError) console.log(`  ${page.label}: pausada`);
        else console.log(`  ${page.label}: erro ${(err as Error).message}`);
      }
    }
  }
}

main().then(() => process.exit(0), (e) => {
  console.error(e);
  process.exit(1);
});
