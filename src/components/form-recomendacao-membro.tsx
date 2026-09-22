"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { atualizarRecomendacaoDoMembro } from "@/app/acoes/membros";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ANOS_DE_VALIDADE, ROTULO_RECOMENDACAO_TIPO } from "@/lib/dominio";
import type { RecomendacaoTipo } from "@/generated/prisma/enums";
import { mensagemDeFalha } from "@/lib/falha";

/**
 * Recomendação da ficha do membro — só o tipo e a data impressa nela.
 *
 * Existe para resolver o aviso "Precisam de atenção" sem sair da caravana.
 * Como é dado da ficha, vale para todas as caravanas da pessoa. Nada sobre
 * dignidade ou entrevista entra aqui: isso é do LCR.
 */
export function FormRecomendacaoDoMembro({
  membroId,
  nome,
  tipoInicial,
  validaAteInicial,
}: {
  membroId: string;
  nome: string;
  tipoInicial: RecomendacaoTipo;
  /** AAAA-MM-DD */
  validaAteInicial: string | null;
}) {
  const [tipo, setTipo] = useState<RecomendacaoTipo>(tipoInicial);
  const [validaAte, setValidaAte] = useState(validaAteInicial ?? "");
  const [salvando, iniciarTransicao] = useTransition();

  const semRecomendacao = tipo === "NENHUMA";
  const anos = ANOS_DE_VALIDADE[tipo];
  const mudou =
    tipo !== tipoInicial ||
    (!semRecomendacao && validaAte !== (validaAteInicial ?? ""));
  const faltaData = !semRecomendacao && !validaAte;

  function salvar(evento: React.FormEvent) {
    evento.preventDefault();
    iniciarTransicao(async () => {
      try {
        await atualizarRecomendacaoDoMembro({
          membroId,
          recomendacaoTipo: tipo,
          recomendacaoValidaAte: semRecomendacao ? null : validaAte || null,
        });
        toast.success(`Recomendação de ${nome} atualizada na ficha.`);
      } catch (e) {
        toast.error(mensagemDeFalha(e, "salvar a recomendação"));
      }
    });
  }

  const idTipo = `rec-tipo-${membroId}`;
  const idValidade = `rec-validade-${membroId}`;

  return (
    <form onSubmit={salvar} className="space-y-2 rounded-lg border p-3">
      <div>
        <p className="text-sm font-medium">Recomendação na ficha</p>
        <p className="text-muted-foreground text-xs">
          Só o tipo e a data impressa. Vale para todas as caravanas desta pessoa.
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor={idTipo} className="text-xs">
            Tipo
          </Label>
          <select
            id={idTipo}
            value={tipo}
            onChange={(e) => setTipo(e.target.value as RecomendacaoTipo)}
            className="border-input bg-background h-11 w-full rounded-md border px-3 text-base md:text-sm"
          >
            {(Object.keys(ROTULO_RECOMENDACAO_TIPO) as RecomendacaoTipo[]).map((t) => (
              <option key={t} value={t}>
                {ROTULO_RECOMENDACAO_TIPO[t]}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <Label htmlFor={idValidade} className="text-xs">
            Válida até
          </Label>
          <Input
            id={idValidade}
            type="date"
            className="h-11"
            value={semRecomendacao ? "" : validaAte}
            disabled={semRecomendacao}
            onChange={(e) => setValidaAte(e.target.value)}
          />
        </div>
      </div>

      {anos ? (
        <p className="text-muted-foreground text-xs">
          Costuma valer {anos} {anos === 1 ? "ano" : "anos"} — mas use a data
          impressa na recomendação.
          {faltaData
            ? " Sem a data, o app não tem como confirmar a validade — a pessoa segue em “Precisam de atenção”."
            : ""}
        </p>
      ) : null}

      <Button
        type="submit"
        size="sm"
        disabled={salvando || !mudou}
        className="h-auto min-h-11 w-full whitespace-normal sm:w-auto"
      >
        {salvando ? "Salvando..." : "Salvar recomendação"}
      </Button>
    </form>
  );
}
