import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { FormularioDeCaravana } from "@/components/formulario-de-caravana";
import { PrimeiraUnidade } from "@/components/primeira-unidade";

export const metadata: Metadata = { title: "Nova caravana" };

export default async function PaginaNovaCaravana() {
  const unidades = await prisma.unidade.findMany({
    orderBy: [{ ehPropria: "desc" }, { nome: "asc" }],
    select: { id: true, nome: true },
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold">Nova caravana</h1>
      {unidades.length === 0 ? (
        <PrimeiraUnidade />
      ) : (
        <FormularioDeCaravana unidades={unidades} />
      )}
    </div>
  );
}
