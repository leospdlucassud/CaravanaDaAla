"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { criarCaravana, atualizarCaravana } from "@/app/acoes/caravanas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { ROTULO_STATUS_CARAVANA } from "@/lib/dominio";
import type { StatusCaravana } from "@/generated/prisma/enums";
import { mensagemDeFalha } from "@/lib/falha";

export type ValoresDaCaravana = {
  titulo: string;
  data: string;
  templo: string;
  unidadeOrganizadoraId: string;
  responsavel: string;
  horaSaida: string;
  horaRetornoPrevista: string;
  pontoEncontro: string;
  capacidadeAssentos: string;
  valorPorPessoa: string;
  custoTotalTransporte: string;
  status: StatusCaravana;
  observacoes: string;
};

const VAZIO: ValoresDaCaravana = {
  titulo: "",
  data: "",
  templo: "",
  unidadeOrganizadoraId: "",
  responsavel: "",
  horaSaida: "",
  horaRetornoPrevista: "",
  pontoEncontro: "",
  capacidadeAssentos: "",
  valorPorPessoa: "",
  custoTotalTransporte: "",
  status: "PLANEJAMENTO",
  observacoes: "",
};

function paraNumeroOuNulo(texto: string): number | null {
  const limpo = texto.trim().replace(",", ".");
  if (!limpo) return null;
  const numero = Number(limpo);
  return Number.isFinite(numero) ? numero : null;
}

export function FormularioDeCaravana({
  unidades,
  caravanaId,
  valoresIniciais,
}: {
  unidades: Array<{ id: string; nome: string }>;
  caravanaId?: string;
  valoresIniciais?: Partial<ValoresDaCaravana>;
}) {
  const [valores, setValores] = useState<ValoresDaCaravana>({
    ...VAZIO,
    unidadeOrganizadoraId: unidades[0]?.id ?? "",
    ...valoresIniciais,
  });
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, iniciarTransicao] = useTransition();

  function campo<K extends keyof ValoresDaCaravana>(chave: K) {
    return {
      value: valores[chave],
      onChange: (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
      ) => setValores((v) => ({ ...v, [chave]: e.target.value })),
    };
  }

  function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    setErro(null);

    const capacidade = Number(valores.capacidadeAssentos);
    if (!Number.isInteger(capacidade) || capacidade < 1) {
      setErro("Informe quantos assentos o ônibus tem.");
      return;
    }

    const entrada = {
      titulo: valores.titulo,
      data: valores.data,
      templo: valores.templo,
      unidadeOrganizadoraId: valores.unidadeOrganizadoraId,
      responsavel: valores.responsavel || null,
      horaSaida: valores.horaSaida || null,
      horaRetornoPrevista: valores.horaRetornoPrevista || null,
      pontoEncontro: valores.pontoEncontro || null,
      capacidadeAssentos: capacidade,
      valorPorPessoa: paraNumeroOuNulo(valores.valorPorPessoa),
      custoTotalTransporte: paraNumeroOuNulo(valores.custoTotalTransporte),
      status: valores.status,
      observacoes: valores.observacoes || null,
    };

    iniciarTransicao(async () => {
      try {
        if (caravanaId) {
          await atualizarCaravana(caravanaId, entrada);
          toast.success("Caravana atualizada.");
        } else {
          await criarCaravana(entrada);
        }
      } catch (e) {
        // redirect() do Next atravessa como erro; não é falha de verdade.
        if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e;
        setErro(mensagemDeFalha(e, "salvar a caravana"));
      }
    });
  }

  return (
    <form onSubmit={enviar} className="space-y-4">
      <Card>
        <CardContent className="grid gap-4 p-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="titulo">Título da caravana</Label>
            <Input
              id="titulo"
              required
              placeholder="Caravana de 1º de agosto"
              className="h-11"
              {...campo("titulo")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="data">Data</Label>
            <Input id="data" type="date" required className="h-11" {...campo("data")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="templo">Templo de destino</Label>
            <Input
              id="templo"
              required
              placeholder="Templo do Rio de Janeiro"
              className="h-11"
              aria-describedby="templo-ajuda"
              {...campo("templo")}
            />
            <p id="templo-ajuda" className="text-muted-foreground text-xs">
              Escreva o nome completo, como &quot;Templo do Rio de Janeiro&quot;.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="unidade">Unidade organizadora</Label>
            <select
              id="unidade"
              required
              className="border-input bg-background h-11 w-full rounded-md border px-3 text-sm"
              {...campo("unidadeOrganizadoraId")}
            >
              {unidades.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nome}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="capacidade">Assentos no ônibus</Label>
            <Input
              id="capacidade"
              type="number"
              inputMode="numeric"
              min={1}
              required
              className="h-11"
              {...campo("capacidadeAssentos")}
            />
            <p className="text-muted-foreground text-xs">
              Passar disso manda a pessoa para a fila de espera automaticamente.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="responsavel">Responsável pela caravana</Label>
            <Input
              id="responsavel"
              placeholder="Nome de quem organiza"
              className="h-11"
              {...campo("responsavel")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="saida">Horário de saída</Label>
            <Input id="saida" type="time" className="h-11" {...campo("horaSaida")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="retorno">Retorno previsto</Label>
            <Input
              id="retorno"
              type="time"
              className="h-11"
              {...campo("horaRetornoPrevista")}
            />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="ponto">Ponto de encontro</Label>
            <Input
              id="ponto"
              placeholder="Estacionamento da capela"
              className="h-11"
              {...campo("pontoEncontro")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="valor">Valor por pessoa (R$)</Label>
            <Input
              id="valor"
              inputMode="decimal"
              placeholder="35,00"
              className="h-11"
              {...campo("valorPorPessoa")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="custo">Custo total do transporte (R$)</Label>
            <Input
              id="custo"
              inputMode="decimal"
              placeholder="1800,00"
              className="h-11"
              {...campo("custoTotalTransporte")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Situação</Label>
            <select
              id="status"
              className="border-input bg-background h-11 w-full rounded-md border px-3 text-sm"
              {...campo("status")}
            >
              {(Object.keys(ROTULO_STATUS_CARAVANA) as StatusCaravana[]).map((s) => (
                <option key={s} value={s}>
                  {ROTULO_STATUS_CARAVANA[s]}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea id="observacoes" rows={3} {...campo("observacoes")} />
          </div>
        </CardContent>
      </Card>

      {erro ? (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {erro}
        </p>
      ) : null}

      <Button type="submit" disabled={salvando} className="min-h-11 w-full sm:w-auto">
        {salvando ? "Salvando..." : caravanaId ? "Salvar alterações" : "Criar caravana"}
      </Button>
    </form>
  );
}
