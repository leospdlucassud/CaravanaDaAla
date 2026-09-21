import type { Aviso } from "@/lib/dominio";
import type {
  NomesDeFamilia,
  Ordenanca,
  Organizacao,
  RecomendacaoTipo,
  SituacaoInscricao,
  StatusPagamento,
  StatusRecomendacao,
  StatusSimples,
  TipoParticipacao,
  TipoVinculo,
} from "@/generated/prisma/enums";

/**
 * Inscrição do jeito que chega às telas cliente: só dados simples (sem Date,
 * sem Decimal), para poder atravessar do servidor para o navegador.
 */
export type InscritoSerializado = {
  id: string;
  ordem: number;
  posicaoFila: number | null;
  situacao: SituacaoInscricao;
  participacao: TipoParticipacao;
  ordenanca: Ordenanca | null;
  recomendacaoStatus: StatusRecomendacao | null;
  agendamentoStatus: StatusSimples | null;
  nomesDeFamilia: NomesDeFamilia | null;
  pagamentoStatus: StatusPagamento;
  avisos: Aviso[];
  membro: {
    id: string;
    nomeCompleto: string;
    apelido: string | null;
    organizacao: Organizacao | null;
    unidadeNome: string;
    ehDeOutraUnidade: boolean;
    tipoVinculo: TipoVinculo;
    recemConverso: boolean;
    /**
     * Da ficha do membro — só o tipo e a data impressa na recomendação. Usados
     * para resolver avisos direto no diálogo, sem sair da caravana.
     */
    recomendacaoTipo: RecomendacaoTipo;
    /** AAAA-MM-DD, ou nulo quando não há data registrada. */
    recomendacaoValidaAte: string | null;
  };
};
