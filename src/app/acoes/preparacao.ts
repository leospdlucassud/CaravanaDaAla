"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { lerAutor } from "@/lib/autor";
import { registrarAlteracoes, registrarEvento } from "@/lib/auditoria";

/**
 * Checklist da primeira investidura.
 *
 * É lembrete de logística, não registro de dignidade. Os requisitos do Manual
 * (27.2.2: 18 anos, ensino médio, um ano desde a confirmação, Sacerdócio de
 * Melquisedeque para os homens) ficam num único booleano "o bispo verificou" —
 * o app não guarda nem pergunta item por item.
 */
const CAMPOS = {
  requisitosVerificadosPeloBispo: true,
  entrevistaBispoFeita: true,
  entrevistaEstacaFeita: true,
  agendamentoProprioFeito: true,
  roupasDoTemploProvidenciadas: true,
  acompanhanteDesignado: true,
  orientacaoRecebida: true,
} as const;

export type CampoDoChecklist = keyof typeof CAMPOS;

export async function marcarNoChecklist(entrada: {
  inscricaoId: string;
  campo: CampoDoChecklist;
  marcado: boolean;
}) {
  const dados = z
    .object({
      inscricaoId: z.string().min(1),
      campo: z.enum(Object.keys(CAMPOS) as [CampoDoChecklist, ...CampoDoChecklist[]]),
      marcado: z.boolean(),
    })
    .parse(entrada);

  const autor = await lerAutor();

  const inscricao = await prisma.inscricao.findUniqueOrThrow({
    where: { id: dados.inscricaoId },
    select: { caravanaId: true, checklistPrimeiraInvestidura: true },
  });

  const antes = inscricao.checklistPrimeiraInvestidura
    ? { [dados.campo]: inscricao.checklistPrimeiraInvestidura[dados.campo] }
    : { [dados.campo]: false };

  await prisma.checklistPrimeiraInvestidura.upsert({
    where: { inscricaoId: dados.inscricaoId },
    create: { inscricaoId: dados.inscricaoId, [dados.campo]: dados.marcado },
    update: { [dados.campo]: dados.marcado },
  });

  await registrarAlteracoes({
    autor,
    entidade: "ChecklistPrimeiraInvestidura",
    entidadeId: dados.inscricaoId,
    antes,
    depois: { [dados.campo]: dados.marcado },
  });

  revalidatePath(`/caravanas/${inscricao.caravanaId}/preparacao`);
}

/**
 * Designa quem acompanha quem.
 *
 * O Manual pede acompanhante do mesmo sexo, investido e com recomendação
 * válida, para a primeira investidura (27.2.3.3); e um adulto com recomendação
 * válida acompanhando grupos de jovens no batistério (cap. 28). O app sugere
 * candidatos, mas não impede escolha nenhuma — quem decide é a liderança.
 */
export async function designarAcompanhante(entrada: {
  inscricaoId: string;
  acompanhanteId: string | null;
}) {
  const dados = z
    .object({
      inscricaoId: z.string().min(1),
      acompanhanteId: z.string().nullable(),
    })
    .parse(entrada);

  if (dados.acompanhanteId === dados.inscricaoId) {
    throw new Error("Uma pessoa não pode acompanhar a si mesma.");
  }

  const autor = await lerAutor();

  const inscricao = await prisma.inscricao.update({
    where: { id: dados.inscricaoId },
    data: { acompanhanteId: dados.acompanhanteId },
    select: {
      caravanaId: true,
      membro: { select: { nomeCompleto: true } },
      acompanhante: { select: { membro: { select: { nomeCompleto: true } } } },
    },
  });

  await registrarEvento({
    autor,
    entidade: "Inscricao",
    entidadeId: dados.inscricaoId,
    campo: "acompanhante",
    descricao: inscricao.acompanhante
      ? `${inscricao.membro.nomeCompleto} passa a ser acompanhado por ${inscricao.acompanhante.membro.nomeCompleto}`
      : `Acompanhante de ${inscricao.membro.nomeCompleto} removido`,
  });

  revalidatePath(`/caravanas/${inscricao.caravanaId}`);
  revalidatePath(`/caravanas/${inscricao.caravanaId}/preparacao`);
}
