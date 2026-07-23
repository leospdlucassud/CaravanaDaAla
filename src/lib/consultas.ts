import { prisma } from "@/lib/prisma";
import {
  avisoDeRecomendacaoParaOrdenanca,
  elegivelParaBatisterio,
  entraNoPedidoDeGrupo,
  exigeAgendamentoProprio,
  statusDaRecomendacao,
  venceAntesDaCaravana,
  type Aviso,
} from "@/lib/dominio";

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

type InscricaoParaAviso = {
  participacao: "ORDENANCA" | "ACOMPANHANTE_JARDINS";
  ordenanca: string | null;
  situacao: string;
  membro: {
    recomendacaoTipo: string;
    recomendacaoValidaAte: Date | null;
    anoNascimento: number | null;
    recemConverso: boolean;
  };
  acompanhanteId: string | null;
};

/**
 * Avisos, nunca bloqueios. O app aponta a inconsistência; a decisão continua
 * sendo do bispo, com o Sistema de Preparação de Ordenanças no LCR.
 */
export function calcularAvisos(
  inscricao: InscricaoParaAviso,
  dataDaCaravana: Date,
): Aviso[] {
  const avisos: Aviso[] = [];
  const { membro } = inscricao;

  if (inscricao.situacao !== "CONFIRMADA") return avisos;

  // Quem só acompanha nos jardins não precisa de recomendação nem agendamento.
  if (inscricao.participacao === "ACOMPANHANTE_JARDINS") return avisos;

  const ordenanca = inscricao.ordenanca as Parameters<
    typeof avisoDeRecomendacaoParaOrdenanca
  >[1] | null;

  if (!ordenanca) {
    avisos.push({
      codigo: "ordenanca-indefinida",
      texto:
        "Ordenança ainda não definida — sem ela não dá para saber que recomendação é exigida nem contar no pedido ao templo.",
      gravidade: "media",
    });
    return avisos;
  }

  const tipo = membro.recomendacaoTipo as Parameters<
    typeof avisoDeRecomendacaoParaOrdenanca
  >[0];

  const avisoDeCompatibilidade = avisoDeRecomendacaoParaOrdenanca(tipo, ordenanca);
  if (avisoDeCompatibilidade) avisos.push(avisoDeCompatibilidade);

  const status = statusDaRecomendacao(
    tipo,
    membro.recomendacaoValidaAte,
    dataDaCaravana,
  );
  if (status === "VENCIDA") {
    avisos.push({
      codigo: "recomendacao-vencida",
      texto: "A recomendação vence antes do dia da caravana.",
      gravidade: "alta",
    });
  } else if (
    status === "VALIDA" &&
    venceAntesDaCaravana(membro.recomendacaoValidaAte, dataDaCaravana)
  ) {
    avisos.push({
      codigo: "recomendacao-vencendo",
      texto:
        "A recomendação vence logo depois da caravana — vale agendar a entrevista já.",
      gravidade: "media",
    });
  }

  if (ordenanca === "BATISTERIO") {
    const elegivel = elegivelParaBatisterio(membro.anoNascimento, dataDaCaravana);
    if (elegivel === false) {
      avisos.push({
        codigo: "idade-batisterio",
        texto:
          "Ainda não completa 12 anos neste ano — a recomendação de uso limitado só vale a partir de janeiro do ano em que a pessoa faz 12.",
        gravidade: "alta",
      });
    }
    if (membro.recemConverso && !inscricao.acompanhanteId) {
      avisos.push({
        codigo: "recem-converso-sem-acompanhante",
        texto: "Recém-converso indo ao batistério sem acompanhante designado.",
        gravidade: "media",
      });
    }
  }

  if (exigeAgendamentoProprio(ordenanca)) {
    avisos.push({
      codigo: "agendamento-proprio",
      texto:
        "Ordenança própria: precisa de agendamento separado, por telefone com o templo. Não entra no pedido de grupo.",
      gravidade: "media",
    });
  }

  return avisos;
}

export type ResumoDaCaravana = {
  confirmados: number;
  naFila: number;
  desistentes: number;
  capacidade: number;
  vagasRestantes: number;
  recomendacaoPendente: number;
  agendamentoPendente: number;
  ordenancaPendente: number;
  pagamentoPendente: number;
  totalArrecadado: number;
  custoTotal: number;
  comAvisoAlto: number;
  noPedidoDeGrupo: number;
};

export function resumir(
  inscritos: Array<{
    situacao: string;
    participacao: "ORDENANCA" | "ACOMPANHANTE_JARDINS";
    ordenanca: string | null;
    recomendacaoStatus: string | null;
    agendamentoStatus: string | null;
    pagamentoStatus: string;
    valorPago: unknown;
    avisos: Aviso[];
  }>,
  caravana: { capacidadeAssentos: number; custoTotalTransporte: unknown },
): ResumoDaCaravana {
  const confirmados = inscritos.filter((i) => i.situacao === "CONFIRMADA");

  const paraNumero = (v: unknown) => (v == null ? 0 : Number(v));

  return {
    confirmados: confirmados.length,
    naFila: inscritos.filter((i) => i.situacao === "FILA_ESPERA").length,
    desistentes: inscritos.filter((i) => i.situacao === "DESISTIU").length,
    capacidade: caravana.capacidadeAssentos,
    vagasRestantes: Math.max(0, caravana.capacidadeAssentos - confirmados.length),
    recomendacaoPendente: confirmados.filter(
      (i) => i.participacao === "ORDENANCA" && i.recomendacaoStatus === null,
    ).length,
    agendamentoPendente: confirmados.filter(
      (i) => i.participacao === "ORDENANCA" && i.agendamentoStatus === null,
    ).length,
    ordenancaPendente: confirmados.filter(
      (i) => i.participacao === "ORDENANCA" && i.ordenanca === null,
    ).length,
    pagamentoPendente: confirmados.filter((i) => i.pagamentoStatus === "PENDENTE")
      .length,
    totalArrecadado: confirmados.reduce((s, i) => s + paraNumero(i.valorPago), 0),
    custoTotal: paraNumero(caravana.custoTotalTransporte),
    comAvisoAlto: confirmados.filter((i) =>
      i.avisos.some((a) => a.gravidade === "alta"),
    ).length,
    noPedidoDeGrupo: confirmados.filter((i) =>
      entraNoPedidoDeGrupo(
        i.participacao,
        i.ordenanca as Parameters<typeof entraNoPedidoDeGrupo>[1],
      ),
    ).length,
  };
}
