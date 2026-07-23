"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, FileSpreadsheet, TriangleAlert, Upload } from "lucide-react";
import { toast } from "sonner";
import {
  analisarArquivo,
  confirmarImportacao,
  type EntradaDaImportacao,
  type LinhaComDuplicatas,
  type PreviaDaImportacao,
} from "@/app/acoes/importacao";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ROTULO_ORDENANCA, ROTULO_ORGANIZACAO_CURTO } from "@/lib/dominio";
import { cn } from "@/lib/utils";

type LinhaRevisada = LinhaComDuplicatas & {
  incluir: boolean;
  nomeRevisado: string;
  membroExistenteId: string | null;
};

export function Importador({
  unidades,
}: {
  unidades: Array<{ id: string; nome: string }>;
}) {
  const router = useRouter();
  const [previa, setPrevia] = useState<PreviaDaImportacao | null>(null);
  const [linhas, setLinhas] = useState<LinhaRevisada[]>([]);
  const [caravana, setCaravana] = useState({
    titulo: "",
    data: "",
    templo: "",
    capacidadeAssentos: "46",
    unidadeOrganizadoraId: unidades[0]?.id ?? "",
  });
  const [erro, setErro] = useState<string | null>(null);
  const [processando, iniciarTransicao] = useTransition();

  function enviarArquivo(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErro(null);
    const dadosDoFormulario = new FormData(evento.currentTarget);

    iniciarTransicao(async () => {
      try {
        const resultado = await analisarArquivo(dadosDoFormulario);
        setPrevia(resultado);
        setLinhas(
          resultado.linhas.map((l) => ({
            ...l,
            incluir: true,
            nomeRevisado: l.nomeSugerido,
            // Duplicata muito provável já vem pré-selecionada, mas visível para
            // a pessoa desfazer — juntar cadastros por engano é pior que duplicar.
            membroExistenteId:
              l.duplicatas[0] && l.duplicatas[0].similaridade >= 0.95
                ? l.duplicatas[0].candidato.id
                : null,
          })),
        );
        setCaravana((c) => ({
          ...c,
          titulo: resultado.tituloDaCaravana ?? c.titulo,
          unidadeOrganizadoraId:
            resultado.unidades[0]?.id ?? c.unidadeOrganizadoraId,
        }));
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Não foi possível ler o arquivo.");
      }
    });
  }

  function alterarLinha(indice: number, mudanca: Partial<LinhaRevisada>) {
    setLinhas((atuais) =>
      atuais.map((l, i) => (i === indice ? { ...l, ...mudanca } : l)),
    );
  }

  function importar() {
    setErro(null);

    const capacidade = Number(caravana.capacidadeAssentos);
    if (!caravana.titulo.trim() || !caravana.data || !caravana.templo.trim()) {
      setErro("Preencha título, data e templo da caravana.");
      return;
    }
    if (!Number.isInteger(capacidade) || capacidade < 1) {
      setErro("Informe quantos assentos o ônibus tem.");
      return;
    }

    const faltandoNome = linhas.filter(
      (l) => l.incluir && !l.membroExistenteId && l.nomeRevisado.trim().length < 2,
    );
    if (faltandoNome.length > 0) {
      setErro(
        `${faltandoNome.length} linha(s) sem nome. Preencha o nome ou desmarque para não importar.`,
      );
      return;
    }

    const entrada: EntradaDaImportacao = {
      caravana: { ...caravana, capacidadeAssentos: capacidade },
      linhas: linhas.map((l) => ({
        incluir: l.incluir,
        nomeCompleto: l.nomeRevisado.trim(),
        apelido: l.apelido,
        membroExistenteId: l.membroExistenteId,
        organizacao: l.organizacao,
        ehPesquisador: l.ehPesquisador,
        recemConverso: l.recemConverso,
        observacao: l.observacao,
        participacao: l.participacao,
        ordenanca: l.ordenanca,
        recomendacaoStatus: l.recomendacaoStatus,
        agendamentoStatus: l.agendamentoStatus,
        nomesDeFamilia: l.nomesDeFamilia,
        pagamentoStatus: l.pagamentoStatus,
        incluidoNoAgendamentoGrupo: l.incluidoNoAgendamentoGrupo,
        precisaAjudaEntrevista: l.precisaAjudaEntrevista,
        precisaAjudaNomes: l.precisaAjudaNomes,
        naFilaDeEspera: l.naFilaDeEspera,
      })),
    };

    iniciarTransicao(async () => {
      try {
        const resultado = await confirmarImportacao(entrada);
        toast.success(
          `Importado: ${resultado.inscricoesCriadas} inscrições, ${resultado.membrosCriados} membros novos, ${resultado.naFila} na fila.`,
        );
        router.push(`/caravanas/${resultado.caravanaId}`);
      } catch (e) {
        setErro(e instanceof Error ? e.message : "A importação falhou.");
      }
    });
  }

  if (!previa) {
    return (
      <form onSubmit={enviarArquivo} className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileSpreadsheet className="size-5" aria-hidden="true" />
              Escolha a planilha
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="arquivo">Arquivo .xlsx</Label>
              <Input
                id="arquivo"
                name="arquivo"
                type="file"
                accept=".xlsx"
                required
                className="h-11 py-2"
              />
            </div>
            <p className="text-muted-foreground text-sm">
              Nada é gravado agora. Primeiro mostramos tudo o que foi lido, para
              você conferir e corrigir — principalmente as linhas sem nome.
            </p>
            <Button type="submit" disabled={processando} className="min-h-11">
              <Upload className="size-4" aria-hidden="true" />
              {processando ? "Lendo..." : "Ler planilha"}
            </Button>
          </CardContent>
        </Card>

        {erro ? (
          <Alert variant="destructive">
            <AlertDescription>{erro}</AlertDescription>
          </Alert>
        ) : null}
      </form>
    );
  }

  const aImportar = linhas.filter((l) => l.incluir).length;
  const aindaSemNome = linhas.filter(
    (l) => l.incluir && !l.membroExistenteId && l.nomeRevisado.trim().length < 2,
  ).length;

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-4">
        <Resumo rotulo="Linhas lidas" valor={previa.totalDeLinhasLidas} />
        <Resumo rotulo="Serão importadas" valor={aImportar} />
        <Resumo
          rotulo="Sem nome"
          valor={aindaSemNome}
          alerta={aindaSemNome > 0}
        />
        <Resumo
          rotulo="Possíveis duplicatas"
          valor={previa.comDuplicataProvavel}
          alerta={previa.comDuplicataProvavel > 0}
        />
      </div>

      {previa.semNome > 0 ? (
        <Alert>
          <TriangleAlert className="size-4" aria-hidden="true" />
          <AlertTitle>{previa.semNome} linha(s) vieram sem nome</AlertTitle>
          <AlertDescription>
            Elas têm organização e status preenchidos, mas ninguém sabe de quem
            são. Preencha o nome abaixo ou desmarque para deixá-las de fora —
            elas estão destacadas.
          </AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Dados da caravana</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="imp-titulo">Título</Label>
            <Input
              id="imp-titulo"
              className="h-11"
              value={caravana.titulo}
              onChange={(e) => setCaravana({ ...caravana, titulo: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="imp-data">Data</Label>
            <Input
              id="imp-data"
              type="date"
              className="h-11"
              value={caravana.data}
              onChange={(e) => setCaravana({ ...caravana, data: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="imp-templo">Templo</Label>
            <Input
              id="imp-templo"
              className="h-11"
              value={caravana.templo}
              onChange={(e) => setCaravana({ ...caravana, templo: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="imp-capacidade">Assentos no ônibus</Label>
            <Input
              id="imp-capacidade"
              type="number"
              min={1}
              className="h-11"
              value={caravana.capacidadeAssentos}
              onChange={(e) =>
                setCaravana({ ...caravana, capacidadeAssentos: e.target.value })
              }
            />
            <p className="text-muted-foreground text-xs">
              A planilha não guardava isso. Quem passar da capacidade vai para a
              fila de espera.
            </p>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="imp-unidade">Unidade organizadora</Label>
            <select
              id="imp-unidade"
              className="border-input bg-background h-11 w-full rounded-md border px-3 text-sm"
              value={caravana.unidadeOrganizadoraId}
              onChange={(e) =>
                setCaravana({ ...caravana, unidadeOrganizadoraId: e.target.value })
              }
            >
              {previa.unidades.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nome}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Conferir as pessoas</h2>

        <ul className="space-y-2">
          {linhas.map((linha, indice) => (
            <li
              key={`${linha.linhaNaPlanilha}-${indice}`}
              className={cn(
                "bg-card rounded-lg border p-3",
                linha.semNome && "border-amber-400 dark:border-amber-700",
                !linha.incluir && "opacity-50",
              )}
            >
              <div className="flex items-start gap-3">
                <Checkbox
                  checked={linha.incluir}
                  onCheckedChange={(marcado) =>
                    alterarLinha(indice, { incluir: marcado === true })
                  }
                  className="mt-2.5 size-5"
                  aria-label={`Importar a linha ${linha.linhaNaPlanilha}`}
                />

                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Label
                      htmlFor={`nome-${indice}`}
                      className="text-muted-foreground text-xs"
                    >
                      Linha {linha.linhaNaPlanilha}
                    </Label>
                    {linha.naFilaDeEspera ? (
                      <Badge variant="outline">Fila de espera</Badge>
                    ) : null}
                    {linha.ehPesquisador ? (
                      <Badge variant="secondary">Pesquisador</Badge>
                    ) : null}
                    {linha.recemConverso ? (
                      <Badge variant="secondary">Recém-converso</Badge>
                    ) : null}
                    {linha.organizacao ? (
                      <Badge variant="outline">
                        {ROTULO_ORGANIZACAO_CURTO[linha.organizacao]}
                      </Badge>
                    ) : null}
                    {linha.participacao === "ACOMPANHANTE_JARDINS" ? (
                      <Badge variant="outline">Jardins</Badge>
                    ) : linha.ordenanca ? (
                      <Badge variant="outline">
                        {ROTULO_ORDENANCA[linha.ordenanca]}
                      </Badge>
                    ) : (
                      <Badge variant="outline">Ordenança pendente</Badge>
                    )}
                  </div>

                  <Input
                    id={`nome-${indice}`}
                    value={linha.nomeRevisado}
                    onChange={(e) =>
                      alterarLinha(indice, { nomeRevisado: e.target.value })
                    }
                    placeholder={
                      linha.semNome
                        ? "Sem nome na planilha — quem é esta pessoa?"
                        : "Nome completo"
                    }
                    className="h-11"
                    disabled={!linha.incluir || Boolean(linha.membroExistenteId)}
                  />

                  {linha.duplicatas.length > 0 ? (
                    <div className="space-y-1">
                      <Label
                        htmlFor={`dup-${indice}`}
                        className="text-muted-foreground text-xs"
                      >
                        Parece já existir no cadastro
                      </Label>
                      <select
                        id={`dup-${indice}`}
                        className="border-input bg-background h-11 w-full rounded-md border px-3 text-sm"
                        value={linha.membroExistenteId ?? ""}
                        onChange={(e) =>
                          alterarLinha(indice, {
                            membroExistenteId: e.target.value || null,
                          })
                        }
                        disabled={!linha.incluir}
                      >
                        <option value="">Criar um cadastro novo</option>
                        {linha.duplicatas.map((d) => (
                          <option key={d.candidato.id} value={d.candidato.id}>
                            Usar {d.candidato.nomeCompleto} (
                            {d.candidato.unidadeNome},{" "}
                            {Math.round(d.similaridade * 100)}% parecido)
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : null}

                  {linha.observacao ? (
                    <p className="text-muted-foreground text-sm">
                      Observação da planilha: {linha.observacao}
                    </p>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {erro ? (
        <Alert variant="destructive">
          <AlertDescription>{erro}</AlertDescription>
        </Alert>
      ) : null}

      <div className="bg-background sticky bottom-0 flex flex-wrap gap-3 border-t py-4">
        <Button onClick={importar} disabled={processando} className="min-h-11">
          <CheckCircle2 className="size-4" aria-hidden="true" />
          {processando ? "Importando..." : `Importar ${aImportar} pessoa(s)`}
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            setPrevia(null);
            setLinhas([]);
          }}
          disabled={processando}
          className="min-h-11"
        >
          Escolher outro arquivo
        </Button>
      </div>
    </div>
  );
}

function Resumo({
  rotulo,
  valor,
  alerta,
}: {
  rotulo: string;
  valor: number;
  alerta?: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-muted-foreground text-sm">{rotulo}</p>
        <p
          className={cn(
            "text-2xl font-semibold tabular-nums",
            alerta && "text-amber-600 dark:text-amber-400",
          )}
        >
          {valor}
        </p>
      </CardContent>
    </Card>
  );
}
