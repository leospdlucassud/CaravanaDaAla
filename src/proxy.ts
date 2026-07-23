import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

/**
 * Corte grosso: barra quem não está logado, antes de chegar na página.
 *
 * A autorização de verdade — papel, unidade, organização — acontece no
 * servidor, contra o banco, em src/lib/autorizacao.ts. Aqui não dá: o proxy
 * roda no Edge e não alcança o Postgres.
 *
 * (No Next 16 esta é a convenção que substituiu o `middleware.ts`.)
 */
export const { auth: proxy } = NextAuth(authConfig);

export default proxy;

export const config = {
  matcher: [
    // Tudo, menos arquivos estáticos e as rotas do próprio Auth.js.
    "/((?!api/auth|_next/static|_next/image|favicon.ico|manifest.webmanifest|.*\\.(?:png|jpg|jpeg|svg|ico|webp)$).*)",
  ],
};
