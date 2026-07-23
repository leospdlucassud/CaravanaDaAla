import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { ROTULO_ORDENANCA, ROTULO_ORGANIZACAO_CURTO } from "@/lib/dominio";
import { BotaoImprimir } from "@/components/botao-imprimir";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Lista de presença" };

/**
 * Lista de presença para levar no ônibus.
 *
 * Não geramos PDF por biblioteca de propósito: a impressão do navegador já
 * produz PDF, imprime em papel, e não acrescenta dependência nenhuma. O que
 * importa é a folha funcionar sem internet depois de impressa — e papel é o
 * offline mais confiável que existe.
 */
export default async function PaginaDePresenca({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const caravana = await prisma.caravana.findUnique({
    where: { id },
    select: {
      id: true,
      titulo: true,
      data: true,
      templo: true,
      horaSaida: true,
      horaRetornoPrevista: true,
      pontoEncontro: true,
      responsavel: true,
      capacidadeAssentos: true,
      inscricoes: {
        where: { situacao: { in: ["CONFIRMADA", "FILA_ESPERA"] } },
        orderBy: [{ situacao: "asc" }, { ordem: "asc" }, { posicaoFila: "asc" }],
        select: {
          situacao: true,
          ordem: true,
          posicaoFila: true,
          participacao: true,
          ordenanca: true,
          membro: {
            select: {
              nomeCompleto: true,
              organizacao: true,
              telefone: true,
            },
          },
        },
      },
    },
  });

  if (!caravana) notFound();

  const confirmados = caravana.inscricoes.filter((i) => i.situacao === "CONFIRMADA");
  const naFila = caravana.inscricoes.filter((i) => i.situacao === "FILA_ESPERA");

  const dataPorExtenso = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(caravana.data);

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="space-y-2 print:hidden">
        <Button asChild variant="ghost" className="-ml-3 min-h-11">
          <Link href={`/caravanas/${caravana.id}`}>
            <ArrowLeft className="size-4" aria-hidden="true" />
            Voltar para a caravana
          </Link>
        </Button>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold">Lista de presença</h1>
          <BotaoImprimir />
        </div>
        <p className="text-muted-foreground text-sm">
          Ao imprimir, escolha &quot;Salvar como PDF&quot; se quiser o arquivo.
          A folha impressa funciona sem internet — leve no ônibus.
        </p>
      </div>

      <article className="space-y-4 print:text-black">
        <header className="border-b pb-3">
          <h2 className="text-xl font-bold">{caravana.titulo}</h2>
          <p className="text-sm">
            {dataPorExtenso} · Templo de {caravana.templo}
          </p>
          <p className="text-sm">
            {caravana.horaSaida ? `Saída às ${caravana.horaSaida}` : "Saída a definir"}
            {caravana.pontoEncontro ? ` · ${caravana.pontoEncontro}` : ""}
            {caravana.horaRetornoPrevista
              ? ` · retorno previsto às ${caravana.horaRetornoPrevista}`
              : ""}
          </p>
          <p className="text-sm">
            {confirmados.length} de {caravana.capacidadeAssentos} assentos
            {caravana.responsavel ? ` · Responsável: ${caravana.responsavel}` : ""}
          </p>
        </header>

        <Tabela
          titulo="Confirmados"
          linhas={confirmados.map((i) => ({
            numero: i.ordem,
            nome: i.membro.nomeCompleto,
            organizacao: i.membro.organizacao
              ? ROTULO_ORGANIZACAO_CURTO[i.membro.organizacao]
              : "—",
            atividade:
              i.participacao === "ACOMPANHANTE_JARDINS"
                ? "Jardins"
                : i.ordenanca
                  ? ROTULO_ORDENANCA[i.ordenanca]
                  : "A definir",
            telefone: i.membro.telefone ?? "",
          }))}
        />

        {naFila.length > 0 ? (
          <Tabela
            titulo="Fila de espera"
            linhas={naFila.map((i) => ({
              numero: i.posicaoFila ?? 0,
              nome: i.membro.nomeCompleto,
              organizacao: i.membro.organizacao
                ? ROTULO_ORGANIZACAO_CURTO[i.membro.organizacao]
                : "—",
              atividade:
                i.participacao === "ACOMPANHANTE_JARDINS"
                  ? "Jardins"
                  : i.ordenanca
                    ? ROTULO_ORDENANCA[i.ordenanca]
                    : "A definir",
              telefone: i.membro.telefone ?? "",
            }))}
          />
        ) : null}

        <p className="text-xs print:mt-6">
          Confira a lista na ida e na volta. Ninguém fica para trás.
        </p>
      </article>
    </div>
  );
}

function Tabela({
  titulo,
  linhas,
}: {
  titulo: string;
  linhas: Array<{
    numero: number;
    nome: string;
    organizacao: string;
    atividade: string;
    telefone: string;
  }>;
}) {
  if (linhas.length === 0) return null;

  return (
    <section className="break-inside-auto">
      <h3 className="mb-2 font-semibold">
        {titulo} ({linhas.length})
      </h3>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b text-left">
            <th className="w-10 py-1">N°</th>
            <th className="py-1">Nome</th>
            <th className="w-24 py-1">Organização</th>
            <th className="w-32 py-1">No templo</th>
            <th className="w-28 py-1">Telefone</th>
            <th className="w-14 py-1 text-center">Ida</th>
            <th className="w-14 py-1 text-center">Volta</th>
          </tr>
        </thead>
        <tbody>
          {linhas.map((linha) => (
            <tr key={`${linha.numero}-${linha.nome}`} className="break-inside-avoid border-b">
              <td className="py-1.5 tabular-nums">{linha.numero}</td>
              <td className="py-1.5">{linha.nome}</td>
              <td className="py-1.5">{linha.organizacao}</td>
              <td className="py-1.5">{linha.atividade}</td>
              <td className="py-1.5 tabular-nums">{linha.telefone}</td>
              {/* Quadradinhos para marcar à caneta: a folha precisa servir
                  mesmo quando o celular estiver sem bateria. */}
              <td className="py-1.5 text-center">
                <span className="inline-block size-4 border border-current" />
              </td>
              <td className="py-1.5 text-center">
                <span className="inline-block size-4 border border-current" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
