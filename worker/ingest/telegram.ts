// Escuta do Telegram (GramJS), SOMENTE LEITURA.
// Nunca envia mensagem, não entra em grupo, não marca como lida e ignora conversas individuais.
//
// Como funciona:
// 1. Lista seus grupos e canais a cada minuto e grava cada um em `sources` (kind "telegram").
//    Só os de promoção ligam sozinhos; os outros você decide na tela Fontes.
// 2. De cada canal ligado, lê as mensagens que ainda não leu (na primeira vez, as últimas 30 das últimas 24 h).
// 3. Mensagem nova chega por evento, em segundos. A leitura de 1 em 1 minuto é a rede de segurança:
//    se um evento se perder, a mensagem entra na próxima passada.
// 4. Oferta que vem daqui é conferida na loja na hora (via rápida), sem esperar a fila.
import { eq, sql } from "drizzle-orm";
import { Client } from "pg";
import { TelegramClient } from "telegram";
import { NewMessage, type NewMessageEvent } from "telegram/events";
import { StringSession } from "telegram/sessions";
import { hostOf } from "@/config/stores";
import { isOffTopicGroup, isPromoGroup } from "@/config/telegram-filter";
import { CMD_CHANNEL, db, schema } from "@/lib/db";
import type { SourceStats } from "@/lib/db/schema";
import { activeAlvos, ingestRaw, notify } from "../pipeline";
import { verifyNow } from "../verify/verify";
import { offerFromMessage } from "./message";

const { sources } = schema;

const INVITE_RE = /(?:https?:\/\/)?(t\.me\/(?:\+|joinchat\/)[A-Za-z0-9_-]{8,}|t\.me\/[A-Za-z][A-Za-z0-9_]{4,}|chat\.whatsapp\.com\/[A-Za-z0-9]{10,}|whatsapp\.com\/channel\/[A-Za-z0-9]{10,})/gi;
const REFRESH_EVERY = 60 * 1000;
const FLUSH_EVERY = 10 * 1000;
const BACKFILL_LIMIT = 30;
const BACKFILL_HOURS = 24;

type Peer = Parameters<TelegramClient["getMessages"]>[0];
type Chat = {
  key: string;
  sourceId: number;
  name: string;
  username: string | null;
  peer: Peer;
  stats: SourceStats;
  lastMessageAt: Date | null;
  dirty: boolean;
  chain: Promise<void>;
  /** Sites dos links de mensagens que não tinham loja conhecida. Serve para descobrir encurtador ou loja que falta na lista. */
  unknownHosts: Map<string, number>;
};

/**
 * Texto da mensagem mais os links que não aparecem no texto: os de palavras clicáveis ("COMPRE AQUI")
 * e os dos botões embaixo da mensagem. Muitos canais de oferta só põem o link da loja ali.
 */
function textWithLinks(m: { message?: string; entities?: unknown; replyMarkup?: unknown }): string {
  const links: string[] = [];
  for (const e of (Array.isArray(m.entities) ? m.entities : []) as { url?: unknown }[]) {
    if (typeof e.url === "string") links.push(e.url);
  }
  const rows = (m.replyMarkup as { rows?: { buttons?: { url?: unknown }[] }[] } | undefined)?.rows;
  for (const r of Array.isArray(rows) ? rows : []) {
    for (const b of r.buttons ?? []) if (typeof b.url === "string") links.push(b.url);
  }
  const text = m.message ?? "";
  const extra = [...new Set(links)].filter((l) => !text.includes(l));
  return [text, ...extra].join(String.fromCharCode(10));
}

const today = () => new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
const freshStats = (lastId = 0): SourceStats => ({ day: today(), read: 0, withLink: 0, touched: 0, offers: 0, lastId });

