"use client";

import { useState } from "react";
import { Check, Copy, MessageCircle, PhoneOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ROTULO_PENDENCIA, type TipoDePendencia } from "@/lib/mensagens";
import { cn } from "@/lib/utils";

export type PessoaComMensagem = {
  inscricaoId: string;
  nome: string;
  mensagem: string;
  link: string | null;
};

export type GrupoDeMensagens = {
  tipo: TipoDePendencia;
  pessoas: PessoaComMensagem[];
};

/**
 * Lista sequencial, uma pessoa por vez.
 *
 * Nada de abrir vinte abas de wa.me de uma vez: no celular isso simplesmente
 * não funciona. Aqui a pessoa avisa um, marca como feito, passa para o próximo.
 * O "já avisei" vive só nesta tela — é uma marca de sessão, não um registro.
 */
export function MensagensPorPendencia({ grupos }: { grupos: GrupoDeMensagens[] }) {
  const [avisados, setAvisados] = useState<Set<string>>(new Set());

  function marcar(chave: string) {
    setAvisados((atuais) => {
      const novo = new Set(atuais);
      if (novo.has(chave)) novo.delete(chave);
      else novo.add(chave);
      return novo;
    });
  }

  async function copiar(mensagem: string, nome: string) {
    try {
      await navigator.clipboard.writeText(mensagem);
      toast.success(`Mensagem para ${nome} copiada.`);
    } catch {
      toast.error("Não deu para copiar. Selecione o texto e copie à mão.");
    }
  }

  if (grupos.length === 0) {
    return (
      <p className="text-muted-foreground rounded-lg border border-dashed p-6 text-center">
        Nenhuma pendência para cobrar. Está tudo resolvido.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {grupos.map((grupo) => (
        <Card key={grupo.tipo}>
          <CardHeader>
            <CardTitle className="flex flex-wrap items-center gap-2 text-lg">
              {ROTULO_PENDENCIA[grupo.tipo]}
              <Badge variant="secondary">{grupo.pessoas.length}</Badge>
            </CardTitle>
          </CardHeader>

          <CardContent>
            <ul className="space-y-2">
              {grupo.pessoas.map((pessoa) => {
                const chave = `${grupo.tipo}:${pessoa.inscricaoId}`;
                const avisado = avisados.has(chave);

                return (
                  <li
                    key={chave}
                    className={cn(
                      "rounded-lg border p-3",
                      avisado && "bg-muted/50 opacity-70",
                    )}
                  >
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium">{pessoa.nome}</span>
                      <Button
                        variant="ghost"
                        onClick={() => marcar(chave)}
                        className="min-h-11"
                        aria-pressed={avisado}
                      >
                        <Check className="size-4" aria-hidden="true" />
                        {avisado ? "Avisado" : "Marcar como avisado"}
                      </Button>
                    </div>

                    <p className="text-muted-foreground mb-3 text-sm">
                      {pessoa.mensagem}
                    </p>

                    <div className="flex flex-wrap gap-2">
                      {pessoa.link ? (
                        <Button asChild className="min-h-11">
                          <a
                            href={pessoa.link}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <MessageCircle className="size-4" aria-hidden="true" />
                            Abrir conversa
                          </a>
                        </Button>
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-muted-foreground min-h-11 gap-1.5 px-3"
                        >
                          <PhoneOff className="size-4" aria-hidden="true" />
                          Sem telefone cadastrado
                        </Badge>
                      )}

                      <Button
                        variant="outline"
                        onClick={() => copiar(pessoa.mensagem, pessoa.nome)}
                        className="min-h-11"
                      >
                        <Copy className="size-4" aria-hidden="true" />
                        Copiar texto
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
