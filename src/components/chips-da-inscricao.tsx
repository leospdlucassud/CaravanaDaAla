"use client";

import { toast } from "sonner";
import {
  atualizarCampoDaInscricao,
  definirAtividadeNoTemplo,
} from "@/app/acoes/inscricoes";
import { ChipDeStatus, type OpcaoDeChip } from "@/components/chip-de-status";
import type { InscritoSerializado } from "@/components/inscrito-serializado";
import {
  atividadeDaInscricao,
  ROTULO_NOMES_FAMILIA,
  ROTULO_ORDENANCA,
  ROTULO_PAGAMENTO,
  ROTULO_STATUS_RECOMENDACAO,
  ROTULO_STATUS_SIMPLES,
  type AtividadeNoTemplo,
} from "@/lib/dominio";
import type {
  NomesDeFamilia,
  Ordenanca,
  StatusPagamento,
  StatusRecomendacao,
  StatusSimples,
} from "@/generated/prisma/enums";

/**
 * Os chips de status de uma inscrição, usados na lista de inscritos e nos
 * diálogos dos cards do resumo. Um lugar só, para as duas telas mostrarem e
 * gravarem exatamente a mesma coisa.
 *
 * Cada chip é remontado quando o valor que vem do servidor muda (key = valor):
 * assim, se o dado for alterado em outro lugar, o chip não fica mostrando o
 * valor antigo.
 */

// --- Opções -----------------------------------------------------------------

export const OPCOES_ATIVIDADE: OpcaoDeChip<AtividadeNoTemplo>[] = [
  { valor: null, rotulo: "Pendente", tom: "atencao" },
  ...(Object.keys(ROTULO_ORDENANCA) as Ordenanca[]).map((o) => ({
    valor: o,
    rotulo: ROTULO_ORDENANCA[o],
    tom: "neutro" as const,
  })),
  { valor: "JARDINS", rotulo: "Só acompanha (jardins)", tom: "neutro" },
];

/**
 * Sem "Pendente": para quem está em "Precisam de atenção", apagar a ordenança
 * tiraria o aviso sem resolver nada — a pessoa só mudaria de quadrinho.
 */
export const OPCOES_ATIVIDADE_DEFINIDA = OPCOES_ATIVIDADE.filter((o) => o.valor !== null);

export const OPCOES_RECOMENDACAO: OpcaoDeChip<StatusRecomendacao | null>[] = [
  { valor: null, rotulo: "Pendente", tom: "atencao" },
  { valor: "VALIDA", rotulo: ROTULO_STATUS_RECOMENDACAO.VALIDA, tom: "positivo" },
  { valor: "VENCIDA", rotulo: ROTULO_STATUS_RECOMENDACAO.VENCIDA, tom: "critico" },
  { valor: "NAO_POSSUI", rotulo: ROTULO_STATUS_RECOMENDACAO.NAO_POSSUI, tom: "critico" },
  {
    valor: "NAO_SE_APLICA",
    rotulo: ROTULO_STATUS_RECOMENDACAO.NAO_SE_APLICA,
    tom: "neutro",
  },
];

export const OPCOES_AGENDAMENTO: OpcaoDeChip<StatusSimples | null>[] = [
  { valor: null, rotulo: "Pendente", tom: "atencao" },
  { valor: "SIM", rotulo: ROTULO_STATUS_SIMPLES.SIM, tom: "positivo" },
  { valor: "NAO", rotulo: ROTULO_STATUS_SIMPLES.NAO, tom: "atencao" },
  { valor: "NAO_SE_APLICA", rotulo: ROTULO_STATUS_SIMPLES.NAO_SE_APLICA, tom: "neutro" },
];

export const OPCOES_NOMES: OpcaoDeChip<NomesDeFamilia | null>[] = [
  { valor: null, rotulo: "Pendente", tom: "atencao" },
  {
    valor: "PROPRIOS_PRONTOS",
    rotulo: ROTULO_NOMES_FAMILIA.PROPRIOS_PRONTOS,
    tom: "positivo",
  },
  {
    valor: "USARA_NOMES_DO_TEMPLO",
    rotulo: ROTULO_NOMES_FAMILIA.USARA_NOMES_DO_TEMPLO,
    tom: "neutro",
  },
  {
    valor: "PRECISA_DE_AJUDA",
    rotulo: ROTULO_NOMES_FAMILIA.PRECISA_DE_AJUDA,
    tom: "atencao",
  },
];

