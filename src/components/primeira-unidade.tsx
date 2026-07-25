"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { criarUnidade } from "@/app/acoes/unidades";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Nenhuma unidade é fixada em código: a instalação cadastra a sua na primeira
 * vez, e o mesmo app serve qualquer ala ou ramo.
 */
export function PrimeiraUnidade() {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [estaca, setEstaca] = useState("");
  const [tipo, setTipo] = useState<"ALA" | "RAMO">("ALA");
  const [salvando, iniciarTransicao] = useTransition();

  function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    iniciarTransicao(async () => {
      try {
        const unidade = await criarUnidade({
          nome,
          estaca: estaca || null,
          tipo,
        });
        toast.success(`Unidade ${unidade.nome} cadastrada.`);
        router.refresh();
      } catch (e) {
        toast.error(
          e instanceof Error ? e.message : "Não foi possível criar a unidade.",
        );
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Antes de tudo: qual é a sua unidade?</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={enviar} className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="unidade-nome">Nome da unidade</Label>
            <Input
              id="unidade-nome"
              required
              className="h-11"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="unidade-tipo">Tipo</Label>
            <select
              id="unidade-tipo"
              className="border-input bg-background h-11 w-full rounded-md border px-3 text-sm"
              value={tipo}
              onChange={(e) => setTipo(e.target.value as "ALA" | "RAMO")}
            >
              <option value="ALA">Ala</option>
              <option value="RAMO">Ramo</option>
            </select>
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="unidade-estaca">Estaca ou distrito (opcional)</Label>
            <Input
              id="unidade-estaca"
              className="h-11"
              value={estaca}
              onChange={(e) => setEstaca(e.target.value)}
            />
          </div>

          <div className="sm:col-span-2">
            <Button type="submit" disabled={salvando} className="min-h-11">
              {salvando ? "Salvando..." : "Cadastrar unidade"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
