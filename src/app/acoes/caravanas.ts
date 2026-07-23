"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { registrarAlteracoes, registrarEvento } from "@/lib/auditoria";
import {
  SemPermissao,
  exigirPodeEditarCaravana,
  exigirUsuario,
} from "@/lib/autorizacao";
import { podeEditarCaravanaDe } from "@/lib/permissoes";
import { aplicarCapacidade, renumerar } from "@/lib/fila";

const horario = z
  .string()
  .trim()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use o formato HH:MM.")
  .nullable()
  .optional()
  .or(z.literal("").transform(() => null));

const esquemaDeCaravana = z.object({
  titulo: z.string().trim().min(3, "Dê um título à caravana."),
  data: z.coerce.date(),
  templo: z.string().trim().min(2, "Informe o templo de destino."),
  unidadeOrganizadoraId: z.string().min(1),
  horaSaida: horario,
  horaRetornoPrevista: horario,
  pontoEncontro: z.string().trim().max(200).nullable().optional(),
  capacidadeAssentos: z
    .number()
    .int()
    .min(1, "O ônibus precisa de pelo menos um assento.")
    .max(500),
  valorPorPessoa: z.number().nonnegative().nullable().optional(),
  custoTotalTransporte: z.number().nonnegative().nullable().optional(),
  status: z
    .enum(["PLANEJAMENTO", "CONFIRMADA", "REALIZADA", "CANCELADA"])
    .default("PLANEJAMENTO"),
  observacoes: z.string().trim().max(1000).nullable().optional(),
});

export type EntradaDeCaravana = z.input<typeof esquemaDeCaravana>;

function paraDados(dados: z.output<typeof esquemaDeCaravana>) {
  return {
    ...dados,
    horaSaida: dados.horaSaida ?? null,
    horaRetornoPrevista: dados.horaRetornoPrevista ?? null,
    pontoEncontro: dados.pontoEncontro ?? null,
    valorPorPessoa: dados.valorPorPessoa ?? null,
    custoTotalTransporte: dados.custoTotalTransporte ?? null,
    observacoes: dados.observacoes ?? null,
  };
}

export async function criarCaravana(entrada: EntradaDeCaravana) {
  const dados = esquemaDeCaravana.parse(entrada);
  const ator = await exigirUsuario();

  if (
    !podeEditarCaravanaDe(ator, {
      unidadeOrganizadoraId: dados.unidadeOrganizadoraId,
    })
  ) {
    throw new SemPermissao();
  }

  const caravana = await prisma.caravana.create({
    data: { ...paraDados(dados), responsavelId: ator.id },
    select: { id: true, titulo: true },
  });

  await registrarEvento({
    ator,
    entidade: "Caravana",
    entidadeId: caravana.id,
    campo: "criacao",
    descricao: `Caravana criada: ${caravana.titulo}`,
  });

  revalidatePath("/");
  redirect(`/caravanas/${caravana.id}`);
}

export async function atualizarCaravana(id: string, entrada: EntradaDeCaravana) {
  const dados = esquemaDeCaravana.parse(entrada);
  const { ator } = await exigirPodeEditarCaravana(id);

  const antes = await prisma.caravana.findUniqueOrThrow({
    where: { id },
    select: {
      titulo: true,
      data: true,
      templo: true,
      horaSaida: true,
      horaRetornoPrevista: true,
      pontoEncontro: true,
      capacidadeAssentos: true,
      valorPorPessoa: true,
      custoTotalTransporte: true,
      status: true,
      observacoes: true,
    },
  });

  const depois = paraDados(dados);

  await prisma.$transaction(async (cliente) => {
    await cliente.caravana.update({ where: { id }, data: depois });

    // Mudou o tamanho do ônibus: a lista precisa se acomodar sozinha, subindo
    // gente da fila ou rebaixando os últimos confirmados.
    if (antes.capacidadeAssentos !== dados.capacidadeAssentos) {
      const inscricoes = await cliente.inscricao.findMany({
        where: { caravanaId: id },
        select: {
          id: true,
          situacao: true,
          ordem: true,
          posicaoFila: true,
          criadoEm: true,
        },
      });

      const posicoes = aplicarCapacidade(inscricoes, dados.capacidadeAssentos);
      await Promise.all(
        posicoes.map((p) =>
          cliente.inscricao.update({
            where: { id: p.id },
            data: {
              situacao: p.situacao,
              ordem: p.ordem,
              posicaoFila: p.posicaoFila,
            },
          }),
        ),
      );
    }
  });

  await registrarAlteracoes({
    ator,
    entidade: "Caravana",
    entidadeId: id,
    antes: antes as unknown as Record<string, unknown>,
    depois: depois as unknown as Record<string, unknown>,
  });

  revalidatePath("/");
  revalidatePath(`/caravanas/${id}`);
}

