// Foto da oferta a partir da própria mensagem do Telegram: a foto anexada ou a da prévia do link.
// Somente leitura, na conta do usuário. Nada de buscar imagem no Google: o robots.txt dele proíbe robôs na busca,
// e uma foto achada por nome pode ser de outro produto.
import { mkdirSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { and, eq, gte, inArray, isNull, sql } from "drizzle-orm";
import { Api, type TelegramClient } from "telegram";
import { db, schema } from "@/lib/db";
import { FOTOS_DIR, fotoUrl } from "@/lib/fotos";

/** A foto da mensagem: anexada (MessageMediaPhoto) ou da prévia do link (WebPage.photo). */
function photoOf(msg: Api.Message): Api.Photo | null {
  const m = msg.media;
  if (m instanceof Api.MessageMediaPhoto && m.photo instanceof Api.Photo) return m.photo;
  if (m instanceof Api.MessageMediaWebPage && m.webpage instanceof Api.WebPage && m.webpage.photo instanceof Api.Photo) return m.webpage.photo;
  return null;
}

/** Tamanho médio: "x" (800 px) ou "m" (320 px); senão, o maior. Evita baixar a foto em resolução cheia. */
function sizeOf(photo: Api.Photo): Api.TypePhotoSize | undefined {
  const sizes = (photo.sizes ?? []).filter((s) => s instanceof Api.PhotoSize || s instanceof Api.PhotoSizeProgressive);
  const by = (t: string) => sizes.find((s) => "type" in s && s.type === t);
  return by("x") ?? by("m") ?? by("y") ?? undefined;
}

/** Baixa a foto da mensagem para a pasta de fotos e devolve o endereço servido pelo site, ou null se não houver. */
export async function savePhoto(client: TelegramClient, msg: Api.Message, name: string): Promise<string | null> {
  const photo = photoOf(msg);
  if (!photo) return null;
  const buf = (await client.downloadMedia(new Api.MessageMediaPhoto({ photo }), { thumb: sizeOf(photo) })) as Buffer | undefined;
  if (!buf || buf.length < 500) return null;
  mkdirSync(FOTOS_DIR, { recursive: true });
  const file = `${name.replace(/[^A-Za-z0-9_-]/g, "_")}.jpg`;
  await writeFile(path.join(FOTOS_DIR, file), buf);
  return fotoUrl(file);
}

/** Põe a foto na oferta só se ela ainda não tem uma (a da loja, quando a conferência acha, vale mais). */
export async function setOfferPhoto(offerId: number, url: string) {
  await db.update(schema.offers).set({ imageUrl: url }).where(and(eq(schema.offers.id, offerId), isNull(schema.offers.imageUrl)));
}

type Peer = Parameters<TelegramClient["getMessages"]>[0];

/**
 * Ofertas do Telegram dos últimos 4 dias que ficaram sem foto: relê as mensagens (100 por pedido) e baixa as fotos.
 * Devagar de propósito (uma foto a cada 250 ms) para não chamar atenção do Telegram.
 */
export async function backfillPhotos(client: TelegramClient, peers: Map<string, Peer>): Promise<number> {
  const rows = await db
    .select({ id: schema.offers.id, ext: schema.rawMessages.externalId })
    .from(schema.offers)
    .innerJoin(schema.sources, eq(schema.offers.sourceId, schema.sources.id))
    .innerJoin(schema.rawMessages, eq(schema.offers.rawMessageId, schema.rawMessages.id))
    .where(
      and(
        eq(schema.sources.kind, "telegram"),
        isNull(schema.offers.imageUrl),
        inArray(schema.offers.kind, ["produto", "cupom"]),
        gte(schema.offers.createdAt, sql`now() - interval '4 days'`),
      ),
    );
  const byChat = new Map<string, { id: number; msgId: number }[]>();
  for (const r of rows) {
    const [chat, msgId] = r.ext.split("/");
    if (!chat || !Number(msgId) || !peers.has(chat)) continue;
    byChat.set(chat, [...(byChat.get(chat) ?? []), { id: r.id, msgId: Number(msgId) }]);
  }
  let saved = 0;
  for (const [chat, list] of byChat) {
    for (let i = 0; i < list.length; i += 100) {
      const part = list.slice(i, i + 100);
      const msgs = await client.getMessages(peers.get(chat)!, { ids: part.map((p) => p.msgId) });
      for (const msg of msgs) {
        if (!(msg instanceof Api.Message)) continue;
        const offer = part.find((p) => p.msgId === msg.id);
        if (!offer) continue;
        try {
          const url = await savePhoto(client, msg, `tg-${chat}-${msg.id}`);
          if (url) {
            await setOfferPhoto(offer.id, url);
            saved++;
          }
        } catch (e) {
          console.warn(`[telegram] foto da mensagem ${chat}/${msg.id} falhou: ${(e as Error).message}`);
        }
        await new Promise((r) => setTimeout(r, 250));
      }
    }
  }
  return saved;
}
