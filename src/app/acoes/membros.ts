"use server";

import { refresh, revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { lerAutor } from "@/lib/autor";
import { registrarAlteracoes, registrarEvento } from "@/lib/auditoria";
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
  anoNascimento: z.number().int().min(1900).max(ANO_ATUAL).nullable().optional(),
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

function normalizarOpcionais(dados: z.output<typeof esquemaDeMembro>) {
  return {
    ...dados,
    apelido: dados.apelido ?? null,
    organizacao: dados.organizacao ?? null,
    sexo: dados.sexo ?? null,
    anoNascimento: dados.anoNascimento ?? null,
    telefone: dados.telefone ?? null,
    observacoes: dados.observacoes ?? null,
    recomendacaoValidaAte: dados.recomendacaoValidaAte ?? null,
  };
}

export async function criarMembro(entrada: EntradaDeMembro) {
  const dados = normalizarOpcionais(esquemaDeMembro.parse(entrada));
  const autor = await lerAutor();

  const membro = await prisma.membro.create({
    data: { ...dados, nomeNormalizado: normalizarNome(dados.nomeCompleto) },
    select: { id: true, nomeCompleto: true },
  });

  await registrarEvento({
    autor,
    entidade: "Membro",
    entidadeId: membro.id,
    campo: "criacao",
    descricao: `Membro cadastrado: ${membro.nomeCompleto}`,
  });

  revalidatePath("/membros");
  return membro;
}

export async function atualizarMembro(id: string, entrada: EntradaDeMembro) {
  const dados = normalizarOpcionais(esquemaDeMembro.parse(entrada));
  const autor = await lerAutor();

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

  await prisma.membro.update({
    where: { id },
    data: { ...dados, nomeNormalizado: normalizarNome(dados.nomeCompleto) },
  });

  await registrarAlteracoes({
    autor,
    entidade: "Membro",
    entidadeId: id,
    antes,
    depois: dados,
  });

  revalidatePath("/membros");
  revalidatePath(`/membros/${id}`);
}

/**
 * LGPD: apaga os dados pessoais mas preserva o histórico das caravanas, que é
 * registro da unidade. O membro vira "Registro anonimizado".
 */
export async function anonimizarMembro(id: string) {
  const autor = await lerAutor();

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
    autor,
    entidade: "Membro",
    entidadeId: id,
    campo: "anonimizacao",
    descricao: "Dados pessoais anonimizados a pedido (LGPD)",
  });

  revalidatePath("/membros");
  revalidatePath(`/membros/${id}`);
}

/**
 * Só a recomendação da ficha: tipo e data impressa. Usada para resolver o aviso
 * "Precisam de atenção" direto no diálogo da caravana, sem abrir a ficha
 * inteira.
 *
 * Como é dado da ficha, vale para todas as caravanas da pessoa — por isso
 * invalida todas as páginas de caravana, e não só a que está aberta.
 * Nada além de tipo e validade entra aqui: dignidade e entrevista são do LCR.
 */
export async function atualizarRecomendacaoDoMembro(entrada: {
  membroId: string;
  recomendacaoTipo: string;
  recomendacaoValidaAte: string | null;
}) {
  const dados = z
    .object({
      membroId: z.string().min(1),
      recomendacaoTipo: z.enum([
        "NENHUMA",
        "USO_LIMITADO",
        "MEMBRO_INVESTIDO",
        "ORDENANCAS_PROPRIAS",
      ]),
      recomendacaoValidaAte: z.coerce.date().nullable(),
    })
    .parse(entrada);

  // Sem recomendação, não existe validade a guardar.
  const recomendacaoValidaAte =
    dados.recomendacaoTipo === "NENHUMA" ? null : dados.recomendacaoValidaAte;

  const autor = await lerAutor();

  const antes = await prisma.membro.findUniqueOrThrow({
    where: { id: dados.membroId },
    select: { recomendacaoTipo: true, recomendacaoValidaAte: true },
  });

  const depois = {
    recomendacaoTipo: dados.recomendacaoTipo,
    recomendacaoValidaAte,
  };

  await prisma.membro.update({ where: { id: dados.membroId }, data: depois });

  await registrarAlteracoes({
    autor,
    entidade: "Membro",
    entidadeId: dados.membroId,
    antes,
    depois,
  });

  revalidatePath("/membros");
  revalidatePath(`/membros/${dados.membroId}`);
  // Os avisos de recomendação aparecem em qualquer caravana da pessoa.
  revalidatePath("/(app)/caravanas/[id]", "page");
  // E a tela aberta agora (o diálogo da caravana) reflete na hora.
  refresh();
}
