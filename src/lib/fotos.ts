import path from "node:path";

// Fotos das mensagens do Telegram, baixadas pelo worker (somente leitura, na conta do usuário) e servidas por /api/foto.
export const FOTOS_DIR = path.join(process.cwd(), ".garimpo", "fotos");
export const FOTO_NAME = /^[A-Za-z0-9_-]{1,80}\.jpg$/;
export const fotoUrl = (name: string) => `/api/foto/${name}`;
