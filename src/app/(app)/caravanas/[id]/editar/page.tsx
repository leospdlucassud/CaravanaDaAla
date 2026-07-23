import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { FormularioDeCaravana } from "@/components/formulario-de-caravana";

export const metadata: Metadata = { title: "Editar caravana" };

/** Data para o input[type=date], sempre em UTC para não escorregar um dia. */
function paraCampoDeData(data: Date): string {
  return data.toISOString().slice(0, 10);
}

export default async function PaginaEditarCaravana({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const caravana = await prisma.caravana.findUnique({ where: { id } });
  if (!caravana) notFound();

  const unidades = await prisma.unidade.findMany({
    orderBy: [{ ehPropria: "desc" }, { nome: "asc" }],
    select: { id: true, nome: true },
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold">Editar caravana</h1>
      <FormularioDeCaravana
        unidades={unidades}
        caravanaId={caravana.id}
        valoresIniciais={{
          titulo: caravana.titulo,
          data: paraCampoDeData(caravana.data),
          templo: caravana.templo,
          unidadeOrganizadoraId: caravana.unidadeOrganizadoraId,
          responsavel: caravana.responsavel ?? "",
          horaSaida: caravana.horaSaida ?? "",
          horaRetornoPrevista: caravana.horaRetornoPrevista ?? "",
          pontoEncontro: caravana.pontoEncontro ?? "",
          capacidadeAssentos: String(caravana.capacidadeAssentos),
          valorPorPessoa: caravana.valorPorPessoa?.toString() ?? "",
          custoTotalTransporte: caravana.custoTotalTransporte?.toString() ?? "",
          status: caravana.status,
          observacoes: caravana.observacoes ?? "",
        }}
      />
    </div>
  );
}
