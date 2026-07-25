"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { atualizarMembro, criarMembro } from "@/app/acoes/membros";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  ANOS_DE_VALIDADE,
  ROTULO_ORGANIZACAO,
  ROTULO_RECOMENDACAO_TIPO,
  ROTULO_SEXO,
  ROTULO_VINCULO,
} from "@/lib/dominio";
import type {
  Organizacao,
  RecomendacaoTipo,
  Sexo,
  TipoVinculo,
} from "@/generated/prisma/enums";

export type ValoresDoMembro = {
  nomeCompleto: string;
  apelido: string;
  unidadeId: string;
  organizacao: Organizacao | "";
  tipoVinculo: TipoVinculo;
  sexo: Sexo | "";
  anoNascimento: string;
  telefone: string;
  recemConverso: boolean;
  ehInvestido: boolean;
  recomendacaoTipo: RecomendacaoTipo;
  recomendacaoValidaAte: string;
  observacoes: string;
};

const VAZIO: ValoresDoMembro = {
  nomeCompleto: "",
  apelido: "",
  unidadeId: "",
  organizacao: "",
  tipoVinculo: "MEMBRO",
  sexo: "",
  anoNascimento: "",
  telefone: "",
  recemConverso: false,
  ehInvestido: false,
  recomendacaoTipo: "NENHUMA",
  recomendacaoValidaAte: "",
  observacoes: "",
};

