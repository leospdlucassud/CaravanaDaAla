"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, MoreVertical, UserMinus } from "lucide-react";
import { toast } from "sonner";
import {
  enviarParaFila,
  promoverInscricao,
  registrarDesistenciaDeInscricao,
} from "@/app/acoes/inscricoes";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { SituacaoInscricao } from "@/generated/prisma/enums";

export function AcoesDaInscricao({
  inscricaoId,
  nome,
  situacao,
}: {
  inscricaoId: string;
  nome: string;
  situacao: SituacaoInscricao;
}) {
  const router = useRouter();
  const [emAndamento, iniciarTransicao] = useTransition();

  function executar(acao: () => Promise<unknown>, aoDarCerto: () => void) {
    iniciarTransicao(async () => {
      try {
        await acao();
        aoDarCerto();
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Não foi possível concluir.");
      }
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-11 shrink-0"
          disabled={emAndamento}
          aria-label={`Ações para ${nome}`}
        >
          <MoreVertical className="size-5" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="font-normal">{nome}</DropdownMenuLabel>

        {situacao === "FILA_ESPERA" ? (
          <DropdownMenuItem
            className="min-h-11 gap-3"
            onSelect={() =>
              executar(
                () => promoverInscricao(inscricaoId),
                () => toast.success(`${nome} subiu para uma vaga confirmada.`),
              )
            }
          >
            <ArrowUp className="size-4" aria-hidden="true" />
            Promover para o ônibus
          </DropdownMenuItem>
        ) : null}

        {situacao === "CONFIRMADA" ? (
          <>
            <DropdownMenuItem
              className="min-h-11 gap-3"
              onSelect={() =>
                iniciarTransicao(async () => {
                  try {
                    const { promovido } =
                      await registrarDesistenciaDeInscricao(inscricaoId);

                    // Avisar quem subiu é o ponto todo: essa pessoa não sabe
                    // que agora tem assento, e alguém precisa ligar para ela.
                    if (promovido) {
                      toast.success(
                        `Desistência de ${nome} registrada. ${promovido.nomeCompleto} subiu da fila — avise!`,
                        { duration: 10_000 },
                      );
                    } else {
                      toast.success(`Desistência de ${nome} registrada.`);
                    }
                    router.refresh();
                  } catch (e) {
                    toast.error(
                      e instanceof Error ? e.message : "Não foi possível concluir.",
                    );
                  }
                })
              }
            >
              <UserMinus className="size-4" aria-hidden="true" />
              Registrar desistência
            </DropdownMenuItem>

            <DropdownMenuItem
              className="min-h-11 gap-3"
              onSelect={() =>
                executar(
                  () => enviarParaFila(inscricaoId),
                  () => toast.success(`${nome} foi para a fila de espera.`),
                )
              }
            >
              <ArrowDown className="size-4" aria-hidden="true" />
              Mover para a fila de espera
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
