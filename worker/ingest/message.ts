// Decide, sem IA e sem rede, se uma mensagem de grupo ou canal é uma oferta que interessa.
// Fica separado da Escuta para poder ser testado sem conectar no Telegram.
import { isShortener, storeForUrl } from "@/config/stores";
import { matchAlvo, type AlvoLite } from "../match/alvos";
import { categorize } from "../match/category";
import { extractCouponCode } from "../parse/coupons";

const URL_RE = /https?:\/\/[^\s<>"')\]]+/gi;

/** Primeiro link de loja conhecida ou de encurtador (amzn.to, etc.). */
export function extractOutbound(text: string): string | null {
  const urls = (text.match(URL_RE) ?? []).map((u) => u.replace(/[.,;!?]+$/, ""));
  return urls.find((u) => storeForUrl(u) || isShortener(u)) ?? null;
}

/** Tira link, negrito e título de Markdown ("**", "__", "# "), e espaços repetidos. */
const cleanLine = (l: string) =>
  l
    .replace(URL_RE, "")
    .replace(/\*\*|__|~~|`/g, "")
    .replace(/^\s*#+\s+/, "")
    .replace(/\s+/g, " ")
    .trim();

/**
 * Linha de ficha técnica ("- 512GB SSD", "• 16 GB RAM", "SPECS: ..."): descreve o produto, não é o nome dele.
 * Emoji de destaque (✅, ✔️, ➡️) no começo não faz a linha ser ficha: muitos canais põem um antes do nome do produto.
 */
const isSpecLine = (l: string) => /^\s*([-–•▪▫◾·]\s*\S|specs?\s*:)/i.test(l);

/**
 * Quanto a linha parece nome de produto. Nome de produto costuma ter modelo com número ("G305", "27 Pol", "1TB")
 * e ser mais longo; chamada de efeito ("MONITOR BRABO NO PRECINHO") não tem número e é curta.
 */
export function productness(line: string): number {
  let score = 0;
  if (/\d/.test(line)) score += 3;
  if (/[A-Za-z]+\d|\d+[A-Za-z]/.test(line)) score += 2; // código de modelo: G305, 24MS500, 1TB
  if (line.length >= 30) score += 1;
  if (/[,(]/.test(line)) score += 1; // "Monitor LG, 27 Pol, IPS"
  if (/[!?]/.test(line)) score -= 2;
  return score;
}

/** Começos de linha que são preço, cupom, chamada para clicar, propaganda do canal ou aviso, e não nome de produto. */
const NOISE_START =
  /^(r\$|por\b|de\b.{0,3}r\$|cupo[mn]|frete|parcel|em at[eé]|ou\b|à vista|a vista|pre[cç]o|valor|link|compre|acesse|resgate|aplique|use\b|usem\b|ative|confira|clique|copie|adicione|assine|torne-se|ganhe|seja prime|teste|salve|entre|participe|siga|sorteio|grupo|canal|bot\b|telegram|whatsapp|an[uú]ncio|ofertas? v[aá]lidas|sujeit|\d{1,2}\s*x\s*(de\b|r\$|sem\b|\d))/;

/** Linha que não é nome de produto: preço, cupom, chamada, rótulo ("Telegram de Ofertas:"), conversa ("e a live? kkk"). */
function isNoiseLine(l: string): boolean {
  const t = l.replace(/^[^\p{L}\p{N}]+/u, "").toLowerCase();
  if (NOISE_START.test(t)) return true;
  if (/:$/.test(t)) return true; // rótulo de link: "BOT DE ALERTAS:", "Link do produto:"
  if (/\?|kkk|haha|rsrs/.test(t)) return true; // conversa
  if (/\b(sorteio|telegram|whatsapp|t\.me|bot de|grupo de ofertas|no app\b.*(clique|abrir))/.test(t)) return true;
  // "R$ 100 OFF!!", "COM 15% OFF": só o desconto, sem produto.
  if (/^(com\s+)?(r\$\s?[\d.,]+|\d{1,3}\s?%)\s?(off|de desconto)[\s!]*$/.test(t)) return true;
  // Precisa de pelo menos duas palavras de verdade (letras), senão é só número, emoji ou preço.
  return (t.match(/\p{L}{2,}/gu) ?? []).length < 2;
}

/** Linha que fala de desconto ou cupom: pode ser o título de um post de cupom, mas perde para o nome de um produto. */
const isDealTalk = (l: string) => /\b(off|cupom|cupons|desconto|cashback)\b/i.test(l);

export type MessageVerdict =
  | { kind: "vazia" }
  | { kind: "sem-link" }
  | { kind: "sem-produto"; outboundUrl: string }
  | { kind: "oferta"; title: string; outboundUrl: string };

/**
 * Mensagem sem link de loja não é oferta. Com link, é oferta de qualquer produto: quem escolhe o que entra são
 * os grupos em que o usuário está. O título é a linha que mais parece nome de produto: modelo com número,
 * nome de um tipo de produto conhecido (categoria) e, no desempate, um Alvo. Preço, cupom, chamada para clicar,
 * propaganda do canal e conversa não contam. Sem nenhuma linha assim, não é oferta ("sem-produto").
 */
export function offerFromMessage(text: string, alvos: AlvoLite[]): MessageVerdict {
  const body = text.trim();
  if (!body) return { kind: "vazia" };
  const outboundUrl = extractOutbound(body);
  if (!outboundUrl) return { kind: "sem-link" };
  const all = body
    .split("\n")
    .map((l) => l.replace(/\*\*|__/g, ""))
    .filter((l) => !isSpecLine(l))
    .map(cleanLine)
    .map((l) => l.replace(/^[^\p{L}\p{N}]+/u, "").trim())
    .filter((l) => l.length > 3);
  const lines = all.filter((l) => !isNoiseLine(l));
  // Sem produto, mas com código de cupom ("Usem o Cupom: C0M3C0U35"): é post de cupom; o título é a primeira linha.
  const couponOnly = () =>
    extractCouponCode(body) && all.length ? ({ kind: "oferta", title: all[0].slice(0, 200), outboundUrl } as const) : ({ kind: "sem-produto", outboundUrl } as const);
  if (!lines.length) return couponOnly();
  const ranked = lines
    .map((l, i) => {
      const base = productness(l);
      const category = categorize(l) ? 2 : 0;
      // Linha do Alvo só ganha bônus quando já parece nome de produto (chamada de efeito com "monitor" não vale).
      const alvoBonus = base >= 3 && matchAlvo(l, alvos) ? 1 : 0;
      // Chamada em maiúsculas sem número ("SUA COLUNA PEDIU ESSA AQUI") perde para o nome do produto.
      const shout = l === l.toUpperCase() && !/\d/.test(l) ? -1 : 0;
      const deal = isDealTalk(l) ? -2 : 0;
      return { l, deal: deal < 0, score: base + category + alvoBonus + shout + deal - i * 0.01 };
    })
    .sort((a, b) => b.score - a.score);
  const best = ranked[0];
  // Linha de cupom ("15% OFF em R$ 79: SEMPREAQUI") vale como título só quando não há produto: vira post de cupom.
  if (best.score >= 2) return { kind: "oferta", title: best.l.slice(0, 200), outboundUrl };
  const dealLine = ranked.find((r) => r.deal);
  return dealLine ? { kind: "oferta", title: dealLine.l.slice(0, 200), outboundUrl } : couponOnly();
}
