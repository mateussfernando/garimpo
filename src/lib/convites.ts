// Convites do Telegram achados nas mensagens (tela Fontes). O app nunca entra em grupo nenhum: só mostra.

const PRIVADO = /^t\.me\/(?:\+|joinchat\/)([A-Za-z0-9_-]+)$/i;

/**
 * Link como ele é guardado: sem "https://", domínio e nome público em minúsculas. O código de um convite privado
 * (t.me/+Ab3…) diferencia maiúsculas de minúsculas, então fica como veio: em minúsculas ele não abre.
 */
export function normalizarConvite(raw: string): string {
  const link = raw.replace(/^https?:\/\//i, "");
  const priv = link.match(PRIVADO);
  if (priv) return `t.me/+${priv[1]}`;
  return link.toLowerCase();
}

/** Código do convite privado (t.me/+… ou t.me/joinchat/…), ou null se o link é de um grupo ou canal público. */
export function codigoDoConvite(link: string): string | null {
  return link.match(PRIVADO)?.[1] ?? null;
}

/**
 * Por que o convite não serve, ou null se pode servir:
 * - código só em minúsculas: foi gravado assim antes da correção de 26/11 e o Telegram não reconhece;
 * - o Telegram disse que o convite é inválido ou venceu (o worker confere e grava em app_settings);
 * - nome público terminado em "bot": é um robô, não um grupo.
 */
export function porQueNaoAbre(link: string, recusados: ReadonlySet<string>): string | null {
  if (recusados.has(link)) return "O Telegram diz que o convite venceu ou não existe";
  const codigo = codigoDoConvite(link);
  if (codigo) return /[a-z]/.test(codigo) && !/[A-Z]/.test(codigo) ? "Link salvo sem as maiúsculas, o Telegram não reconhece" : null;
  if (/^t\.me\/[a-z0-9_]+bot$/i.test(link)) return "É um bot, não um grupo";
  return null;
}
