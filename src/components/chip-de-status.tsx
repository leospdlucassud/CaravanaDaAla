"use client";

import { useState, useTransition } from "react";
import { Check, ChevronDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export type OpcaoDeChip<T> = {
  valor: T;
  rotulo: string;
  /** Aparência do chip quando este valor está selecionado. */
  tom?: "neutro" | "positivo" | "atencao" | "critico";
};

const CLASSES_POR_TOM = {
  neutro: "bg-muted text-muted-foreground border-transparent",
  positivo:
    "bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-100 dark:border-emerald-800",
  atencao:
    "bg-amber-100 text-amber-950 border-amber-300 dark:bg-amber-950 dark:text-amber-50 dark:border-amber-800",
  critico:
    "bg-red-100 text-red-950 border-red-300 dark:bg-red-950 dark:text-red-50 dark:border-red-800",
} as const;

/**
 * Edição em dois toques: um toque abre, outro escolhe.
 *
 * Salva de forma otimista — o chip muda na hora e só volta atrás se o servidor
 * recusar. Quem está preenchendo isso em pé, na saída da capela, não pode
 * esperar ida e volta de rede a cada campo.
 */
export function ChipDeStatus<T extends string | null>({
  rotuloDoCampo,
  valor,
  opcoes,
  aoMudar,
  className,
  desabilitado = false,
}: {
  rotuloDoCampo: string;
  valor: T;
  opcoes: OpcaoDeChip<T>[];
  aoMudar: (novo: T) => Promise<void>;
  className?: string;
  desabilitado?: boolean;
}) {
  const [valorVisivel, setValorVisivel] = useState<T>(valor);
  const [salvando, iniciarTransicao] = useTransition();

  const selecionada =
    opcoes.find((o) => o.valor === valorVisivel) ?? opcoes.find((o) => o.valor === null);
  const tom = selecionada?.tom ?? "neutro";

  function escolher(novo: T) {
    if (novo === valorVisivel) return;
    const anterior = valorVisivel;
    setValorVisivel(novo);

    iniciarTransicao(async () => {
      try {
        await aoMudar(novo);
      } catch {
        setValorVisivel(anterior);
        toast.error(`Não deu para salvar "${rotuloDoCampo}". Tente de novo.`);
      }
    });
  }

  if (desabilitado) {
    return (
      <span
        className={cn(
          "inline-flex min-h-11 items-center rounded-full border px-3 py-1.5 text-sm",
          CLASSES_POR_TOM.neutro,
          className,
        )}
      >
        <span className="text-muted-foreground mr-1.5">{rotuloDoCampo}:</span>
        {selecionada?.rotulo ?? "—"}
      </span>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "inline-flex min-h-11 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm",
          "focus-visible:ring-ring transition-colors focus-visible:ring-2 focus-visible:outline-none",
          CLASSES_POR_TOM[tom],
          className,
        )}
        aria-label={`${rotuloDoCampo}: ${selecionada?.rotulo ?? "pendente"}. Toque para alterar.`}
      >
        <span className="opacity-70">{rotuloDoCampo}:</span>
        <span className="font-medium">{selecionada?.rotulo ?? "Pendente"}</span>
        {salvando ? (
          <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
        ) : (
          <ChevronDown className="size-3.5 opacity-60" aria-hidden="true" />
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="min-w-56">
        <DropdownMenuLabel>{rotuloDoCampo}</DropdownMenuLabel>
        {opcoes.map((opcao) => (
          <DropdownMenuItem
            key={String(opcao.valor)}
            onSelect={() => escolher(opcao.valor)}
            className="min-h-11 justify-between"
          >
            {opcao.rotulo}
            {opcao.valor === valorVisivel ? (
              <Check className="size-4" aria-hidden="true" />
            ) : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
