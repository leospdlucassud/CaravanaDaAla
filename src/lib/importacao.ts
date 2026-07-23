/**
 * Leitura da planilha de controle da caravana.
 *
 * Módulo puro: recebe uma matriz de células já lida do arquivo e devolve linhas
 * estruturadas com os avisos do que precisa de revisão humana. Quem grava no
 * banco é a ação de importação, depois que a pessoa confere a prévia.
 *
 * Traduzimos o vocabulário da planilha para o do app, e isso NÃO é uma cópia
 * de campo para campo:
 *
 * - "?" e vazio viram a mesma coisa: pendente (nulo). A planilha tinha dois
 *   jeitos de dizer "não sei" e ninguém somava os dois.
 * - "Ajudar a agendar entrevista" e "Precisa de ajuda" eram AÇÕES misturadas
 *   com ESTADOS na mesma coluna; viram sinalizadores próprios, preservando o
 *   estado.
 * - "jardim" não é ordenança: vira participação de acompanhante.
 * - "(Pesquisador)" e "(Rosa dos Ventos)" saem de dentro do nome.
 */

import { extrairDadosDoNome, normalizarNome } from "@/lib/normalizar";
import type {
  NomesDeFamilia,
  Ordenanca,
  Organizacao,
  StatusPagamento,
  StatusRecomendacao,
  StatusSimples,
  TipoParticipacao,
} from "@/generated/prisma/enums";

export type Celula = string | null | undefined;

/** Colunas da planilha, na ordem em que aparecem. */
const COLUNA = {
  numero: 0,
  membro: 1,
  organizacao: 2,
  recemConverso: 3,
  cartao: 4,
  recomendacao: 5,
  agendamento: 6,
  ordenanca: 7,
  pagamento: 8,
  beneficioArea: 9,
  agendamentoGrupo: 10,
} as const;

