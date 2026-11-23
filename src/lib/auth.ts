// Login do Garimpo (better-auth): nome, e-mail e senha, e "Entrar com Google".
// A senha nunca é guardada: fica o hash bcrypt (bcryptjs, custo 12) em `contas.password`.
// Sessões no banco (tabela `sessoes`), em cookie httpOnly. Só roda no servidor: nada aqui vai para o navegador.
import bcrypt from "bcryptjs";
import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { prisma } from "@/lib/db/prisma";
import { tellWorker } from "@/lib/alvos";
import { darAlvosIniciais } from "@/lib/alvos-iniciais";

/** O botão "Entrar com Google" só existe com as duas chaves no .env. */
export const googleEnabled = () => !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

export const auth = betterAuth({
  appName: "Garimpo",
  // BETTER_AUTH_URL e BETTER_AUTH_SECRET vêm do .env.
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    minPasswordLength: 8,
    // O bcrypt só usa os primeiros 72 bytes da senha.
    maxPasswordLength: 72,
    password: {
      hash: (password) => bcrypt.hash(password, 12),
      verify: ({ hash, password }) => bcrypt.compare(password, hash),
    },
  },
  socialProviders: googleEnabled()
    ? { google: { clientId: process.env.GOOGLE_CLIENT_ID!, clientSecret: process.env.GOOGLE_CLIENT_SECRET!, prompt: "select_account" } }
    : {},
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 dias
    updateAge: 60 * 60 * 24, // renova uma vez por dia de uso
  },
  // Limite de tentativas no banco (vale também com várias instâncias na Vercel).
  rateLimit: {
    enabled: true,
    storage: "database",
    window: 60,
    max: 100,
    customRules: {
      "/sign-in/email": { window: 60, max: 5 },
      "/sign-up/email": { window: 60 * 60, max: 5 },
    },
  },
  telemetry: { enabled: false },
  databaseHooks: {
    // Conta desativada (tela Usuários) não entra: nem com senha nem com Google.
    session: {
      create: {
        before: async (session) => {
          const u = await prisma.user.findUnique({ where: { id: session.userId }, select: { isActive: true } });
          if (u && !u.isActive) throw new APIError("FORBIDDEN", { code: "CONTA_DESATIVADA", message: "Esta conta está desativada." });
        },
      },
    },
    // Conta nova (e-mail ou Google) começa com a cópia dos Alvos iniciais, e o worker classifica as ofertas de 7 dias neles.
    user: {
      create: {
        after: async (user) => {
          try {
            if (await darAlvosIniciais(user.id)) await tellWorker({ acao: "rematch", userId: user.id });
          } catch (e) {
            // Sem os Alvos a conta funciona do mesmo jeito; o worker dá a cópia quando subir de novo (ensureSeed).
            console.error("[contas] não deu para criar os Alvos iniciais:", (e as Error).message);
          }
        },
      },
    },
  },
  plugins: [nextCookies()],
});

export type Sessao = typeof auth.$Infer.Session;
