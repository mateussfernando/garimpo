import type { Metadata } from "next";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import { Globais } from "@/components/globais";
import { googleEnabled } from "@/lib/auth";
import { SCRIPT_TEMA } from "@/lib/tema";
import "./globals.css";

export const metadata: Metadata = {
  title: "Garimpo · Vitrine",
  description: "As melhores ofertas das últimas 48 h, com a nota de cada uma.",
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
