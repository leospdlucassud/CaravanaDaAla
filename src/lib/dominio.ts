/**
 * Regras do domínio, derivadas do Manual Geral e do site da Igreja.
 *
 * Módulo puro: importa só os enums gerados (que não têm runtime), nunca o
 * cliente do Prisma. Assim as regras rodam em teste de unidade sem banco.
 *
 * Princípio: tudo aqui produz AVISO, nunca bloqueio. Quem decide sobre
 * dignidade e preparação é o bispo, com o Sistema de Preparação de Ordenanças
 * no LCR. O app só sinaliza o que parece inconsistente.
 */

import {
  NomesDeFamilia,
  Ordenanca,
  Organizacao,
  Papel,
  RecomendacaoTipo,
  Sexo,
  SituacaoInscricao,
  StatusCaravana,
  StatusPagamento,
  StatusRecomendacao,
  StatusSimples,
  TipoParticipacao,
  TipoVinculo,
} from "@/generated/prisma/enums";

// ---------------------------------------------------------------------------
// Rótulos em português — o vocabulário da Igreja, um lugar só.
// ---------------------------------------------------------------------------

export const ROTULO_ORGANIZACAO: Record<Organizacao, string> = {
  QUORUM_ELDERES: "Quórum de Élderes",
  SOCIEDADE_SOCORRO: "Sociedade de Socorro",
  MOCAS: "Moças",
  RAPAZES: "Rapazes",
  PRIMARIA: "Primária",
};

export const ROTULO_ORGANIZACAO_CURTO: Record<Organizacao, string> = {
  QUORUM_ELDERES: "Quórum",
  SOCIEDADE_SOCORRO: "Soc. Socorro",
  MOCAS: "Moças",
  RAPAZES: "Rapazes",
  PRIMARIA: "Primária",
};

export const ROTULO_ORDENANCA: Record<Ordenanca, string> = {
  BATISTERIO: "Batistério",
  INICIATORIA: "Iniciatória",
  INVESTIDURA: "Investidura (vicária)",
  PRIMEIRA_INVESTIDURA: "1ª investidura (própria)",
  SELAMENTO_CONJUGE: "Selamento de cônjuges",
  SELAMENTO_FAMILIA: "Selamento de filhos aos pais",
};

export const ROTULO_RECOMENDACAO_TIPO: Record<RecomendacaoTipo, string> = {
  NENHUMA: "Não possui",
  USO_LIMITADO: "Uso limitado",
  MEMBRO_INVESTIDO: "Membro investido",
  ORDENANCAS_PROPRIAS: "Ordenanças próprias",
};

export const ROTULO_STATUS_RECOMENDACAO: Record<StatusRecomendacao, string> = {
  VALIDA: "Válida",
  VENCIDA: "Vencida",
  NAO_POSSUI: "Não possui",
  NAO_SE_APLICA: "Não se aplica",
};

export const ROTULO_STATUS_SIMPLES: Record<StatusSimples, string> = {
  SIM: "Sim",
  NAO: "Não",
  NAO_SE_APLICA: "Não se aplica",
};

export const ROTULO_NOMES_FAMILIA: Record<NomesDeFamilia, string> = {
  PROPRIOS_PRONTOS: "Nomes próprios prontos",
  USARA_NOMES_DO_TEMPLO: "Usará nomes do templo",
  PRECISA_DE_AJUDA: "Precisa de ajuda",
};

export const ROTULO_PAGAMENTO: Record<StatusPagamento, string> = {
  PENDENTE: "Pendente",
  PAGO: "Pago",
  ISENTO: "Isento",
  BENEFICIO_AREA: "Benefício da Área",
};

export const ROTULO_SITUACAO: Record<SituacaoInscricao, string> = {
  CONFIRMADA: "Confirmada",
  FILA_ESPERA: "Fila de espera",
  DESISTIU: "Desistiu",
  CANCELADA: "Cancelada",
};

export const ROTULO_STATUS_CARAVANA: Record<StatusCaravana, string> = {
  PLANEJAMENTO: "Em planejamento",
  CONFIRMADA: "Confirmada",
  REALIZADA: "Realizada",
  CANCELADA: "Cancelada",
};

export const ROTULO_PAPEL: Record<Papel, string> = {
  ADMINISTRADOR: "Administrador",
  ORGANIZADOR: "Organizador da caravana",
  LIDER_ORGANIZACAO: "Líder de organização",
  VISUALIZADOR: "Visualizador",
};

