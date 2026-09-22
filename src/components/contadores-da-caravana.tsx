"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import {
  ArrowUp,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  TriangleAlert,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { promoverInscricao } from "@/app/acoes/inscricoes";
import type { OpcaoDeChip } from "@/components/chip-de-status";
import {
  ChipAgendamento,
  ChipAtividade,
  ChipRecomendacao,
  ChipsDaInscricao,
  OPCOES_AGENDAMENTO,
  OPCOES_ATIVIDADE,
  OPCOES_ATIVIDADE_DEFINIDA,
  OPCOES_RECOMENDACAO,
} from "@/components/chips-da-inscricao";
import { FormRecomendacaoDoMembro } from "@/components/form-recomendacao-membro";
import type { InscritoSerializado } from "@/components/inscrito-serializado";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  atividadeDaInscricao,
  ROTULO_ORGANIZACAO_CURTO,
  ROTULO_RECOMENDACAO_TIPO,
} from "@/lib/dominio";
import { mensagemDeFalha } from "@/lib/falha";
import { formatarDinheiro } from "@/lib/financeiro";
import { PENDENCIAS, type ChaveDePendencia, type ResumoDaCaravana } from "@/lib/resumo";
import { cn } from "@/lib/utils";

/**
 * Os cards do resumo da caravana. Cada um abre a lista de quem está por trás do
 * número — e cada nome da lista abre, ali mesmo, o que resolve aquela
 * pendência.
 *
 * A lista é "congelada" ao abrir: quem é resolvido continua visível, com o
 * desfecho ao lado, em vez de sumir e fazer a lista pular debaixo do dedo. O
 * número do card e a contagem do topo do diálogo se atualizam sozinhos.
 */

type ChaveDeLista = "inscritos" | ChaveDePendencia;

type CardBase = {
  rotulo: string;
  valor: string;
  detalhe?: string;
  destaque?: "alerta" | "ok";
};

type CardLista = CardBase & {
  tipo: "lista";
  chave: ChaveDeLista;
  /** Explica o card e o que fazer com cada nome. */
  descricao: string;
};

type CardLink = CardBase & { tipo: "link"; chave: string; href: string };

type Card = CardLista | CardLink;

/** Quem aparece na lista de cada card — as mesmas regras do número do card. */
function pertenceAoCard(chave: ChaveDeLista, inscrito: InscritoSerializado): boolean {
  return chave === "inscritos"
    ? inscrito.situacao === "CONFIRMADA"
    : PENDENCIAS[chave](inscrito);
}

// --- Desfecho: o que aconteceu com quem saiu da pendência ---------------------

type Tom = "ok" | "atencao" | "critico";
type Desfecho = { texto: string; tom: Tom };

function tomDaOpcao(tom: OpcaoDeChip<unknown>["tom"]): Tom {
  if (tom === "critico") return "critico";
  if (tom === "atencao") return "atencao";
  return "ok";
}

/**
 * Nulo enquanto a pessoa ainda tem a pendência do card. Depois, diz o que foi
 * registrado — e com a cor certa: marcar a recomendação como "Vencida" tira a
 * pessoa da lista "a conferir", mas não é notícia boa, e um ✓ verde ali
 * enganaria.
 */
