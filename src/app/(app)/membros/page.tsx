import type { Metadata } from "next";
import Link from "next/link";
import { Plus, TriangleAlert } from "lucide-react";
import { prisma } from "@/lib/prisma";
import {
  ROTULO_ORGANIZACAO_CURTO,
  ROTULO_RECOMENDACAO_TIPO,
  statusDaRecomendacao,
} from "@/lib/dominio";
import { normalizarNome } from "@/lib/normalizar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const metadata: Metadata = { title: "Membros" };

export default async function PaginaDeMembros({
  searchParams,
}: {
  searchParams: Promise<{ busca?: string }>;
}) {
  const { busca = "" } = await searchParams;
  const buscaNormalizada = normalizarNome(busca);

  const membros = await prisma.membro.findMany({
    where: {
      ativo: true,
      ...(buscaNormalizada
        ? { nomeNormalizado: { contains: buscaNormalizada } }
        : {}),
    },
    orderBy: { nomeCompleto: "asc" },
    include: {
      unidade: { select: { nome: true } },
      _count: { select: { inscricoes: true } },
    },
    take: 300,
  });

  const hoje = new Date();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Membros</h1>
        <Button asChild className="min-h-11">
          <Link href="/membros/novo">
            <Plus className="size-4" aria-hidden="true" />
            Novo membro
          </Link>
        </Button>
      </div>

      <form className="max-w-md">
        <Label htmlFor="busca" className="sr-only">
          Buscar por nome
        </Label>
        <Input
          id="busca"
          name="busca"
          type="search"
          defaultValue={busca}
          placeholder="Buscar por nome e pressionar Enter"
          className="h-11"
        />
      </form>

      {membros.length === 0 ? (
        <Card>
          <CardContent className="text-muted-foreground py-12 text-center">
            {busca
              ? "Ninguém encontrado com esse nome."
              : "Nenhum membro cadastrado ainda. Cadastre um a um, ou importe a planilha."}
          </CardContent>
        </Card>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {membros.map((membro) => {
            const status = statusDaRecomendacao(
              membro.recomendacaoTipo,
              membro.recomendacaoValidaAte,
              hoje,
            );
            return (
              <li key={membro.id}>
                <Link
                  href={`/membros/${membro.id}`}
                  className="focus-visible:ring-ring block rounded-lg focus-visible:ring-2 focus-visible:outline-none"
                >
                  <Card className="hover:border-primary/50 transition-colors">
                    <CardContent className="space-y-2 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate font-medium">
                            {membro.nomeCompleto}
                            {membro.apelido ? (
                              <span className="text-muted-foreground font-normal">
                                {" "}
                                ({membro.apelido})
                              </span>
                            ) : null}
                          </p>
                          <p className="text-muted-foreground text-sm">
                            {membro.organizacao
                              ? ROTULO_ORGANIZACAO_CURTO[membro.organizacao]
                              : "Sem organização"}
                            {membro.unidade ? ` · ${membro.unidade.nome}` : ""}
                          </p>
                        </div>
                        {membro.recemConverso ? (
                          <Badge variant="secondary">Recém-converso</Badge>
                        ) : null}
                      </div>

                      <p className="flex items-center gap-1.5 text-sm">
                        {status === "VENCIDA" ? (
                          <span className="flex items-center gap-1.5 text-red-600 dark:text-red-400">
                            <TriangleAlert className="size-4" aria-hidden="true" />
                            Recomendação vencida
                          </span>
                        ) : status === "NAO_POSSUI" ? (
                          <span className="text-muted-foreground">
                            Sem recomendação registrada
                          </span>
                        ) : (
                          <span className="text-muted-foreground">
                            {ROTULO_RECOMENDACAO_TIPO[membro.recomendacaoTipo]} ·
                            válida
                          </span>
                        )}
                      </p>

                      <p className="text-muted-foreground text-xs">
                        {membro._count.inscricoes === 0
                          ? "Nunca participou de uma caravana"
                          : `${membro._count.inscricoes} caravana(s)`}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
