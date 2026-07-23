import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { FormularioDeMembro } from "@/components/formulario-de-membro";
import { PrimeiraUnidade } from "@/components/primeira-unidade";

export const metadata: Metadata = { title: "Novo membro" };

export default async function PaginaNovoMembro() {
  const unidades = await prisma.unidade.findMany({
    orderBy: [{ ehPropria: "desc" }, { nome: "asc" }],
    select: { id: true, nome: true },
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold">Novo membro</h1>
      {unidades.length === 0 ? (
        <PrimeiraUnidade />
      ) : (
        <FormularioDeMembro unidades={unidades} />
      )}
    </div>
  );
}
