// pnpm admin:criar  ->  cria a conta de administrador (ou promove uma conta que já existe).
// Pede nome, e-mail e senha aqui no terminal. A senha não aparece enquanto você digita, não vai na linha de comando
// e é guardada só como hash bcrypt (o mesmo caminho do cadastro do site).
import "dotenv/config";
import { createInterface } from "node:readline";
import { tellWorker } from "@/lib/alvos";
import { auth } from "@/lib/auth";
import { assumirDadosAntigos, temDadosAntigos } from "@/lib/dados-antigos";
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

/** Os Alvos, marcações e eventos de antes das contas passam para o admin (uma vez, e só se ele quiser). */
async function oferecerDadosAntigos(userId: string) {
  if (!(await temDadosAntigos())) return;
  const ok = await perguntar("Esta conta fica com os Alvos, as marcações (vigiar, descartar, soneca) e os eventos de antes das contas? (s/n) ");
  if (!/^s/i.test(ok)) return console.log("Os dados de antes continuam sem dono (dá para rodar de novo depois).");
  const r = await assumirDadosAntigos(userId);
  if (!r) return console.log("Outra conta já ficou com os dados de antes.");
  await tellWorker({ acao: "rematch", userId });
  console.log(`Dados de antes: ${r.alvos} Alvos, ${r.faixas} faixas, ${r.marcacoes} marcações, ${r.ofertasNoAlvo} ofertas nos Alvos e ${r.eventos} eventos agora são desta conta.`);
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
    // Também reativa: é a saída se o único admin ficar desativado.
    await prisma.user.update({ where: { id: existente.id }, data: { cargoId: admin.id, isActive: true } });
    console.log(`Pronto: ${existente.name} (${email}) agora é ${admin.nome}${existente.isActive ? "" : " e a conta foi reativada"}.`);
    return oferecerDadosAntigos(existente.id);
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
  await oferecerDadosAntigos(res.user.id);
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
