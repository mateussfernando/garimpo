// pnpm mcp:chave  ->  chaves de acesso ao MCP do Garimpo pela internet (/api/mcp). Só neste PC, com acesso ao banco.
//   pnpm mcp:chave criar <e-mail da conta> [nome]   cria e mostra a chave UMA vez (o banco guarda só o hash)
//   pnpm mcp:chave listar                           lista as chaves (sem mostrar nenhuma)
//   pnpm mcp:chave desligar <id>                    a chave para de funcionar na hora (a linha fica, desligada)
//   pnpm mcp:chave desligar oauth:<id>              corta um app que entrou pelo OAuth (ex.: o claude.ai), com todos os tokens dele
import "dotenv/config";
import { prisma } from "../src/lib/db/prisma";
import { gerarChave } from "../src/lib/mcp/chaves";

async function main() {
  const [acao, arg, ...resto] = process.argv.slice(2);
  if (acao === "criar") {
    const email = arg?.trim().toLowerCase();
    const user = email ? await prisma.user.findUnique({ where: { email }, select: { id: true, name: true, isActive: true } }) : null;
    if (!user?.isActive) throw new Error("uso: pnpm mcp:chave criar <e-mail de uma conta ativa> [nome]");
    const nome = resto.join(" ").trim().slice(0, 60) || "Claude";
    const { chave, prefixo, hash } = gerarChave();
    const row = await prisma.chaveMcp.create({ data: { userId: user.id, nome, prefixo, hash }, select: { id: true } });
    console.log(`Chave ${row.id} criada para ${user.name} (${nome}). Guarde agora; ela não aparece de novo:\n\n${chave}\n`);
    console.log(`Endereço: ${(process.env.BETTER_AUTH_URL ?? "http://localhost:3333").replace(/\/$/, "")}/api/mcp`);
    console.log("Cabeçalho: Authorization: Bearer <a chave>");
  } else if (acao === "listar") {
    const rows = await prisma.chaveMcp.findMany({ orderBy: { id: "asc" }, include: { user: { select: { name: true } } } });
    console.log("Chaves de acesso:");
    console.table(rows.map((r) => ({ id: r.id, conta: r.user.name, nome: r.nome, comeco: `${r.prefixo}…`, ligada: r.isActive, criada: r.criadaEm.toISOString().slice(0, 16), usada: r.usadaEm?.toISOString().slice(0, 16) ?? "-" })));
    const apps = await prisma.oauthCliente.findMany({ where: { tokens: { some: {} } }, orderBy: { id: "asc" }, include: { tokens: { where: { isActive: true, expiraEm: { gt: new Date() } }, select: { userId: true, criadoEm: true } } } });
    console.log("Apps que entraram pelo OAuth (desligar oauth:<id>):");
    console.table(apps.map((a) => ({ id: `oauth:${a.id}`, nome: a.nome, ligado: a.isActive, contas: new Set(a.tokens.map((t) => t.userId)).size, ultimo_token: a.tokens.map((t) => t.criadoEm).sort().at(-1)?.toISOString().slice(0, 16) ?? "-" })));
  } else if (acao === "desligar" && arg?.startsWith("oauth:")) {
    const id = Number(arg.slice(6));
    if (!Number.isInteger(id)) throw new Error("uso: pnpm mcp:chave desligar oauth:<id>");
    await prisma.oauthCliente.update({ where: { id }, data: { isActive: false } });
    await prisma.oauthToken.updateMany({ where: { clienteId: id }, data: { isActive: false } });
    console.log(`App oauth:${id} desligado, com todos os tokens.`);
  } else if (acao === "desligar") {
    const id = Number(arg);
    if (!Number.isInteger(id)) throw new Error("uso: pnpm mcp:chave desligar <id>");
    await prisma.chaveMcp.update({ where: { id }, data: { isActive: false } });
    console.log(`Chave ${id} desligada.`);
  } else {
    console.log("uso: pnpm mcp:chave criar <e-mail> [nome] | listar | desligar <id> | desligar oauth:<id>");
  }
}

main()
  .catch((e) => {
    console.error((e as Error).message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
