"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, TriangleAlert } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ROTULO_ORGANIZACAO_CURTO } from "@/lib/dominio";
import { formatarDinheiro } from "@/lib/financeiro";
import { cn } from "@/lib/utils";
import type { InscritoSerializado } from "@/components/lista-de-inscritos";

// Reaproveitamos só o que interessa do resumo da caravana.
type Resumo = {
  confirmados: number;
  capacidade: number;
  vagasRestantes: number;
  naFila: number;
  comAvisoAlto: number;
  noPedidoDeGrupo: number;
  ordenancaPendente: number;
  recomendacaoPendente: number;
  agendamentoPendente: number;
  totalArrecadado: number;
  custoTotal: number;
  pagamentoPendente: number;
};

type CardBase = {
  chave: string;
  rotulo: string;
  valor: string;
  detalhe?: string;
  destaque?: "alerta" | "ok";
};

type CardLista = CardBase & {
  tipo: "lista";
  pessoas: InscritoSerializado[];
  descricao: string;
  mostrarAvisos?: boolean;
  mostrarPosicaoFila?: boolean;
};

type CardLink = CardBase & { tipo: "link"; href: string };

type CardParado = CardBase & { tipo: "parado" };

type CardConfig = CardLista | CardLink | CardParado;

function classeValor(destaque?: "alerta" | "ok") {
  if (destaque === "alerta")
    return "text-2xl font-semibold text-red-600 tabular-nums dark:text-red-400";
  if (destaque === "ok")
    return "text-2xl font-semibold text-emerald-600 tabular-nums dark:text-emerald-400";
  return "text-2xl font-semibold tabular-nums";
}

function MioloDoCard({ card, clicavel }: { card: CardConfig; clicavel: boolean }) {
  return (
    <div className="p-4 text-left">
      <div className="flex items-start justify-between gap-2">
        <p className="text-muted-foreground text-sm">{card.rotulo}</p>
        {clicavel ? (
          <ChevronRight
            className="text-muted-foreground size-4 shrink-0"
            aria-hidden="true"
          />
        ) : null}
      </div>
      <p className={classeValor(card.destaque)}>{card.valor}</p>
      {card.detalhe ? (
        <p className="text-muted-foreground text-xs">{card.detalhe}</p>
      ) : null}
    </div>
  );
}

