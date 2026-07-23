import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { montarRelatorio, resumirFinanceiro } from "@/lib/financeiro";
import { PainelFinanceiro } from "@/components/painel-financeiro";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Financeiro" };

/** Decimal do Prisma não atravessa para o cliente: vira número aqui. */
const paraNumero = (valor: { toString(): string } | null) =>
  valor === null ? null : Number(valor.toString());

export default async function PaginaFinanceira({
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
      custoTotalTransporte: true,
      valorPorPessoa: true,
      inscricoes: {
        orderBy: { ordem: "asc" },
        select: {
          id: true,
          situacao: true,
          pagamentoStatus: true,
          valorPago: true,
          valorBeneficioArea: true,
          membro: { select: { nomeCompleto: true } },
        },
      },
    },
  });

  if (!caravana) notFound();

  const itens = caravana.inscricoes.map((i) => ({
    pagamentoStatus: i.pagamentoStatus,
    valorPago: paraNumero(i.valorPago),
    valorBeneficioArea: paraNumero(i.valorBeneficioArea),
    situacao: i.situacao,
  }));

  const resumo = resumirFinanceiro(itens, {
    custoTotalTransporte: paraNumero(caravana.custoTotalTransporte),
    valorPorPessoa: paraNumero(caravana.valorPorPessoa),
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="space-y-2">
        <Button asChild variant="ghost" className="-ml-3 min-h-11">
          <Link href={`/caravanas/${caravana.id}`}>
            <ArrowLeft className="size-4" aria-hidden="true" />
            Voltar para a caravana
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold">Financeiro</h1>
      </div>

      <PainelFinanceiro
        resumo={resumo}
        relatorio={montarRelatorio(caravana, resumo)}
        linhas={caravana.inscricoes
          .filter((i) => i.situacao === "CONFIRMADA")
          .map((i) => ({
            id: i.id,
            nome: i.membro.nomeCompleto,
            pagamentoStatus: i.pagamentoStatus,
            valorPago: paraNumero(i.valorPago),
            valorBeneficioArea: paraNumero(i.valorBeneficioArea),
          }))}
      />
    </div>
  );
}