function limpar(valor: Celula): string {
  return String(valor ?? "")
    .replace(/[\r\n]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Compara ignorando caixa, acento e espaço — a planilha tinha as três coisas. */
function igual(valor: Celula, ...alternativas: string[]): boolean {
  const alvo = normalizarNome(limpar(valor));
  return alternativas.some((a) => normalizarNome(a) === alvo);
}

function contem(valor: Celula, trecho: string): boolean {
  return normalizarNome(limpar(valor)).includes(normalizarNome(trecho));
}

// --- Tradutores de coluna ---------------------------------------------------

export function lerOrganizacao(valor: Celula): Organizacao | null {
  if (igual(valor, "Quorum", "Qúorum", "Quórum")) return "QUORUM_ELDERES";
  if (igual(valor, "Soc", "Soc.", "Sociedade de Socorro")) return "SOCIEDADE_SOCORRO";
  if (igual(valor, "Mocas", "Moças")) return "MOCAS";
  if (igual(valor, "Rapazes")) return "RAPAZES";
  if (igual(valor, "Primaria", "Primária")) return "PRIMARIA";
  return null;
}

export function lerSimNao(valor: Celula): boolean {
  return igual(valor, "sim", "s");
}

export function lerRecomendacao(valor: Celula): {
  status: StatusRecomendacao | null;
  precisaAjudaEntrevista: boolean;
} {
  if (contem(valor, "ajudar a agendar")) {
    // Era ação, não estado: o estado real ficava perdido.
    return { status: null, precisaAjudaEntrevista: true };
  }
  if (igual(valor, "Valida", "Válida")) {
    return { status: "VALIDA", precisaAjudaEntrevista: false };
  }
  if (igual(valor, "Invalida", "Inválida")) {
    return { status: "VENCIDA", precisaAjudaEntrevista: false };
  }
  if (contem(valor, "se aplica")) {
    return { status: "NAO_SE_APLICA", precisaAjudaEntrevista: false };
  }
  return { status: null, precisaAjudaEntrevista: false };
}

export function lerAgendamento(valor: Celula): StatusSimples | null {
  if (igual(valor, "sim")) return "SIM";
  if (igual(valor, "nao", "não")) return "NAO";
  if (contem(valor, "se aplica")) return "NAO_SE_APLICA";
  return null;
}

export function lerCartao(valor: Celula): {
  nomesDeFamilia: NomesDeFamilia | null;
  precisaAjudaNomes: boolean;
} {
  if (contem(valor, "precisa de ajuda")) {
    return { nomesDeFamilia: "PRECISA_DE_AJUDA", precisaAjudaNomes: true };
  }
  if (igual(valor, "sim")) {
    return { nomesDeFamilia: "PROPRIOS_PRONTOS", precisaAjudaNomes: false };
  }
  // "Não" e "?" viram pendente: na planilha de origem a coluna estava com o
  // mesmo valor em todas as linhas, ou seja, não carregava informação.
  return { nomesDeFamilia: null, precisaAjudaNomes: false };
}

export function lerOrdenanca(valor: Celula): {
  ordenanca: Ordenanca | null;
  participacao: TipoParticipacao;
} {
  if (contem(valor, "jardim")) {
    // Jardim não é ordenança: é quem ocupa assento sem entrar no templo.
    return { ordenanca: null, participacao: "ACOMPANHANTE_JARDINS" };
  }
  if (contem(valor, "1") && contem(valor, "investidura")) {
    return { ordenanca: "PRIMEIRA_INVESTIDURA", participacao: "ORDENANCA" };
  }
  if (contem(valor, "batisterio")) {
    return { ordenanca: "BATISTERIO", participacao: "ORDENANCA" };
  }
  if (contem(valor, "iniciatoria")) {
    return { ordenanca: "INICIATORIA", participacao: "ORDENANCA" };
  }
  if (contem(valor, "investidura")) {
    return { ordenanca: "INVESTIDURA", participacao: "ORDENANCA" };
  }
  if (contem(valor, "selamento")) {
    return { ordenanca: "SELAMENTO_CONJUGE", participacao: "ORDENANCA" };
  }
  return { ordenanca: null, participacao: "ORDENANCA" };
}

export function lerPagamento(
  valorPagamento: Celula,
  valorBeneficio: Celula,
): StatusPagamento {
  if (lerSimNao(valorBeneficio)) return "BENEFICIO_AREA";
  if (lerSimNao(valorPagamento)) return "PAGO";
  return "PENDENTE";
}

// --- Análise da planilha ----------------------------------------------------

export type LinhaImportada = {
  /** Linha na planilha, para a pessoa conseguir conferir na origem. */
  linhaNaPlanilha: number;
  nomeOriginal: string;
  nomeSugerido: string;
  apelido: string | null;
  ehPesquisador: boolean;
  unidadeMencionada: string | null;
  observacao: string | null;
  organizacao: Organizacao | null;
  recemConverso: boolean;
  participacao: TipoParticipacao;
  ordenanca: Ordenanca | null;
  recomendacaoStatus: StatusRecomendacao | null;
  agendamentoStatus: StatusSimples | null;
  nomesDeFamilia: NomesDeFamilia | null;
  pagamentoStatus: StatusPagamento;
  incluidoNoAgendamentoGrupo: boolean;
  precisaAjudaEntrevista: boolean;
  precisaAjudaNomes: boolean;
  naFilaDeEspera: boolean;
  /** Sem nome na origem: precisa ser preenchido antes de gravar. */
  semNome: boolean;
};

export type ResultadoDaAnalise = {
  tituloDaCaravana: string | null;
  linhas: LinhaImportada[];
  totalDeLinhasLidas: number;
  ignoradas: number;
};

const ROTULO_DE_FILA = /f\.?\s*espera/i;

/**
 * Lê a matriz de células e devolve as linhas estruturadas.
 *
 * Tolerante de propósito: encontra o cabeçalho em vez de exigir que ele esteja
 * numa linha fixa, porque a planilha tem um título mesclado por cima que muda
 * de tamanho conforme quem editou por último.
 */
export function analisarPlanilha(matriz: Celula[][]): ResultadoDaAnalise {
  let indiceDoCabecalho = -1;
  let tituloDaCaravana: string | null = null;

  for (let i = 0; i < Math.min(matriz.length, 20); i++) {
    const linha = matriz[i] ?? [];
    if (linha.some((c) => contem(c, "membro"))) {
      indiceDoCabecalho = i;
      break;
    }
    const primeira = limpar(linha[0]);
    if (primeira && !tituloDaCaravana) tituloDaCaravana = primeira;
  }

  if (indiceDoCabecalho === -1) {
    return { tituloDaCaravana, linhas: [], totalDeLinhasLidas: 0, ignoradas: 0 };
  }

  const linhas: LinhaImportada[] = [];
  let totalDeLinhasLidas = 0;
  let ignoradas = 0;

  for (let i = indiceDoCabecalho + 1; i < matriz.length; i++) {
    const celulas = matriz[i] ?? [];
    const rotuloDaPrimeira = limpar(celulas[COLUNA.numero]);
    const naFilaDeEspera = ROTULO_DE_FILA.test(rotuloDaPrimeira);

    const nomeOriginal = limpar(celulas[COLUNA.membro]);
    const temAlgumDado = celulas.some((c, indice) => indice > 0 && limpar(c) !== "");

    // Linha da fila sem nome é só uma vaga em branco na planilha.
    if (naFilaDeEspera && !nomeOriginal) {
      ignoradas++;
      continue;
    }

    // Linha totalmente vazia encerra a leitura de dados.
    if (!rotuloDaPrimeira && !temAlgumDado) continue;

    totalDeLinhasLidas++;

    const extraido = extrairDadosDoNome(nomeOriginal);
    const { status: recomendacaoStatus, precisaAjudaEntrevista } = lerRecomendacao(
      celulas[COLUNA.recomendacao],
    );
    const { nomesDeFamilia, precisaAjudaNomes } = lerCartao(celulas[COLUNA.cartao]);
    const { ordenanca, participacao } = lerOrdenanca(celulas[COLUNA.ordenanca]);

    linhas.push({
      linhaNaPlanilha: i + 1,
      nomeOriginal,
      nomeSugerido: extraido.nomeCompleto,
      apelido: extraido.apelido,
      ehPesquisador: extraido.ehPesquisador,
      unidadeMencionada: extraido.unidadeMencionada,
      observacao: extraido.observacao,
      organizacao: lerOrganizacao(celulas[COLUNA.organizacao]),
      recemConverso: lerSimNao(celulas[COLUNA.recemConverso]),
      participacao,
      ordenanca,
      recomendacaoStatus,
      agendamentoStatus: lerAgendamento(celulas[COLUNA.agendamento]),
      nomesDeFamilia,
      pagamentoStatus: lerPagamento(
        celulas[COLUNA.pagamento],
        celulas[COLUNA.beneficioArea],
      ),
      incluidoNoAgendamentoGrupo: lerSimNao(celulas[COLUNA.agendamentoGrupo]),
      precisaAjudaEntrevista,
      precisaAjudaNomes,
      naFilaDeEspera,
      semNome: nomeOriginal === "",
    });
  }

  return { tituloDaCaravana, linhas, totalDeLinhasLidas, ignoradas };
}

/**
 * O nome é a única coisa que a importação não consegue inventar. Estas linhas
 * precisam de intervenção humana antes de virar registro.
 */
export function linhasQuePrecisamDeNome(
  resultado: ResultadoDaAnalise,
): LinhaImportada[] {
  return resultado.linhas.filter((l) => l.semNome);
}
