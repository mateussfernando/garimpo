// Escuta do Telegram (GramJS), SOMENTE LEITURA.
// Nunca envia mensagem, não entra em grupo, não marca como lida e ignora conversas individuais.
// Na primeira conexão lista seus grupos e canais, grava cada um em `sources` (kind "telegram")
// e liga sozinho só os que têm cara de promoção. Para ligar ou desligar outro, mude `enabled` em sources.
import { eq } from "drizzle-orm";
import { TelegramClient } from "telegram";
import { NewMessage, type NewMessageEvent } from "telegram/events";
import { StringSession } from "telegram/sessions";
import { isShortener, storeForUrl } from "@/config/stores";
import { db, schema } from "@/lib/db";
import { ingestRaw } from "../pipeline";

const { sources } = schema;

const PROMO_NAME = /promo|oferta|achad|cupom|cupon|desconto|pechinch|barat|black|11\.?11|deal|garimp|economi|bug|preç|preco/i;
const URL_RE = /https?:\/\/[^\s<>"')\]]+/gi;
const REFRESH_EVERY = 60 * 1000;

type Watched = { sourceId: number; username: string | null };

export function extractOutbound(text: string): string | null {
  const urls = (text.match(URL_RE) ?? []).map((u) => u.replace(/[.,;!?]+$/, ""));
  return urls.find((u) => storeForUrl(u) || isShortener(u)) ?? null;
}

export function titleFrom(text: string): string {
  const line =
    text
      .split("\n")
      .map((l) => l.replace(URL_RE, "").replace(/\s+/g, " ").trim())
      .find((l) => l.length > 3) ?? text;
  return line.slice(0, 200);
}

export function telegramCredentials() {
  const apiId = Number(process.env.TELEGRAM_API_ID);
  const apiHash = process.env.TELEGRAM_API_HASH ?? "";
  const session = process.env.TELEGRAM_SESSION ?? "";
  return { apiId, apiHash, session, ok: Number.isFinite(apiId) && apiId > 0 && !!apiHash };
}

export async function startTelegram() {
  const cred = telegramCredentials();
  if (!cred.ok) {
    console.warn("[telegram] falta TELEGRAM_API_ID/TELEGRAM_API_HASH no .env. Escuta desligada.");
    return;
  }
  if (!cred.session) {
    console.warn("[telegram] falta TELEGRAM_SESSION. Rode `pnpm telegram:login` uma vez e cole a sessão no .env. Escuta desligada.");
    return;
  }

  const client = new TelegramClient(new StringSession(cred.session), cred.apiId, cred.apiHash, {
    connectionRetries: 10,
    autoReconnect: true,
  });
  await client.connect();
  if (!(await client.checkAuthorization())) {
    console.warn("[telegram] a sessão não vale mais. Rode `pnpm telegram:login` de novo.");
    await client.disconnect();
    return;
  }

  const watched = new Map<string, Watched>();

  async function syncDialogs() {
    const dialogs = await client.getDialogs({ limit: 300 });
    let on = 0;
    let off = 0;
    for (const d of dialogs) {
      if (!(d.isGroup || d.isChannel)) continue; // conversa individual: nunca
      const id = String(d.id);
      const name = d.title || d.name || id;
      const username = (d.entity as { username?: string } | undefined)?.username ?? null;
      const slug = `tg-${id}`;
      const url = username ? `https://t.me/${username}` : `telegram:${id}`;
      const [existing] = await db.select().from(sources).where(eq(sources.slug, slug));
      let row = existing;
      if (!row) {
        [row] = await db
          .insert(sources)
          .values({ slug, kind: "telegram", name, url, enabled: PROMO_NAME.test(name) })
          .returning();
        console.log(`[telegram] fonte nova: ${name} (${row.enabled ? "ligada" : "desligada"})`);
      } else if (row.name !== name || row.url !== url) {
        await db.update(sources).set({ name, url }).where(eq(sources.id, row.id));
      }
      if (row.enabled) {
        watched.set(id, { sourceId: row.id, username });
        on++;
      } else {
        watched.delete(id);
        off++;
      }
    }
    return { on, off };
  }

  const first = await syncDialogs();
  console.log(`[telegram] escutando ${first.on} grupos/canais (${first.off} desligados em sources)`);
  setInterval(() => syncDialogs().catch((e) => console.error("[telegram] erro ao listar chats:", e)), REFRESH_EVERY);

  client.addEventHandler(async (event: NewMessageEvent) => {
    try {
      const msg = event.message;
      if (event.isPrivate || msg.out) return; // nunca conversas individuais nem o que eu mesmo enviei
      const w = watched.get(String(event.chatId));
      if (!w) return;
      const text = (msg.message ?? "").trim();
      if (!text) return;
      const outboundUrl = extractOutbound(text);
      if (!outboundUrl) return; // papo sem link de loja não é oferta
      const externalId = `${String(event.chatId)}/${msg.id}`;
      const id = await ingestRaw({
        sourceId: w.sourceId,
        externalId,
        title: titleFrom(text),
        text,
        url: w.username ? `https://t.me/${w.username}/${msg.id}` : null,
        outboundUrl,
        imageUrl: null,
      });
      if (id) console.log(`[telegram] oferta ${id}: ${titleFrom(text).slice(0, 70)}`);
    } catch (e) {
      console.error("[telegram] erro na mensagem:", e);
    }
  }, new NewMessage({ incoming: true }));
}
