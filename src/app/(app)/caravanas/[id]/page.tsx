import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CalendarDays, Clock, MapPin } from "lucide-react";
import { AcoesDaCaravana } from "@/components/acoes-da-caravana";
import { carregarInscritos, resumir } from "@/lib/consultas";
import {
  caravanaEstaAtiva,
  ROTULO_STATUS_CARAVANA,
  rotuloGrupoCaravana,
} from "@/lib/dominio";
import {
  ListaDeInscritos,
  type InscritoSerializado,
} from "@/components/lista-de-inscritos";
import { Badge } from "@/components/ui/badge";
import { ContadoresDaCaravana } from "@/components/contadores-da-caravana";

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

const formatarData = (data: Date) =>
  new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(data);

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
              <Badge variant={caravanaEstaAtiva(caravana.status) ? "default" : "secondary"}>
                {rotuloGrupoCaravana(caravana.status)}
              </Badge>
              <span className="text-muted-foreground text-sm">
                {ROTULO_STATUS_CARAVANA[caravana.status]}
              </span>
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

          <AcoesDaCaravana caravanaId={caravana.id} statusAtual={caravana.status} />
        </div>
      </header>

      <section aria-label="Resumo da caravana">
        <ContadoresDaCaravana
          caravanaId={caravana.id}
          resumo={resumo}
          confirmados={confirmados}
          naFila={naFila}
        />
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
