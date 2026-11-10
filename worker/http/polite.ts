// Coleta educada: robots.txt, 1 pedido a cada 5 a 10 s por domínio,
// cache de 10 min, pausa de 1 h em 429/403, User-Agent fixo, sem proxy.

export const USER_AGENT = "GarimpoBot/0.1 (app pessoal de ofertas; coleta educada)";
const ROBOTS_TTL = 24 * 60 * 60 * 1000;
const PAUSE_MS = 60 * 60 * 1000;
const DEFAULT_TTL = 10 * 60 * 1000;
const MAX_BODY = 3 * 1024 * 1024;

export type FetchResult = { url: string; status: number; body: string; location: string | null };

export class PausedError extends Error {
  constructor(public host: string, public until: number) {
    super(`${host} pediu pausa até ${new Date(until).toLocaleTimeString("pt-BR")}`);
  }
}
export class RobotsError extends Error {
  constructor(public url: string) {
    super(`robots.txt não permite ${url}`);
  }
}

const nextAllowedAt = new Map<string, number>();
const chains = new Map<string, Promise<unknown>>();
const pausedUntil = new Map<string, number>();
const cache = new Map<string, { at: number; res: FetchResult }>();
const robotsCache = new Map<string, { at: number; ttl: number; rules: RobotsRules }>();

type Rule = { allow: boolean; re: RegExp; len: number };
type RobotsRules = { mode: "rules"; rules: Rule[] } | { mode: "allow-all" } | { mode: "deny-all" };

let onPause: ((host: string, until: number) => void) | null = null;
export function setPauseListener(fn: (host: string, until: number) => void) {
  onPause = fn;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function pausedHosts(): { host: string; until: number }[] {
  const now = Date.now();
  return [...pausedUntil.entries()].filter(([, u]) => u > now).map(([host, until]) => ({ host, until }));
}

/** Enfileira por domínio, com 5 a 10 s entre pedidos ao mesmo domínio. */
function schedule<T>(host: string, fn: () => Promise<T>): Promise<T> {
  const prev = chains.get(host) ?? Promise.resolve();
  const run = prev
    .catch(() => undefined)
    .then(async () => {
      const wait = (nextAllowedAt.get(host) ?? 0) - Date.now();
      if (wait > 0) await sleep(wait);
      try {
        return await fn();
      } finally {
        nextAllowedAt.set(host, Date.now() + 5000 + Math.random() * 5000);
      }
    });
  chains.set(host, run);
  return run;
}

async function rawFetch(url: string, redirect: "follow" | "manual"): Promise<FetchResult> {
  const res = await fetch(url, {
    redirect,
    signal: AbortSignal.timeout(20_000),
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "pt-BR,pt;q=0.9",
    },
  });
  let body = "";
  if (redirect === "follow" || res.status < 300 || res.status >= 400) {
    const buf = await res.arrayBuffer();
    body = new TextDecoder("utf-8").decode(buf.byteLength > MAX_BODY ? buf.slice(0, MAX_BODY) : buf);
  }
  return { url: res.url || url, status: res.status, body, location: res.headers.get("location") };
}

