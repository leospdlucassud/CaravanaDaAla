"use client";

import Link from "next/link";
import {
  ClipboardCheck,
  Download,
  ListChecks,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Printer,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DuplicarCaravana } from "@/components/duplicar-caravana";

/**
 * As três ações do dia a dia ficam à mão; o resto vai para o menu.
 * Com dez botões lado a lado ninguém acha o que procura.
 */
export function AcoesDaCaravana({ caravanaId }: { caravanaId: string }) {
  const noMenu = [
    { href: `/caravanas/${caravanaId}/editar`, rotulo: "Editar caravana", Icone: Pencil },
    {
      href: `/caravanas/${caravanaId}/preparacao`,
      rotulo: "Preparação e acompanhantes",
      Icone: ListChecks,
    },
    { href: `/caravanas/${caravanaId}/financeiro`, rotulo: "Financeiro", Icone: Wallet },
    {
      href: `/caravanas/${caravanaId}/mensagens`,
      rotulo: "Mensagens de cobrança",
      Icone: MessageCircle,
    },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      <Button asChild variant="outline" className="min-h-11">
        <Link href={`/caravanas/${caravanaId}/agendamento`}>Agendamento</Link>
      </Button>

      <Button asChild variant="outline" className="min-h-11">
        <Link href={`/caravanas/${caravanaId}/embarque`}>
          <ClipboardCheck className="size-4" aria-hidden="true" />
          Embarque
        </Link>
      </Button>

      <Button asChild className="min-h-11">
        <Link href={`/caravanas/${caravanaId}/inscrever`}>Inscrever</Link>
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon" className="size-11" aria-label="Mais ações">
            <MoreHorizontal className="size-5" aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-64">
          {noMenu.map(({ href, rotulo, Icone }) => (
            <DropdownMenuItem key={href} asChild className="min-h-11 gap-3">
              <Link href={href}>
                <Icone className="size-4" aria-hidden="true" />
                {rotulo}
              </Link>
            </DropdownMenuItem>
          ))}

          <DropdownMenuSeparator />

          <DropdownMenuItem asChild className="min-h-11 gap-3">
            <Link href={`/caravanas/${caravanaId}/presenca`}>
              <Printer className="size-4" aria-hidden="true" />
              Lista de presença
            </Link>
          </DropdownMenuItem>

          <DropdownMenuItem asChild className="min-h-11 gap-3">
            {/* Rota fora do layout do app: devolve o arquivo, não uma página. */}
            <a href={`/caravanas/${caravanaId}/exportar`} download>
              <Download className="size-4" aria-hidden="true" />
              Exportar planilha (.xlsx)
            </a>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DuplicarCaravana caravanaId={caravanaId} />
    </div>
  );
}
