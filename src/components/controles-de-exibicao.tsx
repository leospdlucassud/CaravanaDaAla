"use client";

import { useState, useTransition } from "react";
import { Monitor, Moon, Sun, Type } from "lucide-react";
import { salvarPreferencias } from "@/app/acoes/preferencias";
import {
  ESCALAS_DE_FONTE,
  ROTULO_ESCALA,
  ROTULO_TEMA,
  type EscalaDeFonte,
  type Preferencias,
  type Tema,
} from "@/lib/preferencias";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const ICONE_TEMA = {
  CLARO: Sun,
  ESCURO: Moon,
  SISTEMA: Monitor,
} as const;

/** Aplica na hora, sem esperar o servidor — a gravação segue em segundo plano. */
function aplicarNoDocumento(tema: Tema, escala: number) {
  const escuroDoSistema = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const escuro = tema === "ESCURO" || (tema === "SISTEMA" && escuroDoSistema);
  document.documentElement.classList.toggle("dark", escuro);
  document.documentElement.style.fontSize = `${escala}%`;
}

export function ControlesDeExibicao({
  preferenciasIniciais,
}: {
  preferenciasIniciais: Preferencias;
}) {
  const [preferencias, setPreferencias] = useState(preferenciasIniciais);
  const [pendente, iniciarTransicao] = useTransition();

  function mudarTema(tema: Tema) {
    aplicarNoDocumento(tema, preferencias.escalaFonte);
    setPreferencias((atuais) => ({ ...atuais, tema }));
    iniciarTransicao(() => {
      void salvarPreferencias({ tema });
    });
  }

  function mudarEscala(escalaFonte: EscalaDeFonte) {
    aplicarNoDocumento(preferencias.tema, escalaFonte);
    setPreferencias((atuais) => ({ ...atuais, escalaFonte }));
    iniciarTransicao(() => {
      void salvarPreferencias({ escalaFonte });
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-11"
          aria-label="Aparência: tema e tamanho da letra"
          data-pendente={pendente || undefined}
        >
          <Type className="size-5" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel>Tema</DropdownMenuLabel>
        {(Object.keys(ROTULO_TEMA) as Tema[]).map((tema) => {
          const Icone = ICONE_TEMA[tema];
          const ativo = preferencias.tema === tema;
          return (
            <DropdownMenuItem
              key={tema}
              onSelect={() => mudarTema(tema)}
              className="min-h-11 gap-3"
              aria-current={ativo ? "true" : undefined}
            >
              <Icone className="size-4" aria-hidden="true" />
              <span className={cn(ativo && "font-semibold")}>{ROTULO_TEMA[tema]}</span>
            </DropdownMenuItem>
          );
        })}

        <DropdownMenuSeparator />

        <DropdownMenuLabel>Tamanho da letra</DropdownMenuLabel>
        {ESCALAS_DE_FONTE.map((escala) => {
          const ativo = preferencias.escalaFonte === escala;
          return (
            <DropdownMenuItem
              key={escala}
              onSelect={() => mudarEscala(escala)}
              className="min-h-11 justify-between"
              aria-current={ativo ? "true" : undefined}
            >
              <span className={cn(ativo && "font-semibold")}>
                {ROTULO_ESCALA[escala]}
              </span>
              <span className="text-muted-foreground text-sm">{escala}%</span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
