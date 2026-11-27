// Abrir o Garimpo de outro PC ou do celular da rede de casa (pedido do usuário, 26/11): http://<endereço deste PC>:3333.
// O login (better-auth) só aceita pedidos vindos do BETTER_AUTH_URL (localhost); estes são os outros endereços aceitos.
// Só os endereços deste PC, em número (nunca um nome de site): um site de fora não consegue se passar por eles
// (DNS rebinding), porque o navegador manda o nome dele no Origin, não o número.
// O next.config.ts faz a mesma conta para o allowedDevOrigins (ele não importa arquivos do src).
import { networkInterfaces } from "node:os";

/** Rede de casa (10.x, 172.16-31.x, 192.168.x) e a do Tailscale (100.64-127.x). Fora: 169.254 (sem rede) e 127.x. */
export const IP_DA_REDE = /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.)/;

/** Os endereços IPv4 deste PC na rede de casa. */
export function ipsDaRede(): string[] {
  return Object.values(networkInterfaces())
    .flat()
    .filter((i) => i && i.family === "IPv4" && !i.internal && IP_DA_REDE.test(i.address))
    .map((i) => i!.address);
}

/** Origens extras para o login: http://<ip>:<porta> de cada endereço deste PC. Vazio na Vercel (lá não há rede de casa). */
export function origensDaRede(): string[] {
  if (process.env.VERCEL) return [];
  const porta = process.env.PORT || new URL(process.env.BETTER_AUTH_URL || "http://localhost:3000").port || "3000";
  return ipsDaRede().map((ip) => `http://${ip}:${porta}`);
}
