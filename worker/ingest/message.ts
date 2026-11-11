// Decide, sem IA e sem rede, se uma mensagem de grupo ou canal é uma oferta que interessa.
// Fica separado da Escuta para poder ser testado sem conectar no Telegram.
import { isShortener, storeForUrl } from "@/config/stores";
import { matchAlvo, type AlvoLite } from "../match/alvos";

const URL_RE = /https?:\/\/[^\s<>"')\]]+/gi;

/** Primeiro link de loja conhecida ou de encurtador (amzn.to, etc.). */
export function extractOutbound(text: string): string | null {
  const urls = (text.match(URL_RE) ?? []).map((u) => u.replace(/[.,;!?]+$/, ""));
  return urls.find((u) => storeForUrl(u) || isShortener(u)) ?? null;
}

const cleanLine = (l: string) => l.replace(URL_RE, "").replace(/\s+/g, " ").trim();

export type MessageVerdict =
  | { kind: "vazia" }
  | { kind: "sem-link" }
  | { kind: "fora-dos-alvos"; outboundUrl: string }
  | { kind: "oferta"; title: string; outboundUrl: string };

/**
 * Mensagem sem link de loja não é oferta. Com link, vale a primeira linha que nomeia um produto de algum Alvo:
 * ela vira o título. O "🔥 OFERTA RELÂMPAGO 🔥" da primeira linha não serve de título.
 */
export function offerFromMessage(text: string, alvos: AlvoLite[]): MessageVerdict {
  const body = text.trim();
  if (!body) return { kind: "vazia" };
  const outboundUrl = extractOutbound(body);
  if (!outboundUrl) return { kind: "sem-link" };
  const line = body
    .split("\n")
    .map(cleanLine)
    .find((l) => l.length > 3 && matchAlvo(l, alvos));
  if (!line) return { kind: "fora-dos-alvos", outboundUrl };
  return { kind: "oferta", title: line.slice(0, 200), outboundUrl };
}
