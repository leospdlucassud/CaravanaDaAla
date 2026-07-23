-- DropForeignKey
ALTER TABLE "usuarios" DROP CONSTRAINT "usuarios_unidadeId_fkey";

-- DropForeignKey
ALTER TABLE "accounts" DROP CONSTRAINT "accounts_userId_fkey";

-- DropForeignKey
ALTER TABLE "sessions" DROP CONSTRAINT "sessions_userId_fkey";

-- DropForeignKey
ALTER TABLE "caravanas" DROP CONSTRAINT "caravanas_responsavelId_fkey";

-- DropForeignKey
ALTER TABLE "registros_auditoria" DROP CONSTRAINT "registros_auditoria_usuarioId_fkey";

-- AlterTable
ALTER TABLE "caravanas" DROP COLUMN "responsavelId",
ADD COLUMN     "responsavel" TEXT;

-- AlterTable
ALTER TABLE "registros_auditoria" DROP COLUMN "usuarioEmail",
DROP COLUMN "usuarioId",
ADD COLUMN     "autor" TEXT;

-- DropTable
DROP TABLE "usuarios";

-- DropTable
DROP TABLE "accounts";

-- DropTable
DROP TABLE "sessions";

-- DropTable
DROP TABLE "verification_tokens";

-- DropEnum
DROP TYPE "Papel";

-- DropEnum
DROP TYPE "Tema";
