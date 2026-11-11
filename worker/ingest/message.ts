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

/** Linha de ficha técnica ("- 512GB SSD", "• 16 GB RAM", "SPECS: ..."): descreve o produto, não é o nome dele. */
const isSpecLine = (l: string) => /^\s*([-–•▪▫◾✅☑✔*·]|specs?\s*:)/i.test(l);

/**
 * Quanto a linha parece nome de produto. Nome de produto costuma ter modelo com número ("G305", "27 Pol", "1TB")
 * e ser mais longo; chamada de efeito ("MONITOR BRABO NO PRECINHO") não tem número e é curta.
 */
function productness(line: string): number {
  let score = 0;
  if (/\d/.test(line)) score += 3;
  if (/[A-Za-z]+\d|\d+[A-Za-z]/.test(line)) score += 2; // código de modelo: G305, 24MS500, 1TB
  if (line.length >= 30) score += 1;
  if (/[,(]/.test(line)) score += 1; // "Monitor LG, 27 Pol, IPS"
  if (/[!?]/.test(line)) score -= 2;
  return score;
}

export type MessageVerdict =
  | { kind: "vazia" }
  | { kind: "sem-link" }
  | { kind: "fora-dos-alvos"; outboundUrl: string }
  | { kind: "oferta"; title: string; outboundUrl: string };

/**
 * Mensagem sem link de loja não é oferta. Com link, o título é a linha que mais parece nome de um produto de algum Alvo.
 * Linha de ficha técnica não conta, e chamada de efeito sem modelo nem número só vale se não houver linha melhor
 * e se for a primeira coisa que a mensagem diz sobre o produto.
 */
export function offerFromMessage(text: string, alvos: AlvoLite[]): MessageVerdict {
  const body = text.trim();
  if (!body) return { kind: "vazia" };
  const outboundUrl = extractOutbound(body);
  if (!outboundUrl) return { kind: "sem-link" };
  const candidates = body
    .split("\n")
    .filter((l) => !isSpecLine(l))
    .map(cleanLine)
    .filter((l) => l.length > 3 && matchAlvo(l, alvos))
    .map((l, i) => ({ l, score: productness(l) - i * 0.01 }))
    .sort((a, b) => b.score - a.score);
  const best = candidates[0];
  // Sem nenhum número na linha, não dá para saber de que produto se fala: fica de fora (a triagem por IA pega depois).
  if (!best || best.score < 3) return { kind: "fora-dos-alvos", outboundUrl };
  return { kind: "oferta", title: best.l.slice(0, 200), outboundUrl };
}
