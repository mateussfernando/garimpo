import "dotenv/config";
import { defineConfig } from "drizzle-kit";

const url = process.env.DATABASE_URL!;
// Banco fora deste PC (Supabase): SSL. Mesma regra de src/lib/db/index.ts.
const remote = !!url && !/@(localhost|127\.0\.0\.1|\[::1\])(:\d+)?\//i.test(url);

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: remote ? { url, ssl: { rejectUnauthorized: false } } : { url },
});