function LinhaPessoa({
  inscrito,
  mostrarAvisos,
  mostrarPosicaoFila,
}: {
  inscrito: InscritoSerializado;
  mostrarAvisos?: boolean;
  mostrarPosicaoFila?: boolean;
}) {
  const numero = mostrarPosicaoFila ? inscrito.posicaoFila : inscrito.ordem;
  return (
    <li className="flex items-start gap-3 py-2">
      <span className="bg-muted text-muted-foreground mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-medium tabular-nums">
        {numero}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">
          {inscrito.membro.nomeCompleto}
          {inscrito.membro.apelido ? (
            <span className="text-muted-foreground font-normal">
              {" "}
              ({inscrito.membro.apelido})
            </span>
          ) : null}
        </p>
        <p className="text-muted-foreground text-sm">
          {inscrito.membro.organizacao
            ? ROTULO_ORGANIZACAO_CURTO[inscrito.membro.organizacao]
            : "Sem organização"}
          {inscrito.membro.ehDeOutraUnidade
            ? ` · ${inscrito.membro.unidadeNome}`
            : ""}
        </p>
        {mostrarAvisos && inscrito.avisos.length > 0 ? (
          <ul className="mt-1 space-y-0.5">
            {inscrito.avisos.map((aviso) => (
              <li
                key={aviso.codigo}
                className={cn(
                  "flex items-start gap-1.5 text-xs",
                  aviso.gravidade === "alta"
                    ? "text-red-700 dark:text-red-300"
                    : "text-amber-700 dark:text-amber-300",
                )}
              >
                <TriangleAlert className="mt-0.5 size-3 shrink-0" aria-hidden="true" />
                <span>{aviso.texto}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </li>
  );
}

export function ContadoresDaCaravana({
  caravanaId,
  resumo,
  confirmados,
  naFila,
}: {
  caravanaId: string;
  resumo: Resumo;
  confirmados: InscritoSerializado[];
  naFila: InscritoSerializado[];
}) {
  const [aberto, setAberto] = useState<string | null>(null);

  const cards = useMemo<CardConfig[]>(() => {
    const comOrdenanca = confirmados.filter((i) => i.participacao === "ORDENANCA");

    return [
      {
        chave: "inscritos",
        tipo: "lista",
        rotulo: "Inscritos",
        valor: `${resumo.confirmados}/${resumo.capacidade}`,
        detalhe:
          resumo.vagasRestantes > 0
            ? `${resumo.vagasRestantes} vaga(s) livre(s)`
            : "Ônibus lotado",
        descricao: "Todos que estão confirmados nesta caravana.",
        pessoas: confirmados,
      },
      {
        chave: "fila",
        tipo: "lista",
        rotulo: "Fila de espera",
        valor: String(resumo.naFila),
        detalhe: resumo.naFila > 0 ? "Sobem se alguém desistir" : "Ninguém esperando",
        descricao: "Sobem para o ônibus na ordem, quando abre vaga.",
        pessoas: naFila,
        mostrarPosicaoFila: true,
      },
      {
        chave: "atencao",
        tipo: "lista",
        rotulo: "Precisam de atenção",
        valor: String(resumo.comAvisoAlto),
        destaque: resumo.comAvisoAlto > 0 ? "alerta" : "ok",
        detalhe: "Podem ser barrados no templo",
        descricao: "Resolva estes avisos antes da viagem.",
        pessoas: confirmados.filter((i) =>
          i.avisos.some((a) => a.gravidade === "alta"),
        ),
        mostrarAvisos: true,
      },
      {
        chave: "pedido",
        tipo: "link",
        rotulo: "No pedido ao templo",
        valor: String(resumo.noPedidoDeGrupo),
        detalhe: "Sem as ordenanças próprias",
        href: `/caravanas/${caravanaId}/agendamento`,
      },
      {
        chave: "ordenanca",
        tipo: "lista",
        rotulo: "Ordenança a definir",
        valor: String(resumo.ordenancaPendente),
        destaque: resumo.ordenancaPendente > 0 ? "alerta" : "ok",
        descricao: "Falta escolher o que cada um vai fazer no templo.",
        pessoas: comOrdenanca.filter((i) => i.ordenanca === null),
      },
      {
        chave: "recomendacao",
        tipo: "lista",
        rotulo: "Recomendação a conferir",
        valor: String(resumo.recomendacaoPendente),
        descricao: "Falta confirmar a situação da recomendação.",
        pessoas: comOrdenanca.filter((i) => i.recomendacaoStatus === null),
      },
      {
        chave: "agendamento",
        tipo: "lista",
        rotulo: "Agendamento a confirmar",
        valor: String(resumo.agendamentoPendente),
        descricao: "Falta confirmar o horário no templo.",
        pessoas: comOrdenanca.filter((i) => i.agendamentoStatus === null),
      },
      {
        chave: "arrecadado",
        tipo: "link",
        rotulo: "Arrecadado",
        valor: formatarDinheiro(resumo.totalArrecadado),
        detalhe:
          resumo.custoTotal > 0
            ? `de ${formatarDinheiro(resumo.custoTotal)} de custo`
            : `${resumo.pagamentoPendente} pagamento(s) pendente(s)`,
        href: `/caravanas/${caravanaId}/financeiro`,
      },
    ];
  }, [caravanaId, resumo, confirmados, naFila]);

  const cardAberto = cards.find(
    (c): c is CardLista => c.tipo === "lista" && c.chave === aberto,
  );

  return (
    <>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((card) => {
          const classeCard =
            "bg-card rounded-xl border transition-colors";

          if (card.tipo === "link") {
            return (
              <Link
                key={card.chave}
                href={card.href}
                className={cn(
                  classeCard,
                  "hover:border-primary/50 focus-visible:ring-ring block focus-visible:ring-2 focus-visible:outline-none",
                )}
              >
                <MioloDoCard card={card} clicavel />
              </Link>
            );
          }

          const temPessoas = card.tipo === "lista" && card.pessoas.length > 0;

          if (card.tipo === "lista" && temPessoas) {
            return (
              <button
                key={card.chave}
                type="button"
                onClick={() => setAberto(card.chave)}
                className={cn(
                  classeCard,
                  "hover:border-primary/50 focus-visible:ring-ring w-full focus-visible:ring-2 focus-visible:outline-none",
                )}
              >
                <MioloDoCard card={card} clicavel />
              </button>
            );
          }

          // Sem pessoas para mostrar (ex.: nenhuma pendência) — card estático.
          return (
            <div key={card.chave} className={classeCard}>
              <MioloDoCard card={card} clicavel={false} />
            </div>
          );
        })}
      </div>

      <Dialog
        open={cardAberto !== undefined}
        onOpenChange={(o) => {
          if (!o) setAberto(null);
        }}
      >
        <DialogContent className="max-h-[80vh] overflow-hidden">
          {cardAberto ? (
            <>
              <DialogHeader>
                <DialogTitle>
                  {cardAberto.rotulo} ({cardAberto.pessoas.length})
                </DialogTitle>
                <DialogDescription>{cardAberto.descricao}</DialogDescription>
              </DialogHeader>
              <ul className="max-h-[60vh] divide-y overflow-y-auto">
                {cardAberto.pessoas.map((inscrito) => (
                  <LinhaPessoa
                    key={inscrito.id}
                    inscrito={inscrito}
                    mostrarAvisos={cardAberto.mostrarAvisos}
                    mostrarPosicaoFila={cardAberto.mostrarPosicaoFila}
                  />
                ))}
              </ul>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
