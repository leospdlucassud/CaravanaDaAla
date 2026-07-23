import NextAuth from "next-auth";
import Resend from "next-auth/providers/resend";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { authConfig } from "@/auth.config";
import { prisma } from "@/lib/prisma";

/**
 * Configuração completa: só é carregada no runtime Node, nunca no Edge.
 *
 * Sessão em JWT, com o Prisma guardando usuários, contas e os tokens do link
 * mágico. O JWT carrega só a identidade ("quem é"); papel e escopo NUNCA são
 * lidos do token — são buscados do banco a cada ação, para que uma mudança de
 * papel valha na hora, sem esperar o token expirar.
 */

const chaveResend = process.env.AUTH_RESEND_KEY;
const remetente = process.env.EMAIL_FROM ?? "onboarding@resend.dev";

const emailsDeAdministrador = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
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
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user }) {
      if (user?.id) token.sub = user.id;
      return token;
    },
    async session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      return session;
    },
  },
  events: {
    async signIn({ user }) {
      if (!user.id) return;

      const email = user.email?.toLowerCase();
      const deveSerAdministrador =
        Boolean(email) && emailsDeAdministrador.includes(email!);

      await prisma.user.update({
        where: { id: user.id },
        data: {
          ultimoLoginEm: new Date(),
          // Bootstrap: o primeiro acesso de um e-mail listado em ADMIN_EMAILS
          // vira administrador. Depois disso, papéis se gerenciam pela tela de
          // administração.
          ...(deveSerAdministrador ? { papel: "ADMINISTRADOR" } : {}),
        },
      });
    },
  },
});
