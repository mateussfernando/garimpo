// Sobe o site (next dev ou next start) na porta do .env.
// O Next não lê PORT do .env (o servidor sobe antes), então este lançador lê, confere se a porta está livre
// e, se estiver ocupada por outro programa, usa a próxima livre e avisa.
//   PORT=3333 no .env  ->  http://localhost:3333
//   sem PORT           ->  3000; se ocupada, 3333
import "dotenv/config";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { networkInterfaces } from "node:os";
import { fileURLToPath } from "node:url";

const mode = process.argv[2] === "start" ? "start" : "dev";
const wanted = Number(process.env.PORT) || null;

/** A porta está livre em IPv4 e IPv6? (outro app pode estar só no "::", e o localhost cai nele.) */
function isFree(port) {
  return new Promise((resolve) => {
    const s = createServer();
    s.once("error", () => resolve(false));
    s.once("listening", () => s.close(() => resolve(true)));
    s.listen({ port, host: "::", ipv6Only: false });
  });
}

async function pickPort() {
  const candidates = wanted ? [wanted] : [3000, 3333];
  for (const p of candidates) if (await isFree(p)) return p;
  // Todas ocupadas: a próxima livre depois da última.
  for (let p = candidates.at(-1) + 1; p < candidates.at(-1) + 50; p++) if (await isFree(p)) return p;
  throw new Error("nenhuma porta livre perto de " + candidates.join(", "));
}

const port = await pickPort();
if (wanted && port !== wanted) console.warn(`[web] a porta ${wanted} do .env está ocupada por outro programa; usando ${port}.`);
else if (!wanted && port !== 3000) console.warn(`[web] a porta 3000 está ocupada por outro programa; usando ${port}. Para fixar, ponha PORT=${port} no .env.`);

const lan = Object.values(networkInterfaces())
  .flat()
  .find((i) => i && i.family === "IPv4" && !i.internal)?.address;
console.log(`[web] Garimpo em http://localhost:${port}${lan ? ` (na rede: http://${lan}:${port})` : ""}`);

const nextBin = fileURLToPath(new URL("../node_modules/next/dist/bin/next", import.meta.url));
const child = spawn(process.execPath, [nextBin, mode, "-H", "0.0.0.0", "-p", String(port)], {
  stdio: "inherit",
  env: { ...process.env, PORT: String(port) },
});
child.on("exit", (code) => process.exit(code ?? 0));
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => child.kill(sig));
