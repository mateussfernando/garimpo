// pnpm admin:criar  ->  cria a conta de administrador (ou promove uma conta que já existe).
// Pede nome, e-mail e senha aqui no terminal. A senha não aparece enquanto você digita, não vai na linha de comando
// e é guardada só como hash bcrypt (o mesmo caminho do cadastro do site).
import "dotenv/config";
import { createInterface } from "node:readline";
import { auth } from "@/lib/auth";
import { pool } from "@/lib/db";
import { prisma } from "@/lib/db/prisma";

// Um leitor só para o script todo, com uma fila de linhas: funciona digitando e também com a entrada vinda de um pipe.
const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: process.stdin.isTTY ?? false });
const saida = rl as unknown as { _writeToOutput: (s: string) => void };
const escrever = saida._writeToOutput.bind(rl);
let mudo = false;
// Com a senha, não ecoa o que é digitado.
saida._writeToOutput = (s: string) => {
  if (!mudo) escrever(s);
};
const linhas: string[] = [];
const esperando: ((linha: string | null) => void)[] = [];
let fechado = false;
rl.on("line", (l) => (esperando.length ? esperando.shift()!(l) : linhas.push(l)));
rl.on("close", () => {
  fechado = true;
  while (esperando.length) esperando.shift()!(null);
});

async function perguntar(texto: string, oculto = false): Promise<string> {
  process.stdout.write(texto);
  mudo = oculto;
  const linha = linhas.length ? linhas.shift()! : fechado ? null : await new Promise<string | null>((ok) => esperando.push(ok));
  mudo = false;
  if (oculto) process.stdout.write("\n");
  if (linha == null) throw new Error("a entrada acabou antes da resposta");
  return linha.trim();
}

async function main() {
  const admin = await prisma.cargo.findFirst({ where: { todas: true } });
  if (!admin) throw new Error("O cargo de administrador não existe: rode `pnpm db:deploy` antes.");

  const email = (await perguntar("E-mail: ")).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("E-mail inválido.");
  const existente = await prisma.user.findUnique({ where: { email } });

  if (existente) {
    const ok = await perguntar(`Já existe a conta de ${existente.name}. Tornar administrador? (s/n) `);
    if (!/^s/i.test(ok)) return console.log("Nada mudou.");
    await prisma.user.update({ where: { id: existente.id }, data: { cargoId: admin.id } });
    return console.log(`Pronto: ${existente.name} (${email}) agora é ${admin.nome}.`);
  }

  const name = await perguntar("Nome: ");
  if (name.length < 2) throw new Error("O nome precisa ter pelo menos 2 letras.");
  const password = await perguntar("Senha (8 a 72 caracteres): ", true);
  if (password.length < 8 || password.length > 72) throw new Error("A senha precisa ter de 8 a 72 caracteres.");
  const again = await perguntar("Repita a senha: ", true);
  if (again !== password) throw new Error("As senhas não batem.");

  const res = await auth.api.signUpEmail({ body: { name, email, password } });
  await prisma.user.update({ where: { id: res.user.id }, data: { cargoId: admin.id } });
  console.log(`Pronto: conta de ${name} (${email}) criada como ${admin.nome}. Entre em /entrar com esse e-mail e senha.`);
}

main()
  .catch((e) => {
    console.error(`Erro: ${(e as Error).message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    rl.close();
    await prisma.$disconnect();
    await pool.end();
  });
