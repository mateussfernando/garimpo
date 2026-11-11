import "dotenv/config";
import { pool } from "@/lib/db";
import { ALVOS_V0 } from "@/config/alvos";
import { offerFromMessage } from "../ingest/message";
const alvos = ALVOS_V0.map((a, i) => ({ id: i + 1, ...a }));
async function main() {
  const r = await pool.query("select o.id, o.title, r.text from offers o join raw_messages r on r.id=o.raw_message_id join sources s on s.id=o.source_id where s.kind='telegram' order by o.id desc limit 400");
  let changed = 0, gone = 0;
  for (const x of r.rows) {
    const v = offerFromMessage(x.text, alvos);
    const t = v.kind === "oferta" ? v.title : `<${v.kind}>`;
    if (t !== x.title) { changed++; if (v.kind !== "oferta") gone++; if (changed <= 70) console.log(`${x.title.slice(0, 55).padEnd(55)} => ${t.slice(0, 80)}`); }
  }
  console.log({ total: r.rows.length, changed, gone });
  await pool.end();
}
void main();
