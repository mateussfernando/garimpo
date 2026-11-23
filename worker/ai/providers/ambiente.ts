// Ambiente mínimo para o `claude -p` e o `agy`. O worker tem no ambiente tudo do .env (DATABASE_URL, a sessão do
// Telegram, segredos do login e do Mercado Livre); nada disso vai para a IA. O filho recebe só o que o sistema precisa
// para rodar um programa (PATH, pasta do usuário, temporários, proxy) e o que cada CLI pede para entrar.

/** O que o Windows (e Linux/macOS) precisa para abrir um programa e achar as pastas do usuário. */
const SISTEMA = [
  "PATH", "PATHEXT", "SystemRoot", "SystemDrive", "windir", "ComSpec", "OS",
  "USERPROFILE", "HOMEDRIVE", "HOMEPATH", "HOME", "USERNAME", "USER", "LOGNAME", "SHELL",
  "APPDATA", "LOCALAPPDATA", "ProgramData", "ProgramFiles", "ProgramFiles(x86)", "ProgramW6432", "CommonProgramFiles",
  "TEMP", "TMP", "TMPDIR", "NUMBER_OF_PROCESSORS", "PROCESSOR_ARCHITECTURE", "LANG", "LC_ALL", "TZ",
  "XDG_CONFIG_HOME", "XDG_DATA_HOME", "XDG_CACHE_HOME",
  "HTTP_PROXY", "HTTPS_PROXY", "NO_PROXY", "http_proxy", "https_proxy", "no_proxy", "NODE_EXTRA_CA_CERTS", "SSL_CERT_FILE",
];

/**
 * Monta o ambiente do processo filho: as variáveis do sistema que existirem e as `extra` (as do próprio CLI).
 * No Windows os nomes não diferenciam maiúsculas (Path = PATH): cada uma entra uma vez só.
 */
export function ambienteMinimo(extra: Record<string, string | undefined> = {}, base: NodeJS.ProcessEnv = process.env): NodeJS.ProcessEnv {
  const out: Record<string, string> = {};
  const tem = new Set<string>();
  const ler = (nome: string) => {
    if (base[nome] !== undefined) return base[nome];
    const achado = Object.keys(base).find((k) => k.toLowerCase() === nome.toLowerCase());
    return achado ? base[achado] : undefined;
  };
  for (const nome of SISTEMA) {
    const v = ler(nome);
    if (v === undefined || tem.has(nome.toLowerCase())) continue;
    out[nome] = v;
    tem.add(nome.toLowerCase());
  }
  for (const [k, v] of Object.entries(extra)) if (v !== undefined) out[k] = v;
  return out as NodeJS.ProcessEnv;
}
