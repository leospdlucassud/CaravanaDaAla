"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, MoreVertical, Trash2, UserMinus } from "lucide-react";
import { toast } from "sonner";
import {
  enviarParaFila,
  promoverInscricao,
  registrarDesistenciaDeInscricao,
  removerInscricao,
} from "@/app/acoes/inscricoes";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { SituacaoInscricao } from "@/generated/prisma/enums";

type Confirmacao = "desistencia" | "remover";

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
  // Ações que apagam/desfazem passam por confirmação; as reversíveis, não.
  const [confirmacao, setConfirmacao] = useState<Confirmacao | null>(null);

  // Abre o diálogo só depois do menu terminar de fechar. Sem isso, o Radix
  // devolve o foco ao gatilho no mesmo instante e o diálogo fecha sozinho.
  function pedirConfirmacao(tipo: Confirmacao) {
    setTimeout(() => setConfirmacao(tipo), 0);
  }

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

  function confirmarDesistencia() {
    iniciarTransicao(async () => {
      try {
        const { promovido } = await registrarDesistenciaDeInscricao(inscricaoId);
        // Avisar quem subiu é o ponto todo: essa pessoa não sabe que agora tem
        // assento, e alguém precisa ligar para ela.
        if (promovido) {
          toast.success(
            `Desistência de ${nome} registrada. ${promovido.nomeCompleto} subiu da fila — avise!`,
            { duration: 10_000 },
          );
        } else {
          toast.success(`Desistência de ${nome} registrada.`);
        }
        setConfirmacao(null);
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Não foi possível concluir.");
      }
    });
  }

  function confirmarRemocao() {
    executar(
      () => removerInscricao(inscricaoId),
      () => {
        toast.success(`${nome} foi removido(a) da caravana.`);
        setConfirmacao(null);
      },
    );
  }

  return (
    <>
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
                onSelect={() => pedirConfirmacao("desistencia")}
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

          <DropdownMenuSeparator />

          <DropdownMenuItem
            className="min-h-11 gap-3 text-red-600 focus:text-red-600 dark:text-red-400"
            onSelect={() => pedirConfirmacao("remover")}
          >
            <Trash2 className="size-4" aria-hidden="true" />
            Remover da caravana
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog
        open={confirmacao !== null}
        onOpenChange={(aberto) => {
          if (!aberto) setConfirmacao(null);
        }}
      >
        <DialogContent>
          {confirmacao === "desistencia" ? (
            <>
              <DialogHeader>
                <DialogTitle>Registrar desistência de {nome}?</DialogTitle>
                <DialogDescription>
                  {nome} sai da lista de confirmados e, se houver fila, o próximo
                  sobe automaticamente. Dá para inscrever de novo depois, se
                  precisar.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  variant="outline"
                  className="min-h-11"
                  onClick={() => setConfirmacao(null)}
                  disabled={emAndamento}
                >
                  Cancelar
                </Button>
                <Button
                  className="min-h-11"
                  onClick={confirmarDesistencia}
                  disabled={emAndamento}
                >
                  {emAndamento ? "Registrando..." : "Registrar desistência"}
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Remover {nome} da caravana?</DialogTitle>
                <DialogDescription>
                  Isto apaga a inscrição desta pessoa nesta caravana, com todos os
                  status (ordenança, pagamento, embarque). O cadastro do membro
                  continua intacto. Esta ação não pode ser desfeita.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  variant="outline"
                  className="min-h-11"
                  onClick={() => setConfirmacao(null)}
                  disabled={emAndamento}
                >
                  Cancelar
                </Button>
                <Button
                  variant="destructive"
                  className="min-h-11"
                  onClick={confirmarRemocao}
                  disabled={emAndamento}
                >
                  {emAndamento ? "Removendo..." : "Remover da caravana"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
