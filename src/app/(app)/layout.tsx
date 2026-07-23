import Link from "next/link";
import { redirect } from "next/navigation";
import { Bus, LogOut, Upload, Users } from "lucide-react";
import { signOut } from "@/auth";
import { usuarioAtual } from "@/lib/autorizacao";
import { podeImportarPlanilha } from "@/lib/permissoes";
import { lerPreferencias } from "@/lib/preferencias-servidor";
import { ROTULO_PAPEL } from "@/lib/dominio";
import { ControlesDeExibicao } from "@/components/controles-de-exibicao";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default async function LayoutDoApp({
  children,
}: {
  children: React.ReactNode;
}) {
  const ator = await usuarioAtual();
  if (!ator) redirect("/entrar");

  const preferencias = await lerPreferencias();

  const itensDeNavegacao = [
    { href: "/", rotulo: "Caravanas", Icone: Bus },
    { href: "/membros", rotulo: "Membros", Icone: Users },
    ...(podeImportarPlanilha(ator)
      ? [{ href: "/importar", rotulo: "Importar", Icone: Upload }]
      : []),
  ];

  return (
    <div className="flex min-h-full flex-col">
      <header className="bg-background/95 supports-[backdrop-filter]:bg-background/80 sticky top-0 z-40 border-b backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-2 px-4 py-2">
          <Link
            href="/"
            className="mr-auto flex min-h-11 items-center gap-2 font-semibold"
          >
            <Bus className="text-primary size-5 shrink-0" aria-hidden="true" />
            <span className="hidden sm:inline">Caravana ao Templo</span>
            <span className="sm:hidden">Caravana</span>
          </Link>

          <ControlesDeExibicao preferenciasIniciais={preferencias} />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-11"
                aria-label="Sua conta"
              >
                <span className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-full text-sm font-medium">
                  {(ator.nome ?? ator.email).charAt(0).toLocaleUpperCase("pt-BR")}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel className="font-normal">
                <span className="block truncate font-medium">
                  {ator.nome ?? ator.email}
                </span>
                <span className="text-muted-foreground block text-sm">
                  {ROTULO_PAPEL[ator.papel]}
                </span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/entrar" });
                }}
              >
                <DropdownMenuItem asChild className="min-h-11">
                  <button type="submit" className="w-full">
                    <LogOut className="size-4" aria-hidden="true" />
                    Sair
                  </button>
                </DropdownMenuItem>
              </form>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <nav
          aria-label="Seções"
          className="mx-auto flex w-full max-w-6xl gap-1 overflow-x-auto px-2 pb-1"
        >
          {itensDeNavegacao.map(({ href, rotulo, Icone }) => (
            <Link
              key={href}
              href={href}
              className="text-muted-foreground hover:text-foreground hover:bg-muted flex min-h-11 items-center gap-2 rounded-md px-3 text-sm font-medium whitespace-nowrap transition-colors"
            >
              <Icone className="size-4" aria-hidden="true" />
              {rotulo}
            </Link>
          ))}
        </nav>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
