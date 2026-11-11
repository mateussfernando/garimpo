"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const MUTE_KEY = "garimpo:mudo";

/**
 * Som e título da aba para o alerta de Alvo atingido. Só na Vitrine: nada vai para o celular.
 * O navegador só deixa tocar som depois de um clique ou tecla na página; até lá o alerta é só visual.
 */
export function useAlertSound() {
  const [muted, setMuted] = useState(false);
  const ctxRef = useRef<AudioContext | null>(null);
  const titleTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const baseTitle = useRef<string>("");

  useEffect(() => {
    const first = setTimeout(() => setMuted(localStorage.getItem(MUTE_KEY) === "1"), 0);
    const unlock = () => {
      if (!ctxRef.current) {
        try {
          ctxRef.current = new AudioContext();
        } catch {
          /* sem áudio neste navegador */
        }
      }
      void ctxRef.current?.resume();
    };
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
    const stopTitle = () => {
      if (titleTimer.current) clearInterval(titleTimer.current);
      titleTimer.current = null;
      if (baseTitle.current) document.title = baseTitle.current;
    };
    window.addEventListener("focus", stopTitle);
    return () => {
      clearTimeout(first);
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      window.removeEventListener("focus", stopTitle);
      stopTitle();
    };
  }, []);

  const toggleMute = useCallback(() => {
    setMuted((m) => {
      localStorage.setItem(MUTE_KEY, m ? "0" : "1");
      return !m;
    });
  }, []);

  /** Três notas subindo para Alvo atingido; uma nota curta para oferta nova. */
  const play = useCallback(
    (kind: "alvo" | "nova") => {
      const ctx = ctxRef.current;
      if (muted || !ctx || ctx.state !== "running") return false;
      const notes = kind === "alvo" ? [660, 880, 1320] : [520];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        const t = ctx.currentTime + i * 0.14;
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(kind === "alvo" ? 0.22 : 0.08, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.26);
        osc.connect(gain).connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.3);
      });
      return true;
    },
    [muted],
  );

  /** Pisca o título da aba até você voltar para ela. */
  const flashTitle = useCallback((text: string) => {
    if (document.hasFocus()) return;
    if (!titleTimer.current) baseTitle.current = document.title;
    if (titleTimer.current) clearInterval(titleTimer.current);
    let on = false;
    titleTimer.current = setInterval(() => {
      on = !on;
      document.title = on ? text : baseTitle.current;
    }, 900);
  }, []);

  return { muted, toggleMute, play, flashTitle };
}
