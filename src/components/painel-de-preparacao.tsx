"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  designarAcompanhante,
  marcarNoChecklist,
  type CampoDoChecklist,
} from "@/app/acoes/preparacao";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { mensagemDeFalha } from "@/lib/falha";

const ITENS_DO_CHECKLIST: Array<{ campo: CampoDoChecklist; rotulo: string }> = [
  {
    campo: "requisitosVerificadosPeloBispo",
    rotulo: "Requisitos verificados pelo bispo",
  },
  { campo: "entrevistaBispoFeita", rotulo: "Entrevista com o bispo" },
  { campo: "entrevistaEstacaFeita", rotulo: "Entrevista com a presidência de estaca" },
  {
    campo: "agendamentoProprioFeito",
    rotulo: "Agendamento próprio feito por telefone com o templo",
  },
  { campo: "roupasDoTemploProvidenciadas", rotulo: "Roupas do templo providenciadas" },
  { campo: "acompanhanteDesignado", rotulo: "Acompanhante designado" },
  { campo: "orientacaoRecebida", rotulo: "Orientação recebida" },
];

export type PessoaComChecklist = {
  inscricaoId: string;
  nome: string;
  checklist: Record<CampoDoChecklist, boolean>;
};

export type PessoaQuePrecisaAcompanhante = {
  inscricaoId: string;
  nome: string;
  motivo: string;
  acompanhanteId: string | null;
  candidatos: Array<{ id: string; nome: string }>;
};

export function PainelDePreparacao({
  primeirasInvestiduras,
  semAcompanhante,
}: {
  primeirasInvestiduras: PessoaComChecklist[];
  semAcompanhante: PessoaQuePrecisaAcompanhante[];
}) {
  const [checklists, setChecklists] = useState(() =>
    Object.fromEntries(primeirasInvestiduras.map((p) => [p.inscricaoId, p.checklist])),
  );
  const [acompanhantes, setAcompanhantes] = useState(() =>
    Object.fromEntries(
      semAcompanhante.map((p) => [p.inscricaoId, p.acompanhanteId ?? ""]),
    ),
  );
  const [, iniciarTransicao] = useTransition();

  function alternar(inscricaoId: string, campo: CampoDoChecklist, marcado: boolean) {
    setChecklists((atual) => ({
      ...atual,
      [inscricaoId]: { ...atual[inscricaoId], [campo]: marcado },
    }));

    iniciarTransicao(async () => {
      try {
        await marcarNoChecklist({ inscricaoId, campo, marcado });
      } catch {
        setChecklists((atual) => ({
          ...atual,
          [inscricaoId]: { ...atual[inscricaoId], [campo]: !marcado },
        }));
        toast.error("Não deu para salvar o checklist.");
      }
    });
  }

  function escolherAcompanhante(inscricaoId: string, acompanhanteId: string) {
    const anterior = acompanhantes[inscricaoId] ?? "";
    setAcompanhantes((atual) => ({ ...atual, [inscricaoId]: acompanhanteId }));

    iniciarTransicao(async () => {
      try {
        await designarAcompanhante({
          inscricaoId,
          acompanhanteId: acompanhanteId || null,
        });
        toast.success("Acompanhante salvo.");
      } catch (e) {
        setAcompanhantes((atual) => ({ ...atual, [inscricaoId]: anterior }));
        toast.error(mensagemDeFalha(e, "salvar o acompanhante"));
      }
    });
  }

  const nadaAFazer =
    primeirasInvestiduras.length === 0 && semAcompanhante.length === 0;

  if (nadaAFazer) {
    return (
      <p className="text-muted-foreground rounded-lg border border-dashed p-6 text-center">
        Nada pendente de preparação: ninguém vai receber a primeira investidura e
        todos que precisam de acompanhante já têm um.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {primeirasInvestiduras.map((pessoa) => {
        const marcados = ITENS_DO_CHECKLIST.filter(
          (item) => checklists[pessoa.inscricaoId]?.[item.campo],
        ).length;

        return (
          <Card key={pessoa.inscricaoId}>
            <CardHeader>
              <CardTitle className="flex flex-wrap items-center gap-2 text-lg">
                {pessoa.nome}
                <Badge variant={marcados === ITENS_DO_CHECKLIST.length ? "default" : "secondary"}>
                  {marcados} de {ITENS_DO_CHECKLIST.length}
                </Badge>
              </CardTitle>
              <p className="text-muted-foreground text-sm">
                Primeira investidura. O app não guarda os requisitos item a item
                — isso é registro do bispo, no LCR.
              </p>
            </CardHeader>

            <CardContent>
              <ul className="space-y-1">
                {ITENS_DO_CHECKLIST.map((item) => {
                  const id = `${pessoa.inscricaoId}-${item.campo}`;
                  const marcado = checklists[pessoa.inscricaoId]?.[item.campo] ?? false;

                  return (
                    <li key={item.campo}>
                      <label
                        htmlFor={id}
                        className="hover:bg-muted flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-2"
                      >
                        <Checkbox
                          id={id}
                          checked={marcado}
                          onCheckedChange={(m) =>
                            alternar(pessoa.inscricaoId, item.campo, m === true)
                          }
                          className="size-5"
                        />
                        <span className={marcado ? "text-muted-foreground line-through" : ""}>
                          {item.rotulo}
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        );
      })}

      {semAcompanhante.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Acompanhantes a designar</CardTitle>
            <p className="text-muted-foreground text-sm">
              Ninguém deveria chegar ao templo sozinho na primeira vez. Os
              candidatos sugeridos são do mesmo sexo e já investidos, como o
              Manual pede — mas a escolha é sua.
            </p>
          </CardHeader>

          <CardContent>
            <ul className="space-y-3">
              {semAcompanhante.map((pessoa) => (
                <li key={pessoa.inscricaoId} className="rounded-lg border p-3">
                  <div className="mb-2">
                    <p className="font-medium">{pessoa.nome}</p>
                    <p className="text-muted-foreground text-sm">{pessoa.motivo}</p>
                  </div>

                  <Label
                    htmlFor={`acompanhante-${pessoa.inscricaoId}`}
                    className="sr-only"
                  >
                    Acompanhante de {pessoa.nome}
                  </Label>
                  <select
                    id={`acompanhante-${pessoa.inscricaoId}`}
                    value={acompanhantes[pessoa.inscricaoId] ?? ""}
                    onChange={(e) =>
                      escolherAcompanhante(pessoa.inscricaoId, e.target.value)
                    }
                    className="border-input bg-background h-11 w-full rounded-md border px-3 text-sm"
                  >
                    <option value="">Sem acompanhante designado</option>
                    {pessoa.candidatos.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nome}
                      </option>
                    ))}
                  </select>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
