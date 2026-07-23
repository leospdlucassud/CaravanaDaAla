import type { NextAuthConfig } from "next-auth";

/**
 * Parte da configuração que roda também no proxy (Edge).
 *
 * Duas coisas NÃO podem estar aqui:
 *
 * 1. O Prisma — o Edge não alcança o Postgres. Por isso o proxy só faz o corte
 *    grosso ("está logado?"), e a autorização de verdade acontece no servidor,
 *    contra o banco, em src/lib/autorizacao.ts.
 *
 * 2. O provedor de e-mail — o Auth.js exige um adapter sempre que existe um
 *    provedor de e-mail na configuração. Como o adapter é o do Prisma, deixar o
 *    provedor aqui fazia a instância do proxy estourar `MissingAdapter` a cada
 *    requisição. Os provedores entram só em src/auth.ts.
 */
export const authConfig = {
  providers: [],
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
