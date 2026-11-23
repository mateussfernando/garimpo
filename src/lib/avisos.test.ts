import { describe, expect, it, vi } from "vitest";
import type { Permissao } from "@/config/permissoes";

// O módulo de sessão puxa o better-auth e o banco; aqui só a regra de permissão importa.
vi.mock("@/lib/sessao", () => ({ pode: (u: { permissoes: string[] }, p: string) => u.permissoes.includes(p) }));
const { avisoPara } = await import("./avisos");

const comum = { id: 11, permissoes: ["ofertas.ver", "ia.analises.ver", "alvos.proprios"] as Permissao[] };
const admin = { id: 1, permissoes: ["ofertas.ver", "sistema.ver", "ia.gerenciar", "ia.analises.ver"] as Permissao[] };

describe("avisos do tempo real", () => {
  it("o admin recebe o aviso inteiro", () => {
    const raw = JSON.stringify({ type: "pause", host: "kabum.com.br", until: 1 });
    expect(avisoPara(admin, raw)).toBe(raw);
  });
  it("o usuário comum não recebe pausa de loja, fonte, IA nem canal novo", () => {
    expect(avisoPara(comum, JSON.stringify({ type: "pause", host: "kabum.com.br" }))).toBeNull();
    expect(avisoPara(comum, JSON.stringify({ type: "source", slug: "tg-1", status: "ok" }))).toBeNull();
    expect(avisoPara(comum, JSON.stringify({ type: "ai" }))).toBeNull();
    expect(avisoPara(comum, JSON.stringify({ type: "event", kind: "canal", id: 3 }))).toBeNull();
  });
  it("o usuário comum recebe oferta e cupom, sem detalhe", () => {
    expect(avisoPara(comum, JSON.stringify({ type: "offer", id: 7, alvoAtingido: true, host: "x" }))).toBe('{"type":"offer","id":7}');
    expect(avisoPara(comum, JSON.stringify({ type: "coupon" }))).toBe('{"type":"coupon"}');
  });
  it("aviso do Alvo de outra pessoa não sai para ninguém além dela", () => {
    const raw = JSON.stringify({ type: "event", kind: "alvo", offerId: 7, userId: 12 });
    expect(avisoPara(comum, raw)).toBeNull();
    expect(avisoPara(admin, raw)).toBeNull();
    expect(avisoPara({ ...comum, id: 12 }, raw)).toContain('"kind":"alvo"');
  });
});
