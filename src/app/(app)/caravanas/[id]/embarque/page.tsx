import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { ListaDeEmbarque } from "@/components/lista-de-embarque";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Embarque" };

export default async function PaginaDeEmbarque({
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
          ordem: true,
          checkinIda: true,
          checkinVolta: true,
          membro: {
            select: { nomeCompleto: true, organizacao: true, telefone: true },
          },
        },
      },
    },
  });

  if (!caravana) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="space-y-2">
        <Button asChild variant="ghost" className="-ml-3 min-h-11">
          <Link href={`/caravanas/${caravana.id}`}>
            <ArrowLeft className="size-4" aria-hidden="true" />
            Voltar para a caravana
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold">Embarque</h1>
        <p className="text-muted-foreground">
          Toque no nome para marcar quem está no ônibus. Confira a volta antes de
          sair do templo.
        </p>
      </div>

      <ListaDeEmbarque
        pessoas={caravana.inscricoes.map((i) => ({
          id: i.id,
          ordem: i.ordem,
          nomeCompleto: i.membro.nomeCompleto,
          organizacao: i.membro.organizacao,
          telefone: i.membro.telefone,
          presenteIda: i.checkinIda !== null,
          presenteVolta: i.checkinVolta !== null,
        }))}
      />
    </div>
  );
}
