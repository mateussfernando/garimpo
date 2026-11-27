"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

// "Estou aqui" para o Painel do admin saber quantas pessoas usam o site e quando (pedido do usuário, 26/11).
// Avisa ao abrir cada página e a cada minuto enquanto a aba está visível (aba escondida não conta como "no site agora").
// Quem não tem conta é só um código aleatório guardado neste navegador (localStorage `garimpo:vid`): sem IP, sem nome.

const CHAVE = "garimpo:vid";

/** Código aleatório do visitante. getRandomValues funciona também fora de HTTPS (a Vitrine pela rede de casa). */
function codigo(): string | null {
  try {
    let v = localStorage.getItem(CHAVE);
    if (!v || !/^[0-9a-f-]{36}$/.test(v)) {
      const b = crypto.getRandomValues(new Uint8Array(16));
      b[6] = (b[6] & 0x0f) | 0x40; // versão 4
      b[8] = (b[8] & 0x3f) | 0x80;
      const h = [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
      v = `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
      localStorage.setItem(CHAVE, v);
    }
    return v;
  } catch {
    return null; // navegador sem localStorage (aba anônima bloqueada): a conta, se houver, ainda conta pelo servidor
  }
}

function avisar(pagina: boolean) {
  void fetch("/api/acesso", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ vid: codigo(), pagina }),
    keepalive: true,
  }).catch(() => undefined);
}

export function Presenca() {
  const caminho = usePathname();
  useEffect(() => {
    if (document.visibilityState === "visible") avisar(true);
  }, [caminho]);
  useEffect(() => {
    const vivo = () => {
      if (document.visibilityState === "visible") avisar(false);
    };
    const t = setInterval(vivo, 60_000);
    document.addEventListener("visibilitychange", vivo);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", vivo);
    };
  }, []);
  return null;
}
