import type { NextAuthConfig } from "next-auth";
import Resend from "next-auth/providers/resend";

/**
 * Parte da configuração que roda também no middleware (Edge).
 *
 * Nada aqui pode importar o Prisma: o middleware faz apenas o corte grosso
 * ("está logado?"). A autorização de verdade — papel, unidade, organização —
 * é conferida no servidor, contra o banco, em src/lib/autorizacao.ts.
 */

const chaveResend = process.env.AUTH_RESEND_KEY;
const remetente = process.env.EMAIL_FROM ?? "onboarding@resend.dev";

export const authConfig = {
  providers: [
    Resend({
      apiKey: chaveResend ?? "chave-ausente-em-desenvolvimento",
      from: remetente,
      // Sem chave de e-mail configurada (desenvolvimento local), imprimimos o
      // link no terminal em vez de falhar. Assim dá para testar o login sem
      // depender de serviço externo.
      ...(chaveResend
        ? {}
        : {
            sendVerificationRequest: async ({
              identifier,
              url,
            }: {
              identifier: string;
              url: string;
            }) => {
              console.log(
                [
                  "",
                  "==============================================================",
                  " LINK DE ACESSO (modo desenvolvimento, e-mail não configurado)",
                  ` Para: ${identifier}`,
                  ` Abra: ${url}`,
                  "==============================================================",
                  "",
                ].join("\n"),
              );
            },
          }),
    }),
  ],
  pages: {
    signIn: "/entrar",
    verifyRequest: "/entrar/verifique-seu-email",
    error: "/entrar",
  },
  callbacks: {
    authorized({ auth, request }) {
      const logado = Boolean(auth?.user);
      const { pathname } = request.nextUrl;

      const rotaPublica =
        pathname.startsWith("/entrar") || pathname.startsWith("/api/auth");

      if (rotaPublica) return true;
      return logado;
    },
  },
  trustHost: true,
} satisfies NextAuthConfig;
