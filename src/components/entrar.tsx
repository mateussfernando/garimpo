"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

type Modo = "entrar" | "criar";

/** Só volta para um caminho do próprio site (nada de //outro-site.com). */
function destinoSeguro(de: string | null): string {
  return de && de.startsWith("/") && !de.startsWith("//") && !de.startsWith("/entrar") ? de : "/";
}

/** Mensagem de erro em português, sem dizer mais do que precisa. */
function mensagem(err: { status?: number; code?: string; message?: string } | null, modo: Modo): string {
  if (!err) return "";
  if (err.status === 429) return "Muitas tentativas. Espere um minuto e tente de novo.";
  if (err.code === "CONTA_DESATIVADA") return "Esta conta está desativada. Fale com o administrador do Garimpo.";
  if (modo === "entrar") return "E-mail ou senha errados.";
  if (err.code === "USER_ALREADY_EXISTS" || err.code === "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL") return "Já existe uma conta com esse e-mail. Use Entrar.";
  if (err.code === "PASSWORD_TOO_SHORT") return "A senha precisa ter pelo menos 8 caracteres.";
  if (err.code === "PASSWORD_TOO_LONG") return "A senha pode ter no máximo 72 caracteres.";
  if (err.code === "INVALID_EMAIL") return "Esse e-mail não parece válido.";
  return "Não deu para criar a conta. Confira os dados e tente de novo.";
}

const input = "h-11 rounded-[10px] border border-control bg-bg px-3 text-[15px] outline-none focus:border-ink-3";

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] uppercase tracking-[0.06em] text-label">{label}</span>
      {children}
    </label>
  );
}

export function Entrar({ google }: { google: boolean }) {
  const router = useRouter();
  const params = useSearchParams();
  const destino = destinoSeguro(params.get("de"));
  const [modo, setModo] = useState<Modo>("entrar");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro("");
    setEnviando(true);
    const { error } =
      modo === "entrar"
        ? await authClient.signIn.email({ email, password: senha })
        : await authClient.signUp.email({ name: nome.trim(), email, password: senha });
    setEnviando(false);
    if (error) return setErro(mensagem(error, modo));
    router.replace(destino);
    router.refresh();
  };

  const comGoogle = async () => {
    setErro("");
    await authClient.signIn.social({ provider: "google", callbackURL: destino, errorCallbackURL: "/entrar" });
  };

  return (
    <main className="grid min-h-screen place-items-center px-4">
      <div className="flex w-full max-w-sm flex-col gap-5 rounded-2xl border border-card-line bg-surface p-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">Garimpo</h1>
          <p className="text-sm text-muted">{modo === "entrar" ? "Entre para ver as ofertas." : "Crie sua conta: leva meio minuto."}</p>
        </div>

        <div role="tablist" aria-label="Entrar ou criar conta" className="grid grid-cols-2 gap-1 rounded-[10px] border border-control p-1 text-[13px]">
          {(["entrar", "criar"] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={modo === m}
              onClick={() => {
                setModo(m);
                setErro("");
              }}
              className={`h-9 rounded-[7px] font-medium ${modo === m ? "bg-active text-ink" : "text-ink-2 hover:text-ink"}`}
            >
              {m === "entrar" ? "Entrar" : "Criar conta"}
            </button>
          ))}
        </div>

        <form onSubmit={enviar} className="flex flex-col gap-4">
          {modo === "criar" && (
            <Campo label="Nome">
              <input name="name" value={nome} onChange={(e) => setNome(e.target.value)} required minLength={2} maxLength={60} autoComplete="name" className={input} />
            </Campo>
          )}
          <Campo label="E-mail">
            <input name="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" autoFocus className={input} />
          </Campo>
          <Campo label="Senha">
            <input
              name="password"
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
              minLength={8}
              maxLength={72}
              autoComplete={modo === "entrar" ? "current-password" : "new-password"}
              aria-invalid={!!erro}
              className={input}
            />
          </Campo>
          {modo === "criar" && <p className="-mt-2 text-xs text-muted">Pelo menos 8 caracteres.</p>}
          {erro && (
            <p role="alert" className="text-sm text-bad">
              {erro}
            </p>
          )}
          <button type="submit" disabled={enviando} className="h-11 rounded-[10px] border border-ink bg-ink text-[14px] font-medium text-bg disabled:opacity-60">
            {enviando ? "Um instante…" : modo === "entrar" ? "Entrar" : "Criar conta"}
          </button>
        </form>

        {google && (
          <>
            <div className="flex items-center gap-3 text-xs text-ink-3" aria-hidden="true">
              <span className="h-px flex-1 bg-line" />
              ou
              <span className="h-px flex-1 bg-line" />
            </div>
            <button type="button" onClick={() => void comGoogle()} className="flex h-11 items-center justify-center gap-2 rounded-[10px] border border-control text-[14px] font-medium text-ink-2 hover:text-ink">
              <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
                <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.4 29.3 35.5 24 35.5c-6.4 0-11.5-5.1-11.5-11.5S17.6 12.5 24 12.5c2.9 0 5.6 1.1 7.6 2.9l5.7-5.7C33.7 6.4 29.1 4.5 24 4.5 13.2 4.5 4.5 13.2 4.5 24S13.2 43.5 24 43.5 43.5 34.8 43.5 24c0-1.2-.1-2.3-.3-3.5z" />
                <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8c1.8-4.4 6.1-7.5 11.1-7.5 2.9 0 5.6 1.1 7.6 2.9l5.7-5.7C33.7 6.4 29.1 4.5 24 4.5c-7.5 0-14 4.3-17.7 10.2z" />
                <path fill="#4CAF50" d="M24 43.5c5 0 9.6-1.9 13-5l-6-5.1c-2 1.4-4.4 2.1-7 2.1-5.3 0-9.7-3.1-11.3-7.5l-6.5 5C9.9 39.1 16.4 43.5 24 43.5z" />
                <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.4l6 5.1c-.4.4 6.3-4.6 6.3-14.5 0-1.2-.1-2.3-.4-3.5z" />
              </svg>
              Entrar com Google
            </button>
          </>
        )}
      </div>
    </main>
  );
}
