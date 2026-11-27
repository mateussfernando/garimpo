/**
 * Para onde ir depois de entrar (o `?de=` que o proxy põe): só um caminho do próprio site. Não basta olhar se começa
 * com "/": o navegador lê "/\outro.com" e "/<tab>/outro.com" como "//outro.com" (revisão de segurança, 26/11). Então o
 * destino é resolvido como o navegador faria e precisa dar no mesmo site; senão, a Vitrine.
 */
export function destinoSeguro(de: string | null | undefined, origem = typeof location === "undefined" ? null : location.origin): string {
  if (!de || !origem || !de.startsWith("/")) return "/";
  try {
    const u = new URL(de, origem);
    return u.origin === origem ? u.pathname + u.search + u.hash : "/";
  } catch {
    return "/";
  }
}
