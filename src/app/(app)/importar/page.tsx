import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { usuarioAtual } from "@/lib/autorizacao";
import { podeImportarPlanilha } from "@/lib/permissoes";
import { Importador } from "@/components/importador";
import { PrimeiraUnidade } from "@/components/primeira-unidade";

export const metadata: Metadata = { title: "Importar planilha" };

export default async function PaginaDeImportacao() {
  const ator = await usuarioAtual();
  if (!ator) return null;
  if (!podeImportarPlanilha(ator)) redirect("/");

  const unidades = await prisma.unidade.findMany({
    orderBy: [{ ehPropria: "desc" }, { nome: "asc" }],
    select: { id: true, nome: true },
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Importar planilha</h1>
        <p className="text-muted-foreground mt-1">
          Traz a lista de uma caravana da planilha antiga para o app.
        </p>
      </div>

      {unidades.length === 0 ? <PrimeiraUnidade /> : <Importador unidades={unidades} />}
    </div>
  );
}
