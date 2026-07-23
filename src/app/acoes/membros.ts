"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { registrarAlteracoes, registrarEvento } from "@/lib/auditoria";
import {
  SemPermissao,
  exigirPodeEditarMembro,
  exigirUsuario,
} from "@/lib/autorizacao";
import { podeAnonimizarMembro, podeEditarMembroDe } from "@/lib/permissoes";
import { normalizarNome } from "@/lib/normalizar";

const ANO_ATUAL = new Date().getFullYear();

const esquemaDeMembro = z.object({
  nomeCompleto: z.string().trim().min(2, "Informe o nome completo."),
  apelido: z.string().trim().max(80).nullable().optional(),
  unidadeId: z.string().min(1, "Escolha a unidade."),
  organizacao: z
    .enum(["QUORUM_ELDERES", "SOCIEDADE_SOCORRO", "MOCAS", "RAPAZES", "PRIMARIA"])
    .nullable()
    .optional(),
  tipoVinculo: z.enum(["MEMBRO", "PESQUISADOR", "CONVIDADO"]).default("MEMBRO"),
  sexo: z.enum(["MASCULINO", "FEMININO"]).nullable().optional(),
  anoNascimento: z
    .number()
    .int()
    .min(1900)
    .max(ANO_ATUAL)
    .nullable()
    .optional(),
  telefone: z.string().trim().max(30).nullable().optional(),
  recemConverso: z.boolean().default(false),
  ehInvestido: z.boolean().default(false),
  recomendacaoTipo: z
    .enum(["NENHUMA", "USO_LIMITADO", "MEMBRO_INVESTIDO", "ORDENANCAS_PROPRIAS"])
    .default("NENHUMA"),
  recomendacaoValidaAte: z.coerce.date().nullable().optional(),
  observacoes: z.string().trim().max(1000).nullable().optional(),
});

export type EntradaDeMembro = z.input<typeof esquemaDeMembro>;

export async function criarMembro(entrada: EntradaDeMembro) {
  const dados = esquemaDeMembro.parse(entrada);
  const ator = await exigirUsuario();

  if (!podeEditarMembroDe(ator, {
    unidadeId: dados.unidadeId,
    organizacao: dados.organizacao ?? null,
  })) {
    throw new SemPermissao();
  }

  const membro = await prisma.membro.create({
    data: {
      ...dados,
      apelido: dados.apelido ?? null,
      organizacao: dados.organizacao ?? null,
      sexo: dados.sexo ?? null,
      anoNascimento: dados.anoNascimento ?? null,
      telefone: dados.telefone ?? null,
      observacoes: dados.observacoes ?? null,
      recomendacaoValidaAte: dados.recomendacaoValidaAte ?? null,
      nomeNormalizado: normalizarNome(dados.nomeCompleto),
    },
    select: { id: true, nomeCompleto: true },
  });

  await registrarEvento({
    ator,
    entidade: "Membro",
    entidadeId: membro.id,
    campo: "criacao",
    descricao: `Membro cadastrado: ${membro.nomeCompleto}`,
  });

  revalidatePath("/membros");
  return membro;
}

export async function atualizarMembro(id: string, entrada: EntradaDeMembro) {
  const dados = esquemaDeMembro.parse(entrada);
  const { ator } = await exigirPodeEditarMembro(id);

  // Mudar de unidade/organização não pode ser rota de fuga do próprio escopo.
  if (!podeEditarMembroDe(ator, {
    unidadeId: dados.unidadeId,
    organizacao: dados.organizacao ?? null,
  })) {
    throw new SemPermissao(
      "Você não pode mover um membro para fora do seu escopo de acesso.",
    );
  }

  const antes = await prisma.membro.findUniqueOrThrow({
    where: { id },
    select: {
      nomeCompleto: true,
      apelido: true,
      unidadeId: true,
      organizacao: true,
      tipoVinculo: true,
      sexo: true,
      anoNascimento: true,
      telefone: true,
      recemConverso: true,
      ehInvestido: true,
      recomendacaoTipo: true,
      recomendacaoValidaAte: true,
      observacoes: true,
    },
  });

  const depois = {
    ...dados,
    apelido: dados.apelido ?? null,
    organizacao: dados.organizacao ?? null,
    sexo: dados.sexo ?? null,
    anoNascimento: dados.anoNascimento ?? null,
    telefone: dados.telefone ?? null,
    observacoes: dados.observacoes ?? null,
    recomendacaoValidaAte: dados.recomendacaoValidaAte ?? null,
  };

  await prisma.membro.update({
    where: { id },
    data: { ...depois, nomeNormalizado: normalizarNome(dados.nomeCompleto) },
  });

  await registrarAlteracoes({
    ator,
    entidade: "Membro",
    entidadeId: id,
    antes,
    depois,
  });

  revalidatePath("/membros");
  revalidatePath(`/membros/${id}`);
}

/**
 * LGPD: apaga os dados pessoais mas preserva o histórico das caravanas, que é
 * registro da unidade. O membro vira "Registro anonimizado".
 */
export async function anonimizarMembro(id: string) {
  const ator = await exigirUsuario();
  if (!podeAnonimizarMembro(ator)) {
    throw new SemPermissao("Somente o administrador pode anonimizar um membro.");
  }

  await prisma.membro.update({
    where: { id },
    data: {
      nomeCompleto: "Registro anonimizado",
      nomeNormalizado: "registro anonimizado",
      apelido: null,
      telefone: null,
      anoNascimento: null,
      sexo: null,
      observacoes: null,
      recomendacaoTipo: "NENHUMA",
      recomendacaoValidaAte: null,
      recemConverso: false,
      ehInvestido: false,
      ativo: false,
      anonimizadoEm: new Date(),
    },
  });

  await registrarEvento({
    ator,
    entidade: "Membro",
    entidadeId: id,
    campo: "anonimizacao",
    descricao: "Dados pessoais anonimizados a pedido (LGPD)",
  });

  revalidatePath("/membros");
  revalidatePath(`/membros/${id}`);
}
