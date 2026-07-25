"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
import { alterarStatusCaravana } from "@/app/acoes/caravanas";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  caravanaEstaAtiva,
  ROTULO_STATUS_CARAVANA,
  rotuloGrupoCaravana,
} from "@/lib/dominio";
import type { StatusCaravana } from "@/generated/prisma/enums";

const STATUS: StatusCaravana[] = [
  "PLANEJAMENTO",
  "CONFIRMADA",
  "REALIZADA",
  "CANCELADA",
];

export function AlterarSituacaoCaravana({
  caravanaId,
  statusAtual,
}: {
  caravanaId: string;
  statusAtual: StatusCaravana;
}) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [status, setStatus] = useState<StatusCaravana>(statusAtual);
  const [salvando, iniciarTransicao] = useTransition();

  function salvar() {
    iniciarTransicao(async () => {
      try {
        await alterarStatusCaravana(caravanaId, status);
        toast.success(
          `Situação alterada para ${ROTULO_STATUS_CARAVANA[status]} (${rotuloGrupoCaravana(status)}).`,
        );
        setAberto(false);
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Não foi possível alterar.");
      }
    });
  }

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>
        <Button variant="outline" className="min-h-11">
          <SlidersHorizontal className="size-4" aria-hidden="true" />
          Situação
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Situação da caravana</DialogTitle>
          <DialogDescription>
            Ativa (em planejamento ou confirmada) aparece na lista principal.
            Inativa (realizada ou cancelada) sai da lista, mas continua acessível
            pelo filtro.
          </DialogDescription>
        </DialogHeader>

        <fieldset className="my-4 space-y-2">
          {STATUS.map((s) => (
            <label
              key={s}
              className="hover:bg-muted flex min-h-11 cursor-pointer items-center gap-3 rounded-md border px-3"
            >
              <input
                type="radio"
                name="status"
                value={s}
                checked={status === s}
                onChange={() => setStatus(s)}
                className="size-4"
              />
              <span className="flex-1">{ROTULO_STATUS_CARAVANA[s]}</span>
              <span className="text-muted-foreground text-xs">
                {caravanaEstaAtiva(s) ? "Ativa" : "Inativo"}
              </span>
            </label>
          ))}
        </fieldset>

        <Button onClick={salvar} disabled={salvando} className="min-h-11">
          {salvando ? "Salvando..." : "Salvar situação"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
