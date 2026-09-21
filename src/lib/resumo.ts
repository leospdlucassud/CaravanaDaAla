/**
 * Os números do resumo da caravana — e o que cada um conta.
 *
 * Fonte única: o número do card e a lista que abre ao clicar nele usam as
 * mesmas funções de PENDENCIAS. Se as duas contas vivessem em lugares
 * diferentes, bastaria alguém ajustar uma regra só de um lado para o card dizer
 * "13" e o diálogo mostrar 12 pessoas.
 *
 * Módulo puro: sem banco, para poder ser testado sozinho.
 */

import { entraNoPedidoDeGrupo, type Aviso } from "@/lib/dominio";
import type { Ordenanca, TipoParticipacao } from "@/generated/prisma/enums";

export type InscricaoParaResumo = {
  situacao: string;
  participacao: TipoParticipacao;
  ordenanca: string | null;
  recomendacaoStatus: string | null;
  agendamentoStatus: string | null;
  avisos: Pick<Aviso, "gravidade">[];
};

export type ChaveDePendencia =
  | "fila"
  | "atencao"
  | "ordenanca"
  | "recomendacao"
  | "agendamento";

/** Confirmada e vai fazer ordenança (quem só acompanha nos jardins não entra). */
function confirmadaParaOrdenanca(i: InscricaoParaResumo): boolean {
  return i.situacao === "CONFIRMADA" && i.participacao === "ORDENANCA";
}

/** Quem cada card conta. Verdadeiro = ainda pendente. */
export const PENDENCIAS: Record<
  ChaveDePendencia,
  (inscricao: InscricaoParaResumo) => boolean
> = {
  fila: (i) => i.situacao === "FILA_ESPERA",
  atencao: (i) =>
    i.situacao === "CONFIRMADA" && i.avisos.some((a) => a.gravidade === "alta"),
  ordenanca: (i) => confirmadaParaOrdenanca(i) && i.ordenanca === null,
  recomendacao: (i) => confirmadaParaOrdenanca(i) && i.recomendacaoStatus === null,
  agendamento: (i) => confirmadaParaOrdenanca(i) && i.agendamentoStatus === null,
};

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
  inscritos: Array<
    InscricaoParaResumo & { pagamentoStatus: string; valorPago: unknown }
  >,
  caravana: { capacidadeAssentos: number; custoTotalTransporte: unknown },
): ResumoDaCaravana {
  const confirmados = inscritos.filter((i) => i.situacao === "CONFIRMADA");
  const contar = (chave: ChaveDePendencia) =>
    inscritos.filter(PENDENCIAS[chave]).length;
  const paraNumero = (v: unknown) => (v == null ? 0 : Number(v));

  return {
    confirmados: confirmados.length,
    naFila: contar("fila"),
    desistentes: inscritos.filter((i) => i.situacao === "DESISTIU").length,
    capacidade: caravana.capacidadeAssentos,
    vagasRestantes: Math.max(0, caravana.capacidadeAssentos - confirmados.length),
    recomendacaoPendente: contar("recomendacao"),
    agendamentoPendente: contar("agendamento"),
    ordenancaPendente: contar("ordenanca"),
    pagamentoPendente: confirmados.filter((i) => i.pagamentoStatus === "PENDENTE")
      .length,
    totalArrecadado: confirmados.reduce((s, i) => s + paraNumero(i.valorPago), 0),
    custoTotal: paraNumero(caravana.custoTotalTransporte),
    comAvisoAlto: contar("atencao"),
    noPedidoDeGrupo: confirmados.filter((i) =>
      entraNoPedidoDeGrupo(i.participacao, i.ordenanca as Ordenanca | null),
    ).length,
  };
}
