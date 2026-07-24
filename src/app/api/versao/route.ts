import { VERSAO } from "@/lib/versao";

// Sempre dinâmico e sem cache: o endpoint precisa refletir a versão do deploy
// atual, não uma resposta guardada pela CDN. É comparando isto com a versão
// embutida no navegador que o app sabe que subiu uma versão nova.
export const dynamic = "force-dynamic";

export function GET() {
  return Response.json(
    { versao: VERSAO },
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}
