"use client";

import { useState, useTransition } from "react";
import { Copy, Phone, Send, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { salvarPedidoDeAgendamento } from "@/app/acoes/agendamento";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ROTULO_ORDENANCA, type LinhaDoPedidoDeGrupo } from "@/lib/dominio";
import type { CanalAgendamento, Ordenanca } from "@/generated/prisma/enums";

export function PedidoDeAgendamento({
  caravanaId,
  texto,
  linhas,
  ordenancasProprias,
  semSexoInformado,
  inicial,
}: {
  caravanaId: string;
  texto: string;
  linhas: LinhaDoPedidoDeGrupo[];
  ordenancasProprias: string[];
  semSexoInformado: number;
  inicial: {
    canal: CanalAgendamento;
    enviado: boolean;
    confirmado: boolean;
    referencia: string;
    observacoes: string;
    vagas: Record<string, number>;
  };
}) {
  const [canal, setCanal] = useState(inicial.canal);
  const [enviado, setEnviado] = useState(inicial.enviado);
  const [confirmado, setConfirmado] = useState(inicial.confirmado);
  const [referencia, setReferencia] = useState(inicial.referencia);
  const [observacoes, setObservacoes] = useState(inicial.observacoes);
  const [vagas, setVagas] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      linhas.map((l) => [l.ordenanca, String(inicial.vagas[l.ordenanca] ?? "")]),
    ),
  );
  const [salvando, iniciarTransicao] = useTransition();

  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto);
      toast.success("Texto copiado. É só colar no e-mail para o templo.");
    } catch {
      toast.error("Não deu para copiar. Selecione o texto e copie à mão.");
    }
  }

  function salvar() {
    iniciarTransicao(async () => {
      try {
        await salvarPedidoDeAgendamento({
          caravanaId,
          canal,
          enviado,
          confirmado,
          referencia: referencia.trim() || null,
          observacoes: observacoes.trim() || null,
          vagas: linhas.map((l) => ({
            ordenanca: l.ordenanca,
            vagasConfirmadas: Number(vagas[l.ordenanca] || 0),
          })),
        });
        toast.success("Agendamento salvo.");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Não foi possível salvar.");
      }
    });
  }

  if (linhas.length === 0) {
    return (
      <Alert>
        <TriangleAlert className="size-4" aria-hidden="true" />
        <AlertTitle>Ainda não há o que pedir ao templo</AlertTitle>
        <AlertDescription>
          O pedido é montado a partir dos inscritos confirmados que já têm
          ordenança definida. Defina as ordenanças na lista da caravana e volte
          aqui.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">O que vai no pedido</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <ul className="divide-y">
            {linhas.map((linha) => (
              <li
                key={linha.ordenanca}
                className="flex flex-wrap items-center justify-between gap-2 py-2"
              >
                <span className="font-medium">
                  {ROTULO_ORDENANCA[linha.ordenanca]}
                </span>
                <span className="text-muted-foreground text-sm tabular-nums">
                  {linha.total} pessoa(s) · {linha.homens} h · {linha.mulheres} m
                  {linha.semSexoInformado > 0
                    ? ` · ${linha.semSexoInformado} sem sexo informado`
                    : ""}
                </span>
              </li>
            ))}
          </ul>

          {semSexoInformado > 0 ? (
            <Alert>
              <TriangleAlert className="size-4" aria-hidden="true" />
              <AlertDescription>
                {semSexoInformado} pessoa(s) sem sexo informado. O templo pede a
                contagem de homens e mulheres — vale preencher na ficha antes de
                enviar.
              </AlertDescription>
            </Alert>
          ) : null}

          {ordenancasProprias.length > 0 ? (
            <Alert>
              <Phone className="size-4" aria-hidden="true" />
              <AlertTitle>Fora deste pedido: agendar por telefone</AlertTitle>
              <AlertDescription>
                <ul className="mt-1 list-disc space-y-1 pl-4">
                  {ordenancasProprias.map((linha) => (
                    <li key={linha}>{linha}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Texto para enviar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <pre className="bg-muted max-h-96 overflow-auto rounded-md p-3 text-sm whitespace-pre-wrap">
            {texto}
          </pre>
          <Button onClick={copiar} className="min-h-11">
            <Copy className="size-4" aria-hidden="true" />
            Copiar texto
          </Button>
          <p className="text-muted-foreground text-sm">
            Alas e estacas agendam por e-mail ou telefone direto com o templo —
            o agendamento on-line em grupo atende só grupos pequenos.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Situação do agendamento</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="canal">Como foi feito o contato</Label>
            <select
              id="canal"
              value={canal}
              onChange={(e) => setCanal(e.target.value as CanalAgendamento)}
              className="border-input bg-background h-11 w-full rounded-md border px-3 text-sm sm:max-w-xs"
            >
              <option value="EMAIL">E-mail</option>
              <option value="TELEFONE">Telefone</option>
              <option value="ONLINE">Site do templo</option>
            </select>
          </div>

          <div className="flex items-center gap-3">
            <Checkbox
              id="enviado"
              checked={enviado}
              onCheckedChange={(m) => setEnviado(m === true)}
              className="size-5"
            />
            <Label htmlFor="enviado" className="font-normal">
              Já enviei o pedido
            </Label>
          </div>

          <div className="flex items-center gap-3">
            <Checkbox
              id="confirmado"
              checked={confirmado}
              onCheckedChange={(m) => setConfirmado(m === true)}
              className="size-5"
            />
            <Label htmlFor="confirmado" className="font-normal">
              O templo confirmou
            </Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="referencia">Protocolo ou confirmação do templo</Label>
            <Input
              id="referencia"
              value={referencia}
              onChange={(e) => setReferencia(e.target.value)}
              placeholder="Ex.: confirmado por e-mail, 14h no batistério"
              className="h-11"
            />
          </div>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">
              Vagas confirmadas pelo templo
            </legend>
            <p className="text-muted-foreground text-sm">
              Preencha depois da resposta. O painel passa a comparar isto com o
              número de inscritos.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {linhas.map((linha) => (
                <div key={linha.ordenanca} className="space-y-1">
                  <Label htmlFor={`vaga-${linha.ordenanca}`} className="text-sm">
                    {ROTULO_ORDENANCA[linha.ordenanca]}
                  </Label>
                  <Input
                    id={`vaga-${linha.ordenanca}`}
                    type="number"
                    min={0}
                    inputMode="numeric"
                    value={vagas[linha.ordenanca] ?? ""}
                    onChange={(e) =>
                      setVagas((v) => ({
                        ...v,
                        [linha.ordenanca as Ordenanca]: e.target.value,
                      }))
                    }
                    placeholder={String(linha.total)}
                    className="h-11"
                  />
                </div>
              ))}
            </div>
          </fieldset>

          <div className="space-y-2">
            <Label htmlFor="obs-agendamento">Observações</Label>
            <Textarea
              id="obs-agendamento"
              rows={3}
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
            />
          </div>

          <Button onClick={salvar} disabled={salvando} className="min-h-11">
            <Send className="size-4" aria-hidden="true" />
            {salvando ? "Salvando..." : "Salvar agendamento"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
