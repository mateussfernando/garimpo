import { jsonSchemaOf, type AiProvider } from "../types";

// Ollama local. O nome do modelo é o de OLLAMA_MODEL (o Haiku só existe na Anthropic).
export const ollama: AiProvider = {
  name: "ollama",
  async generate(req) {
    const model = process.env.OLLAMA_MODEL;
    if (!model) throw new Error("Falta OLLAMA_MODEL no .env para AI_PROVIDER=ollama");
    const res = await fetch(`${process.env.OLLAMA_URL ?? "http://localhost:11434"}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(120_000),
      body: JSON.stringify({
        model,
        stream: false,
        format: jsonSchemaOf(req.schema),
        messages: [
          { role: "system", content: req.system },
          { role: "user", content: req.prompt },
        ],
      }),
    });
    if (!res.ok) throw new Error(`Ollama respondeu ${res.status}`);
    const json = (await res.json()) as { message?: { content?: string }; prompt_eval_count?: number; eval_count?: number };
    return {
      data: req.schema.parse(JSON.parse(json.message?.content ?? "")),
      inputTokens: json.prompt_eval_count ?? 0,
      outputTokens: json.eval_count ?? 0,
    };
  },
};
