// Comandos que chegam ao worker por pg_notify (o site avisa; quem faz é o worker). Só passa o formato que o site
// manda: JSON quebrado, ação desconhecida ou campo a mais é ignorado e fica no log. Ninguém de fora fala com esse canal
// (precisa do banco), mas o worker não confia nem no próprio site: cada comando é conferido aqui.
import { z } from "zod";

/** Canal do Telegram ("Procurar de novo", fonte mudou): o site manda sempre `{}`. */
export const TelegramCmdSchema = z.object({}).strict();
/** "Chamar IA agora" e "Continuar". */
export const AiCmdSchema = z.object({ acao: z.literal("rodar") }).strict();
/** "Testar" da tela Fontes: a configuração em si é conferida pelo worker (CONFIG_SCHEMA) antes de abrir qualquer site. */
export const FontesCmdSchema = z
  .object({ acao: z.literal("testar"), token: z.uuid(), kind: z.enum(["feed", "pagina", "vtex"]), config: z.unknown() })
  .strict();

/** Lê um comando do canal: devolve os dados conferidos, ou null (e avisa no log) se o formato não for o esperado. */
export function lerComando<T>(schema: z.ZodType<T>, payload: string | undefined, canal: string): T | null {
  let raw: unknown;
  try {
    raw = JSON.parse(payload ?? "");
  } catch {
    raw = undefined;
  }
  const r = schema.safeParse(raw);
  if (r.success) return r.data;
  console.warn(`[${canal}] comando ignorado: formato inválido`);
  return null;
}