/**
 * Duplica a caravana trazendo as mesmas pessoas com os status por-viagem
 * zerados. O que é permanente (recomendação, dados do membro) fica no cadastro
 * e não precisa ser copiado.
 */
export async function duplicarCaravana(
  id: string,
  entrada: { titulo: string; data: Date | string },
) {
  const { ator, caravana } = await exigirPodeEditarCaravana(id);

  const original = await prisma.caravana.findUniqueOrThrow({
    where: { id },
    select: {
      templo: true,
      horaSaida: true,
      horaRetornoPrevista: true,
      pontoEncontro: true,
      capacidadeAssentos: true,
      valorPorPessoa: true,
      custoTotalTransporte: true,
      observacoes: true,
      inscricoes: {
        where: { situacao: { in: ["CONFIRMADA", "FILA_ESPERA"] } },
        orderBy: [{ ordem: "asc" }, { posicaoFila: "asc" }],
        select: { membroId: true, situacao: true, participacao: true },
      },
    },
  });

  const nova = await prisma.$transaction(async (cliente) => {
    const criada = await cliente.caravana.create({
      data: {
        titulo: entrada.titulo,
        data: new Date(entrada.data),
        templo: original.templo,
        unidadeOrganizadoraId: caravana.unidadeOrganizadoraId,
        horaSaida: original.horaSaida,
        horaRetornoPrevista: original.horaRetornoPrevista,
        pontoEncontro: original.pontoEncontro,
        capacidadeAssentos: original.capacidadeAssentos,
        valorPorPessoa: original.valorPorPessoa,
        custoTotalTransporte: original.custoTotalTransporte,
        status: "PLANEJAMENTO",
        responsavelId: ator.id,
      },
      select: { id: true },
    });

    if (original.inscricoes.length > 0) {
      await cliente.inscricao.createMany({
        data: original.inscricoes.map((i, indice) => ({
          caravanaId: criada.id,
          membroId: i.membroId,
          // Todo mundo volta como confirmado até a capacidade; o que passar,
          // aplicarCapacidade empurra para a fila logo abaixo.
          situacao: "CONFIRMADA" as const,
          ordem: indice + 1,
          participacao: i.participacao,
        })),
      });

      const inscricoes = await cliente.inscricao.findMany({
        where: { caravanaId: criada.id },
        select: {
          id: true,
          situacao: true,
          ordem: true,
          posicaoFila: true,
          criadoEm: true,
        },
      });

      const posicoes = aplicarCapacidade(inscricoes, original.capacidadeAssentos);
      await Promise.all(
        posicoes.map((p) =>
          cliente.inscricao.update({
            where: { id: p.id },
            data: {
              situacao: p.situacao,
              ordem: p.ordem,
              posicaoFila: p.posicaoFila,
            },
          }),
        ),
      );
    }

    return criada;
  });

  await registrarEvento({
    ator,
    entidade: "Caravana",
    entidadeId: nova.id,
    campo: "criacao",
    descricao: `Duplicada a partir da caravana ${id}`,
  });

  revalidatePath("/");
  redirect(`/caravanas/${nova.id}`);
}

export async function recalcularPosicoes(caravanaId: string) {
  await exigirPodeEditarCaravana(caravanaId);

  await prisma.$transaction(async (cliente) => {
    const inscricoes = await cliente.inscricao.findMany({
      where: { caravanaId },
      select: {
        id: true,
        situacao: true,
        ordem: true,
        posicaoFila: true,
        criadoEm: true,
      },
    });

    const posicoes = renumerar(inscricoes);
    await Promise.all(
      posicoes.map((p) =>
        cliente.inscricao.update({
          where: { id: p.id },
          data: { situacao: p.situacao, ordem: p.ordem, posicaoFila: p.posicaoFila },
        }),
      ),
    );
  });

  revalidatePath(`/caravanas/${caravanaId}`);
  revalidatePath(`/caravanas/${caravanaId}/inscritos`);
}