export const OPCOES_PAGAMENTO: OpcaoDeChip<StatusPagamento>[] = [
  { valor: "PENDENTE", rotulo: ROTULO_PAGAMENTO.PENDENTE, tom: "atencao" },
  { valor: "PAGO", rotulo: ROTULO_PAGAMENTO.PAGO, tom: "positivo" },
  { valor: "ISENTO", rotulo: ROTULO_PAGAMENTO.ISENTO, tom: "neutro" },
  { valor: "BENEFICIO_AREA", rotulo: ROTULO_PAGAMENTO.BENEFICIO_AREA, tom: "neutro" },
];

// --- Chips individuais --------------------------------------------------------

type Props = { inscrito: InscritoSerializado };

type CampoSimples =
  | "recomendacaoStatus"
  | "agendamentoStatus"
  | "nomesDeFamilia"
  | "pagamentoStatus";

function salvarCampo(inscricaoId: string, campo: CampoSimples) {
  return async (valor: unknown) => {
    await atualizarCampoDaInscricao({ inscricaoId, campo, valor });
  };
}

/** Ordenança — ou "só acompanha nos jardins", para quem não entra no templo. */
export function ChipAtividade({
  inscrito,
  opcoes = OPCOES_ATIVIDADE,
}: Props & { opcoes?: OpcaoDeChip<AtividadeNoTemplo>[] }) {
  const valor = atividadeDaInscricao(inscrito);
  return (
    <ChipDeStatus
      key={String(valor)}
      rotuloDoCampo="Ordenança"
      valor={valor}
      opcoes={opcoes}
      aoMudar={async (atividade) => {
        const { acompanhadosDesfeitos } = await definirAtividadeNoTemplo({
          inscricaoId: inscrito.id,
          atividade,
        });
        if (acompanhadosDesfeitos.length > 0) {
          toast.warning(
            `${inscrito.membro.nomeCompleto} vai ficar nos jardins e deixou de ser acompanhante de ${acompanhadosDesfeitos.join(", ")}. Escolha outro acompanhante em Preparação.`,
            { duration: 10000 },
          );
        }
      }}
    />
  );
}

export function ChipRecomendacao({ inscrito }: Props) {
  return (
    <ChipDeStatus
      key={String(inscrito.recomendacaoStatus)}
      rotuloDoCampo="Recomendação"
      valor={inscrito.recomendacaoStatus}
      opcoes={OPCOES_RECOMENDACAO}
      aoMudar={salvarCampo(inscrito.id, "recomendacaoStatus")}
    />
  );
}

export function ChipAgendamento({ inscrito }: Props) {
  return (
    <ChipDeStatus
      key={String(inscrito.agendamentoStatus)}
      rotuloDoCampo="Agendamento"
      valor={inscrito.agendamentoStatus}
      opcoes={OPCOES_AGENDAMENTO}
      aoMudar={salvarCampo(inscrito.id, "agendamentoStatus")}
    />
  );
}

export function ChipNomes({ inscrito }: Props) {
  return (
    <ChipDeStatus
      key={String(inscrito.nomesDeFamilia)}
      rotuloDoCampo="Nomes"
      valor={inscrito.nomesDeFamilia}
      opcoes={OPCOES_NOMES}
      aoMudar={salvarCampo(inscrito.id, "nomesDeFamilia")}
    />
  );
}

export function ChipPagamento({ inscrito }: Props) {
  return (
    <ChipDeStatus
      key={inscrito.pagamentoStatus}
      rotuloDoCampo="Pagamento"
      valor={inscrito.pagamentoStatus}
      opcoes={OPCOES_PAGAMENTO}
      aoMudar={salvarCampo(inscrito.id, "pagamentoStatus")}
    />
  );
}

/**
 * Todos os chips da inscrição. Quem só acompanha nos jardins não entra no
 * templo: recomendação, agendamento e nomes não se aplicam, então somem.
 */
export function ChipsDaInscricao({ inscrito }: Props) {
  const nosJardins = inscrito.participacao === "ACOMPANHANTE_JARDINS";

  return (
    <div className="flex flex-wrap gap-1.5">
      <ChipAtividade inscrito={inscrito} />
      {nosJardins ? null : (
        <>
          <ChipRecomendacao inscrito={inscrito} />
          <ChipAgendamento inscrito={inscrito} />
          <ChipNomes inscrito={inscrito} />
        </>
      )}
      <ChipPagamento inscrito={inscrito} />
    </div>
  );
}
