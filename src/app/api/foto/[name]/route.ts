import { readFile } from "node:fs/promises";
import path from "node:path";
import { FOTOS_DIR, FOTO_NAME } from "@/lib/fotos";

// Serve a foto de uma mensagem do Telegram que o worker baixou. Só nomes simples, só dentro da pasta de fotos.
export async function GET(_request: Request, ctx: RouteContext<"/api/foto/[name]">) {
  const { name } = await ctx.params;
  if (!FOTO_NAME.test(name)) return new Response("nome inválido", { status: 400 });
  try {
    const body = await readFile(path.join(FOTOS_DIR, name));
    return new Response(new Uint8Array(body), { headers: { "Content-Type": "image/jpeg", "Cache-Control": "public, max-age=604800, immutable" } });
  } catch {
    return new Response("sem foto", { status: 404 });
  }
}
