// Trava de rede do worker: ele só abre sites públicos da internet, nunca a rede da casa nem o próprio PC.
// Vale para tudo que o worker abre (verificação, coleta, fontes configuráveis, encurtadores), a cada redirecionamento.
// Sem isso, um link encurtado postado num grupo (ou uma fonte mal configurada) que leve a http://192.168.0.1 ou a
// http://localhost:5432 faria o worker, de dentro do PC, acessar o roteador ou os programas locais (SSRF).
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

export class BlockedUrlError extends Error {
  constructor(public readonly url: string, motivo: string) {
    super(`endereço bloqueado (${motivo})`);
  }
}

/** Portas aceitas: as da web. Loja não usa outra; serviço interno quase sempre usa. */
const PORTAS = new Set(["", "80", "443"]);
/** Nomes que só existem dentro da rede. */
const NOME_INTERNO = /(^|\.)(localhost|local|internal|intranet|lan|home|corp|localdomain|home\.arpa)\.?$/i;

function v4(ip: string): number[] | null {
  const p = ip.split(".").map(Number);
  return p.length === 4 && p.every((n) => Number.isInteger(n) && n >= 0 && n <= 255) ? p : null;
}

/** IPv4 que não é internet pública: loopback, redes privadas, link-local (inclui 169.254.169.254), CGNAT, reservados. */
function v4Interno([a, b, c]: number[]): boolean {
  return (
    a === 0 || // "esta rede"
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) || // CGNAT
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 0 && (c === 0 || c === 2)) ||
    (a === 198 && (b === 18 || b === 19)) ||
    (a === 198 && b === 51 && c === 100) ||
    (a === 203 && b === 0 && c === 113) ||
    a >= 224 // multicast, reservado, broadcast
  );
}

/** Os 8 grupos de 16 bits de um IPv6 (com IPv4 no fim, se houver), ou null. */
function v6Grupos(ip: string): number[] | null {
  let s = ip.toLowerCase().replace(/^\[|\]$/g, "").replace(/%.*$/, "");
  const m = s.match(/(\d+\.\d+\.\d+\.\d+)$/);
  if (m) {
    const q = v4(m[1]);
    if (!q) return null;
    s = s.slice(0, -m[1].length) + `${((q[0] << 8) | q[1]).toString(16)}:${((q[2] << 8) | q[3]).toString(16)}`;
  }
  const [head, tail, extra] = s.split("::");
  if (extra !== undefined) return null;
  const h = head ? head.split(":") : [];
  const t = tail !== undefined ? (tail ? tail.split(":") : []) : null;
  const parts = t ? [...h, ...Array(8 - h.length - t.length).fill("0"), ...t] : h;
  if (parts.length !== 8) return null;
  const g = parts.map((x) => (/^[0-9a-f]{1,4}$/.test(x) ? parseInt(x, 16) : NaN));
  return g.every((n) => !Number.isNaN(n)) ? g : null;
}

/** O endereço (IPv4 ou IPv6) é da rede interna ou não é roteável na internet? Na dúvida, sim. */
export function ipInterno(ip: string): boolean {
  const q = v4(ip);
  if (q) return v4Interno(q);
  const g = v6Grupos(ip);
  if (!g) return true;
  const embutido = (hi: number, lo: number) => v4Interno([hi >> 8, hi & 255, lo >> 8, lo & 255]);
  if (g.slice(0, 7).every((x) => x === 0)) return true; // :: e ::1
  if (g.slice(0, 5).every((x) => x === 0) && g[5] === 0xffff) return embutido(g[6], g[7]); // ::ffff:a.b.c.d
  if (g.slice(0, 6).every((x) => x === 0)) return true; // ::a.b.c.d (antigo)
  if (g[0] === 0x64 && g[1] === 0xff9b) return embutido(g[6], g[7]); // NAT64
  if ((g[0] & 0xfe00) === 0xfc00) return true; // fc00::/7, rede privada
  if ((g[0] & 0xffc0) === 0xfe80 || (g[0] & 0xffc0) === 0xfec0) return true; // link-local e site-local
  if ((g[0] & 0xff00) === 0xff00) return true; // multicast
  if (g[0] === 0x2001 && g[1] === 0x0db8) return true; // documentação
  if (g[0] === 0x2002) return embutido(g[1], g[2]); // 6to4
  return false;
}

type Resolver = (host: string) => Promise<string[]>;
const resolverPadrao: Resolver = async (host) => (await lookup(host, { all: true, verbatim: true })).map((a) => a.address);
let resolver = resolverPadrao;
/** Só para os testes (sem DNS de verdade). */
export function usarResolver(r: Resolver | null) {
  resolver = r ?? resolverPadrao;
}

/**
 * Confere um endereço antes de o worker abrir: só http/https, porta da web, sem usuário e senha na URL, nome que não
 * é de rede interna e nenhum IP (do nome resolvido no DNS) interno. Lança BlockedUrlError se não puder.
 */
export async function conferirUrl(url: string): Promise<void> {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    throw new BlockedUrlError(url, "endereço inválido");
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") throw new BlockedUrlError(url, `protocolo ${u.protocol}`);
  if (!PORTAS.has(u.port)) throw new BlockedUrlError(url, `porta ${u.port}`);
  if (u.username || u.password) throw new BlockedUrlError(url, "usuário e senha na URL");
  const host = u.hostname.replace(/^\[|\]$/g, "");
  if (!host || NOME_INTERNO.test(host) || (!host.includes(".") && !isIP(host))) throw new BlockedUrlError(url, "nome da rede interna");
  let ips: string[];
  if (isIP(host)) ips = [host];
  // Falha de DNS é erro comum (tenta de novo depois), não bloqueio.
  else ips = await resolver(host);
  if (!ips.length || ips.some(ipInterno)) throw new BlockedUrlError(url, "rede interna");
}