export const ROTULO_VINCULO: Record<TipoVinculo, string> = {
  MEMBRO: "Membro",
  PESQUISADOR: "Pesquisador",
  CONVIDADO: "Convidado",
};

export const ROTULO_PARTICIPACAO: Record<TipoParticipacao, string> = {
  ORDENANCA: "Ordenança",
  ACOMPANHANTE_JARDINS: "Acompanhante (jardins)",
};

export const ROTULO_SEXO: Record<Sexo, string> = {
  MASCULINO: "Masculino",
  FEMININO: "Feminino",
};

// ---------------------------------------------------------------------------
// Validade da recomendação
// ---------------------------------------------------------------------------

/**
 * Prazos praticados pela Igreja: recomendação regular vale 2 anos, a de uso
 * limitado vale 1 ano.
 *
 * Isto é apenas SUGESTÃO de preenchimento. A data impressa na recomendação da
 * pessoa sempre prevalece, e é ela que o app guarda — o Manual não fixa o prazo
 * no texto do capítulo 26, e regra que muda não deve virar cálculo escondido.
 */
export const ANOS_DE_VALIDADE: Record<RecomendacaoTipo, number | null> = {
  NENHUMA: null,
  USO_LIMITADO: 1,
  MEMBRO_INVESTIDO: 2,
  ORDENANCAS_PROPRIAS: 2,
};

export function validadeSugerida(
  tipo: RecomendacaoTipo,
  dataDaEntrevista: Date,
): Date | null {
  const anos = ANOS_DE_VALIDADE[tipo];
  if (anos === null) return null;
  const vencimento = new Date(dataDaEntrevista);
  vencimento.setFullYear(vencimento.getFullYear() + anos);
  return vencimento;
}

/** Status derivado da data guardada, na data de referência (dia da caravana). */
export function statusDaRecomendacao(
  tipo: RecomendacaoTipo,
  validaAte: Date | null,
  dataDeReferencia: Date,
): StatusRecomendacao {
  if (tipo === "NENHUMA") return StatusRecomendacao.NAO_POSSUI;
  if (!validaAte) return StatusRecomendacao.NAO_POSSUI;
  return validaAte >= dataDeReferencia
    ? StatusRecomendacao.VALIDA
    : StatusRecomendacao.VENCIDA;
}

/** Antecedência com que avisamos que a recomendação vence antes da caravana. */
export const DIAS_DE_ANTECEDENCIA_DO_ALERTA = 45;

export function venceAntesDaCaravana(
  validaAte: Date | null,
  dataDaCaravana: Date,
  diasDeAntecedencia = DIAS_DE_ANTECEDENCIA_DO_ALERTA,
): boolean {
  if (!validaAte) return false;
  const limite = new Date(dataDaCaravana);
  limite.setDate(limite.getDate() + diasDeAntecedencia);
  return validaAte < limite;
}

// ---------------------------------------------------------------------------
// Matriz ordenança x tipo de recomendação
// Manual Geral 26.1.1 (uso limitado), 26.1.2 (membro investido),
// 26.1.3 (ordenanças próprias).
// ---------------------------------------------------------------------------

export const RECOMENDACAO_ACEITA_PARA: Record<Ordenanca, RecomendacaoTipo[]> = {
  // Uso limitado atende; quem já é investido também participa.
  BATISTERIO: ["USO_LIMITADO", "MEMBRO_INVESTIDO"],
  INICIATORIA: ["MEMBRO_INVESTIDO"],
  INVESTIDURA: ["MEMBRO_INVESTIDO"],
  // Ordenanças próprias.
  PRIMEIRA_INVESTIDURA: ["ORDENANCAS_PROPRIAS"],
  SELAMENTO_CONJUGE: ["ORDENANCAS_PROPRIAS", "MEMBRO_INVESTIDO"],
  SELAMENTO_FAMILIA: ["ORDENANCAS_PROPRIAS", "MEMBRO_INVESTIDO"],
};

export type Aviso = {
  codigo: string;
  texto: string;
  gravidade: "alta" | "media";
};

