"use client";

import { useState, useTransition } from "react";
import { CopyPlus } from "lucide-react";
import { toast } from "sonner";
import { duplicarCaravana } from "@/app/acoes/caravanas";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { mensagemDeFalha } from "@/lib/falha";

/**
 * Duplica a caravana trazendo as mesmas pessoas com os status por-viagem
 * zerados. O que é permanente — recomendação, telefone, organização — fica no
 * cadastro do membro e não precisa ser redigitado.
 */
export function DuplicarCaravana({ caravanaId }: { caravanaId: string }) {
  const [aberto, setAberto] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [data, setData] = useState("");
  const [duplicando, iniciarTransicao] = useTransition();

  function enviar(evento: React.FormEvent) {
    evento.preventDefault();

    iniciarTransicao(async () => {
      try {
        await duplicarCaravana(caravanaId, { titulo, data });
      } catch (e) {
        // O redirect do Next atravessa como erro; não é falha de verdade.
        if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e;
        toast.error(mensagemDeFalha(e, "duplicar"));
      }
    });
  }

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>
        <Button variant="outline" className="min-h-11">
          <CopyPlus className="size-4" aria-hidden="true" />
          Duplicar
        </Button>
      </DialogTrigger>

      <DialogContent>
        <form onSubmit={enviar}>
          <DialogHeader>
            <DialogTitle>Duplicar esta caravana</DialogTitle>
            <DialogDescription>
              As mesmas pessoas entram na nova caravana, com pagamento,
              agendamento e demais status zerados.
            </DialogDescription>
          </DialogHeader>

          <div className="my-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="titulo-copia">Título da nova caravana</Label>
              <Input
                id="titulo-copia"
                required
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Caravana de setembro"
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="data-copia">Data</Label>
              <Input
                id="data-copia"
                type="date"
                required
                value={data}
                onChange={(e) => setData(e.target.value)}
                className="h-11"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={duplicando} className="min-h-11">
              {duplicando ? "Duplicando..." : "Duplicar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
