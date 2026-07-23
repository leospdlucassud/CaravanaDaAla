"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Search, TriangleAlert } from "lucide-react";
import { atualizarCampoDaInscricao } from "@/app/acoes/inscricoes";
import { AcoesDaInscricao } from "@/components/acoes-da-inscricao";
import { ChipDeStatus, type OpcaoDeChip } from "@/components/chip-de-status";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ROTULO_NOMES_FAMILIA,
  ROTULO_ORDENANCA,
  ROTULO_ORGANIZACAO_CURTO,
  ROTULO_PAGAMENTO,
  ROTULO_STATUS_RECOMENDACAO,
  ROTULO_STATUS_SIMPLES,
} from "@/lib/dominio";
import { normalizarNome } from "@/lib/normalizar";
import { cn } from "@/lib/utils";
import type { Aviso } from "@/lib/dominio";
import type {
  NomesDeFamilia,
  Ordenanca,
  Organizacao,
  SituacaoInscricao,
  StatusPagamento,
  StatusRecomendacao,
  StatusSimples,
  TipoParticipacao,
} from "@/generated/prisma/enums";

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
    tipoVinculo: "MEMBRO" | "PESQUISADOR" | "CONVIDADO";
    recemConverso: boolean;
  };
};

// --- Opções dos chips ------------------------------------------------------

const OPCOES_ORDENANCA: OpcaoDeChip<Ordenanca | null>[] = [
  { valor: null, rotulo: "Pendente", tom: "atencao" },
  ...(Object.keys(ROTULO_ORDENANCA) as Ordenanca[]).map((o) => ({
    valor: o,
    rotulo: ROTULO_ORDENANCA[o],
    tom: "neutro" as const,
  })),
];

