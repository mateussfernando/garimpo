import { connection } from "next/server";
import { Client } from "pg";
import { NOTIFY_CHANNEL } from "@/lib/db";

// Tempo real: o worker chama pg_notify; aqui fazemos LISTEN e repassamos por SSE.
// (Com Cache Components não se exporta `runtime`: a rota já roda em Node.)
export async function GET(request: Request) {
  await connection();
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  await client.query(`LISTEN ${NOTIFY_CHANNEL}`);

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
      client.on("notification", (msg) => send(`data: ${msg.payload ?? "{}"}\n\n`));
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