export function FormularioDeMembro({
  unidades,
  membroId,
  valoresIniciais,
}: {
  unidades: Array<{ id: string; nome: string }>;
  membroId?: string;
  valoresIniciais?: Partial<ValoresDoMembro>;
}) {
  const router = useRouter();
  const [valores, setValores] = useState<ValoresDoMembro>({
    ...VAZIO,
    unidadeId: unidades[0]?.id ?? "",
    ...valoresIniciais,
  });
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, iniciarTransicao] = useTransition();

  function campo<K extends keyof ValoresDoMembro>(chave: K) {
    return {
      value: valores[chave] as string,
      onChange: (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
      ) => setValores((v) => ({ ...v, [chave]: e.target.value })),
    };
  }

  const anosDeValidade = ANOS_DE_VALIDADE[valores.recomendacaoTipo];

  function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    setErro(null);

    const ano = valores.anoNascimento.trim();
    const entrada = {
      nomeCompleto: valores.nomeCompleto,
      apelido: valores.apelido || null,
      unidadeId: valores.unidadeId,
      organizacao: valores.organizacao || null,
      tipoVinculo: valores.tipoVinculo,
      sexo: valores.sexo || null,
      anoNascimento: ano ? Number(ano) : null,
      telefone: valores.telefone || null,
      recemConverso: valores.recemConverso,
      ehInvestido: valores.ehInvestido,
      recomendacaoTipo: valores.recomendacaoTipo,
      recomendacaoValidaAte: valores.recomendacaoValidaAte || null,
      observacoes: valores.observacoes || null,
    };

    iniciarTransicao(async () => {
      try {
        if (membroId) {
          await atualizarMembro(membroId, entrada);
          toast.success("Cadastro atualizado.");
        } else {
          const criado = await criarMembro(entrada);
          toast.success(`${criado.nomeCompleto} cadastrado.`);
          router.push("/membros");
        }
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Não foi possível salvar.");
      }
    });
  }

  return (
    <form onSubmit={enviar} className="space-y-4">
      <Card>
        <CardContent className="grid gap-4 p-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="nome">Nome completo</Label>
            <Input id="nome" required className="h-11" {...campo("nomeCompleto")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="apelido">Como é conhecido (opcional)</Label>
            <Input id="apelido" className="h-11" {...campo("apelido")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="unidade">Unidade</Label>
            <select
              id="unidade"
              required
              className="border-input bg-background h-11 w-full rounded-md border px-3 text-sm"
              {...campo("unidadeId")}
            >
              {unidades.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nome}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="organizacao">Organização</Label>
            <select
              id="organizacao"
              className="border-input bg-background h-11 w-full rounded-md border px-3 text-sm"
              {...campo("organizacao")}
            >
              <option value="">Sem organização</option>
              {(Object.keys(ROTULO_ORGANIZACAO) as Organizacao[]).map((o) => (
                <option key={o} value={o}>
                  {ROTULO_ORGANIZACAO[o]}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="vinculo">Vínculo</Label>
            <select
              id="vinculo"
              required
              className="border-input bg-background h-11 w-full rounded-md border px-3 text-sm"
              {...campo("tipoVinculo")}
            >
              {(Object.keys(ROTULO_VINCULO) as TipoVinculo[]).map((v) => (
                <option key={v} value={v}>
                  {ROTULO_VINCULO[v]}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sexo">Sexo</Label>
            <select
              id="sexo"
              required
              className="border-input bg-background h-11 w-full rounded-md border px-3 text-sm"
              {...campo("sexo")}
            >
              <option value="" disabled>
                Selecione
              </option>
              {(Object.keys(ROTULO_SEXO) as Sexo[]).map((s) => (
                <option key={s} value={s}>
                  {ROTULO_SEXO[s]}
                </option>
              ))}
            </select>
            <p className="text-muted-foreground text-xs">
              Usado só para o pedido ao templo, que pede a contagem de homens e
              mulheres, e para a regra de acompanhante.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ano">Ano de nascimento</Label>
            <Input
              id="ano"
              type="number"
              inputMode="numeric"
              min={1900}
              max={new Date().getFullYear()}
              placeholder="2014"
              className="h-11"
              {...campo("anoNascimento")}
            />
            <p className="text-muted-foreground text-xs">
              Só o ano: a regra do batistério vale a partir de janeiro do ano em
              que a pessoa completa 12.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="telefone">Telefone / WhatsApp</Label>
            <Input
              id="telefone"
              type="tel"
              inputMode="tel"
              className="h-11"
              {...campo("telefone")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="investidura">Investidura</Label>
            <select
              id="investidura"
              className="border-input bg-background h-11 w-full rounded-md border px-3 text-sm"
              value={valores.ehInvestido ? "SIM" : "NAO"}
              onChange={(e) =>
                setValores((v) => ({ ...v, ehInvestido: e.target.value === "SIM" }))
              }
            >
              <option value="NAO">Sem investidura</option>
              <option value="SIM">Já recebeu a investidura</option>
            </select>
          </div>

          <div className="flex items-center gap-3">
            <Checkbox
              id="recemConverso"
              checked={valores.recemConverso}
              onCheckedChange={(marcado) =>
                setValores((v) => ({ ...v, recemConverso: marcado === true }))
              }
              className="size-5"
            />
            <Label htmlFor="recemConverso" className="font-normal">
              Recém-converso
              <span className="text-muted-foreground block text-xs font-normal">
                Batizado há menos de 2 anos
              </span>
            </Label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="grid gap-4 p-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <h2 className="font-medium">Recomendação para o templo</h2>
            <p className="text-muted-foreground text-sm">
              Guardamos apenas o tipo e a data de validade impressa na
              recomendação. Nada sobre entrevista ou dignidade é registrado aqui
              — isso vive no Sistema de Preparação de Ordenanças, no LCR.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="recomendacaoTipo">Tipo</Label>
            <select
              id="recomendacaoTipo"
              className="border-input bg-background h-11 w-full rounded-md border px-3 text-sm"
              {...campo("recomendacaoTipo")}
            >
              {(Object.keys(ROTULO_RECOMENDACAO_TIPO) as RecomendacaoTipo[]).map((t) => (
                <option key={t} value={t}>
                  {ROTULO_RECOMENDACAO_TIPO[t]}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="validade">Válida até</Label>
            <Input
              id="validade"
              type="date"
              className="h-11"
              disabled={valores.recomendacaoTipo === "NENHUMA"}
              {...campo("recomendacaoValidaAte")}
            />
            {anosDeValidade ? (
              <p className="text-muted-foreground text-xs">
                Costuma valer {anosDeValidade}{" "}
                {anosDeValidade === 1 ? "ano" : "anos"} — mas use a data impressa
                na recomendação da pessoa.
              </p>
            ) : null}
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
        {salvando ? "Salvando..." : membroId ? "Salvar alterações" : "Cadastrar membro"}
      </Button>
    </form>
  );
}