function desfechoDaLinha(
  chave: ChaveDeLista,
  inscrito: InscritoSerializado,
): Desfecho | null {
  if (chave === "inscritos" || pertenceAoCard(chave, inscrito)) return null;

  if (chave === "fila") return { texto: "Subiu para o ônibus", tom: "ok" };

  // Mexeram na pessoa por outro caminho enquanto o diálogo estava aberto.
  if (inscrito.situacao === "FILA_ESPERA") {
    return { texto: "Foi para a fila de espera", tom: "atencao" };
  }
  if (inscrito.participacao === "ACOMPANHANTE_JARDINS") {
    return { texto: "Só acompanha (jardins)", tom: "ok" };
  }

  switch (chave) {
    case "ordenanca": {
      const atividade = atividadeDaInscricao(inscrito);
      const opcao = OPCOES_ATIVIDADE.find((o) => o.valor === atividade);
      return { texto: `Ordenança: ${opcao?.rotulo ?? "definida"}`, tom: "ok" };
    }
    case "recomendacao": {
      const opcao = OPCOES_RECOMENDACAO.find(
        (o) => o.valor === inscrito.recomendacaoStatus,
      );
      return {
        texto: `Recomendação: ${opcao?.rotulo ?? "registrada"}`,
        tom: tomDaOpcao(opcao?.tom),
      };
    }
    case "agendamento": {
      const opcao = OPCOES_AGENDAMENTO.find((o) => o.valor === inscrito.agendamentoStatus);
      return {
        texto: `Agendamento: ${opcao?.rotulo ?? "registrado"}`,
        tom: tomDaOpcao(opcao?.tom),
      };
    }
    case "atencao":
      // Sem ordenança o aviso some, mas nada foi resolvido: a pessoa só mudou
      // de quadrinho.
      return PENDENCIAS.ordenanca(inscrito)
        ? { texto: "Ficou sem ordenança", tom: "atencao" }
        : { texto: "Resolvido", tom: "ok" };
  }
}

const CLASSES_DO_TOM: Record<Tom, { bolinha: string; texto: string }> = {
  ok: {
    bolinha: "bg-emerald-600 text-white",
    texto: "text-emerald-700 dark:text-emerald-400",
  },
  atencao: {
    bolinha: "bg-amber-500 text-white",
    texto: "text-amber-700 dark:text-amber-300",
  },
  critico: {
    bolinha: "bg-red-600 text-white",
    texto: "text-red-700 dark:text-red-300",
  },
};

/** "Falta 1 de 5." / "Faltam 3 de 5." / "Tudo resolvido." */
function textoDoAndamento(pendentes: number, comProblema: number, total: number) {
  if (pendentes === 1) return `Falta 1 de ${total}.`;
  if (pendentes > 1) return `Faltam ${pendentes} de ${total}.`;
  if (comProblema === 0) return "Tudo resolvido.";
  return comProblema === 1
    ? "Tudo registrado, mas 1 pessoa ainda tem problema."
    : `Tudo registrado, mas ${comProblema} pessoas ainda têm problema.`;
}

/** A fila não é tarefa a zerar: promover todo mundo lotaria o ônibus. */
function textoDaFila(naFila: number, vagas: number) {
  const fila =
    naFila === 0
      ? "Ninguém mais na fila"
      : `${naFila} ${naFila === 1 ? "pessoa" : "pessoas"} na fila`;
  const assentos =
    vagas === 0 ? "ônibus lotado" : `${vagas} ${vagas === 1 ? "vaga livre" : "vagas livres"}`;
  return `${fila} · ${assentos}.`;
}

const formatarData = (iso: string) =>
  new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(new Date(iso));

function classeValor(destaque?: "alerta" | "ok") {
  if (destaque === "alerta")
    return "text-2xl font-semibold text-red-600 tabular-nums dark:text-red-400";
  if (destaque === "ok")
    return "text-2xl font-semibold text-emerald-600 tabular-nums dark:text-emerald-400";
  return "text-2xl font-semibold tabular-nums";
}