/** Guarda convites (t.me, chat.whatsapp.com) vistos nas mensagens. O app nunca entra sozinho em nenhum. */
async function saveInvites(text: string, ownUsername: string | null, from: string | null) {
  const found = new Set((text.match(INVITE_RE) ?? []).map((l) => l.replace(/^https?:\/\//i, "").toLowerCase()));
  for (const link of found) {
    if (/^t\.me\/(c|s)\//.test(link) || (ownUsername && link === `t.me/${ownUsername.toLowerCase()}`)) continue;
    const kind = link.startsWith("t.me") ? "telegram" : "whatsapp";
    await db
      .insert(schema.invites)
      .values({ link, kind, fromSource: from })
      .onConflictDoUpdate({ target: schema.invites.link, set: { mentions: sql`${schema.invites.mentions} + 1`, lastSeenAt: new Date() } })
      .catch(() => undefined);
  }
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

  const chats = new Map<string, Chat>();
  // Mesmo filtro das comunidades: só entra mensagem que nomeia um produto de algum Alvo.
  let alvos = await activeAlvos();
  setInterval(() => activeAlvos().then((a) => (alvos = a)).catch(() => undefined), REFRESH_EVERY);

  /** Uma mensagem por vez em cada chat, na ordem, para o contador e o `lastId` nunca se atropelarem. */
  const enqueue = (chat: Chat, job: () => Promise<void>) => {
    chat.chain = chat.chain.then(job).catch((e) => console.error(`[telegram] erro em ${chat.name}:`, (e as Error).message));
    return chat.chain;
  };

  async function handleMessage(chat: Chat, msg: { id: number; text: string; date: number }) {
    if (msg.id <= chat.stats.lastId) return; // já lida (o evento e a leitura de segurança podem trazer a mesma)
    if (chat.stats.day !== today()) chat.stats = freshStats(chat.stats.lastId);
    chat.stats.lastId = msg.id;
    chat.stats.read++;
    chat.lastMessageAt = new Date(msg.date * 1000);
    chat.dirty = true;
    if (!msg.text.trim()) return;
    void saveInvites(msg.text, chat.username, chat.name);
    const verdict = offerFromMessage(msg.text, alvos);
    if (verdict.kind === "sem-link") {
      for (const u of msg.text.match(/https?:\/\/[^\s<>"')\]]+/gi) ?? []) {
        const host = hostOf(u);
        if (host && !/^(t\.me|telegram\.me)$/.test(host) && chat.unknownHosts.size < 40) chat.unknownHosts.set(host, (chat.unknownHosts.get(host) ?? 0) + 1);
      }
    }
    if (verdict.kind === "vazia" || verdict.kind === "sem-link") return;
    chat.stats.withLink++;
    if (verdict.kind === "fora-dos-alvos") return;
    chat.stats.touched++;
    const offerId = await ingestRaw({
      sourceId: chat.sourceId,
      externalId: `${chat.key}/${msg.id}`,
      title: verdict.title,
      text: msg.text,
      url: chat.username ? `https://t.me/${chat.username}/${msg.id}` : null,
      outboundUrl: verdict.outboundUrl,
      imageUrl: null,
    });
    if (!offerId) return;
    chat.stats.offers++;
    const t0 = Date.now();
    console.log(`[telegram] oferta ${offerId} de ${chat.name}: ${verdict.title.slice(0, 70)}`);
    // Via rápida: confere na loja já. Não espera terminar para ler a próxima mensagem.
    void verifyNow(offerId)
      .then(() => console.log(`[telegram] oferta ${offerId} conferida em ${((Date.now() - t0) / 1000).toFixed(1)} s`))
      .catch((e) => console.error("[telegram] erro na via rápida:", (e as Error).message));
  }

  /** Lê o que ainda não foi lido do chat. Na primeira vez, só as últimas 24 h. */
  async function catchUp(chat: Chat) {
    const first = chat.stats.lastId === 0;
    const msgs = await client.getMessages(chat.peer, { limit: BACKFILL_LIMIT, ...(first ? {} : { minId: chat.stats.lastId }) });
    const cutoff = Date.now() / 1000 - BACKFILL_HOURS * 3600;
    const list = msgs.filter((m) => m.id > chat.stats.lastId && (!first || m.date >= cutoff)).sort((a, b) => a.id - b.id);
    const before = { ...chat.stats };
    for (const m of list) await handleMessage(chat, { id: m.id, text: textWithLinks(m), date: m.date });
    if (first) {
      // Marca o ponto de partida mesmo se não havia nada nas últimas 24 h, para não reler tudo na próxima vez.
      const newest = msgs.reduce((mx, m) => Math.max(mx, m.id), chat.stats.lastId);
      if (newest > chat.stats.lastId) {
        chat.stats.lastId = newest;
        chat.dirty = true;
      }
      console.log(
        `[telegram] ${chat.name}: ${chat.stats.read - before.read} lidas das últimas ${BACKFILL_HOURS} h, ${chat.stats.withLink - before.withLink} com link de loja, ${chat.stats.touched - before.touched} nos Alvos, ${chat.stats.offers - before.offers} ofertas`,
      );
      const hosts = [...chat.unknownHosts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
      if (hosts.length) console.log(`[telegram] ${chat.name}: links sem loja conhecida: ${hosts.map(([h, n]) => `${h} (${n})`).join(", ")}`);
    }
  }

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
          .values({ slug, kind: "telegram", name, url, enabled: isPromoGroup(name) })
          .returning();
        console.log(`[telegram] fonte nova: ${name} (${row.enabled ? "ligada" : "desligada"})`);
      } else if (row.enabled && !row.decision && isOffTopicGroup(name)) {
        // Grupo de outro assunto que tinha ligado sozinho: desliga.
        [row] = await db.update(sources).set({ name, url, enabled: false }).where(eq(sources.id, row.id)).returning();
        console.log(`[telegram] desligado (outro assunto): ${name}`);
      } else if (row.name !== name || row.url !== url) {
        await db.update(sources).set({ name, url }).where(eq(sources.id, row.id));
      }
      await db.update(sources).set({ lastRunAt: new Date() }).where(eq(sources.id, row.id));

      if (!row.enabled) {
        chats.delete(id);
        off++;
        continue;
      }
      on++;
      const peer = (d.inputEntity ?? d.entity) as Peer;
      let chat = chats.get(id);
      if (!chat) {
        chat = {
          key: id,
          sourceId: row.id,
          name,
          username,
          peer,
          stats: row.stats ?? freshStats(),
          lastMessageAt: row.lastMessageAt,
          dirty: false,
          chain: Promise.resolve(),
          unknownHosts: new Map(),
        };
        chats.set(id, chat);
        const c = chat;
        void enqueue(c, () => catchUp(c)); // primeira leitura deste canal nesta execução
      } else {
        chat.name = name;
        chat.username = username;
        chat.peer = peer;
        // Rede de segurança: a última mensagem do canal é mais nova do que a última lida? Então lê o que faltou.
        const top = d.message?.id ?? 0;
        if (top > chat.stats.lastId) {
          const c = chat;
          void enqueue(c, () => catchUp(c));
        }
      }
    }
    return { on, off };
  }

  /** Grava os contadores dos canais que mudaram e avisa as telas. */
  async function flush() {
    let any = false;
    for (const chat of chats.values()) {
      if (!chat.dirty) continue;
      chat.dirty = false;
      any = true;
      await db.update(sources).set({ stats: chat.stats, lastMessageAt: chat.lastMessageAt }).where(eq(sources.id, chat.sourceId));
    }
    if (any) await notify({ type: "source" });
  }
  setInterval(() => flush().catch((e) => console.error("[telegram] erro ao gravar contadores:", (e as Error).message)), FLUSH_EVERY);

  // A tela Fontes avisa por pg_notify quando o usuário muda uma fonte ou pede "Procurar de novo".
  const cmd = new Client({ connectionString: process.env.DATABASE_URL });
  await cmd.connect();
  await cmd.query(`LISTEN ${CMD_CHANNEL}`);
  cmd.on("notification", () => void syncDialogs().then(() => notify({ type: "source" })).catch((e) => console.error("[telegram] erro ao listar chats:", e)));
  cmd.on("error", (e) => console.error("[telegram] canal de comandos caiu:", e.message));

  const first = await syncDialogs();
  console.log(`[telegram] escutando ${first.on} grupos/canais (${first.off} desligados em sources)`);
  setInterval(() => syncDialogs().catch((e) => console.error("[telegram] erro ao listar chats:", (e as Error).message)), REFRESH_EVERY);

  client.addEventHandler((event: NewMessageEvent) => {
    const msg = event.message;
    if (event.isPrivate || msg.out) return; // nunca conversas individuais nem o que eu mesmo enviei
    const chat = chats.get(String(event.chatId));
    if (!chat) return;
    void enqueue(chat, () => handleMessage(chat, { id: msg.id, text: textWithLinks(msg), date: msg.date }));
  }, new NewMessage({ incoming: true }));
}
