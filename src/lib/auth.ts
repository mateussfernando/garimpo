// Senha do site no deploy (Vercel). No seu PC, sem SITE_PASSWORD, o site abre normal.
// O cookie guarda uma assinatura HMAC da senha, nunca a senha. Web Crypto, para valer também no proxy.

export const COOKIE = "garimpo_acesso";
export const COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

const enc = new TextEncoder();

async function sign(secret: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = await crypto.subtle.sign("HMAC", key, enc.encode("garimpo:acesso:v1"));
  return [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Comparação que não vaza, pelo tempo, em que posição as duas diferem. */
export function safeEqual(a: string, b: string): boolean {
  const x = enc.encode(a);
  const y = enc.encode(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}

/** O site pede senha? Só quando SITE_PASSWORD existe. */
export const authEnabled = () => !!process.env.SITE_PASSWORD;

/** Valor do cookie para a senha atual. Mudar SITE_PASSWORD invalida todos os acessos. */
export async function accessToken(): Promise<string> {
  return sign(process.env.SITE_PASSWORD ?? "");
}

export async function hasAccess(cookieValue: string | undefined): Promise<boolean> {
  if (!authEnabled()) return true;
  if (!cookieValue) return false;
  return safeEqual(cookieValue, await accessToken());
}
