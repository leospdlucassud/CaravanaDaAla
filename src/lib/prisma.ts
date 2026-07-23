import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

/**
 * Cliente único do Prisma.
 *
 * Em desenvolvimento o Next recarrega os módulos a cada alteração; sem o cache
 * no globalThis abriríamos uma conexão nova a cada hot reload até estourar o
 * limite do Postgres.
 */

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL não está definida. Copie o .env.example para .env e preencha com a URL do seu banco no Neon.",
  );
}

function criarCliente() {
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });
}

const globalParaPrisma = globalThis as unknown as {
  prisma?: ReturnType<typeof criarCliente>;
};

export const prisma = globalParaPrisma.prisma ?? criarCliente();

if (process.env.NODE_ENV !== "production") {
  globalParaPrisma.prisma = prisma;
}
