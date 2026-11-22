import { describe, expect, it } from "vitest";
import { hojeSP, inicioDoDia } from "./tempo";

describe("inicioDoDia", () => {
  it("é a meia-noite de São Paulo, em qualquer fuso do servidor", () => {
    // 22/11/2026 20:00 em São Paulo = 23:00 UTC.
    expect(inicioDoDia(new Date("2026-11-22T23:00:00Z")).toISOString()).toBe("2026-11-22T03:00:00.000Z");
    // 01:30 UTC do dia 23 ainda é dia 22 em São Paulo (22:30).
    expect(inicioDoDia(new Date("2026-11-23T01:30:00Z")).toISOString()).toBe("2026-11-22T03:00:00.000Z");
    expect(hojeSP(new Date("2026-11-23T01:30:00Z"))).toBe("2026-11-22");
  });
});
