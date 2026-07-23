import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { usuarioAtual } from "@/lib/autorizacao";
import { podeEditarMembroDe, podeVerMembroDe } from "@/lib/permissoes";
import { ROTULO_ORDENANCA, ROTULO_SITUACAO } from "@/lib/dominio";
import { FormularioDeMembro } from "@/components/formulario-de-membro";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Ficha do membro" };

function paraCampoDeData(data: Date | null): string {
  return data ? data.toISOString().slice(0, 10) : "";
}

export default async function PaginaDoMembro({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ator = await usuarioAtual();
  if (!ator) return null;

  const membro = await prisma.membro.findUnique({
    where: { id },
    include: {
      unidade: { select: { nome: true } },
      inscricoes: {
        orderBy: { caravana: { data: "desc" } },
        include: {
          caravana: { select: { id: true, titulo: true, data: true, templo: true } },
        },
      },
    },
  });

  if (!membro) notFound();
  if (!podeVerMembroDe(ator, membro)) redirect("/membros");

  const unidades = await prisma.unidade.findMany({
    orderBy: [{ ehPropria: "desc" }, { nome: "asc" }],
    select: { id: true, nome: true },
  });

  const editavel = podeEditarMembroDe(ator, membro);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{membro.nomeCompleto}</h1>
        <p className="text-muted-foreground text-sm">
          {membro.unidade.nome}
          {membro.anonimizadoEm ? " · registro anonimizado" : ""}
        </p>
      </div>

      {editavel ? (
        <FormularioDeMembro
          unidades={unidades}
          membroId={membro.id}
          valoresIniciais={{
            nomeCompleto: membro.nomeCompleto,
            apelido: membro.apelido ?? "",
            unidadeId: membro.unidadeId,
            organizacao: membro.organizacao ?? "",
            tipoVinculo: membro.tipoVinculo,
            sexo: membro.sexo ?? "",
            anoNascimento: membro.anoNascimento?.toString() ?? "",
            telefone: membro.telefone ?? "",
            recemConverso: membro.recemConverso,
            ehInvestido: membro.ehInvestido,
            recomendacaoTipo: membro.recomendacaoTipo,
            recomendacaoValidaAte: paraCampoDeData(membro.recomendacaoValidaAte),
            observacoes: membro.observacoes ?? "",
          }}
        />
      ) : (
        <Card>
          <CardContent className="text-muted-foreground p-4">
            Você tem acesso apenas de leitura a esta ficha.
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Histórico de caravanas</CardTitle>
        </CardHeader>
        <CardContent>
          {membro.inscricoes.length === 0 ? (
            <p className="text-muted-foreground">
              Ainda não participou de nenhuma caravana.
            </p>
          ) : (
            <ul className="divide-y">
              {membro.inscricoes.map((inscricao) => (
                <li
                  key={inscricao.id}
                  className="flex flex-wrap items-center justify-between gap-2 py-3"
                >
                  <div>
                    <Link
                      href={`/caravanas/${inscricao.caravana.id}`}
                      className="font-medium hover:underline"
                    >
                      {inscricao.caravana.titulo}
                    </Link>
                    <p className="text-muted-foreground text-sm">
                      {new Intl.DateTimeFormat("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        timeZone: "UTC",
                      }).format(inscricao.caravana.data)}{" "}
                      · Templo de {inscricao.caravana.templo}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {inscricao.ordenanca ? (
                      <Badge variant="outline">
                        {ROTULO_ORDENANCA[inscricao.ordenanca]}
                      </Badge>
                    ) : null}
                    <Badge variant="secondary">
                      {ROTULO_SITUACAO[inscricao.situacao]}
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
