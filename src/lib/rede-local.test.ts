import { afterEach, describe, expect, it, vi } from "vitest";
import { IP_DA_REDE, origensDaRede } from "./rede-local";

describe("IP_DA_REDE", () => {
  it("aceita a rede de casa e o Tailscale", () => {
    for (const ip of ["192.168.0.194", "10.0.0.5", "172.16.1.1", "172.31.255.1", "100.64.0.1", "100.127.9.9"]) expect(IP_DA_REDE.test(ip), ip).toBe(true);
  });
  it("recusa internet, sem rede e loopback", () => {
    for (const ip of ["8.8.8.8", "169.254.83.107", "127.0.0.1", "172.32.0.1", "172.15.0.1", "100.128.0.1", "100.63.0.1", "1.192.168.1"]) expect(IP_DA_REDE.test(ip), ip).toBe(false);
  });
});

describe("origensDaRede", () => {
  afterEach(() => vi.unstubAllEnvs());
  it("na Vercel não aceita nenhuma origem extra", () => {
    vi.stubEnv("VERCEL", "1");
    expect(origensDaRede()).toEqual([]);
  });
  it("usa a porta do .env e só endereços em número", () => {
    vi.stubEnv("VERCEL", "");
    vi.stubEnv("PORT", "3333");
    for (const o of origensDaRede()) expect(o).toMatch(/^http:\/\/\d+\.\d+\.\d+\.\d+:3333$/);
  });
});
