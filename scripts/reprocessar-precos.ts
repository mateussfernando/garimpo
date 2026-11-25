// pnpm precos:reprocessar [--gravar] [--horas 48]
// Roda o parser de hoje no texto das ofertas recentes que ainda leem um preço só ("unico", sem forma de pagamento) e
// não foram conferidas na loja. Corrige só a forma do preço: price_basis, cash_cents, price_card_cents e
// list_price_cents. Sem --gravar, só mostra o que mudaria. Antes de gravar: pnpm db:backup antes-reprocessar-precos.
import "dotenv/config";
import { pool } from "@/lib/db";
import { parseOfferText } from "../worker/parse/parser";

const gravar = process.argv.includes("--gravar");
const iHoras = process.argv.indexOf("--horas");
const horas = iHoras > 0 ? Number(process.argv[iHoras + 1]) || 48 : 48;

type Linha = {
  id: number;
  texto: string;
  price_basis: string | null;
  price_card_cents: number | null;
  cash_cents: number | null;
  list_price_cents: number | null;
};

async function main() {
const { rows } = await pool.query<Linha>(
  `select o.id, r.text as texto, o.price_basis, o.price_card_cents, o.cash_cents, o.list_price_cents
     from offers o join raw_messages r on r.id = o.raw_message_id
    where o.created_at > now() - make_interval(hours => $1)
      and o.verify_status <> 'verificado'
      and (o.price_basis = 'unico' or o.price_basis is null)`,
  [horas],
);

const mudancas: { id: number; de: string; para: string; dados: Pick<Linha, "price_basis" | "price_card_cents" | "cash_cents" | "list_price_cents"> }[] = [];
for (const o of rows) {
  const p = parseOfferText(o.texto);
  // Só o que o parser novo passou a entender: a forma do preço. Um "unico" que continua "unico" fica como está.
  if (p.priceBasis == null || p.priceBasis === "unico" || p.priceCardCents == null) continue;
  const dados = {
    price_basis: p.priceBasis,
    price_card_cents: p.priceCardCents,
    cash_cents: p.cashCents,
    list_price_cents: p.listPriceCents ?? o.list_price_cents,
  };
  const igual = dados.price_basis === o.price_basis && dados.price_card_cents === o.price_card_cents && dados.cash_cents === o.cash_cents && dados.list_price_cents === o.list_price_cents;
  if (igual) continue;
  const fmt = (b: string | null, c: number | null, x: number | null) => `${b ?? "?"} cartão=${c ?? "-"} pix=${x ?? "-"}`;
  mudancas.push({ id: o.id, de: fmt(o.price_basis, o.price_card_cents, o.cash_cents), para: fmt(dados.price_basis, dados.price_card_cents, dados.cash_cents), dados });
}

const porBase = new Map<string, number>();
for (const m of mudancas) porBase.set(m.dados.price_basis!, (porBase.get(m.dados.price_basis!) ?? 0) + 1);
console.log(`${rows.length} ofertas de ${horas} h com um preço só e não conferidas; ${mudancas.length} mudam.`);
for (const [b, n] of porBase) console.log(`  ${b === "avista" ? "viram Pix" : b === "cartao" ? "viram cartão" : b}: ${n}`);
for (const m of mudancas.slice(0, 12)) console.log(`  #${m.id}: ${m.de}  ->  ${m.para}`);

if (!gravar) {
  console.log("\nNada foi gravado. Para gravar: pnpm db:backup antes-reprocessar-precos && pnpm precos:reprocessar --gravar");
} else {
  const c = await pool.connect();
  try {
    await c.query("begin");
    for (const m of mudancas) {
      await c.query(
        "update offers set price_basis = $2, price_card_cents = $3, cash_cents = $4, list_price_cents = $5 where id = $1",
        [m.id, m.dados.price_basis, m.dados.price_card_cents, m.dados.cash_cents, m.dados.list_price_cents],
      );
    }
    await c.query("commit");
    console.log(`\n${mudancas.length} ofertas gravadas.`);
  } catch (e) {
    await c.query("rollback");
    throw e;
  } finally {
    c.release();
  }
}
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