function MioloDoCard({ card, clicavel }: { card: Card; clicavel: boolean }) {
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

// --- O que resolve cada card -------------------------------------------------

/** Botões do painel: largura toda no celular, e o texto quebra com letra grande. */
const CLASSE_BOTAO_DO_PAINEL = "h-auto min-h-11 w-full whitespace-normal sm:w-auto";

function LinkDaFicha({ membroId }: { membroId: string }) {
  return (
    <Link
      href={`/membros/${membroId}`}
      className="text-muted-foreground hover:text-foreground inline-flex min-h-11 items-center gap-1.5 text-sm underline-offset-4 hover:underline"
    >
      <UserRound className="size-4" aria-hidden="true" />
      Abrir a ficha completa
    </Link>
  );
}

function Dica({ children }: { children: React.ReactNode }) {
  return <p className="text-muted-foreground text-sm">{children}</p>;
}

function PromoverDaFila({
  inscrito,
  vagasRestantes,
  capacidade,
}: {
  inscrito: InscritoSerializado;
  vagasRestantes: number;
  capacidade: number;
}) {
  const [promovendo, iniciarTransicao] = useTransition();

  if (inscrito.situacao !== "FILA_ESPERA") {
    return <Dica>Já está no ônibus.</Dica>;
  }

  function promover() {
    iniciarTransicao(async () => {
      try {
        await promoverInscricao(inscrito.id);
        toast.success(`${inscrito.membro.nomeCompleto} subiu para o ônibus — avise!`);
      } catch (e) {
        toast.error(mensagemDeFalha(e, "promover"));
      }
    });
  }

  return (
    <div className="space-y-2">
      {vagasRestantes > 0 ? (
        <Dica>
          {vagasRestantes} {vagasRestantes === 1 ? "vaga livre" : "vagas livres"} no
          ônibus.
        </Dica>
      ) : (
        <p className="text-sm text-amber-700 dark:text-amber-300">
          O ônibus está lotado ({capacidade} assentos). Promover vai passar da
          capacidade — faça isso só se houver lugar de fato.
        </p>
      )}
      <Button onClick={promover} disabled={promovendo} className={CLASSE_BOTAO_DO_PAINEL}>
        <ArrowUp className="size-4" aria-hidden="true" />
        {promovendo ? "Promovendo..." : "Promover para o ônibus"}
      </Button>
    </div>
  );
}

function PainelDeResolucao({
  chave,
  inscrito,
  vagasRestantes,
  capacidade,
}: {
  chave: ChaveDeLista;
  inscrito: InscritoSerializado;
  vagasRestantes: number;
  capacidade: number;
}) {
  const { membro } = inscrito;

  switch (chave) {
    case "inscritos":
      return (
        <>
          <ChipsDaInscricao inscrito={inscrito} />
          <LinkDaFicha membroId={membro.id} />
        </>
      );

    case "fila":
      return (
        <PromoverDaFila
          inscrito={inscrito}
          vagasRestantes={vagasRestantes}
          capacidade={capacidade}
        />
      );

    case "ordenanca":
      return (
        <>
          <Dica>
            Escolha o que a pessoa vai fazer no templo. Se ela só vai acompanhar,
            escolha &quot;Só acompanha (jardins)&quot;.
          </Dica>
          <ChipAtividade inscrito={inscrito} />
        </>
      );

    case "recomendacao":
      return (
        <>
          <Dica>
            Na ficha: {ROTULO_RECOMENDACAO_TIPO[membro.recomendacaoTipo]}
            {membro.recomendacaoValidaAte
              ? `, válida até ${formatarData(membro.recomendacaoValidaAte)}`
              : membro.recomendacaoTipo === "NENHUMA"
                ? ""
                : ", sem data de validade registrada"}
            .
          </Dica>
          <ChipRecomendacao inscrito={inscrito} />
        </>
      );

    case "agendamento":
      return (
        <>
          <Dica>A pessoa já tem horário marcado no templo?</Dica>
          <ChipAgendamento inscrito={inscrito} />
        </>
      );

    case "atencao":
      return (
        <>
          <div className="space-y-1.5">
            <p className="text-sm font-medium">Nesta caravana</p>
            <Dica>
              Se a ordenança não combina com a recomendação, troque aqui — ou
              marque &quot;Só acompanha (jardins)&quot;.
            </Dica>
            <ChipAtividade inscrito={inscrito} opcoes={OPCOES_ATIVIDADE_DEFINIDA} />
          </div>
          <FormRecomendacaoDoMembro
            key={`${membro.recomendacaoTipo}-${membro.recomendacaoValidaAte ?? ""}`}
            membroId={membro.id}
            nome={membro.nomeCompleto}
            tipoInicial={membro.recomendacaoTipo}
            validaAteInicial={membro.recomendacaoValidaAte}
          />
          <LinkDaFicha membroId={membro.id} />
        </>
      );
  }
}

// --- Uma linha (um nome) do diálogo ------------------------------------------

function LinhaDoDialogo({
  chave,
  id,
  nomeAoAbrir,
  inscrito,
  expandida,
  aoAlternar,
  vagasRestantes,
  capacidade,
}: {
  chave: ChaveDeLista;
  id: string;
  /** O nome de quando o diálogo abriu — para dizer quem saiu da lista. */
  nomeAoAbrir: string;
  inscrito: InscritoSerializado | undefined;
  expandida: boolean;
  aoAlternar: () => void;
  vagasRestantes: number;
  capacidade: number;
}) {
  const linha = useRef<HTMLLIElement>(null);

  // O painel abre embaixo do nome. Num nome no pé da lista, ele nasceria fora
  // da tela e o toque pareceria não ter feito nada.
  useEffect(() => {
    if (expandida) linha.current?.scrollIntoView({ block: "nearest" });
  }, [expandida]);

  // Saiu da caravana (desistência ou remoção) enquanto o diálogo estava aberto.
  if (!inscrito) {
    return (
      <li ref={linha} className="text-muted-foreground px-2 py-3 text-sm">
        {nomeAoAbrir} saiu da lista (desistência ou remoção).
      </li>
    );
  }

  const desfecho = desfechoDaLinha(chave, inscrito);
  const numero =
    inscrito.situacao === "FILA_ESPERA" ? inscrito.posicaoFila : inscrito.ordem;
  const idDoPainel = `resolver-${id}`;
  const avisosVisiveis = chave === "atencao" ? inscrito.avisos : [];
  const classesDoTom = desfecho ? CLASSES_DO_TOM[desfecho.tom] : null;

  return (
    <li ref={linha} className="py-1">
      <button
        type="button"
        onClick={aoAlternar}
        aria-expanded={expandida}
        aria-controls={idDoPainel}
        className="hover:bg-muted focus-visible:ring-ring flex min-h-11 w-full items-start gap-3 rounded-md px-2 py-2 text-left focus-visible:ring-2 focus-visible:outline-none"
      >
        <span
          className={cn(
            "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-medium tabular-nums",
            classesDoTom ? classesDoTom.bolinha : "bg-muted text-muted-foreground",
          )}
          aria-hidden="true"
        >
          {!desfecho ? (
            numero
          ) : desfecho.tom === "ok" ? (
            <CheckCircle2 className="size-4" />
          ) : (
            <TriangleAlert className="size-4" />
          )}
        </span>

        <span className="min-w-0 flex-1">
          <span className="block font-medium break-words">
            {inscrito.membro.nomeCompleto}
            {inscrito.membro.apelido ? (
              <span className="text-muted-foreground font-normal">
                {" "}
                ({inscrito.membro.apelido})
              </span>
            ) : null}
          </span>
          <span className="text-muted-foreground block text-sm">
            {inscrito.membro.organizacao
              ? ROTULO_ORGANIZACAO_CURTO[inscrito.membro.organizacao]
              : "Sem organização"}
            {inscrito.membro.ehDeOutraUnidade ? ` · ${inscrito.membro.unidadeNome}` : ""}
          </span>
          {desfecho && classesDoTom ? (
            <span className={cn("block text-xs font-medium", classesDoTom.texto)}>
              {desfecho.texto}
            </span>
          ) : null}
        </span>

        {expandida ? (
          <ChevronDown className="text-muted-foreground mt-1 size-4 shrink-0" aria-hidden="true" />
        ) : (
          <ChevronRight className="text-muted-foreground mt-1 size-4 shrink-0" aria-hidden="true" />
        )}
      </button>

      {avisosVisiveis.length > 0 ? (
        <ul className="mt-0.5 mb-1 space-y-0.5 pl-2 sm:pl-12">
          {avisosVisiveis.map((aviso) => (
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

      {expandida ? (
        <div id={idDoPainel} className="space-y-3 pt-1 pr-2 pb-3 pl-2 sm:pl-12">
          <PainelDeResolucao
            chave={chave}
            inscrito={inscrito}
            vagasRestantes={vagasRestantes}
            capacidade={capacidade}
          />
        </div>
      ) : null}
    </li>
  );
}

// --- Cards + diálogo ---------------------------------------------------------

type CardAberto = {
  chave: ChaveDeLista;
  /** Quem o card mostrava na hora de abrir — a lista fica congelada. */
  ids: string[];
  nomes: Record<string, string>;
};

export function ContadoresDaCaravana({
  caravanaId,
  resumo,
  confirmados,
  naFila,
}: {
  caravanaId: string;
  resumo: ResumoDaCaravana;
  confirmados: InscritoSerializado[];
  naFila: InscritoSerializado[];
}) {
  const [aberto, setAberto] = useState<CardAberto | null>(null);
  const [expandida, setExpandida] = useState<string | null>(null);
  // Ao fechar, o foco volta ao card que abriu o diálogo (ou à grade, se o card
  // deixou de ser clicável porque não sobrou ninguém nele).
  const cardQueAbriu = useRef<HTMLButtonElement | null>(null);
  const grade = useRef<HTMLDivElement>(null);

  const todos = useMemo(() => [...confirmados, ...naFila], [confirmados, naFila]);
  const porId = useMemo(() => new Map(todos.map((i) => [i.id, i])), [todos]);

  const cards = useMemo<Card[]>(
    () => [
      {
        tipo: "lista",
        chave: "inscritos",
        rotulo: "Inscritos",
        valor: `${resumo.confirmados}/${resumo.capacidade}`,
        detalhe:
          resumo.vagasRestantes > 0
            ? `${resumo.vagasRestantes} vaga(s) livre(s)`
            : "Ônibus lotado",
        descricao: "Toque num nome para ver e mudar tudo sobre a pessoa nesta caravana.",
      },
      {
        tipo: "lista",
        chave: "fila",
        rotulo: "Fila de espera",
        valor: String(resumo.naFila),
        detalhe: resumo.naFila > 0 ? "Sobem se alguém desistir" : "Ninguém esperando",
        descricao: "Toque num nome para promover a pessoa para o ônibus.",
      },
      {
        tipo: "lista",
        chave: "atencao",
        rotulo: "Precisam de atenção",
        valor: String(resumo.comAvisoAlto),
        destaque: resumo.comAvisoAlto > 0 ? "alerta" : "ok",
        detalhe: "Podem ser barrados no templo",
        descricao:
          "Toque num nome para corrigir a ordenança ou a recomendação registrada na ficha.",
      },
      {
        tipo: "link",
        chave: "pedido",
        rotulo: "No pedido ao templo",
        valor: String(resumo.noPedidoDeGrupo),
        detalhe: "Sem as ordenanças próprias",
        href: `/caravanas/${caravanaId}/agendamento`,
      },
      {
        tipo: "lista",
        chave: "ordenanca",
        rotulo: "Ordenança a definir",
        valor: String(resumo.ordenancaPendente),
        destaque: resumo.ordenancaPendente > 0 ? "alerta" : "ok",
        descricao: "Toque num nome para escolher o que a pessoa vai fazer no templo.",
      },
      {
        tipo: "lista",
        chave: "recomendacao",
        rotulo: "Recomendação a conferir",
        valor: String(resumo.recomendacaoPendente),
        descricao: "Toque num nome para registrar a situação da recomendação.",
      },
      {
        tipo: "lista",
        chave: "agendamento",
        rotulo: "Agendamento a confirmar",
        valor: String(resumo.agendamentoPendente),
        descricao: "Toque num nome para confirmar o horário no templo.",
      },
      {
        tipo: "link",
        chave: "arrecadado",
        rotulo: "Arrecadado",
        valor: formatarDinheiro(resumo.totalArrecadado),
        detalhe:
          resumo.custoTotal > 0
            ? `de ${formatarDinheiro(resumo.custoTotal)} de custo`
            : `${resumo.pagamentoPendente} pagamento(s) pendente(s)`,
        href: `/caravanas/${caravanaId}/financeiro`,
      },
    ],
    [caravanaId, resumo],
  );

  function abrir(chave: ChaveDeLista, botao: HTMLButtonElement) {
    const doCard = todos.filter((i) => pertenceAoCard(chave, i));
    cardQueAbriu.current = botao;
    setAberto({
      chave,
      ids: doCard.map((i) => i.id),
      nomes: Object.fromEntries(doCard.map((i) => [i.id, i.membro.nomeCompleto])),
    });
    // Uma pessoa só: já abre o que resolve, sem toque extra.
    setExpandida(doCard.length === 1 ? doCard[0].id : null);
  }

  function fechar() {
    setAberto(null);
    setExpandida(null);
  }

  const cardAberto = aberto
    ? cards.find((c): c is CardLista => c.tipo === "lista" && c.chave === aberto.chave)
    : undefined;

  let andamento: string | null = null;
  if (aberto?.chave === "fila") {
    andamento = textoDaFila(resumo.naFila, resumo.vagasRestantes);
  } else if (aberto && aberto.chave !== "inscritos") {
    let pendentes = 0;
    let comProblema = 0;
    for (const id of aberto.ids) {
      const inscrito = porId.get(id);
      if (!inscrito) continue;
      const desfecho = desfechoDaLinha(aberto.chave, inscrito);
      if (!desfecho) pendentes++;
      else if (desfecho.tom !== "ok") comProblema++;
    }
    andamento = textoDoAndamento(pendentes, comProblema, aberto.ids.length);
  }

  return (
    <>
      <div
        ref={grade}
        tabIndex={-1}
        role="group"
        aria-label="Resumo da caravana"
        className="grid grid-cols-2 gap-3 outline-none lg:grid-cols-4"
      >
        {cards.map((card) => {
          const classeCard = "bg-card rounded-xl border transition-colors";

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

          const temAlguem = todos.some((i) => pertenceAoCard(card.chave, i));

          if (!temAlguem) {
            // Ninguém a mostrar (ex.: nenhuma pendência) — card estático.
            return (
              <div key={card.chave} className={classeCard}>
                <MioloDoCard card={card} clicavel={false} />
              </div>
            );
          }

          return (
            <button
              key={card.chave}
              type="button"
              aria-haspopup="dialog"
              onClick={(evento) => abrir(card.chave, evento.currentTarget)}
              className={cn(
                classeCard,
                "hover:border-primary/50 focus-visible:ring-ring w-full focus-visible:ring-2 focus-visible:outline-none",
              )}
            >
              <MioloDoCard card={card} clicavel />
            </button>
          );
        })}
      </div>

      <Dialog
        open={cardAberto !== undefined}
        onOpenChange={(estaAberto) => {
          if (!estaAberto) fechar();
        }}
      >
        <DialogContent
          className="flex max-h-[85vh] flex-col gap-3 sm:max-w-lg"
          onCloseAutoFocus={(evento) => {
            evento.preventDefault();
            const alvo = cardQueAbriu.current;
            (alvo?.isConnected ? alvo : grade.current)?.focus();
          }}
        >
          {cardAberto && aberto ? (
            <>
              <DialogHeader className="pr-8">
                <DialogTitle>
                  {cardAberto.rotulo} ({aberto.ids.length})
                </DialogTitle>
                <DialogDescription>
                  {cardAberto.descricao}
                  {andamento !== null ? (
                    <span
                      className="text-foreground mt-1 block font-medium"
                      aria-live="polite"
                    >
                      {andamento}
                    </span>
                  ) : null}
                </DialogDescription>
              </DialogHeader>

              <ul className="-mx-2 min-h-0 flex-1 divide-y overflow-y-auto px-2">
                {aberto.ids.map((id) => (
                  <LinhaDoDialogo
                    key={id}
                    chave={aberto.chave}
                    id={id}
                    nomeAoAbrir={aberto.nomes[id] ?? "Esta pessoa"}
                    inscrito={porId.get(id)}
                    expandida={expandida === id}
                    aoAlternar={() => setExpandida((atual) => (atual === id ? null : id))}
                    vagasRestantes={resumo.vagasRestantes}
                    capacidade={resumo.capacidade}
                  />
                ))}
              </ul>

              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline" className="min-h-11 w-full sm:w-auto">
                    Fechar
                  </Button>
                </DialogClose>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
