import Link from "next/link";
import { Bus, CircleHelp, Users } from "lucide-react";
import { lerAutor } from "@/lib/autor";
import { lerPreferencias } from "@/lib/preferencias-servidor";
import { ControlesDeExibicao } from "@/components/controles-de-exibicao";
import { QuemEstaUsando } from "@/components/quem-esta-usando";
import { TemploIcone } from "@/components/templo-icone";

const ITENS_DE_NAVEGACAO = [
  { href: "/", rotulo: "Caravanas", Icone: Bus },
  { href: "/membros", rotulo: "Membros", Icone: Users },
  { href: "/ajuda", rotulo: "Ajuda", Icone: CircleHelp },
];

export default async function LayoutDoApp({
  children,
}: {
  children: React.ReactNode;
}) {
  const [preferencias, autor] = await Promise.all([lerPreferencias(), lerAutor()]);

  return (
    <div className="flex min-h-full flex-col">
      <header className="bg-background/95 supports-[backdrop-filter]:bg-background/80 sticky top-0 z-40 border-b backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-2 px-4 py-2">
          <Link
            href="/"
            className="mr-auto flex min-h-11 items-center gap-2 font-semibold"
          >
            <TemploIcone className="text-primary size-5 shrink-0" />
            <span className="hidden sm:inline">Caravana ao Templo</span>
            <span className="sm:hidden">Caravana</span>
          </Link>

          <ControlesDeExibicao preferenciasIniciais={preferencias} />
          <QuemEstaUsando autorAtual={autor} />
        </div>

        <nav
          aria-label="Seções"
          className="mx-auto flex w-full max-w-6xl gap-1 overflow-x-auto px-2 pb-1"
        >
          {ITENS_DE_NAVEGACAO.map(({ href, rotulo, Icone }) => (
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
