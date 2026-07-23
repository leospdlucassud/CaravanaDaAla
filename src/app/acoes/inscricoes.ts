"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { registrarAlteracoes, registrarEvento } from "@/lib/auditoria";
import {
  SemPermissao,
  exigirPodeEditarCaravana,
  exigirPodeEditarInscricao,
  exigirUsuario,
} from "@/lib/autorizacao";
import { podeEditarMembroDe } from "@/lib/permissoes";
import {
  moverParaFila,
  promoverDaFila,
  registrarDesistencia,
  renumerar,
  situacaoAoInscrever,
  type ItemDaLista,
} from "@/lib/fila";

/**
 * Campos editáveis pela lista, um a um.
 *
 * Lista fechada de propósito: sem isso, um `data: entrada` deixaria qualquer
 * campo da inscrição ser sobrescrito por quem soubesse montar a requisição.
 */
const CAMPOS_EDITAVEIS = {
  participacao: z.enum(["ORDENANCA", "ACOMPANHANTE_JARDINS"]),
  ordenanca: z
    .enum([
      "BATISTERIO",
      "INICIATORIA",
      "INVESTIDURA",
      "PRIMEIRA_INVESTIDURA",
      "SELAMENTO_CONJUGE",
      "SELAMENTO_FAMILIA",
    ])
    .nullable(),
  recomendacaoStatus: z
    .enum(["VALIDA", "VENCIDA", "NAO_POSSUI", "NAO_SE_APLICA"])
    .nullable(),
  agendamentoStatus: z.enum(["SIM", "NAO", "NAO_SE_APLICA"]).nullable(),
  nomesDeFamilia: z
    .enum(["PROPRIOS_PRONTOS", "USARA_NOMES_DO_TEMPLO", "PRECISA_DE_AJUDA"])
    .nullable(),
  pagamentoStatus: z.enum(["PENDENTE", "PAGO", "ISENTO", "BENEFICIO_AREA"]),
  incluidoNoAgendamentoGrupo: z.boolean(),
  precisaAjudaEntrevista: z.boolean(),
  precisaAjudaNomes: z.boolean(),
  observacoes: z.string().max(500).nullable(),
} as const;

type CampoEditavel = keyof typeof CAMPOS_EDITAVEIS;

export async function atualizarCampoDaInscricao(entrada: {
  inscricaoId: string;
  campo: CampoEditavel;
  valor: unknown;
}) {
  const esquema = CAMPOS_EDITAVEIS[entrada.campo];
  if (!esquema) throw new SemPermissao("Campo não editável.");

  const valor = esquema.parse(entrada.valor);
  const { ator, inscricao } = await exigirPodeEditarInscricao(entrada.inscricaoId);

  const antes = await prisma.inscricao.findUniqueOrThrow({
    where: { id: entrada.inscricaoId },
    select: { [entrada.campo]: true } as Record<string, true>,
  });

  await prisma.inscricao.update({
    where: { id: entrada.inscricaoId },
    data: { [entrada.campo]: valor },
  });

  await registrarAlteracoes({
    ator,
    entidade: "Inscricao",
    entidadeId: entrada.inscricaoId,
    antes: antes as Record<string, unknown>,
    depois: { [entrada.campo]: valor },
  });

  revalidatePath(`/caravanas/${inscricao.caravanaId}`);
  revalidatePath(`/caravanas/${inscricao.caravanaId}/inscritos`);
}

// ---------------------------------------------------------------------------
// Inscrição, fila e capacidade
//
// Toda mexida na lista roda dentro de uma transação e regrava as posições
// inteiras — ninguém digita número de fila.
// ---------------------------------------------------------------------------

async function carregarListaParaCalculo(
  cliente: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  caravanaId: string,
): Promise<{ itens: ItemDaLista[]; capacidade: number }> {
  const caravana = await cliente.caravana.findUniqueOrThrow({
    where: { id: caravanaId },
    select: { capacidadeAssentos: true },
  });

  const inscricoes = await cliente.inscricao.findMany({
    where: { caravanaId },
    select: { id: true, situacao: true, ordem: true, posicaoFila: true, criadoEm: true },
  });

  return { itens: inscricoes, capacidade: caravana.capacidadeAssentos };
}

async function gravarPosicoes(
  cliente: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  posicoes: ReturnType<typeof renumerar>,
) {
  await Promise.all(
    posicoes.map((p) =>
      cliente.inscricao.update({
        where: { id: p.id },
        data: { situacao: p.situacao, ordem: p.ordem, posicaoFila: p.posicaoFila },
      }),
    ),
  );
}

