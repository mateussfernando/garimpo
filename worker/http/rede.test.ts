import { afterEach, describe, expect, it, vi } from "vitest";
import { BlockedUrlError, conferirUrl, ipInterno, usarResolver } from "./rede";
import { __test, politeFetch, unshorten } from "./polite";

// DNS de mentira: os nomes de loja dão IP público; os "de ataque", IP da rede de casa.
const DNS: Record<string, string[]> = {
  "www.kabum.com.br": ["104.18.12.34"],
  "amzn.to": ["52.95.1.2"],
  "encurta.example.com": ["93.184.216.34"],
  "rebind.example.com": ["192.168.1.10"],
  "metade.example.com": ["93.184.216.34", "10.0.0.5"],
  "v6.example.com": ["fd00::1"],
};
usarResolver(async (h) => {
  if (!DNS[h]) throw new Error("ENOTFOUND " + h);
  return DNS[h];
});
afterEach(() => vi.unstubAllGlobals());

const barrado = (url: string) => expect(conferirUrl(url)).rejects.toBeInstanceOf(BlockedUrlError);

describe("trava de rede do worker", () => {
  it("reconhece os IPs internos (IPv4 e IPv6)", () => {
    for (const ip of ["127.0.0.1", "10.1.2.3", "172.16.0.1", "172.31.255.255", "192.168.0.1", "169.254.169.254", "100.64.0.1", "0.0.0.0", "224.0.0.1", "255.255.255.255"]) {
      expect(ipInterno(ip), ip).toBe(true);
    }
    for (const ip of ["::", "::1", "fd12:3456::1", "fe80::1", "ff02::1", "::ffff:127.0.0.1", "::ffff:7f00:1", "::ffff:192.168.0.1", "64:ff9b::10.0.0.1", "2002:c0a8:0101::1", "nao-e-ip"]) {
      expect(ipInterno(ip), ip).toBe(true);
    }
    for (const ip of ["8.8.8.8", "104.18.12.34", "172.32.0.1", "100.128.0.1", "2800:3f0:4001:80e::200e", "2606:4700::6810:85e5", "::ffff:8.8.8.8"]) {
      expect(ipInterno(ip), ip).toBe(false);
    }
  });

  it("barra localhost, a rede de casa, o metadata da nuvem e os disfarces", async () => {
    for (const url of [
      "http://localhost/",
      "http://localhost.:3333/",
      "http://127.0.0.1/",
      "http://192.168.0.1/admin",
      "http://10.0.0.1/",
      "http://169.254.169.254/latest/meta-data/",
      "http://[::1]/",
      "http://[::ffff:127.0.0.1]/",
      "http://0x7f.1/", // 127.0.0.1 em hexadecimal
      "http://2130706433/", // 127.0.0.1 em decimal
      "http://roteador/",
      "http://meu-pc.local/",
      "http://impressora.home.arpa/",
    ]) {
      await barrado(url);
    }
  });

  it("barra o que não é web: outro protocolo, outra porta, senha na URL", async () => {
    await barrado("file:///C:/Windows/win.ini");
    await barrado("ftp://www.kabum.com.br/");
    await barrado("gopher://www.kabum.com.br/");
    await barrado("http://www.kabum.com.br:5432/");
    await barrado("http://usuario:senha@www.kabum.com.br/");
  });

  it("barra nome público que aponta para a rede interna (no DNS)", async () => {
    await barrado("https://rebind.example.com/oferta");
    await barrado("https://metade.example.com/"); // um dos IPs é interno: basta um
    await barrado("https://v6.example.com/");
  });

  it("deixa passar loja e encurtador de verdade", async () => {
    await expect(conferirUrl("https://www.kabum.com.br/produto/123")).resolves.toBeUndefined();
    await expect(conferirUrl("https://amzn.to/abc")).resolves.toBeUndefined();
    await expect(conferirUrl("http://www.kabum.com.br:443/x")).resolves.toBeUndefined();
  });

  it("redirecionamento para a rede interna é barrado antes de sair do PC", async () => {
    const fetchFalso = vi.fn(async (url: string) =>
      url.startsWith("https://encurta.example.com")
        ? new Response(null, { status: 302, headers: { location: "http://192.168.0.1/admin" } })
        : new Response("roteador", { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchFalso);
    await expect(__test.rawFetch("https://encurta.example.com/x", "follow")).rejects.toBeInstanceOf(BlockedUrlError);
    expect(fetchFalso).toHaveBeenCalledTimes(1);
    expect(fetchFalso.mock.calls.some(([u]) => String(u).includes("192.168"))).toBe(false);
  });

  it("redirecionamento por nome que resolve para dentro também é barrado", async () => {
    const fetchFalso = vi.fn(async () => new Response(null, { status: 301, headers: { location: "https://rebind.example.com/" } }));
    vi.stubGlobal("fetch", fetchFalso);
    await expect(__test.rawFetch("https://amzn.to/abc", "follow")).rejects.toBeInstanceOf(BlockedUrlError);
    expect(fetchFalso).toHaveBeenCalledTimes(1);
  });

  it("redirecionamento entre sites públicos continua funcionando", async () => {
    const fetchFalso = vi.fn(async (url: string) =>
      url.startsWith("https://amzn.to")
        ? new Response(null, { status: 302, headers: { location: "https://www.kabum.com.br/produto/1" } })
        : new Response("<html>ok</html>", { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchFalso);
    const r = await __test.rawFetch("https://amzn.to/abc", "follow");
    expect(r.url).toBe("https://www.kabum.com.br/produto/1");
    expect(r.body).toContain("ok");
    expect(fetchFalso).toHaveBeenCalledTimes(2);
  });

  it("a coleta educada e o desencurtador nem tentam abrir endereço interno", async () => {
    const fetchFalso = vi.fn();
    vi.stubGlobal("fetch", fetchFalso);
    await expect(politeFetch("http://192.168.0.1/")).rejects.toBeInstanceOf(BlockedUrlError);
    await expect(unshorten("http://127.0.0.1:80/")).rejects.toBeInstanceOf(BlockedUrlError);
    expect(fetchFalso).not.toHaveBeenCalled();
  });
});
