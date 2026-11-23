import { spawn } from "node:child_process";
import { ambienteMinimo } from "./ambiente";
import { mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { AI_MODEL } from "@/config/pricing";
import { AiRefusal, jsonSchemaOf, type AiLimits, type AiProvider } from "../types";

// Teste pela assinatura: `claude -p` oficial, numa pasta vazia, com CLAUDE_CONFIG_DIR próprio,
// sem ANTHROPIC_API_KEY no ambiente do filho (senão ela vence a assinatura) e sem --bare.
// O token vem de CLAUDE_CODE_OAUTH_TOKEN (gerado com `claude setup-token`).
const WORK = join(tmpdir(), "garimpo-claude");
const CONFIG = join(WORK, "config");

// Várias chamadas ao mesmo tempo (análises em paralelo, categorias, radar): cada `claude -p` vivo usa uma pasta
// de configuração só dele (config, config-1, config-2...), para dois processos nunca escreverem o mesmo arquivo.
const slots = new Set<number>();
function takeSlot(): number {
  let i = 0;
  while (slots.has(i)) i++;
  slots.add(i);
  return i;
}

async function run(args: string[], input: string): Promise<string> {
  const slot = takeSlot();
  try {
    return await runIn(slot === 0 ? CONFIG : `${CONFIG}-${slot}`, args, input);
  } finally {
    slots.delete(slot);
  }
}

function runIn(config: string, args: string[], input: string): Promise<string> {
  mkdirSync(config, { recursive: true });
  // Só o token da assinatura e a pasta de configuração própria; nada do .env do worker (nem ANTHROPIC_API_KEY,
  // que venceria a assinatura).
  const env = ambienteMinimo({ CLAUDE_CODE_OAUTH_TOKEN: process.env.CLAUDE_CODE_OAUTH_TOKEN, CLAUDE_CONFIG_DIR: config });
  return new Promise((resolve, reject) => {
    // Sem shell: o claude.exe recebe cada argumento como está. O prompt vai por stdin.
    const child = spawn("claude", args, { cwd: WORK, env, windowsHide: true });
    let out = "";
    let err = "";
    const timer = setTimeout(() => child.kill(), 120_000);
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (err += d));
    child.on("error", reject);
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve(out);
      else {
        // Com stream-json o motivo vem no campo "result" da última linha.
        let why = (err || out).slice(0, 300);
        try {
          why = String(lastResult(out)?.result ?? why).slice(0, 300);
        } catch {
          /* mantém o texto cru */
        }
        reject(new Error(`claude -p saiu com código ${code}: ${why}`));
      }
    });
    child.stdin.end(input);
  });
}

type CliJson = {
  type?: string;
  is_error?: boolean;
  result?: string;
  structured_output?: unknown;
  total_cost_usd?: number;
  usage?: { input_tokens?: number; output_tokens?: number; cache_read_input_tokens?: number; cache_creation_input_tokens?: number };
};

type Window = { utilization?: number; resetsAt?: number; status?: string };
type RateLimitLine = { type: "rate_limit_event"; rate_limit_info?: { unifiedWindows?: { five_hour?: Window; seven_day?: Window } } };

const lines = (out: string) =>
  out
    .split(/\r?\n/)
    .filter((l) => l.trim().startsWith("{"))
    .flatMap((l) => {
      try {
        return [JSON.parse(l) as Record<string, unknown>];
      } catch {
        return [];
      }
    });

/** A linha final do stream-json (a que traz resultado, uso e custo). */
function lastResult(out: string): CliJson | null {
  const all = lines(out);
  return (all.reverse().find((j) => j.type === "result" || "total_cost_usd" in j) as CliJson | undefined) ?? null;
}

/** Uso da assinatura: janela de 5 h e semanal, em fração (0 a 1), que o claude -p manda a cada chamada. */
function limitsFrom(out: string): AiLimits | null {
  const ev = lines(out).find((j) => j.type === "rate_limit_event") as RateLimitLine | undefined;
  const w = ev?.rate_limit_info?.unifiedWindows;
  if (!w) return null;
  const win = (x?: Window) => (x && typeof x.utilization === "number" ? { pct: Math.round(x.utilization * 1000) / 10, resetsAt: x.resetsAt ? x.resetsAt * 1000 : null, status: x.status ?? null } : null);
  return { fiveHour: win(w.five_hour), sevenDay: win(w.seven_day), at: Date.now() };
}

export const claudeCli: AiProvider = {
  name: "claude-cli",
  model: AI_MODEL,
  async generate(req) {
    if (!process.env.CLAUDE_CODE_OAUTH_TOKEN) {
      throw new Error("Falta CLAUDE_CODE_OAUTH_TOKEN no .env. Rode `claude setup-token` no terminal e cole o token (o claude -p usa uma pasta de configuração própria e não herda o seu login).");
    }
    // Sem ferramentas e sem salvar sessão: é só uma conversa de uma volta, com a resposta em JSON Schema.
    const raw = await run(
      [
        "-p",
        "--model", AI_MODEL,
        "--output-format", "stream-json",
        "--verbose",
        "--tools", "",
        "--no-session-persistence",
        "--json-schema", JSON.stringify(jsonSchemaOf(req.schema)),
        "--system-prompt", req.system,
      ],
      req.prompt,
    );
    const out = lastResult(raw);
    if (!out) throw new Error("claude -p não devolveu o resultado");
    if (out.is_error) throw new Error(`claude -p devolveu erro: ${String(out.result).slice(0, 200)}`);
    let payload: unknown = out.structured_output;
    if (payload == null && typeof out.result === "string") {
      const txt = out.result.trim().replace(/^```(?:json)?\s*|\s*```$/g, "");
      if (!txt) throw new AiRefusal("resposta vazia (possível recusa)");
      payload = JSON.parse(txt);
    }
    const u = out.usage ?? {};
    const input = (u.input_tokens ?? 0) + (u.cache_read_input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0);
    return {
      data: req.schema.parse(payload),
      inputTokens: input,
      outputTokens: u.output_tokens ?? 0,
      costUsd: typeof out.total_cost_usd === "number" ? out.total_cost_usd : undefined,
      limits: limitsFrom(raw),
    };
  },
};
