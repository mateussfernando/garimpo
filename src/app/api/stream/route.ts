import { connection } from "next/server";
import { Client } from "pg";
import { NOTIFY_CHANNEL, pgConfig } from "@/lib/db";
import { avisoPara } from "@/lib/avisos";
import { exigir } from "@/lib/sessao";

// Tempo real: o worker chama pg_notify; aqui fazemos LISTEN e repassamos por SSE, filtrado por quem está vendo.
// (Com Cache Components não se exporta `runtime`: a rota já roda em Node.)
export async function GET(request: Request) {
  await connection();
  const eu = await exigir("ofertas.ver");
  if (eu instanceof Response) return eu;
  // LISTEN precisa de uma conexão que fica com a gente (modo sessão). Na Vercel o DATABASE_URL é o pooler em modo
  // transação (porta 6543), que não escuta: lá DATABASE_LISTEN_URL aponta para o pooler em modo sessão (porta 5432).
  const url = process.env.DATABASE_LISTEN_URL || process.env.DATABASE_URL;
  const client = new Client({ ...pgConfig(url), connectionTimeoutMillis: 10_000 });
  try {
    await client.connect();
    await client.query(`LISTEN ${NOTIFY_CHANNEL}`);
  } catch (e) {
    // Sem isto a falha virava um 500 mudo e a tela ficava em "Reconectando" sem pista (27/11). O motivo vai para o
    // log e para quem abrir /api/stream, sem endereço nem senha.
    client.end().catch(() => undefined);
    const err = e as { code?: string; message?: string };
    const porta = url ? (URL.canParse(url) ? new URL(url).port || "5432" : "inválida") : "sem URL";
    const motivo = `${err.code ?? "erro"}: ${(err.message ?? String(e)).replace(/postgres(ql)?:\/\/\S+/gi, "<url>")}`;
    console.error(`[stream] LISTEN falhou (${process.env.DATABASE_LISTEN_URL ? "DATABASE_LISTEN_URL" : "DATABASE_URL"}, porta ${porta}): ${motivo}`);
    return Response.json({ erro: "tempo real indisponível", motivo, porta }, { status: 503 });
  }

  const encoder = new TextEncoder();
  let closed = false;
  let ping: ReturnType<typeof setInterval> | undefined;

  const shutdown = () => {
    if (closed) return;
    closed = true;
    if (ping) clearInterval(ping);
    client.end().catch(() => undefined);
  };

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (chunk: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          shutdown();
        }
      };
      send("retry: 3000\n\nevent: ready\ndata: {}\n\n");
      client.on("notification", (msg) => {
        const out = avisoPara(eu, msg.payload ?? "{}");
        if (out) send(`data: ${out}\n\n`);
      });
      client.on("error", () => {
        shutdown();
        try {
          controller.close();
        } catch {
          /* já fechado */
        }
      });
      ping = setInterval(() => send(": ping\n\n"), 25_000);
      request.signal.addEventListener("abort", () => {
        shutdown();
        try {
          controller.close();
        } catch {
          /* já fechado */
        }
      });
    },
    cancel: shutdown,
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
