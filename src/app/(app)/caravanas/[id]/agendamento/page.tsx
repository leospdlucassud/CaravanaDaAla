import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import {
  ROTULO_ORDENANCA,
  exigeAgendamentoProprio,
  montarPedidoDeGrupo,
} from "@/lib/dominio";
import { montarTextoDoPedido, pendenciasDeAgendamentoProprio } from "@/lib/pedido";
import { PedidoDeAgendamento } from "@/components/pedido-de-agendamento";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Pedido de agendamento" };

export default async function PaginaDeAgendamento({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const caravana = await prisma.caravana.findUnique({
    where: { id },
    include: {
      unidadeOrganizadora: { select: { nome: true } },
      pedidoAgendamento: { include: { vagas: true } },
      inscricoes: {
        include: {
          membro: { select: { nomeCompleto: true, sexo: true } },
        },
      },
    },
  });

  if (!caravana) notFound();

  const linhas = montarPedidoDeGrupo(
    caravana.inscricoes.map((i) => ({
      participacao: i.participacao,
      ordenanca: i.ordenanca,
      sexo: i.membro.sexo,
      situacao: i.situacao,
    })),
  );

  const texto = montarTextoDoPedido(
    {
      unidade: caravana.unidadeOrganizadora.nome,
      templo: caravana.templo,
      data: caravana.data,
      horaSaida: caravana.horaSaida,
      responsavel: caravana.responsavel,
      totalDeAssentos: caravana.capacidadeAssentos,
    },
    linhas,
  );

  const proprias = pendenciasDeAgendamentoProprio(
    caravana.inscricoes
      .filter(
        (i) =>
          i.situacao === "CONFIRMADA" &&
          i.ordenanca !== null &&
          exigeAgendamentoProprio(i.ordenanca),
      )
      .map((i) => ({
        nome: i.membro.nomeCompleto,
        ordenanca: ROTULO_ORDENANCA[i.ordenanca!],
      })),
  );

  const semSexoInformado = linhas.reduce((s, l) => s + l.semSexoInformado, 0);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="space-y-2">
        <Button asChild variant="ghost" className="-ml-3 min-h-11">
          <Link href={`/caravanas/${caravana.id}`}>
            <ArrowLeft className="size-4" aria-hidden="true" />
            Voltar para a caravana
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold">Pedido de agendamento ao templo</h1>
      </div>

      <PedidoDeAgendamento
        caravanaId={caravana.id}
        texto={texto}
        linhas={linhas}
        ordenancasProprias={proprias}
        semSexoInformado={semSexoInformado}
        inicial={{
          canal: caravana.pedidoAgendamento?.canal ?? "EMAIL",
          enviado: Boolean(caravana.pedidoAgendamento?.enviadoEm),
          confirmado: Boolean(caravana.pedidoAgendamento?.confirmadoEm),
          referencia: caravana.pedidoAgendamento?.referencia ?? "",
          observacoes: caravana.pedidoAgendamento?.observacoes ?? "",
          vagas: Object.fromEntries(
            (caravana.pedidoAgendamento?.vagas ?? []).map((v) => [
              v.ordenanca,
              v.vagasConfirmadas,
            ]),
          ),
        }}
      />
    </div>
  );
}