const OPCOES_RECOMENDACAO: OpcaoDeChip<StatusRecomendacao | null>[] = [
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

const OPCOES_AGENDAMENTO: OpcaoDeChip<StatusSimples | null>[] = [
  { valor: null, rotulo: "Pendente", tom: "atencao" },
  { valor: "SIM", rotulo: ROTULO_STATUS_SIMPLES.SIM, tom: "positivo" },
  { valor: "NAO", rotulo: ROTULO_STATUS_SIMPLES.NAO, tom: "atencao" },
  { valor: "NAO_SE_APLICA", rotulo: ROTULO_STATUS_SIMPLES.NAO_SE_APLICA, tom: "neutro" },
];

const OPCOES_NOMES: OpcaoDeChip<NomesDeFamilia | null>[] = [
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

const OPCOES_PAGAMENTO: OpcaoDeChip<StatusPagamento>[] = [
  { valor: "PENDENTE", rotulo: ROTULO_PAGAMENTO.PENDENTE, tom: "atencao" },
  { valor: "PAGO", rotulo: ROTULO_PAGAMENTO.PAGO, tom: "positivo" },
  { valor: "ISENTO", rotulo: ROTULO_PAGAMENTO.ISENTO, tom: "neutro" },
  { valor: "BENEFICIO_AREA", rotulo: ROTULO_PAGAMENTO.BENEFICIO_AREA, tom: "neutro" },
];

// --- Chips de uma inscrição ------------------------------------------------

function ChipsDaInscricao({ inscrito }: { inscrito: InscritoSerializado }) {
  const salvar =
    <T,>(campo: string) =>
    async (valor: T) => {
      await atualizarCampoDaInscricao({
        inscricaoId: inscrito.id,
        campo: campo as never,
        valor,
      });
    };

  const nosJardins = inscrito.participacao === "ACOMPANHANTE_JARDINS";

  return (
    <div className="flex flex-wrap gap-1.5">
      {nosJardins ? (
        <Badge variant="outline" className="min-h-11 rounded-full px-3">
          Acompanha nos jardins
        </Badge>
      ) : (
        <>
          <ChipDeStatus
            rotuloDoCampo="Ordenança"
            valor={inscrito.ordenanca}
            opcoes={OPCOES_ORDENANCA}
            aoMudar={salvar<Ordenanca | null>("ordenanca")}
          />

          <ChipDeStatus
            rotuloDoCampo="Recomendação"
            valor={inscrito.recomendacaoStatus}
            opcoes={OPCOES_RECOMENDACAO}
            aoMudar={salvar<StatusRecomendacao | null>("recomendacaoStatus")}
          />

          <ChipDeStatus
            rotuloDoCampo="Agendamento"
            valor={inscrito.agendamentoStatus}
            opcoes={OPCOES_AGENDAMENTO}
            aoMudar={salvar<StatusSimples | null>("agendamentoStatus")}
          />

          <ChipDeStatus
            rotuloDoCampo="Nomes"
            valor={inscrito.nomesDeFamilia}
            opcoes={OPCOES_NOMES}
            aoMudar={salvar<NomesDeFamilia | null>("nomesDeFamilia")}
          />
        </>
      )}

      <ChipDeStatus
        rotuloDoCampo="Pagamento"
        valor={inscrito.pagamentoStatus}
        opcoes={OPCOES_PAGAMENTO}
        aoMudar={salvar<StatusPagamento>("pagamentoStatus")}
      />
    </div>
  );
}

function IdentificacaoDoMembro({ inscrito }: { inscrito: InscritoSerializado }) {
  const { membro } = inscrito;
  return (
    <div className="min-w-0">
      <p className="truncate font-medium">
        {membro.nomeCompleto}
        {membro.apelido ? (
          <span className="text-muted-foreground font-normal"> ({membro.apelido})</span>
        ) : null}
      </p>
      <p className="text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm">
        {membro.organizacao ? (
          <span>{ROTULO_ORGANIZACAO_CURTO[membro.organizacao]}</span>
        ) : (
          <span className="italic">sem organização</span>
        )}
        {membro.recemConverso ? <span>· Recém-converso</span> : null}
        {membro.tipoVinculo === "PESQUISADOR" ? <span>· Pesquisador</span> : null}
        {membro.ehDeOutraUnidade ? <span>· {membro.unidadeNome}</span> : null}
      </p>
    </div>
  );
}

function Avisos({ avisos }: { avisos: Aviso[] }) {
  if (avisos.length === 0) return null;
  return (
    <ul className="space-y-1">
      {avisos.map((aviso) => (
        <li
          key={aviso.codigo}
          className={cn(
            "flex items-start gap-1.5 text-sm",
            aviso.gravidade === "alta"
              ? "text-red-700 dark:text-red-300"
              : "text-amber-700 dark:text-amber-300",
          )}
        >
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>{aviso.texto}</span>
        </li>
      ))}
    </ul>
  );
}

// --- Lista -----------------------------------------------------------------

type Filtro = "todos" | "pendencias" | "avisos";

export function ListaDeInscritos({
  inscritos,
  titulo,
  vazio,
}: {
  inscritos: InscritoSerializado[];
  titulo: string;
  vazio: string;
}) {
  const [busca, setBusca] = useState("");
  const [organizacao, setOrganizacao] = useState<Organizacao | "todas">("todas");
  const [filtro, setFiltro] = useState<Filtro>("todos");

  const visiveis = useMemo(() => {
    const buscaNormalizada = normalizarNome(busca);

    return inscritos.filter((inscrito) => {
      if (
        buscaNormalizada &&
        !normalizarNome(inscrito.membro.nomeCompleto).includes(buscaNormalizada)
      ) {
        return false;
      }

      if (organizacao !== "todas" && inscrito.membro.organizacao !== organizacao) {
        return false;
      }

      if (filtro === "avisos") return inscrito.avisos.length > 0;

      if (filtro === "pendencias") {
        if (inscrito.participacao === "ACOMPANHANTE_JARDINS") {
          return inscrito.pagamentoStatus === "PENDENTE";
        }
        return (
          inscrito.ordenanca === null ||
          inscrito.recomendacaoStatus === null ||
          inscrito.agendamentoStatus === null ||
          inscrito.nomesDeFamilia === null ||
          inscrito.pagamentoStatus === "PENDENTE"
        );
      }

      return true;
    });
  }, [inscritos, busca, organizacao, filtro]);

  const organizacoesPresentes = useMemo(() => {
    const presentes = new Set<Organizacao>();
    for (const i of inscritos) if (i.membro.organizacao) presentes.add(i.membro.organizacao);
    return [...presentes];
  }, [inscritos]);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 className="text-lg font-semibold">
          {titulo}{" "}
          <span className="text-muted-foreground font-normal">
            ({visiveis.length}
            {visiveis.length !== inscritos.length ? ` de ${inscritos.length}` : ""})
          </span>
        </h2>
      </div>

      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
        <div className="relative">
          <Label htmlFor="busca-inscritos" className="sr-only">
            Buscar por nome
          </Label>
          <Search
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
            aria-hidden="true"
          />
          <Input
            id="busca-inscritos"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome"
            className="h-11 pl-9"
            type="search"
          />
        </div>

        <div>
          <Label htmlFor="filtro-organizacao" className="sr-only">
            Filtrar por organização
          </Label>
          <select
            id="filtro-organizacao"
            value={organizacao}
            onChange={(e) => setOrganizacao(e.target.value as Organizacao | "todas")}
            className="border-input bg-background h-11 w-full rounded-md border px-3 text-sm"
          >
            <option value="todas">Todas as organizações</option>
            {organizacoesPresentes.map((o) => (
              <option key={o} value={o}>
                {ROTULO_ORGANIZACAO_CURTO[o]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <Label htmlFor="filtro-pendencias" className="sr-only">
            Filtrar por situação
          </Label>
          <select
            id="filtro-pendencias"
            value={filtro}
            onChange={(e) => setFiltro(e.target.value as Filtro)}
            className="border-input bg-background h-11 w-full rounded-md border px-3 text-sm"
          >
            <option value="todos">Mostrar todos</option>
            <option value="pendencias">Só quem tem pendência</option>
            <option value="avisos">Só quem tem aviso</option>
          </select>
        </div>
      </div>

      {visiveis.length === 0 ? (
        <p className="text-muted-foreground rounded-lg border border-dashed py-10 text-center">
          {inscritos.length === 0 ? vazio : "Nada corresponde a esses filtros."}
        </p>
      ) : (
        <ul className="space-y-3">
          {visiveis.map((inscrito) => (
            <li
              key={inscrito.id}
              className={cn(
                "bg-card rounded-lg border p-3 sm:p-4",
                inscrito.avisos.some((a) => a.gravidade === "alta") &&
                  "border-red-300 dark:border-red-900",
              )}
            >
              <div className="flex items-start gap-3">
                <span
                  className="bg-muted text-muted-foreground mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-medium tabular-nums"
                  aria-label={
                    inscrito.situacao === "FILA_ESPERA"
                      ? `Posição ${inscrito.posicaoFila} na fila de espera`
                      : `Inscrito número ${inscrito.ordem}`
                  }
                >
                  {inscrito.situacao === "FILA_ESPERA"
                    ? inscrito.posicaoFila
                    : inscrito.ordem}
                </span>

                <div className="min-w-0 flex-1 space-y-3">
                  <IdentificacaoDoMembro inscrito={inscrito} />
                  <ChipsDaInscricao inscrito={inscrito} />
                  <Avisos avisos={inscrito.avisos} />
                </div>

                <AcoesDaInscricao
                  inscricaoId={inscrito.id}
                  nome={inscrito.membro.nomeCompleto}
                  situacao={inscrito.situacao}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function AvisoDeListaVazia({ mensagem }: { mensagem: string }) {
  return (
    <p className="text-muted-foreground flex items-center gap-2 rounded-lg border border-dashed p-4">
      <AlertTriangle className="size-4" aria-hidden="true" />
      {mensagem}
    </p>
  );
}
