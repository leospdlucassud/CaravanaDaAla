"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Search, TriangleAlert } from "lucide-react";
import { AcoesDaInscricao } from "@/components/acoes-da-inscricao";
import { ChipsDaInscricao } from "@/components/chips-da-inscricao";
import type { InscritoSerializado } from "@/components/inscrito-serializado";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ROTULO_ORGANIZACAO_CURTO, type Aviso } from "@/lib/dominio";
import { normalizarNome } from "@/lib/normalizar";
import { cn } from "@/lib/utils";
import type { Organizacao } from "@/generated/prisma/enums";

// O tipo mora em inscrito-serializado.ts; re-exportado para quem já importava
// daqui.
export type { InscritoSerializado };

// --- Identificação e avisos --------------------------------------------------

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
