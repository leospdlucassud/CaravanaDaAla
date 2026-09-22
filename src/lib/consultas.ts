import { calcularAvisos } from "@/lib/avisos";
import { prisma } from "@/lib/prisma";

/**
 * Consultas de leitura da caravana, com os avisos já calculados.
 *
 * Ficam juntas de propósito: o painel e a lista precisam do mesmo recorte, e
 * duplicar isso em duas telas é como a planilha acabou com dois jeitos de dizer
 * "pendente".
 */

export type InscritoDaLista = Awaited<
  ReturnType<typeof carregarInscritos>
>["inscritos"][number];

export async function carregarInscritos(caravanaId: string) {
  const caravana = await prisma.caravana.findUniqueOrThrow({
    where: { id: caravanaId },
    include: {
      unidadeOrganizadora: { select: { id: true, nome: true } },
    },
  });

  const inscricoes = await prisma.inscricao.findMany({
    where: { caravanaId },
    orderBy: [
      { situacao: "asc" },
      { ordem: "asc" },
      { posicaoFila: "asc" },
    ],
    include: {
      membro: {
        select: {
          id: true,
          nomeCompleto: true,
          apelido: true,
          organizacao: true,
          unidadeId: true,
          unidade: { select: { nome: true } },
          tipoVinculo: true,
          sexo: true,
          anoNascimento: true,
          telefone: true,
          recemConverso: true,
          ehInvestido: true,
          recomendacaoTipo: true,
          recomendacaoValidaAte: true,
        },
      },
      acompanhante: {
        select: { membro: { select: { nomeCompleto: true } } },
      },
    },
  });

  const inscritos = inscricoes.map((inscricao) => ({
    ...inscricao,
    avisos: calcularAvisos(inscricao, caravana.data),
  }));

  return { caravana, inscritos };
}

// O resumo (números dos cards) vive em resumo.ts, que é puro e testável. Fica
// re-exportado aqui para quem já importava de consultas.
export { resumir, type ResumoDaCaravana } from "@/lib/resumo";
