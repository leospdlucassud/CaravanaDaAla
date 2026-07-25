import { TemploIcone } from "@/components/templo-icone";

/**
 * Indicador de carregamento temático.
 *
 * Aparece enquanto a próxima tela busca dados no servidor. Antes disso a
 * transição parecia travada por ~1s; agora dá retorno visual imediato. O ícone
 * do templo pulsa suavemente, acompanhando o tema (claro/escuro) via
 * currentColor.
 */
export function Carregando({ texto = "Carregando…" }: { texto?: string }) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-3 py-20"
      role="status"
      aria-live="polite"
    >
      <TemploIcone className="text-primary size-10 animate-pulse motion-reduce:animate-none" />
      <p className="text-muted-foreground text-sm">{texto}</p>
    </div>
  );
}
