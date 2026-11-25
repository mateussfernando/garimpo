// O que cada um recebe do tempo real (/api/stream). Quem vê o sistema recebe o aviso inteiro; os outros, só os tipos
// que mexem nas telas deles e sem detalhe (o navegador só usa o aviso para recarregar). Pausa de loja, fontes e IA
// são do admin; "Alvo atingido" de outra pessoa nunca sai.
import { pode, type Usuario } from "@/lib/sessao";

type Aviso = { type?: string; kind?: string; id?: number; offerId?: number; userId?: number };

export function avisoPara(u: Pick<Usuario, "id" | "permissoes">, raw: string): string | null {
  let a: Aviso;
  try {
    a = JSON.parse(raw) as Aviso;
  } catch {
    return null;
  }
  // Aviso de um usuário (o Alvo dele): só para ele.
  if (a.userId && a.userId !== u.id) return null;
  if (pode(u, "sistema.ver")) return raw;
  const t = a.type;
  if (t === "ai") return pode(u, "ia.gerenciar") ? JSON.stringify({ type: t }) : null;
  if (t === "coleta") return pode(u, "fontes.gerenciar") ? JSON.stringify({ type: t }) : null;
  if (t === "insight") return pode(u, "ia.analises.ver") ? JSON.stringify({ type: t }) : null;
  if (t === "event") return a.kind === "canal" ? null : JSON.stringify({ type: t, kind: a.kind, offerId: a.offerId });
  if (t === "offer" || t === "coupon" || t === "alvos") return JSON.stringify({ type: t, ...(a.id != null ? { id: a.id } : {}) });
  return null; // source, pause, store e o que vier de novo: só para quem vê o sistema
}
