import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { AI_MODEL } from "@/config/pricing";
import { AiRefusal, jsonSchemaOf, type AiProvider } from "../types";

// Teste pela assinatura: `claude -p` oficial, numa pasta vazia, com CLAUDE_CONFIG_DIR próprio,
// sem ANTHROPIC_API_KEY no ambiente do filho (senão ela vence a assinatura) e sem --bare.
// O token vem de CLAUDE_CODE_OAUTH_TOKEN (gerado com `claude setup-token`).
const WORK = join(tmpdir(), "garimpo-claude");
const CONFIG = join(WORK, "config");

function run(args: string[], input: string): Promise<string> {
  mkdirSync(CONFIG, { recursive: true });
  const env: NodeJS.ProcessEnv = { ...process.env, CLAUDE_CONFIG_DIR: CONFIG };
  delete env.ANTHROPIC_API_KEY;
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
        // Com --output-format json o motivo vem no campo "result" do stdout.
        let why = (err || out).slice(0, 300);
        try {
          why = String((JSON.parse(out) as { result?: string }).result ?? why).slice(0, 300);
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
  is_error?: boolean;
  result?: string;
  structured_output?: unknown;
  usage?: { input_tokens?: number; output_tokens?: number; cache_read_input_tokens?: number; cache_creation_input_tokens?: number };
};

export const claudeCli: AiProvider = {
  name: "claude-cli",
  async generate(req) {
    if (!process.env.CLAUDE_CODE_OAUTH_TOKEN) {
      throw new Error("Falta CLAUDE_CODE_OAUTH_TOKEN no .env. Rode `claude setup-token` no terminal e cole o token (o claude -p usa uma pasta de configuração própria e não herda o seu login).");
    }
    // Sem ferramentas e sem salvar sessão: é só uma conversa de uma volta, com a resposta em JSON Schema.
    const raw = await run(
      [
        "-p",
        "--model", AI_MODEL,
        "--output-format", "json",
        "--tools", "",
        "--no-session-persistence",
        "--json-schema", JSON.stringify(jsonSchemaOf(req.schema)),
        "--system-prompt", req.system,
      ],
      req.prompt,
    );
    const out = JSON.parse(raw) as CliJson;
    if (out.is_error) throw new Error(`claude -p devolveu erro: ${String(out.result).slice(0, 200)}`);
    let payload: unknown = out.structured_output;
    if (payload == null && typeof out.result === "string") {
      const txt = out.result.trim().replace(/^```(?:json)?\s*|\s*```$/g, "");
      if (!txt) throw new AiRefusal("resposta vazia (possível recusa)");
      payload = JSON.parse(txt);
    }
    const u = out.usage ?? {};
    const input = (u.input_tokens ?? 0) + (u.cache_read_input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0);
    return { data: req.schema.parse(payload), inputTokens: input, outputTokens: u.output_tokens ?? 0 };
  },
};
