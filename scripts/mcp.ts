// MCP do Garimpo neste PC, por stdio: o Claude Code abre sozinho pelo .mcp.json do projeto (ou: pnpm mcp).
// Lê o banco do DATABASE_URL do .env, sem passar pela internet. Roda como a conta de GARIMPO_MCP_EMAIL (no .env);
// sem ela, como o único admin ativo (cargo com todas as permissões). As ferramentas: src/lib/mcp/servidor.ts.
//
// O stdout é do protocolo: qualquer console.log do app iria quebrar a conversa, então tudo vai para o stderr.
console.log = console.error;
console.info = console.error;
console.warn = console.error;

async function main() {
  const { config } = await import("dotenv");
  config({ quiet: true });
  const { StdioServerTransport } = await import("@modelcontextprotocol/sdk/server/stdio.js");
  const { prisma } = await import("../src/lib/db/prisma");
  const { usuarioDaConta } = await import("../src/lib/sessao");
  const { servidorGarimpo } = await import("../src/lib/mcp/servidor");

  const email = process.env.GARIMPO_MCP_EMAIL?.trim().toLowerCase();
  let id: number | null = null;
  if (email) {
    id = (await prisma.user.findUnique({ where: { email }, select: { id: true } }))?.id ?? null;
    if (!id) throw new Error(`GARIMPO_MCP_EMAIL: nenhuma conta com o e-mail ${email}`);
  } else {
    const admins = await prisma.user.findMany({ where: { isActive: true, cargo: { todas: true, isActive: true } }, select: { id: true }, take: 2 });
    if (admins.length !== 1) throw new Error("Ponha GARIMPO_MCP_EMAIL=<e-mail da conta> no .env (há mais de um admin, ou nenhum)");
    id = admins[0].id;
  }
  const eu = await usuarioDaConta(id);
  if (!eu) throw new Error("A conta do MCP está desativada");

  await servidorGarimpo(eu).connect(new StdioServerTransport());
  console.error(`[mcp] Garimpo pronto (stdio) como ${eu.name} · ${eu.cargo.nome}`);
}

main().catch((e) => {
  console.error("[mcp]", (e as Error).message);
  process.exit(1);
});
