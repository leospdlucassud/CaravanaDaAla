import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import {
  PainelDePreparacao,
  type PessoaComChecklist,
  type PessoaQuePrecisaAcompanhante,
} from "@/components/painel-de-preparacao";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Preparação" };

const CHECKLIST_VAZIO = {
  requisitosVerificadosPeloBispo: false,
  entrevistaBispoFeita: false,
  entrevistaEstacaFeita: false,
  agendamentoProprioFeito: false,
  roupasDoTemploProvidenciadas: false,
  acompanhanteDesignado: false,
  orientacaoRecebida: false,
};

export default async function PaginaDePreparacao({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const caravana = await prisma.caravana.findUnique({
    where: { id },
    select: {
      id: true,
      titulo: true,
      inscricoes: {
        where: { situacao: "CONFIRMADA" },
        orderBy: { ordem: "asc" },
        select: {
          id: true,
          ordenanca: true,
          acompanhanteId: true,
          checklistPrimeiraInvestidura: true,
          membro: {
            select: {
              nomeCompleto: true,
              sexo: true,
              ehInvestido: true,
              recemConverso: true,
            },
          },
        },
      },
    },
  });

  if (!caravana) notFound();

  const primeirasInvestiduras: PessoaComChecklist[] = caravana.inscricoes
    .filter((i) => i.ordenanca === "PRIMEIRA_INVESTIDURA")
    .map((i) => ({
      inscricaoId: i.id,
      nome: i.membro.nomeCompleto,
      checklist: i.checklistPrimeiraInvestidura
        ? {
            requisitosVerificadosPeloBispo:
              i.checklistPrimeiraInvestidura.requisitosVerificadosPeloBispo,
            entrevistaBispoFeita: i.checklistPrimeiraInvestidura.entrevistaBispoFeita,
            entrevistaEstacaFeita: i.checklistPrimeiraInvestidura.entrevistaEstacaFeita,
            agendamentoProprioFeito:
              i.checklistPrimeiraInvestidura.agendamentoProprioFeito,
            roupasDoTemploProvidenciadas:
              i.checklistPrimeiraInvestidura.roupasDoTemploProvidenciadas,
            acompanhanteDesignado:
              i.checklistPrimeiraInvestidura.acompanhanteDesignado,
            orientacaoRecebida: i.checklistPrimeiraInvestidura.orientacaoRecebida,
          }
        : CHECKLIST_VAZIO,
    }));

  // Quem o Manual manda acompanhar: primeira investidura (27.2.3.3) e
  // recém-convertidos indo ao batistério (cap. 28).
  const semAcompanhante: PessoaQuePrecisaAcompanhante[] = caravana.inscricoes
    .filter((i) => {
      if (i.acompanhanteId) return false;
      if (i.ordenanca === "PRIMEIRA_INVESTIDURA") return true;
      return i.membro.recemConverso && i.ordenanca === "BATISTERIO";
    })
    .map((i) => ({
      inscricaoId: i.id,
      nome: i.membro.nomeCompleto,
      motivo:
        i.ordenanca === "PRIMEIRA_INVESTIDURA"
          ? "Primeira investidura: acompanhante do mesmo sexo, já investido e com recomendação válida."
          : "Recém-converso indo ao batistério.",
      acompanhanteId: null,
      candidatos: caravana.inscricoes
        .filter(
          (candidato) =>
            candidato.id !== i.id &&
            // Mesmo sexo, como o Manual pede; se o sexo não foi informado,
            // aparece mesmo assim — é sugestão, não trava.
            (!i.membro.sexo ||
              !candidato.membro.sexo ||
              candidato.membro.sexo === i.membro.sexo) &&
            (i.ordenanca !== "PRIMEIRA_INVESTIDURA" || candidato.membro.ehInvestido),
        )
        .map((candidato) => ({
          id: candidato.id,
          nome: candidato.membro.nomeCompleto,
        })),
    }));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="space-y-2">
        <Button asChild variant="ghost" className="-ml-3 min-h-11">
          <Link href={`/caravanas/${caravana.id}`}>
            <ArrowLeft className="size-4" aria-hidden="true" />
            Voltar para a caravana
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold">Preparação</h1>
      </div>

      <PainelDePreparacao
        primeirasInvestiduras={primeirasInvestiduras}
        semAcompanhante={semAcompanhante}
      />
    </div>
  );
}
