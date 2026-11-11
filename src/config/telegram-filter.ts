// Filtro de grupos do Telegram por nome. Puro: usado pela Escuta (worker) e pela tela Fontes.
// Grupo só liga sozinho se o nome tem cara de promoção E não é de outro assunto.
// Nomes de loja grande contam: o canal oficial delas (ex.: "KaBuM!") só posta oferta.
const PROMO_NAME = /promo|oferta|achad|cupom|cupon|desconto|pechinch|barat|black|11\.?11|garimp|kabum|pichau|terabyte|magalu/i;
const OFFTOPIC_NAME = /curso|vaga|emprego|bate.?papo|porn|putaria|hentai|18\s?\+|\bbet\b|apost|tigrinho|cripto|forex|signal|trade|anime|filme|s[ée]rie|m[úu]sica|futebol|igreja|b[íi]blia|concurso|estudo|faculdade/i;

export const isOffTopicGroup = (name: string) => OFFTOPIC_NAME.test(name);
export const isPromoGroup = (name: string) => PROMO_NAME.test(name) && !isOffTopicGroup(name);

/** Motivo em português, para a tela Fontes. */
export function groupReason(name: string): string {
  if (isOffTopicGroup(name)) return "O nome parece de outro assunto, não de promoção";
  if (isPromoGroup(name)) return "O nome parece de promoção";
  return "O nome não parece de promoção";
}
