import { networkInterfaces } from "node:os";
import type { NextConfig } from "next";

// O site em modo dev também abre de outro PC ou do celular da rede de casa (http://<endereço deste PC>:3333).
// Sem isto o Next barra os arquivos do dev para quem não é localhost e a página fica sem funcionar.
// Mesma regra de src/lib/rede-local.ts (este arquivo não importa do src): só os endereços deste PC.
const IP_DA_REDE = /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.)/;
const ipsDaRede = Object.values(networkInterfaces())
  .flat()
  .filter((i) => i && i.family === "IPv4" && !i.internal && IP_DA_REDE.test(i.address))
  .map((i) => i!.address);

// Cabeçalhos de segurança em toda resposta (páginas e API).
const SEGURANCA = [
  // Nenhum outro site pode abrir o Garimpo dentro de uma moldura (clique enganado / clickjacking).
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'" },
  { key: "X-Frame-Options", value: "DENY" },
  // O navegador não "adivinha" o tipo do arquivo (um texto nunca vira script).
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Para outros sites vai só o domínio de onde se veio, nunca o caminho (ids de oferta, telas de admin).
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // O app não usa câmera, microfone, localização nem pagamento: ficam desligados.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()" },
  // Outra aba aberta a partir do Garimpo não controla a janela dele.
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  // Só com HTTPS (produção): o navegador nunca mais abre o site sem HTTPS.
  ...(process.env.NODE_ENV === "production" ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }] : []),
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // Não anuncia que é Next.js (e a versão) em cada resposta.
  poweredByHeader: false,
  allowedDevOrigins: ipsDaRede,
  async headers() {
    return [{ source: "/:path*", headers: SEGURANCA }];
  },
  // OAuth do MCP (docs/mcp.md): os endereços da especificação apontam para as rotas de src/app/api/oauth/meta.
  async rewrites() {
    return [
      { source: "/.well-known/oauth-protected-resource", destination: "/api/oauth/meta/recurso" },
      { source: "/.well-known/oauth-protected-resource/api/mcp", destination: "/api/oauth/meta/recurso" },
      { source: "/.well-known/oauth-authorization-server", destination: "/api/oauth/meta/servidor" },
      { source: "/.well-known/oauth-authorization-server/api/mcp", destination: "/api/oauth/meta/servidor" },
    ];
  },
  // As telas de administração moraram na raiz até 23/11; hoje ficam na área Admin.
  async redirects() {
    return [
      { source: "/fontes", destination: "/admin/fontes", permanent: false },
      { source: "/lojas", destination: "/admin/lojas", permanent: false },
      { source: "/ia", destination: "/admin/ia", permanent: false },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
