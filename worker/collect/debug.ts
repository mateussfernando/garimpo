// pnpm fontes:debug
// Baixa a lista de cada comunidade uma vez (com as mesmas regras de coleta educada),
// salva o HTML em .garimpo/debug/ e mostra quantos posts e títulos o extrator achou.
// Use para ajustar os padrões de communities-config.ts com o HTML real.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PausedError, RobotsError, politeFetch } from "../http/polite";
import { COMMUNITIES } from "./communities-config";
import { listItems } from "./communities";

async function main() {
  const dir = join(process.cwd(), ".garimpo", "debug");
  mkdirSync(dir, { recursive: true });

  for (const c of COMMUNITIES) {
    try {
      const res = await politeFetch(c.url);
      writeFileSync(join(dir, `${c.slug}.html`), res.body);
      const items = listItems(res.body, c);
      console.log(`\n${c.name}: HTTP ${res.status}, ${items.length} posts`);
      for (const i of items.slice(0, 8)) console.log(`  - ${i.title.slice(0, 90)}  ->  ${i.url}`);
    } catch (err) {
      if (err instanceof RobotsError) console.log(`\n${c.name}: bloqueada pelo robots.txt`);
      else if (err instanceof PausedError) console.log(`\n${c.name}: pausada (${err.message})`);
      else console.log(`\n${c.name}: erro ${(err as Error).message}`);
    }
  }
  console.log(`\nHTML salvo em ${dir}`);
}

main().then(() => process.exit(0), (err) => {
  console.error(err);
  process.exit(1);
});
