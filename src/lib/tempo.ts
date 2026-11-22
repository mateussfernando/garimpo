// Tempo do app. "Hoje" é sempre o dia de São Paulo, mesmo com o banco ou o servidor em UTC (Supabase, Vercel).

const TZ = "America/Sao_Paulo";

/** O instante de `ms` milissegundos atrás. */
export function atras(ms: number): Date {
  return new Date(Date.now() - ms);
}

export const MIN = 60_000;
export const HORA = 60 * MIN;
export const DIA = 24 * HORA;

/** Meia-noite de hoje em São Paulo, como instante (Date). Substitui `date_trunc('day', now())` do banco local. */
export function inicioDoDia(agora = new Date()): Date {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" })
      .formatToParts(agora)
      .map((x) => [x.type, x.value]),
  );
  // Quanto São Paulo está atrás do UTC agora (-3 h hoje; a conta vale se o horário mudar).
  const local = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  const offset = local - Math.floor(agora.getTime() / 1000) * 1000;
  return new Date(Date.UTC(+p.year, +p.month - 1, +p.day) - offset);
}

/** Data (dia, sem hora) de hoje em São Paulo, para colunas `date`. */
export function hojeSP(agora = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(agora);
}
