// pnpm mcp:chave  ->  chaves de acesso ao MCP do Garimpo pela internet (/api/mcp). Só neste PC, com acesso ao banco.
//   pnpm mcp:chave criar <e-mail da conta> [nome]   cria e mostra a chave UMA vez (o banco guarda só o hash)
//   pnpm mcp:chave listar                           lista as chaves (sem mostrar nenhuma)
//   pnpm mcp:chave desligar <id>                    a chave para de funcionar na hora (a linha fica, desligada)
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
    console.table(rows.map((r) => ({ id: r.id, conta: r.user.name, nome: r.nome, comeco: `${r.prefixo}…`, ligada: r.isActive, criada: r.criadaEm.toISOString().slice(0, 16), usada: r.usadaEm?.toISOString().slice(0, 16) ?? "-" })));
  } else if (acao === "desligar") {
    const id = Number(arg);
    if (!Number.isInteger(id)) throw new Error("uso: pnpm mcp:chave desligar <id>");
    await prisma.chaveMcp.update({ where: { id }, data: { isActive: false } });
    console.log(`Chave ${id} desligada.`);
  } else {
    console.log("uso: pnpm mcp:chave criar <e-mail> [nome] | listar | desligar <id>");
  }
}

main()
  .catch((e) => {
    console.error((e as Error).message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
