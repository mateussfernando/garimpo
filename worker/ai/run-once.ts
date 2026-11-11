// pnpm ia:insights  ->  uma passada do job de insights, para testar o provedor escolhido em AI_PROVIDER.
import "dotenv/config";
import { pool } from "@/lib/db";
import { getAiStatus } from "@/lib/ai-usage";
import { runInsights } from "./insights";

async function main() {
  console.log("antes:", await getAiStatus());
  console.log("passada:", await runInsights(3));
  console.log("depois:", await getAiStatus());
}

main()
  .catch((e) => console.error(e))
  .finally(async () => {
    await pool.end().catch(() => undefined);
    process.exit(0);
  });