function parseRobots(txt: string): RobotsRules {
  const lines = txt.split(/\r?\n/).map((l) => l.replace(/#.*/, "").trim());
  type Group = { agents: string[]; rules: Rule[] };
  const groups: Group[] = [];
  let cur: Group | null = null;
  let lastWasAgent = false;
  for (const line of lines) {
    const m = line.match(/^([a-z-]+)\s*:\s*(.*)$/i);
    if (!m) continue;
    const key = m[1].toLowerCase();
    const val = m[2].trim();
    if (key === "user-agent") {
      if (!cur || !lastWasAgent) {
        cur = { agents: [], rules: [] };
        groups.push(cur);
      }
      cur.agents.push(val.toLowerCase());
      lastWasAgent = true;
      continue;
    }
    lastWasAgent = false;
    if (!cur || (key !== "allow" && key !== "disallow")) continue;
    if (key === "disallow" && val === "") continue; // "Disallow:" vazio = libera tudo
    const pattern = val
      .replace(/[.+?^{}()|[\]\\]/g, "\\$&")
      .replace(/\*/g, ".*")
      .replace(/\\\$$/, "$");
    cur.rules.push({ allow: key === "allow", re: new RegExp("^" + pattern), len: val.length });
  }
  const mine = groups.find((g) => g.agents.some((a) => a !== "*" && "garimpobot".includes(a)));
  const star = groups.find((g) => g.agents.includes("*"));
  const group = mine ?? star;
  return group ? { mode: "rules", rules: group.rules } : { mode: "allow-all" };
}

async function robotsFor(origin: string, host: string): Promise<RobotsRules> {
  const hit = robotsCache.get(origin);
  if (hit && Date.now() - hit.at < hit.ttl) return hit.rules;
  // Falha de rede não vira bloqueio: o erro sobe e a próxima passada tenta de novo.
  const res = await schedule(host, () => rawFetch(origin + "/robots.txt", "follow"));
  let rules: RobotsRules;
  let ttl = ROBOTS_TTL;
  if (res.status >= 200 && res.status < 300) rules = parseRobots(res.body);
  else if (res.status >= 400 && res.status < 500) rules = { mode: "allow-all" };
  else {
    // 5xx: o site está com problema; por segurança não coleta, e confere de novo em 10 min.
    rules = { mode: "deny-all" };
    ttl = 10 * 60 * 1000;
  }
  robotsCache.set(origin, { at: Date.now(), ttl, rules });
  return rules;
}

export async function robotsAllows(url: string): Promise<boolean> {
  const u = new URL(url);
  const rules = await robotsFor(u.origin, u.hostname);
  if (rules.mode === "allow-all") return true;
  if (rules.mode === "deny-all") return false;
  const path = u.pathname + u.search;
  let best: Rule | null = null;
  for (const r of rules.rules) {
    if (r.re.test(path) && (!best || r.len > best.len || (r.len === best.len && r.allow))) best = r;
  }
  return best ? best.allow : true;
}

export async function politeFetch(
  url: string,
  opts: { redirect?: "follow" | "manual"; ttlMs?: number } = {},
): Promise<FetchResult> {
  const u = new URL(url);
  const host = u.hostname;
  const until = pausedUntil.get(host);
  if (until && until > Date.now()) throw new PausedError(host, until);
  const redirect = opts.redirect ?? "follow";
  const key = redirect + " " + url;
  const ttl = opts.ttlMs ?? DEFAULT_TTL;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < ttl) return hit.res;
  if (!(await robotsAllows(url))) throw new RobotsError(url);
  const res = await schedule(host, () => rawFetch(url, redirect));
  if (res.status === 429 || res.status === 403) {
    const pauseEnd = Date.now() + PAUSE_MS;
    pausedUntil.set(host, pauseEnd);
    onPause?.(host, pauseEnd);
    throw new PausedError(host, pauseEnd);
  }
  cache.set(key, { at: Date.now(), res });
  return res;
}

/** Segue redirecionamentos um a um (no máximo 5 saltos), cada salto com a fila do seu domínio. */
export async function unshorten(url: string, maxHops = 5): Promise<string> {
  let current = url;
  for (let i = 0; i < maxHops; i++) {
    const res = await politeFetch(current, { redirect: "manual", ttlMs: 6 * 60 * 60 * 1000 });
    if (res.status >= 300 && res.status < 400 && res.location) {
      current = new URL(res.location, current).toString();
      continue;
    }
    // Alguns encurtadores redirecionam por meta refresh ou JS simples.
    const meta = res.body.match(/http-equiv=["']?refresh["']?[^>]*url=([^"'>\s]+)/i) ?? res.body.match(/window\.location(?:\.href)?\s*=\s*["']([^"']+)["']/);
    if (meta && i < maxHops - 1) {
      current = new URL(meta[1].replace(/&amp;/g, "&"), current).toString();
      continue;
    }
    break;
  }
  return current;
}

// Usado só nos testes.
export const __test = { parseRobots };
