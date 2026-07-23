import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { filtroDeMembrosVisiveis, usuarioAtual } from "@/lib/autorizacao";
import { podeEditarCaravanaDe } from "@/lib/permissoes";
import { InscreverMembros } from "@/components/inscrever-membros";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Inscrever membros" };

export default async function PaginaDeInscricao({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ator = await usuarioAtual();
  if (!ator) return null;

  const caravana = await prisma.caravana.findUnique({
    where: { id },
    select: {
      id: true,
      titulo: true,
      capacidadeAssentos: true,
      unidadeOrganizadoraId: true,
      inscricoes: { select: { membroId: true } },
      _count: { select: { inscricoes: { where: { situacao: "CONFIRMADA" } } } },
    },
  });

  if (!caravana) notFound();
  if (!podeEditarCaravanaDe(ator, caravana)) redirect(`/caravanas/${id}`);

  const jaInscritos = new Set(caravana.inscricoes.map((i) => i.membroId));

  const membros = await prisma.membro.findMany({
    where: { ...filtroDeMembrosVisiveis(ator), ativo: true },
    orderBy: { nomeCompleto: "asc" },
    select: {
      id: true,
      nomeCompleto: true,
      apelido: true,
      organizacao: true,
      unidade: { select: { nome: true } },
    },
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
        <h1 className="text-2xl font-semibold">Inscrever em {caravana.titulo}</h1>
      </div>

      <InscreverMembros
        caravanaId={caravana.id}
        vagasRestantes={Math.max(
          0,
          caravana.capacidadeAssentos - caravana._count.inscricoes,
        )}
        candidatos={membros.map((m) => ({
          id: m.id,
          nomeCompleto: m.nomeCompleto,
          apelido: m.apelido,
          organizacao: m.organizacao,
          unidadeNome: m.unidade.nome,
          jaInscrito: jaInscritos.has(m.id),
        }))}
      />
    </div>
  );
}
