"use client";

import { useState, useTransition } from "react";
import { UserRound } from "lucide-react";
import { toast } from "sonner";
import { salvarAutor } from "@/app/acoes/preferencias";
import { VERSAO } from "@/lib/versao";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

/**
 * Quem está mexendo — opcional e sem barreira nenhuma.
 *
 * Não é login: ninguém é impedido de usar o app por não preencher, e o nome
 * não é verificado. Existe só para o histórico de alterações conseguir dizer
 * quem mudou o quê, em vez de registrar tudo como anônimo.
 */
export function QuemEstaUsando({ autorAtual }: { autorAtual: string | null }) {
  const [nome, setNome] = useState(autorAtual ?? "");
  const [aberto, setAberto] = useState(false);
  const [salvando, iniciarTransicao] = useTransition();

  function salvar(evento: React.FormEvent) {
    evento.preventDefault();
    iniciarTransicao(async () => {
      await salvarAutor(nome);
      setAberto(false);
      toast.success(
        nome.trim()
          ? `Anotado. As alterações vão ficar registradas como "${nome.trim()}".`
          : "Nome apagado. As alterações ficarão sem identificação.",
      );
    });
  }

  const primeiraLetra = (autorAtual ?? "").trim().charAt(0).toLocaleUpperCase("pt-BR");

  return (
    <Popover open={aberto} onOpenChange={setAberto}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-11"
          aria-label={
            autorAtual
              ? `Você está identificado como ${autorAtual}. Toque para mudar.`
              : "Dizer quem está usando o app"
          }
        >
          {primeiraLetra ? (
            <span className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-full text-sm font-medium">
              {primeiraLetra}
            </span>
          ) : (
            <UserRound className="size-5" aria-hidden="true" />
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-80">
        <form onSubmit={salvar} className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="nome-de-quem-usa">Quem está usando?</Label>
            <p className="text-muted-foreground text-sm">
              Serve só para o histórico registrar quem alterou o quê. Pode
              deixar em branco — ninguém é impedido de usar o app por isso.
            </p>
          </div>

          <Input
            id="nome-de-quem-usa"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Seu nome"
            maxLength={80}
            className="h-11"
          />

          <Button type="submit" disabled={salvando} className="min-h-11 w-full">
            {salvando ? "Salvando..." : "Salvar"}
          </Button>
        </form>

        <p className="text-muted-foreground mt-3 border-t pt-3 text-center text-xs">
          Versão {VERSAO}
        </p>
      </PopoverContent>
    </Popover>
  );
}
