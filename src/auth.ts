import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { authConfig } from "@/auth.config";
import { prisma } from "@/lib/prisma";

/**
 * Sessão em JWT, com o Prisma guardando usuários, contas e os tokens do link
 * mágico.
 *
 * Por que JWT e não sessão em banco: o middleware roda no Edge e não alcança o
 * Postgres. O JWT carrega só a identidade ("quem é"); papel e escopo NUNCA são
 * lidos do token — são buscados do banco a cada ação, para que uma mudança de
 * papel valha na hora, sem esperar o token expirar.
 */

const emailsDeAdministrador = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
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

      await prisma.usuario.update({
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
