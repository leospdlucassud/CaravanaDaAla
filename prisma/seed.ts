import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

/**
 * Preparo mínimo do banco: só a unidade da instalação.
 *
 * Não há contas nem administradores para liberar — o app é de acesso aberto.
 * Não cria membros nem caravanas de mentira: os dados reais entram pela
 * importação da planilha ou pelo cadastro. Rodar de novo não duplica nada.
 *
 * Este passo é opcional: dá para cadastrar a unidade pela própria tela, na
 * primeira vez que você abrir o app.
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

  if (!nomeDaUnidade) {
    console.log(
      "SEED_UNIDADE_NOME não definida — cadastre a unidade pela tela do app, na primeira vez que abrir.",
    );
    return;
  }

  const existente = await prisma.unidade.findFirst({
    where: { nome: nomeDaUnidade, estaca },
    select: { id: true },
  });

  if (existente) {
    console.log(`Unidade "${nomeDaUnidade}" já existe.`);
    return;
  }

  await prisma.unidade.create({
    data: {
      nome: nomeDaUnidade,
      estaca,
      tipo: "ALA",
      ehPropria: (await prisma.unidade.count()) === 0,
    },
  });

  console.log(`Unidade "${nomeDaUnidade}" criada.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (erro) => {
    console.error(erro);
    await prisma.$disconnect();
    process.exit(1);
  });
