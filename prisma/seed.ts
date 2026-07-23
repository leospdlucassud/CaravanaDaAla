import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

/**
 * Preparo mínimo do banco: a unidade da instalação e os administradores.
 *
 * Não cria membros nem caravanas de mentira — os dados reais entram pela
 * importação da planilha ou pelo cadastro. Rodar de novo não duplica nada.
 */

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "Defina DATABASE_URL (e de preferência DIRECT_URL) no arquivo .env antes de rodar o seed.",
  );
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function main() {
  const nomeDaUnidade = process.env.SEED_UNIDADE_NOME?.trim();
  const estaca = process.env.SEED_UNIDADE_ESTACA?.trim() || null;

  let unidadeId: string | null = null;

  if (nomeDaUnidade) {
    const existente = await prisma.unidade.findFirst({
      where: { nome: nomeDaUnidade, estaca },
      select: { id: true },
    });

    if (existente) {
      unidadeId = existente.id;
      console.log(`Unidade "${nomeDaUnidade}" já existe.`);
    } else {
      const criada = await prisma.unidade.create({
        data: {
          nome: nomeDaUnidade,
          estaca,
          tipo: "ALA",
          ehPropria: (await prisma.unidade.count()) === 0,
        },
        select: { id: true },
      });
      unidadeId = criada.id;
      console.log(`Unidade "${nomeDaUnidade}" criada.`);
    }
  } else {
    console.log(
      "SEED_UNIDADE_NOME não definida — a unidade pode ser cadastrada depois, pela tela de importação.",
    );
    unidadeId =
      (await prisma.unidade.findFirst({ select: { id: true } }))?.id ?? null;
  }

  const administradores = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  for (const email of administradores) {
    await prisma.user.upsert({
      where: { email },
      update: { papel: "ADMINISTRADOR", ativo: true, ...(unidadeId ? { unidadeId } : {}) },
      create: {
        email,
        papel: "ADMINISTRADOR",
        ...(unidadeId ? { unidadeId } : {}),
      },
    });
    console.log(`Administrador liberado: ${email}`);
  }

  if (administradores.length === 0) {
    console.warn(
      "Nenhum e-mail em ADMIN_EMAILS. Sem isso ninguém consegue entrar como administrador.",
    );
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (erro) => {
    console.error(erro);
    await prisma.$disconnect();
    process.exit(1);
  });
