import Link from "next/link";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { ListaDeCaravanas } from "@/components/lista-de-caravanas";

export default async function PaginaDeCaravanas() {
  const caravanas = await prisma.caravana.findMany({
    orderBy: { data: "desc" },
    select: {
      id: true,
      titulo: true,
      data: true,
      templo: true,
      status: true,
      capacidadeAssentos: true,
      _count: { select: { inscricoes: { where: { situacao: "CONFIRMADA" } } } },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Caravanas</h1>
        <Button asChild className="min-h-11">
          <Link href="/caravanas/nova">
            <Plus className="size-4" aria-hidden="true" />
            Nova caravana
          </Link>
        </Button>
      </div>

      {caravanas.length === 0 ? (
        <div className="text-muted-foreground rounded-lg border py-12 text-center">
          <p className="mb-4">Nenhuma caravana cadastrada ainda.</p>
          <Button asChild variant="outline" className="min-h-11">
            <Link href="/caravanas/nova">Criar a primeira caravana</Link>
          </Button>
        </div>
      ) : (
        <ListaDeCaravanas
          caravanas={caravanas.map((c) => ({
            id: c.id,
            titulo: c.titulo,
            dataISO: c.data.toISOString(),
            templo: c.templo,
            status: c.status,
            capacidadeAssentos: c.capacidadeAssentos,
            ocupados: c._count.inscricoes,
          }))}
        />
      )}
    </div>
  );
}
