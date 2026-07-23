import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CalendarDays,
  ClipboardCheck,
  Clock,
  MapPin,
  Pencil,
  Send,
  UserPlus,
} from "lucide-react";
import { carregarInscritos, resumir } from "@/lib/consultas";
import { ROTULO_STATUS_CARAVANA } from "@/lib/dominio";
import {
  ListaDeInscritos,
  type InscritoSerializado,
} from "@/components/lista-de-inscritos";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  try {
    const { caravana } = await carregarInscritos(id);
    return { title: caravana.titulo };
  } catch {
    return { title: "Caravana" };
  }
}

function Contador({
  rotulo,
  valor,
  detalhe,
  destaque,
}: {
  rotulo: string;
  valor: string | number;
  detalhe?: string;
  destaque?: "alerta" | "ok";
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-muted-foreground text-sm">{rotulo}</p>
        <p
          className={
            destaque === "alerta"
              ? "text-2xl font-semibold text-red-600 tabular-nums dark:text-red-400"
              : destaque === "ok"
                ? "text-2xl font-semibold text-emerald-600 tabular-nums dark:text-emerald-400"
                : "text-2xl font-semibold tabular-nums"
          }
        >
          {valor}
        </p>
        {detalhe ? (
          <p className="text-muted-foreground text-xs">{detalhe}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

const formatarData = (data: Date) =>
  new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(data);

const formatarDinheiro = (valor: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor);

export default async function PaginaDaCaravana({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let dados: Awaited<ReturnType<typeof carregarInscritos>>;
  try {
    dados = await carregarInscritos(id);
  } catch {
    notFound();
  }

  const { caravana, inscritos } = dados;
  const resumo = resumir(inscritos, caravana);

  const serializar = (i: (typeof inscritos)[number]): InscritoSerializado => ({
    id: i.id,
    ordem: i.ordem,
    posicaoFila: i.posicaoFila,
    situacao: i.situacao,
    participacao: i.participacao,
    ordenanca: i.ordenanca,
    recomendacaoStatus: i.recomendacaoStatus,
    agendamentoStatus: i.agendamentoStatus,
    nomesDeFamilia: i.nomesDeFamilia,
    pagamentoStatus: i.pagamentoStatus,
    avisos: i.avisos,
    membro: {
      id: i.membro.id,
      nomeCompleto: i.membro.nomeCompleto,
      apelido: i.membro.apelido,
      organizacao: i.membro.organizacao,
      unidadeNome: i.membro.unidade.nome,
      ehDeOutraUnidade: i.membro.unidadeId !== caravana.unidadeOrganizadoraId,
      tipoVinculo: i.membro.tipoVinculo,
      recemConverso: i.membro.recemConverso,
    },
  });

  const confirmados = inscritos.filter((i) => i.situacao === "CONFIRMADA").map(serializar);
  const naFila = inscritos.filter((i) => i.situacao === "FILA_ESPERA").map(serializar);

  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold">{caravana.titulo}</h1>
              <Badge variant="secondary">
                {ROTULO_STATUS_CARAVANA[caravana.status]}
              </Badge>
            </div>
            <p className="text-muted-foreground mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              <span className="flex items-center gap-1.5">
                <CalendarDays className="size-4" aria-hidden="true" />
                {formatarData(caravana.data)}
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin className="size-4" aria-hidden="true" />
                Templo de {caravana.templo}
              </span>
              {caravana.horaSaida ? (
                <span className="flex items-center gap-1.5">
                  <Clock className="size-4" aria-hidden="true" />
                  Saída às {caravana.horaSaida}
                  {caravana.pontoEncontro ? ` · ${caravana.pontoEncontro}` : ""}
                </span>
              ) : null}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" className="min-h-11">
              <Link href={`/caravanas/${caravana.id}/editar`}>
                <Pencil className="size-4" aria-hidden="true" />
                Editar
              </Link>
            </Button>
            <Button asChild variant="outline" className="min-h-11">
              <Link href={`/caravanas/${caravana.id}/agendamento`}>
                <Send className="size-4" aria-hidden="true" />
                Agendamento
              </Link>
            </Button>
            <Button asChild variant="outline" className="min-h-11">
              <Link href={`/caravanas/${caravana.id}/embarque`}>
                <ClipboardCheck className="size-4" aria-hidden="true" />
                Embarque
              </Link>
            </Button>
            <Button asChild className="min-h-11">
              <Link href={`/caravanas/${caravana.id}/inscrever`}>
                <UserPlus className="size-4" aria-hidden="true" />
                Inscrever
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <section aria-label="Resumo da caravana">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Contador
            rotulo="Inscritos"
            valor={`${resumo.confirmados}/${resumo.capacidade}`}
            detalhe={
              resumo.vagasRestantes > 0
                ? `${resumo.vagasRestantes} vaga(s) livre(s)`
                : "Ônibus lotado"
            }
          />
          <Contador
            rotulo="Fila de espera"
            valor={resumo.naFila}
            detalhe={resumo.naFila > 0 ? "Sobem se alguém desistir" : "Ninguém esperando"}
          />
          <Contador
            rotulo="Precisam de atenção"
            valor={resumo.comAvisoAlto}
            destaque={resumo.comAvisoAlto > 0 ? "alerta" : "ok"}
            detalhe="Podem ser barrados no templo"
          />
          <Contador
            rotulo="No pedido ao templo"
            valor={resumo.noPedidoDeGrupo}
            detalhe="Sem as ordenanças próprias"
          />
          <Contador
            rotulo="Ordenança a definir"
            valor={resumo.ordenancaPendente}
            destaque={resumo.ordenancaPendente > 0 ? "alerta" : "ok"}
          />
          <Contador
            rotulo="Recomendação a conferir"
            valor={resumo.recomendacaoPendente}
          />
          <Contador rotulo="Agendamento a confirmar" valor={resumo.agendamentoPendente} />
          <Contador
            rotulo="Arrecadado"
            valor={formatarDinheiro(resumo.totalArrecadado)}
            detalhe={
              resumo.custoTotal > 0
                ? `de ${formatarDinheiro(resumo.custoTotal)} de custo`
                : `${resumo.pagamentoPendente} pagamento(s) pendente(s)`
            }
          />
        </div>
      </section>

      <ListaDeInscritos
        inscritos={confirmados}
        titulo="Inscritos confirmados"
        vazio="Ninguém inscrito ainda."
      />

      {naFila.length > 0 ? (
        <ListaDeInscritos
          inscritos={naFila}
          titulo="Fila de espera"
          vazio="Fila vazia."
        />
      ) : null}
    </div>
  );
}
