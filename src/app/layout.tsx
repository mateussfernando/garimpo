import type { Metadata } from "next";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import { Globais } from "@/components/globais";
import { googleEnabled } from "@/lib/auth";
import { SCRIPT_TEMA } from "@/lib/tema";
import "./globals.css";

// Endereço público, para a prévia do link (WhatsApp e redes) levar a imagem com o endereço completo. Na Vercel vem
// do domínio de produção; aqui, do BETTER_AUTH_URL.
const SITE = process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : (process.env.BETTER_AUTH_URL ?? "http://localhost:3000");
const DESCRICAO = "As melhores ofertas da Black Friday num lugar só, cada uma com nota de 0 a 10 pelo histórico de preço. Notebooks, celulares, TVs e cupons, ao vivo.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: "Garimpo · Vitrine",
  description: DESCRICAO,
  // A imagem vem de src/app/opengraph-image.tsx (o Next põe og:image sozinho).
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "Garimpo",
    title: "Garimpo · Ofertas da Black Friday com nota",
    description: DESCRICAO,
    url: "/",
  },
  twitter: { card: "summary_large_image", title: "Garimpo · Ofertas da Black Friday com nota", description: DESCRICAO },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${GeistSans.variable} ${GeistMono.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        {/* Tema (claro, escuro ou o do sistema) antes de pintar: sem piscar o tema errado. */}
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_TEMA }} />
      </head>
      <body className="min-h-full flex flex-col">
        {children}
        <Globais google={googleEnabled()} />
      </body>
    </html>
  );
}