export function avisoDeRecomendacaoParaOrdenanca(
  tipo: RecomendacaoTipo,
  ordenanca: Ordenanca,
): Aviso | null {
  const aceitas = RECOMENDACAO_ACEITA_PARA[ordenanca];
  if (aceitas.includes(tipo)) return null;

  if (tipo === "NENHUMA") {
    return {
      codigo: "sem-recomendacao",
      texto: `Marcado para ${ROTULO_ORDENANCA[ordenanca].toLowerCase()}, mas não consta recomendação.`,
      gravidade: "alta",
    };
  }

  return {
    codigo: "recomendacao-incompativel",
    texto:
      `Recomendação de ${ROTULO_RECOMENDACAO_TIPO[tipo].toLowerCase()} não atende ` +
      `${ROTULO_ORDENANCA[ordenanca].toLowerCase()} — seria preciso ` +
      aceitas.map((t) => ROTULO_RECOMENDACAO_TIPO[t].toLowerCase()).join(" ou ") +
      ".",
    gravidade: "alta",
  };
}

// ---------------------------------------------------------------------------
// Elegibilidade por idade
// ---------------------------------------------------------------------------

/**
 * Manual Geral 26.1.1: a pessoa se qualifica para a recomendação de uso
 * limitado "a partir do mês de janeiro do ano em que completar 12 anos".
 * A regra é sobre o ANO, não sobre a data — por isso guardamos só o ano.
 */
export function elegivelParaBatisterio(
  anoNascimento: number | null,
  dataDaCaravana: Date,
): boolean | null {
  if (anoNascimento === null) return null; // não sabemos
  return dataDaCaravana.getFullYear() - anoNascimento >= 12;
}

/** Manual Geral 27.2.2: a investidura própria exige no mínimo 18 anos. */
export const IDADE_MINIMA_INVESTIDURA = 18;

export function idadeAproximadaEm(
  anoNascimento: number | null,
  data: Date,
): number | null {
  if (anoNascimento === null) return null;
  return data.getFullYear() - anoNascimento;
}

export function ehMenorDeIdade(
  anoNascimento: number | null,
  data: Date,
): boolean | null {
  const idade = idadeAproximadaEm(anoNascimento, data);
  return idade === null ? null : idade < 18;
}

// ---------------------------------------------------------------------------
// Agendamento
// ---------------------------------------------------------------------------

/**
 * Ordenanças próprias (1ª investidura, selamento) exigem agendamento separado,
 * feito por telefone direto com o templo. Não entram no pedido de grupo.
 */
export const ORDENANCAS_PROPRIAS: Ordenanca[] = [
  "PRIMEIRA_INVESTIDURA",
  "SELAMENTO_CONJUGE",
  "SELAMENTO_FAMILIA",
];

export function exigeAgendamentoProprio(ordenanca: Ordenanca): boolean {
  return ORDENANCAS_PROPRIAS.includes(ordenanca);
}

export function entraNoPedidoDeGrupo(
  participacao: TipoParticipacao,
  ordenanca: Ordenanca | null,
): boolean {
  if (participacao === "ACOMPANHANTE_JARDINS") return false;
  if (!ordenanca) return false;
  return !exigeAgendamentoProprio(ordenanca);
}

export type LinhaDoPedidoDeGrupo = {
  ordenanca: Ordenanca;
  homens: number;
  mulheres: number;
  semSexoInformado: number;
  total: number;
};

/**
 * O templo pede a contagem por ordenança e por sexo. Esta função produz
 * exatamente a tabela que vai no e-mail para o templo.
 */
export function montarPedidoDeGrupo(
  inscritos: Array<{
    participacao: TipoParticipacao;
    ordenanca: Ordenanca | null;
    sexo: Sexo | null;
    situacao: SituacaoInscricao;
  }>,
): LinhaDoPedidoDeGrupo[] {
  const porOrdenanca = new Map<Ordenanca, LinhaDoPedidoDeGrupo>();

  for (const inscrito of inscritos) {
    if (inscrito.situacao !== "CONFIRMADA") continue;
    if (!entraNoPedidoDeGrupo(inscrito.participacao, inscrito.ordenanca)) continue;

    const ordenanca = inscrito.ordenanca as Ordenanca;
    const linha =
      porOrdenanca.get(ordenanca) ??
      { ordenanca, homens: 0, mulheres: 0, semSexoInformado: 0, total: 0 };

    if (inscrito.sexo === "MASCULINO") linha.homens += 1;
    else if (inscrito.sexo === "FEMININO") linha.mulheres += 1;
    else linha.semSexoInformado += 1;

    linha.total += 1;
    porOrdenanca.set(ordenanca, linha);
  }

  const ordemDeExibicao = Object.keys(ROTULO_ORDENANCA) as Ordenanca[];
  return ordemDeExibicao
    .map((o) => porOrdenanca.get(o))
    .filter((l): l is LinhaDoPedidoDeGrupo => l !== undefined);
}
