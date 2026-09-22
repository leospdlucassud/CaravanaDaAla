import {
  avisoDeRecomendacaoParaOrdenanca,
  elegivelParaBatisterio,
  exigeAgendamentoProprio,
  statusDaRecomendacao,
  venceAntesDaCaravana,
  type Aviso,
} from "@/lib/dominio";

/**
 * Os avisos de cada inscrição — puro, sem banco, para poder ser testado. Quem
 * carrega os dados é consultas.ts.
 */

export type InscricaoParaAviso = {
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
  } else if (tipo !== "NENHUMA" && !membro.recomendacaoValidaAte) {
    // Sem a data impressa não dá para afirmar que está válida (ver
    // statusDaRecomendacao). Sem este aviso, apagar a data de uma recomendação
    // vencida "resolvia" o problema na tela.
    avisos.push({
      codigo: "recomendacao-sem-data",
      texto:
        "Recomendação sem data de validade na ficha — confira a data impressa e anote.",
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
