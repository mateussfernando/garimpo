// pnpm lojas:resolver [--seguir] [--horas 48]
// Ofertas recentes que vieram por encurtador ou site de promoção e ficaram sem loja: segue o link até a loja
// (com a mesma coleta educada do worker: fila por site, robots.txt e pausas) e grava só a loja e o endereço.
// Não abre a página da loja nem muda o preço. Sem --seguir, só conta o que seria seguido, sem pedir nada à rede.
import "dotenv/config";
import { hostOf, isLinkDeOutroSite, storeForUrl } from "@/config/stores";
import { pool } from "@/lib/db";
import { seguirAteALoja } from "../worker/verify/verify";

const seguir = process.argv.includes("--seguir");
const iHoras = process.argv.indexOf("--horas");
const horas = iHoras > 0 ? Number(process.argv[iHoras + 1]) || 48 : 48;

async function main() {
  const { rows } = await pool.query<{ id: number; url: string; outbound_url: string | null }>(
    `select o.id, o.url, r.outbound_url
       from offers o join raw_messages r on r.id = o.raw_message_id
      where o.created_at > now() - make_interval(hours => $1)
        and o.store is null and o.url is not null and o.is_active
        and o.kind = 'produto'`,
    [horas],
  );
  // Só as ofertas cujo link é de um encurtador ou site de promoção (as de comunidades como o Promobit têm outro caminho).
  const alvo = rows.filter((o) => isLinkDeOutroSite(o.url));
  const porSite = new Map<string, number>();
  for (const o of alvo) {
    const h = hostOf(o.url) ?? "?";
    porSite.set(h, (porSite.get(h) ?? 0) + 1);
  }
  console.log(`${alvo.length} ofertas de ${horas} h sem loja vieram por encurtador ou site de promoção:`);
  for (const [h, n] of [...porSite].sort((a, b) => b[1] - a[1])) console.log(`  ${h}: ${n}`);
  if (!seguir) {
    console.log("\nNada foi aberto nem gravado. Para seguir os links: pnpm lojas:resolver --seguir");
    return;
  }

  let achou = 0;
  let falhou = 0;
  // Um site por vez em paralelo: a fila do politeFetch já espaça os pedidos de cada site (5 a 10 s).
  const porHost = new Map<string, typeof alvo>();
  for (const o of alvo) {
    const h = hostOf(o.url) ?? "?";
    porHost.set(h, [...(porHost.get(h) ?? []), o]);
  }
  await Promise.all(
    [...porHost.values()].map(async (lista) => {
      for (const o of lista) {
        try {
          const final = await seguirAteALoja(o.outbound_url ?? o.url, { soALoja: true });
          const loja = storeForUrl(final);
          if (loja) {
            await pool.query("update offers set url = $2, store = $3 where id = $1 and store is null", [o.id, final, loja.slug]);
            achou++;
          } else falhou++;
        } catch {
          falhou++;
        }
        if ((achou + falhou) % 25 === 0) console.log(`  ${achou + falhou}/${alvo.length} (lojas achadas: ${achou})`);
      }
    }),
  );
  console.log(`\nPronto: ${achou} ofertas ganharam a loja; ${falhou} não chegaram numa loja da lista (ou o site pediu pausa).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
