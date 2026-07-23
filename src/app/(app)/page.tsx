import Link from "next/link";
import { CalendarDays, MapPin, Plus, Users } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { usuarioAtual } from "@/lib/autorizacao";
import { podeOrganizar } from "@/lib/permissoes";
import { ROTULO_STATUS_CARAVANA } from "@/lib/dominio";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

function formatarData(data: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(data);
}

export default async function PaginaDeCaravanas() {
  const ator = await usuarioAtual();
  if (!ator) return null;

  const caravanas = await prisma.caravana.findMany({
    orderBy: { data: "desc" },
    include: {
      unidadeOrganizadora: { select: { nome: true } },
      _count: { select: { inscricoes: { where: { situacao: "CONFIRMADA" } } } },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Caravanas</h1>
        {podeOrganizar(ator) ? (
          <Button asChild className="min-h-11">
            <Link href="/caravanas/nova">
              <Plus className="size-4" aria-hidden="true" />
              Nova caravana
            </Link>
          </Button>
        ) : null}
      </div>

      {caravanas.length === 0 ? (
        <Card>
          <CardContent className="text-muted-foreground py-12 text-center">
            <p className="mb-4">Nenhuma caravana cadastrada ainda.</p>
            {podeOrganizar(ator) ? (
              <Button asChild variant="outline" className="min-h-11">
                <Link href="/caravanas/nova">Criar a primeira caravana</Link>
              </Button>
            ) : null}
          </CardContent>
        </Card>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {caravanas.map((caravana) => {
            const ocupados = caravana._count.inscricoes;
            const percentual =
              caravana.capacidadeAssentos > 0
                ? Math.min(100, (ocupados / caravana.capacidadeAssentos) * 100)
                : 0;
            const lotado = ocupados >= caravana.capacidadeAssentos;

            return (
              <li key={caravana.id}>
                <Link
                  href={`/caravanas/${caravana.id}`}
                  className="focus-visible:ring-ring block h-full rounded-xl focus-visible:ring-2 focus-visible:outline-none"
                >
                  <Card className="hover:border-primary/50 h-full transition-colors">
                    <CardHeader className="gap-2">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-lg">{caravana.titulo}</CardTitle>
                        <Badge
                          variant={
                            caravana.status === "CONFIRMADA" ? "default" : "secondary"
                          }
                        >
                          {ROTULO_STATUS_CARAVANA[caravana.status]}
                        </Badge>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-3 text-sm">
                      <p className="flex items-center gap-2">
                        <CalendarDays
                          className="text-muted-foreground size-4 shrink-0"
                          aria-hidden="true"
                        />
                        {formatarData(caravana.data)}
                      </p>
                      <p className="flex items-center gap-2">
                        <MapPin
                          className="text-muted-foreground size-4 shrink-0"
                          aria-hidden="true"
                        />
                        Templo de {caravana.templo}
                      </p>
                      <div className="space-y-1.5">
                        <p className="flex items-center gap-2">
                          <Users
                            className="text-muted-foreground size-4 shrink-0"
                            aria-hidden="true"
                          />
                          <span>
                            {ocupados} de {caravana.capacidadeAssentos} assentos
                          </span>
                          {lotado ? (
                            <Badge variant="outline" className="ml-auto">
                              Lotado
                            </Badge>
                          ) : null}
                        </p>
                        <Progress
                          value={percentual}
                          aria-label={`${ocupados} de ${caravana.capacidadeAssentos} assentos ocupados`}
                        />
                      </div>
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
