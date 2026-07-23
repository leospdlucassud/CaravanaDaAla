"use client";

import { useState, useTransition } from "react";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { atualizarValoresDoPagamento } from "@/app/acoes/inscricoes";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ROTULO_PAGAMENTO } from "@/lib/dominio";
import { formatarDinheiro, type ResumoFinanceiro } from "@/lib/financeiro";
import { cn } from "@/lib/utils";
import type { StatusPagamento } from "@/generated/prisma/enums";

export type LinhaFinanceira = {
  id: string;
  nome: string;
  pagamentoStatus: StatusPagamento;
  valorPago: number | null;
  valorBeneficioArea: number | null;
};

function Numero({
  rotulo,
  valor,
  detalhe,
  tom,
}: {
  rotulo: string;
  valor: string;
  detalhe?: string;
  tom?: "positivo" | "negativo";
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-muted-foreground text-sm">{rotulo}</p>
        <p
          className={cn(
            "text-2xl font-semibold tabular-nums",
            tom === "negativo" && "text-red-600 dark:text-red-400",
            tom === "positivo" && "text-emerald-600 dark:text-emerald-400",
          )}
        >
          {valor}
        </p>
        {detalhe ? <p className="text-muted-foreground text-xs">{detalhe}</p> : null}
      </CardContent>
    </Card>
  );
}

function paraNumero(texto: string): number | null {
  const limpo = texto.trim().replace(",", ".");
  if (!limpo) return null;
  const numero = Number(limpo);
  return Number.isFinite(numero) ? numero : null;
}

export function PainelFinanceiro({
  resumo,
  linhas,
  relatorio,
}: {
  resumo: ResumoFinanceiro;
  linhas: LinhaFinanceira[];
  relatorio: string;
}) {
  const [valores, setValores] = useState<Record<string, { pago: string; beneficio: string }>>(
    () =>
      Object.fromEntries(
        linhas.map((l) => [
          l.id,
          {
            pago: l.valorPago?.toString() ?? "",
            beneficio: l.valorBeneficioArea?.toString() ?? "",
          },
        ]),
      ),
  );
  const [salvando, iniciarTransicao] = useTransition();

  function salvar(linha: LinhaFinanceira) {
    const atual = valores[linha.id];
    iniciarTransicao(async () => {
      try {
        await atualizarValoresDoPagamento({
          inscricaoId: linha.id,
          valorPago: paraNumero(atual.pago),
          valorBeneficioArea: paraNumero(atual.beneficio),
        });
        toast.success(`Valores de ${linha.nome} salvos.`);
      } catch {
        toast.error(`Não deu para salvar os valores de ${linha.nome}.`);
      }
    });
  }

  async function copiarRelatorio() {
    try {
      await navigator.clipboard.writeText(relatorio);
      toast.success("Relatório copiado. É só colar para o secretário.");
    } catch {
      toast.error("Não deu para copiar. Selecione o texto e copie à mão.");
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Numero
          rotulo="Total em caixa"
          valor={formatarDinheiro(resumo.totalEmCaixa)}
          detalhe={`${resumo.pagantes} pagaram · ${resumo.comBeneficioDaArea} com benefício`}
        />
        <Numero
          rotulo="Custo do transporte"
          valor={formatarDinheiro(resumo.custoTotal)}
        />
        <Numero
          rotulo="Saldo"
          valor={formatarDinheiro(resumo.saldo)}
          tom={resumo.saldo < 0 ? "negativo" : "positivo"}
          detalhe={resumo.saldo < 0 ? "Falta cobrir o ônibus" : "Cobre o ônibus"}
        />
        <Numero
          rotulo="Ainda a receber"
          valor={formatarDinheiro(resumo.aReceber)}
          detalhe={`${resumo.pendentes} pendente(s) · ${resumo.isentos} isento(s)`}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Relatório para o secretário</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <pre className="bg-muted overflow-auto rounded-md p-3 text-sm whitespace-pre-wrap">
            {relatorio}
          </pre>
          <Button onClick={copiarRelatorio} className="min-h-11">
            <Copy className="size-4" aria-hidden="true" />
            Copiar relatório
          </Button>
        </CardContent>
      </Card>

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold">Valores por pessoa</h2>
          <p className="text-muted-foreground text-sm">
            Marcar &quot;Pago&quot; na lista da caravana já preenche o valor por
            pessoa. Ajuste aqui quem pagou diferente.
          </p>
        </div>

        <ul className="space-y-2">
          {linhas.map((linha) => (
            <li key={linha.id} className="bg-card rounded-lg border p-3">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium">{linha.nome}</span>
                <span className="text-muted-foreground text-sm">
                  {ROTULO_PAGAMENTO[linha.pagamentoStatus]}
                </span>
              </div>

              <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                <div className="space-y-1">
                  <Label htmlFor={`pago-${linha.id}`} className="text-xs">
                    Pagou (R$)
                  </Label>
                  <Input
                    id={`pago-${linha.id}`}
                    inputMode="decimal"
                    className="h-11"
                    value={valores[linha.id]?.pago ?? ""}
                    onChange={(e) =>
                      setValores((v) => ({
                        ...v,
                        [linha.id]: { ...v[linha.id], pago: e.target.value },
                      }))
                    }
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor={`beneficio-${linha.id}`} className="text-xs">
                    Benefício da Área (R$)
                  </Label>
                  <Input
                    id={`beneficio-${linha.id}`}
                    inputMode="decimal"
                    className="h-11"
                    value={valores[linha.id]?.beneficio ?? ""}
                    onChange={(e) =>
                      setValores((v) => ({
                        ...v,
                        [linha.id]: { ...v[linha.id], beneficio: e.target.value },
                      }))
                    }
                  />
                </div>

                <div className="flex items-end">
                  <Button
                    variant="outline"
                    onClick={() => salvar(linha)}
                    disabled={salvando}
                    className="min-h-11 w-full sm:w-auto"
                  >
                    Salvar
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
