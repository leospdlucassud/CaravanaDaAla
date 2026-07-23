import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import {
  linkDoWhatsApp,
  montarMensagem,
  primeiroNomeDe,
  type TipoDePendencia,
} from "@/lib/mensagens";
import {
  MensagensPorPendencia,
  type GrupoDeMensagens,
  type PessoaComMensagem,
} from "@/components/mensagens-por-pendencia";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Mensagens" };

const ORDEM_DAS_PENDENCIAS: TipoDePendencia[] = [
  "entrevista",
  "ordenanca",
  "agendamento",
  "nomes",
  "pagamento",
];

export default async function PaginaDeMensagens({
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
      data: true,
      templo: true,
      valorPorPessoa: true,
      inscricoes: {
        where: { situacao: "CONFIRMADA" },
        orderBy: { ordem: "asc" },
        select: {
          id: true,
          participacao: true,
          ordenanca: true,
          agendamentoStatus: true,
          nomesDeFamilia: true,
          pagamentoStatus: true,
          precisaAjudaEntrevista: true,
          membro: { select: { nomeCompleto: true, telefone: true } },
        },
      },
    },
  });

  if (!caravana) notFound();

  const dataFormatada = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(caravana.data);

  const valorPorPessoa = caravana.valorPorPessoa
    ? Number(caravana.valorPorPessoa.toString())
    : null;

  const grupos: GrupoDeMensagens[] = ORDEM_DAS_PENDENCIAS.map((tipo) => {
    const pessoas: PessoaComMensagem[] = caravana.inscricoes
      .filter((i) => {
        const nosJardins = i.participacao === "ACOMPANHANTE_JARDINS";
        switch (tipo) {
          case "entrevista":
            return i.precisaAjudaEntrevista;
          case "ordenanca":
            return !nosJardins && i.ordenanca === null;
          case "agendamento":
            return !nosJardins && i.agendamentoStatus === null;
          case "nomes":
            return !nosJardins && i.nomesDeFamilia === null;
          case "pagamento":
            return i.pagamentoStatus === "PENDENTE";
        }
      })
      .map((i) => {
        const mensagem = montarMensagem(tipo, {
          primeiroNome: primeiroNomeDe(i.membro.nomeCompleto),
          tituloDaCaravana: caravana.titulo,
          dataFormatada,
          templo: caravana.templo,
          valorPorPessoa,
          ordenanca: i.ordenanca,
        });

        return {
          inscricaoId: i.id,
          nome: i.membro.nomeCompleto,
          mensagem,
          link: linkDoWhatsApp(i.membro.telefone, mensagem),
        };
      });

    return { tipo, pessoas };
  }).filter((g) => g.pessoas.length > 0);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="space-y-2">
        <Button asChild variant="ghost" className="-ml-3 min-h-11">
          <Link href={`/caravanas/${caravana.id}`}>
            <ArrowLeft className="size-4" aria-hidden="true" />
            Voltar para a caravana
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold">Mensagens por pendência</h1>
        <p className="text-muted-foreground">
          O app não envia nada sozinho: ele escreve o texto e abre a conversa.
          Nenhuma mensagem menciona situação de recomendação.
        </p>
      </div>

      <MensagensPorPendencia grupos={grupos} />
    </div>
  );
}
