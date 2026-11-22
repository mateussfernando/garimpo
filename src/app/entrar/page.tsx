export const metadata = { title: "Garimpo · Entrar" };

export default async function Page({ searchParams }: { searchParams: Promise<{ erro?: string; de?: string }> }) {
  const { erro, de } = await searchParams;
  return (
    <main className="grid min-h-screen place-items-center px-4">
      <form method="post" action="/api/entrar" className="flex w-full max-w-sm flex-col gap-4 rounded-2xl border border-card-line bg-surface p-6">
        <h1 className="text-2xl font-semibold tracking-tight">Garimpo</h1>
        <p className="text-sm text-muted">Este site é pessoal. Digite a senha para entrar.</p>
        <input type="hidden" name="de" value={de ?? "/"} />
        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] uppercase tracking-[0.06em] text-label">Senha</span>
          <input
            name="senha"
            type="password"
            autoFocus
            required
            autoComplete="current-password"
            aria-invalid={!!erro}
            className="h-11 rounded-[10px] border border-control bg-bg px-3 text-[15px] outline-none focus:border-ink-3"
          />
        </label>
        {erro && (
          <p role="alert" className="text-sm text-bad">
            Senha errada.
          </p>
        )}
        <button type="submit" className="h-11 rounded-[10px] border border-ink bg-ink text-[14px] font-medium text-bg">
          Entrar
        </button>
      </form>
    </main>
  );
}
