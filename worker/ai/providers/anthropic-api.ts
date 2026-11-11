import Anthropic from "@anthropic-ai/sdk";
import { AI_MODEL } from "@/config/pricing";
import { AiRefusal, jsonSchemaOf, type AiProvider } from "../types";

// Haiku 5.5: sem temperature/top_p/top_k e sem prefill; JSON pelo output_config.format; effort baixo para extração.
export const anthropicApi: AiProvider = {
  name: "anthropic-api",
  async generate(req) {
    if (!process.env.ANTHROPIC_API_KEY) throw new Error("Falta ANTHROPIC_API_KEY no .env para AI_PROVIDER=anthropic-api");
    const client = new Anthropic();
    const res = await client.messages.create({
      model: AI_MODEL,
      max_tokens: 1500,
      system: req.system,
      messages: [{ role: "user", content: req.prompt }],
      output_config: {
        effort: "low",
        format: { type: "json_schema", schema: jsonSchemaOf(req.schema) },
      },
    });
    if (res.stop_reason === "refusal") throw new AiRefusal(`o modelo recusou (${res.stop_details?.category ?? "sem categoria"})`);
    if (res.stop_reason === "max_tokens") throw new Error("a resposta passou do limite de tokens");
    const text = res.content.find((b) => b.type === "text");
    if (!text || text.type !== "text") throw new Error("resposta sem texto");
    return { data: req.schema.parse(JSON.parse(text.text)), inputTokens: res.usage.input_tokens, outputTokens: res.usage.output_tokens };
  },
};
