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

/** Linha que só fala de preço, cupom, frete ou link ("💰 R$ 2.779", "Cupom: BLACK10", "🛒 Compre aqui"): não é nome de produto. */
function isNoiseLine(l: string): boolean {
  const t = l.replace(/^[^\p{L}\p{N}]+/u, "").toLowerCase();
  if (/^(r\$|por\b|de r\$|cupo[mn]|frete|parcel|em at[eé]|ou\b|à vista|a vista|pre[cç]o|valor|link|compre|acesse|resgate|aplique|use o|ative|\d+\s*x\b)/.test(t)) return true;
  // Precisa de pelo menos duas palavras de verdade (letras), senão é só número, emoji ou preço.
  return (t.match(/\p{L}{2,}/gu) ?? []).length < 2;
}

export type MessageVerdict =
  | { kind: "vazia" }
  | { kind: "sem-link" }
  | { kind: "sem-produto"; outboundUrl: string }
  | { kind: "oferta"; title: string; outboundUrl: string };

/**
 * Mensagem sem link de loja não é oferta. Com link, é oferta de qualquer produto: quem escolhe o que entra são
 * os grupos em que o usuário está. O título é a linha que mais parece nome de produto (modelo com número);
 * uma linha que nomeia um Alvo ganha o desempate. Ficha técnica, preço e cupom não contam. Sem linha com número,
 * vale a primeira linha com palavras; a conferência na loja traz o nome certo depois.
 */
export function offerFromMessage(text: string, alvos: AlvoLite[]): MessageVerdict {
  const body = text.trim();
  if (!body) return { kind: "vazia" };
  const outboundUrl = extractOutbound(body);
  if (!outboundUrl) return { kind: "sem-link" };
  const lines = body
    .split("\n")
    .filter((l) => !isSpecLine(l))
    .map(cleanLine)
    .map((l) => l.replace(/^[^\p{L}\p{N}]+/u, "").trim())
    .filter((l) => l.length > 3 && !isNoiseLine(l));
  if (!lines.length) return { kind: "sem-produto", outboundUrl };
  const ranked = lines
    .map((l, i) => {
      const base = productness(l);
      // Linha do Alvo só ganha bônus quando já parece nome de produto (chamada de efeito com "monitor" não vale).
      const alvoBonus = base >= 3 && matchAlvo(l, alvos) ? 1 : 0;
      return { l, score: base + alvoBonus - i * 0.01 };
    })
    .sort((a, b) => b.score - a.score);
  const best = ranked[0].score >= 3 ? ranked[0].l : lines[0];
  return { kind: "oferta", title: best.slice(0, 200), outboundUrl };
}
