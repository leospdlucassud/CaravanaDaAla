"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, MapPin, Users } from "lucide-react";
import {
  caravanaEstaAtiva,
  nomeDoTemplo,
  rotuloGrupoCaravana,
  ROTULO_STATUS_CARAVANA,
} from "@/lib/dominio";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { StatusCaravana } from "@/generated/prisma/enums";

export type CaravanaNaLista = {
  id: string;
  titulo: string;
  dataISO: string;
  templo: string;
  status: StatusCaravana;
  capacidadeAssentos: number;
  ocupados: number;
};

type Filtro = "ativas" | "inativas" | "todas";

const OPCOES_DE_FILTRO: Array<{ valor: Filtro; rotulo: string }> = [
  { valor: "ativas", rotulo: "Ativas" },
  { valor: "inativas", rotulo: "Inativas" },
  { valor: "todas", rotulo: "Todas" },
];

function formatarData(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(iso));
}

export function ListaDeCaravanas({ caravanas }: { caravanas: CaravanaNaLista[] }) {
  // Padrão: só as ativas, como pedido.
  const [filtro, setFiltro] = useState<Filtro>("ativas");

  const visiveis = useMemo(() => {
    if (filtro === "todas") return caravanas;
    const querAtiva = filtro === "ativas";
    return caravanas.filter((c) => caravanaEstaAtiva(c.status) === querAtiva);
  }, [caravanas, filtro]);

  return (
    <div className="space-y-4">
      <div
        className="flex flex-wrap gap-1 rounded-lg border p-1"
        role="group"
        aria-label="Filtrar caravanas"
      >
        {OPCOES_DE_FILTRO.map((opcao) => (
          <button
            key={opcao.valor}
            type="button"
            onClick={() => setFiltro(opcao.valor)}
            aria-pressed={filtro === opcao.valor}
            className={cn(
              "min-h-11 flex-1 rounded-md px-3 text-sm font-medium transition-colors",
              filtro === opcao.valor
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted",
            )}
          >
            {opcao.rotulo}
          </button>
        ))}
      </div>

      {visiveis.length === 0 ? (
        <Card>
          <CardContent className="text-muted-foreground py-12 text-center">
            {filtro === "ativas"
              ? "Nenhuma caravana ativa. Crie uma nova ou veja as inativas no filtro acima."
              : "Nenhuma caravana nesse filtro."}
          </CardContent>
        </Card>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {visiveis.map((caravana) => {
            const percentual =
              caravana.capacidadeAssentos > 0
                ? Math.min(100, (caravana.ocupados / caravana.capacidadeAssentos) * 100)
                : 0;
            const lotado = caravana.ocupados >= caravana.capacidadeAssentos;
            const ativa = caravanaEstaAtiva(caravana.status);

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
                          variant={ativa ? "default" : "secondary"}
                          title={ROTULO_STATUS_CARAVANA[caravana.status]}
                        >
                          {rotuloGrupoCaravana(caravana.status)}
                        </Badge>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-3 text-sm">
                      <p className="flex items-center gap-2">
                        <CalendarDays
                          className="text-muted-foreground size-4 shrink-0"
                          aria-hidden="true"
                        />
                        {formatarData(caravana.dataISO)}
                      </p>
                      <p className="flex items-center gap-2">
                        <MapPin
                          className="text-muted-foreground size-4 shrink-0"
                          aria-hidden="true"
                        />
                        {nomeDoTemplo(caravana.templo)}
                      </p>
                      <div className="space-y-1.5">
                        <p className="flex items-center gap-2">
                          <Users
                            className="text-muted-foreground size-4 shrink-0"
                            aria-hidden="true"
                          />
                          <span>
                            {caravana.ocupados} de {caravana.capacidadeAssentos} assentos
                          </span>
                          {lotado ? (
                            <Badge variant="outline" className="ml-auto">
                              Lotado
                            </Badge>
                          ) : null}
                        </p>
                        <Progress
                          value={percentual}
                          aria-label={`${caravana.ocupados} de ${caravana.capacidadeAssentos} assentos ocupados`}
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
