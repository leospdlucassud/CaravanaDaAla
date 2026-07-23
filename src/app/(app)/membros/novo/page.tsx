import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { usuarioAtual } from "@/lib/autorizacao";
import { FormularioDeMembro } from "@/components/formulario-de-membro";

export const metadata: Metadata = { title: "Novo membro" };

export default async function PaginaNovoMembro() {
  const ator = await usuarioAtual();
  if (!ator) return null;
  if (ator.papel === "VISUALIZADOR") redirect("/membros");

  const unidades = await prisma.unidade.findMany({
    orderBy: [{ ehPropria: "desc" }, { nome: "asc" }],
    select: { id: true, nome: true },
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold">Novo membro</h1>
      <FormularioDeMembro
        unidades={unidades}
        valoresIniciais={{
          unidadeId: ator.unidadeId ?? unidades[0]?.id ?? "",
          organizacao: ator.organizacaoEscopo ?? "",
        }}
      />
    </div>
  );
}
