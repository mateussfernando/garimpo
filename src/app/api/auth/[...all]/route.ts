// Rotas do login (better-auth): entrar, criar conta, sair, Google e sessão.
import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth";

export const { GET, POST } = toNextJsHandler(auth);