export async function inscreverMembro(entrada: {
  caravanaId: string;
  membroId: string;
}) {
  const { ator } = await exigirPodeEditarCaravana(entrada.caravanaId);

  const membro = await prisma.membro.findUnique({
    where: { id: entrada.membroId },
    select: { unidadeId: true, organizacao: true, nomeCompleto: true },
  });
  if (!membro) throw new SemPermissao("Membro não encontrado.");
  if (!podeEditarMembroDe(ator, membro)) throw new SemPermissao();

  const situacao = await prisma.$transaction(async (cliente) => {
    const { itens, capacidade } = await carregarListaParaCalculo(
      cliente,
      entrada.caravanaId,
    );

    const situacaoInicial = situacaoAoInscrever(itens, capacidade);

    const criada = await cliente.inscricao.create({
      data: {
        caravanaId: entrada.caravanaId,
        membroId: entrada.membroId,
        situacao: situacaoInicial,
        ordem: 0,
      },
      select: { id: true, criadoEm: true },
    });

    const posicoes = renumerar([
      ...itens,
      {
        id: criada.id,
        situacao: situacaoInicial,
        ordem: Number.MAX_SAFE_INTEGER,
        posicaoFila: Number.MAX_SAFE_INTEGER,
        criadoEm: criada.criadoEm,
      },
    ]);

    await gravarPosicoes(cliente, posicoes);

    await registrarEvento({
      ator,
      entidade: "Inscricao",
      entidadeId: criada.id,
      campo: "criacao",
      descricao: `${membro.nomeCompleto} inscrito como ${situacaoInicial}`,
      cliente,
    });

    return situacaoInicial;
  });

  revalidatePath(`/caravanas/${entrada.caravanaId}`);
  revalidatePath(`/caravanas/${entrada.caravanaId}/inscritos`);

  return { situacao };
}

export async function promoverInscricao(inscricaoId: string) {
  const { ator, inscricao } = await exigirPodeEditarInscricao(inscricaoId);

  await prisma.$transaction(async (cliente) => {
    const { itens } = await carregarListaParaCalculo(cliente, inscricao.caravanaId);
    await gravarPosicoes(cliente, promoverDaFila(itens, inscricaoId));
    await registrarEvento({
      ator,
      entidade: "Inscricao",
      entidadeId: inscricaoId,
      campo: "situacao",
      descricao: "Promovido da fila de espera para vaga confirmada",
      cliente,
    });
  });

  revalidatePath(`/caravanas/${inscricao.caravanaId}`);
  revalidatePath(`/caravanas/${inscricao.caravanaId}/inscritos`);
}

export async function enviarParaFila(inscricaoId: string) {
  const { ator, inscricao } = await exigirPodeEditarInscricao(inscricaoId);

  await prisma.$transaction(async (cliente) => {
    const { itens } = await carregarListaParaCalculo(cliente, inscricao.caravanaId);
    await gravarPosicoes(cliente, moverParaFila(itens, inscricaoId));
    await registrarEvento({
      ator,
      entidade: "Inscricao",
      entidadeId: inscricaoId,
      campo: "situacao",
      descricao: "Movido para a fila de espera",
      cliente,
    });
  });

  revalidatePath(`/caravanas/${inscricao.caravanaId}`);
  revalidatePath(`/caravanas/${inscricao.caravanaId}/inscritos`);
}

/**
 * Registra desistência e já promove o primeiro da fila, devolvendo quem subiu
 * para a tela poder avisar que essa pessoa precisa ser comunicada.
 */
export async function registrarDesistenciaDeInscricao(inscricaoId: string) {
  const { ator, inscricao } = await exigirPodeEditarInscricao(inscricaoId);

  const promovido = await prisma.$transaction(async (cliente) => {
    const { itens, capacidade } = await carregarListaParaCalculo(
      cliente,
      inscricao.caravanaId,
    );

    const { posicoes, promovidoId } = registrarDesistencia(
      itens,
      inscricaoId,
      capacidade,
    );
    await gravarPosicoes(cliente, posicoes);

    await registrarEvento({
      ator,
      entidade: "Inscricao",
      entidadeId: inscricaoId,
      campo: "situacao",
      descricao: "Registrada desistência",
      cliente,
    });

    if (!promovidoId) return null;

    await registrarEvento({
      ator,
      entidade: "Inscricao",
      entidadeId: promovidoId,
      campo: "situacao",
      descricao: "Promovido automaticamente após desistência",
      cliente,
    });

    return cliente.inscricao.findUnique({
      where: { id: promovidoId },
      select: { membro: { select: { nomeCompleto: true, telefone: true } } },
    });
  });

  revalidatePath(`/caravanas/${inscricao.caravanaId}`);
  revalidatePath(`/caravanas/${inscricao.caravanaId}/inscritos`);

  return {
    promovido: promovido?.membro ?? null,
  };
}

export async function removerInscricao(inscricaoId: string) {
  const { ator, inscricao } = await exigirPodeEditarInscricao(inscricaoId);
  await exigirUsuario();

  await prisma.$transaction(async (cliente) => {
    await cliente.inscricao.delete({ where: { id: inscricaoId } });
    const { itens } = await carregarListaParaCalculo(cliente, inscricao.caravanaId);
    await gravarPosicoes(cliente, renumerar(itens));
    await registrarEvento({
      ator,
      entidade: "Inscricao",
      entidadeId: inscricaoId,
      campo: "remocao",
      descricao: "Inscrição removida da caravana",
      cliente,
    });
  });

  revalidatePath(`/caravanas/${inscricao.caravanaId}`);
  revalidatePath(`/caravanas/${inscricao.caravanaId}/inscritos`);
}
