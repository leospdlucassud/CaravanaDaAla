import "dotenv/config";
import { defineConfig } from "prisma/config";

/**
 * Configuração usada pela CLI do Prisma (migrações, studio, seed).
 *
 * Migração precisa de conexão DIRETA ao Postgres — o pooler do Neon não aceita
 * comandos de DDL em sessão. Por isso preferimos DIRECT_URL aqui, e deixamos
 * DATABASE_URL (a com pooler) para o runtime da aplicação.
 */
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env["DIRECT_URL"] ?? process.env["DATABASE_URL"],
    // Só é necessária para criar novas migrações (`npm run db:migrar`), num
    // banco descartável. Aplicar migrações prontas (`npm run db:aplicar`) não
    // usa isto.
    shadowDatabaseUrl: process.env["SHADOW_DATABASE_URL"],
  },
});
