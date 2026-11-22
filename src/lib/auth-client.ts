"use client";

// Lado do navegador do login: entrar, criar conta, sair e "Entrar com Google". Fala só com /api/auth do próprio site.
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient();
