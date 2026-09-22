"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Search, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { inscreverMembro } from "@/app/acoes/inscricoes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ROTULO_ORGANIZACAO_CURTO } from "@/lib/dominio";
import { normalizarNome } from "@/lib/normalizar";
import type { Organizacao } from "@/generated/prisma/enums";
import { mensagemDeFalha } from "@/lib/falha";

export type CandidatoAInscricao = {
  id: string;
  nomeCompleto: string;
  apelido: string | null;
  organizacao: Organizacao | null;
  unidadeNome: string;
  jaInscrito: boolean;
};

export function InscreverMembros({
  caravanaId,
  candidatos,
  vagasRestantes,
}: {
  caravanaId: string;
  candidatos: CandidatoAInscricao[];
  vagasRestantes: number;
}) {
  const router = useRouter();
  const [busca, setBusca] = useState("");
  const [recemInscritos, setRecemInscritos] = useState<Set<string>>(new Set());
  const [emAndamento, iniciarTransicao] = useTransition();

  const visiveis = useMemo(() => {
    const alvo = normalizarNome(busca);
    if (!alvo) return candidatos.slice(0, 50);
    return candidatos
      .filter((c) => normalizarNome(c.nomeCompleto).includes(alvo))
      .slice(0, 50);
  }, [candidatos, busca]);

  function inscrever(candidato: CandidatoAInscricao) {
    iniciarTransicao(async () => {
      try {
        const { situacao } = await inscreverMembro({
          caravanaId,
          membroId: candidato.id,
        });

        setRecemInscritos((atuais) => new Set(atuais).add(candidato.id));

        if (situacao === "FILA_ESPERA") {
          toast.warning(
            `${candidato.nomeCompleto} entrou na fila de espera — o ônibus já está cheio.`,
          );
        } else {
          toast.success(`${candidato.nomeCompleto} inscrito.`);
        }

        router.refresh();
      } catch (e) {
        toast.error(mensagemDeFalha(e, "inscrever"));
      }
    });
  }

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-sm">
        {vagasRestantes > 0
          ? `${vagasRestantes} assento(s) livre(s). Depois disso, quem for inscrito entra na fila de espera.`
          : "O ônibus está cheio — novas inscrições entram direto na fila de espera."}
      </p>

      <div className="relative max-w-md">
        <Label htmlFor="busca-candidatos" className="sr-only">
          Buscar membro
        </Label>
        <Search
          className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
          aria-hidden="true"
        />
        <Input
          id="busca-candidatos"
          type="search"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome"
          className="h-11 pl-9"
        />
      </div>

      {visiveis.length === 0 ? (
        <p className="text-muted-foreground rounded-lg border border-dashed py-8 text-center">
          Ninguém encontrado.
        </p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {visiveis.map((candidato) => {
            const jaEsta = candidato.jaInscrito || recemInscritos.has(candidato.id);
            return (
              <li
                key={candidato.id}
                className="flex flex-wrap items-center justify-between gap-3 p-3"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    {candidato.nomeCompleto}
                    {candidato.apelido ? (
                      <span className="text-muted-foreground font-normal">
                        {" "}
                        ({candidato.apelido})
                      </span>
                    ) : null}
                  </p>
                  <p className="text-muted-foreground text-sm">
                    {candidato.organizacao
                      ? ROTULO_ORGANIZACAO_CURTO[candidato.organizacao]
                      : "Sem organização"}{" "}
                    · {candidato.unidadeNome}
                  </p>
                </div>

                {jaEsta ? (
                  <Badge variant="secondary" className="min-h-11 gap-1.5 px-3">
                    <Check className="size-4" aria-hidden="true" />
                    Já inscrito
                  </Badge>
                ) : (
                  <Button
                    onClick={() => inscrever(candidato)}
                    disabled={emAndamento}
                    className="min-h-11"
                  >
                    <UserPlus className="size-4" aria-hidden="true" />
                    Inscrever
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
