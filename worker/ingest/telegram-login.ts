// pnpm telegram:login
// Login único na sua conta (telefone, código e senha em duas etapas, se tiver).
// Imprime a sessão para você colar em TELEGRAM_SESSION no .env. Só leitura: o app nunca envia nada.
import "dotenv/config";
import { createInterface } from "node:readline/promises";
import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";

async function main() {
  const apiId = Number(process.env.TELEGRAM_API_ID);
  const apiHash = process.env.TELEGRAM_API_HASH ?? "";
  if (!apiId || !apiHash) {
    console.error("Preencha TELEGRAM_API_ID e TELEGRAM_API_HASH no .env (my.telegram.org).");
    process.exit(1);
  }
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const ask = (q: string) => rl.question(q);
  const client = new TelegramClient(new StringSession(process.env.TELEGRAM_SESSION ?? ""), apiId, apiHash, {
    connectionRetries: 5,
  });
  await client.start({
    phoneNumber: () => ask("Telefone com DDI (ex.: +5511999999999): "),
    phoneCode: () => ask("Código que chegou no Telegram: "),
    password: () => ask("Senha em duas etapas (Enter se não tem): "),
    onError: (e) => console.error(e),
  });
  rl.close();
  console.log("\nLogin ok. Cole esta linha no .env (não compartilhe, ela vale como senha da conta):\n");
  console.log(`TELEGRAM_SESSION=${client.session.save() as unknown as string}\n`);
  await client.disconnect();
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
