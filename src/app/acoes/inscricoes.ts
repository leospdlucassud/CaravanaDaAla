"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { lerAutor } from "@/lib/autor";
import { registrarAlteracoes, registrarEvento } from "@/lib/auditoria";
import {
  moverParaFila,
  promoverDaFila,
  registrarDesistencia,
  renumerar,
  situacaoAoInscrever,
  type ItemDaLista,
} from "@/lib/fila";

/**
 * O app é de acesso aberto: quem abre o endereço edita. Não há papéis nem
 * checagem de permissão — só validação do que está sendo gravado.
 *
 * A lista de campos editáveis abaixo continua fechada, e isso não é sobre
 * confiança em quem usa: é para que uma requisição malformada (ou um bug de
 * tela) não consiga escrever num campo que a interface não expõe.
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
  if (!esquema) throw new Error("Campo não editável.");

  const valor = esquema.parse(entrada.valor);
  const autor = await lerAutor();

  const antes = await prisma.inscricao.findUniqueOrThrow({
    where: { id: entrada.inscricaoId },
    select: {
      [entrada.campo]: true,
      caravanaId: true,
      valorPago: true,
      caravana: { select: { valorPorPessoa: true } },
    } as Record<string, true>,
  });

  const registro = antes as unknown as {
    caravanaId: string;
    valorPago: unknown;
    caravana: { valorPorPessoa: unknown };
  };

  const depois: Record<string, unknown> = { [entrada.campo]: valor };

  // Marcar "Pago" sem registrar o valor faria o contador de arrecadação mentir.
  // Assumimos o valor por pessoa da caravana, que a tela de financeiro poderá
  // ajustar depois quando alguém pagar valor diferente.
  if (entrada.campo === "pagamentoStatus") {
    if (valor === "PAGO" && registro.valorPago == null) {
      depois.valorPago = registro.caravana.valorPorPessoa ?? null;
    } else if (valor === "PENDENTE" || valor === "ISENTO") {
      depois.valorPago = null;
    }
  }

  await prisma.inscricao.update({
    where: { id: entrada.inscricaoId },
    data: depois,
  });

  await registrarAlteracoes({
    autor,
    entidade: "Inscricao",
    entidadeId: entrada.inscricaoId,
    antes: antes as Record<string, unknown>,
    depois,
  });

  revalidatePath(`/caravanas/${registro.caravanaId}`);
}

// ---------------------------------------------------------------------------
// Inscrição, fila e capacidade
//
// Toda mexida na lista roda dentro de uma transação e regrava as posições
// inteiras — ninguém digita número de fila.
// ---------------------------------------------------------------------------

type ClienteDeTransacao = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

async function carregarListaParaCalculo(
  cliente: ClienteDeTransacao,
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
  cliente: ClienteDeTransacao,
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

async function caravanaDaInscricao(inscricaoId: string): Promise<string> {
  const inscricao = await prisma.inscricao.findUnique({
    where: { id: inscricaoId },
    select: { caravanaId: true },
  });
  if (!inscricao) throw new Error("Inscrição não encontrada.");
  return inscricao.caravanaId;
}

export async function inscreverMembro(entrada: {
  caravanaId: string;
  membroId: string;
}) {
  const autor = await lerAutor();

  const membro = await prisma.membro.findUnique({
    where: { id: entrada.membroId },
    select: { nomeCompleto: true },
  });
  if (!membro) throw new Error("Membro não encontrado.");

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
      autor,
      entidade: "Inscricao",
      entidadeId: criada.id,
      campo: "criacao",
      descricao: `${membro.nomeCompleto} inscrito como ${situacaoInicial}`,
      cliente,
    });

    return situacaoInicial;
  });

  revalidatePath(`/caravanas/${entrada.caravanaId}`);
  revalidatePath(`/caravanas/${entrada.caravanaId}/inscrever`);

  return { situacao };
}

export async function promoverInscricao(inscricaoId: string) {
  const autor = await lerAutor();
  const caravanaId = await caravanaDaInscricao(inscricaoId);

  await prisma.$transaction(async (cliente) => {
    const { itens } = await carregarListaParaCalculo(cliente, caravanaId);
    await gravarPosicoes(cliente, promoverDaFila(itens, inscricaoId));
    await registrarEvento({
      autor,
      entidade: "Inscricao",
      entidadeId: inscricaoId,
      campo: "situacao",
      descricao: "Promovido da fila de espera para vaga confirmada",
      cliente,
    });
  });

  revalidatePath(`/caravanas/${caravanaId}`);
}

export async function enviarParaFila(inscricaoId: string) {
  const autor = await lerAutor();
  const caravanaId = await caravanaDaInscricao(inscricaoId);

  await prisma.$transaction(async (cliente) => {
    const { itens } = await carregarListaParaCalculo(cliente, caravanaId);
    await gravarPosicoes(cliente, moverParaFila(itens, inscricaoId));
    await registrarEvento({
      autor,
      entidade: "Inscricao",
      entidadeId: inscricaoId,
      campo: "situacao",
      descricao: "Movido para a fila de espera",
      cliente,
    });
  });

  revalidatePath(`/caravanas/${caravanaId}`);
}

/**
 * Registra desistência e já promove o primeiro da fila, devolvendo quem subiu
 * para a tela poder avisar que essa pessoa precisa ser comunicada.
 */
export async function registrarDesistenciaDeInscricao(inscricaoId: string) {
  const autor = await lerAutor();
  const caravanaId = await caravanaDaInscricao(inscricaoId);

  const promovido = await prisma.$transaction(async (cliente) => {
    const { itens, capacidade } = await carregarListaParaCalculo(cliente, caravanaId);

    const { posicoes, promovidoId } = registrarDesistencia(
      itens,
      inscricaoId,
      capacidade,
    );
    await gravarPosicoes(cliente, posicoes);

    await registrarEvento({
      autor,
      entidade: "Inscricao",
      entidadeId: inscricaoId,
      campo: "situacao",
      descricao: "Registrada desistência",
      cliente,
    });

    if (!promovidoId) return null;

    await registrarEvento({
      autor,
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

  revalidatePath(`/caravanas/${caravanaId}`);

  return { promovido: promovido?.membro ?? null };
}

export async function removerInscricao(inscricaoId: string) {
  const autor = await lerAutor();
  const caravanaId = await caravanaDaInscricao(inscricaoId);

  await prisma.$transaction(async (cliente) => {
    await cliente.inscricao.delete({ where: { id: inscricaoId } });
    const { itens } = await carregarListaParaCalculo(cliente, caravanaId);
    await gravarPosicoes(cliente, renumerar(itens));
    await registrarEvento({
      autor,
      entidade: "Inscricao",
      entidadeId: inscricaoId,
      campo: "remocao",
      descricao: "Inscrição removida da caravana",
      cliente,
    });
  });

  revalidatePath(`/caravanas/${caravanaId}`);
}
