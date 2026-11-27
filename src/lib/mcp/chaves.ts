// Chaves de acesso ao MCP pela internet (/api/mcp). A chave vai no cabeçalho `Authorization: Bearer gmp_...`.
// No banco fica só o hash SHA-256 (tabela chaves_mcp): quem lê o banco não consegue usar a chave.
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/db/prisma";
import { usuarioDaConta, type Usuario } from "@/lib/sessao";

const PREFIXO = "gmp_";

export const hashDaChave = (chave: string) => createHash("sha256").update(chave, "utf8").digest("hex");

/** Chave nova: "gmp_" + 32 bytes aleatórios (base64url). Mostrada uma vez; o banco guarda o hash. */
export function gerarChave(): { chave: string; prefixo: string; hash: string } {
  const chave = PREFIXO + randomBytes(32).toString("base64url");
  return { chave, prefixo: chave.slice(0, 10), hash: hashDaChave(chave) };
}

/** O formato certo, antes de ir ao banco (nada de consulta para lixo). */
export const pareceChave = (s: string) => /^gmp_[A-Za-z0-9_-]{43}$/.test(s);

// "Usada em" no máximo uma vez por minuto por chave, para não escrever no banco a cada chamada.
const ultimaMarca = new Map<number, number>();

/** O dono da chave do cabeçalho Authorization, com cargo e permissões; null = sem chave, chave errada ou desligada. */
export async function usuarioDaChave(authorization: string | null): Promise<Usuario | null> {
  const m = /^Bearer\s+(\S+)$/i.exec(authorization ?? "");
  if (!m || !pareceChave(m[1])) return null;
  const hash = hashDaChave(m[1]);
  const row = await prisma.chaveMcp.findUnique({ where: { hash }, select: { id: true, userId: true, isActive: true, hash: true } });
  // O índice já achou pelo hash; a comparação em tempo constante é a segunda trava.
  if (!row?.isActive || !timingSafeEqual(Buffer.from(row.hash), Buffer.from(hash))) return null;
  const agora = Date.now();
  if (agora - (ultimaMarca.get(row.id) ?? 0) > 60_000) {
    ultimaMarca.set(row.id, agora);
    await prisma.chaveMcp.update({ where: { id: row.id }, data: { usadaEm: new Date(agora) } }).catch(() => undefined);
  }
  return usuarioDaConta(row.userId);
}
