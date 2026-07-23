"use client";

import { useMemo, useState, useTransition } from "react";
import { Check, Search } from "lucide-react";
import { toast } from "sonner";
import { marcarEmbarque } from "@/app/acoes/embarque";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ROTULO_ORGANIZACAO_CURTO } from "@/lib/dominio";
import { normalizarNome } from "@/lib/normalizar";
import { cn } from "@/lib/utils";
import type { Organizacao } from "@/generated/prisma/enums";

export type PessoaNoEmbarque = {
  id: string;
  ordem: number;
  nomeCompleto: string;
  organizacao: Organizacao | null;
  telefone: string | null;
  presenteIda: boolean;
  presenteVolta: boolean;
};

export function ListaDeEmbarque({ pessoas }: { pessoas: PessoaNoEmbarque[] }) {
  const [trecho, setTrecho] = useState<"IDA" | "VOLTA">("IDA");
  const [busca, setBusca] = useState("");
  const [estado, setEstado] = useState(() =>
    Object.fromEntries(
      pessoas.map((p) => [p.id, { IDA: p.presenteIda, VOLTA: p.presenteVolta }]),
    ),
  );
  const [, iniciarTransicao] = useTransition();

  const visiveis = useMemo(() => {
    const alvo = normalizarNome(busca);
    if (!alvo) return pessoas;
    return pessoas.filter((p) => normalizarNome(p.nomeCompleto).includes(alvo));
  }, [pessoas, busca]);

  const presentes = pessoas.filter((p) => estado[p.id]?.[trecho]).length;
  const faltando = pessoas.length - presentes;

  function alternar(pessoa: PessoaNoEmbarque) {
    const presente = !estado[pessoa.id]?.[trecho];
    setEstado((atual) => ({
      ...atual,
      [pessoa.id]: { ...atual[pessoa.id], [trecho]: presente },
    }));

    iniciarTransicao(async () => {
      try {
        await marcarEmbarque({ inscricaoId: pessoa.id, trecho, presente });
      } catch {
        setEstado((atual) => ({
          ...atual,
          [pessoa.id]: { ...atual[pessoa.id], [trecho]: !presente },
        }));
        toast.error(`Não deu para marcar ${pessoa.nomeCompleto}.`);
      }
    });
  }

  return (
    <div className="space-y-4">
      <div
        className="grid grid-cols-2 gap-2"
        role="group"
        aria-label="Trecho da viagem"
      >
        {(["IDA", "VOLTA"] as const).map((opcao) => (
          <Button
            key={opcao}
            variant={trecho === opcao ? "default" : "outline"}
            onClick={() => setTrecho(opcao)}
            className="min-h-12 text-base"
            aria-pressed={trecho === opcao}
          >
            {opcao === "IDA" ? "Ida" : "Volta"}
          </Button>
        ))}
      </div>

      <div
        className={cn(
          "rounded-lg border p-3 text-center",
          faltando === 0
            ? "border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950"
            : "border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950",
        )}
        aria-live="polite"
      >
        <p className="text-2xl font-semibold tabular-nums">
          {presentes} de {pessoas.length}
        </p>
        <p className="text-sm">
          {faltando === 0
            ? "Todo mundo a bordo. Pode sair."
            : `${faltando} pessoa(s) ainda não embarcaram`}
        </p>
      </div>

      <div className="relative">
        <Label htmlFor="busca-embarque" className="sr-only">
          Buscar por nome
        </Label>
        <Search
          className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
          aria-hidden="true"
        />
        <Input
          id="busca-embarque"
          type="search"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome"
          className="h-12 pl-9 text-base"
        />
      </div>

      <ul className="space-y-2">
        {visiveis.map((pessoa) => {
          const presente = estado[pessoa.id]?.[trecho] ?? false;
          return (
            <li key={pessoa.id}>
              <button
                type="button"
                onClick={() => alternar(pessoa)}
                aria-pressed={presente}
                className={cn(
                  "flex min-h-16 w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors",
                  "focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none",
                  presente
                    ? "border-emerald-400 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-950"
                    : "bg-card",
                )}
              >
                <span
                  className={cn(
                    "flex size-10 shrink-0 items-center justify-center rounded-full text-base font-medium tabular-nums",
                    presente
                      ? "bg-emerald-600 text-white"
                      : "bg-muted text-muted-foreground",
                  )}
                  aria-hidden="true"
                >
                  {presente ? <Check className="size-5" /> : pessoa.ordem}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block truncate text-base font-medium">
                    {pessoa.nomeCompleto}
                  </span>
                  <span className="text-muted-foreground block text-sm">
                    {pessoa.organizacao
                      ? ROTULO_ORGANIZACAO_CURTO[pessoa.organizacao]
                      : "Sem organização"}
                    {pessoa.telefone ? ` · ${pessoa.telefone}` : ""}
                  </span>
                </span>

                <span className="text-muted-foreground shrink-0 text-sm">
                  {presente ? "A bordo" : "Marcar"}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
