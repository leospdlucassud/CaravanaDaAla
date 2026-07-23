import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { usuarioAtual } from "@/lib/autorizacao";
import { podeOrganizar } from "@/lib/permissoes";
import { FormularioDeCaravana } from "@/components/formulario-de-caravana";

export const metadata: Metadata = { title: "Nova caravana" };

export default async function PaginaNovaCaravana() {
  const ator = await usuarioAtual();
  if (!ator) return null;
  if (!podeOrganizar(ator)) redirect("/");

  const unidades = await prisma.unidade.findMany({
    orderBy: [{ ehPropria: "desc" }, { nome: "asc" }],
    select: { id: true, nome: true },
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold">Nova caravana</h1>
      <FormularioDeCaravana unidades={unidades} />
    </div>
  );
}
