import { describe, expect, it } from "vitest";
import { isRemoteDb, pgConfig } from "./index";

describe("pgConfig", () => {
  it("banco local abre a sessão em UTC (o adaptador do Prisma manda datas sem fuso)", () => {
    expect(pgConfig("postgres://u:p@localhost:5432/garimpo").options).toBe("-c TimeZone=UTC");
  });
  it("banco remoto (Supabase) vai com SSL e sem `options`, que o pooler pode recusar", () => {
    const c = pgConfig("postgres://u:p@aws-0-sa-east-1.pooler.supabase.com:6543/postgres");
    expect(isRemoteDb("postgres://u:p@aws-0-sa-east-1.pooler.supabase.com:6543/postgres")).toBe(true);
    expect(c.ssl).toBeTruthy();
    expect(c.options).toBeUndefined();
  });
});
