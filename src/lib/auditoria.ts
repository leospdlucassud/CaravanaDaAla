import { prisma } from "@/lib/prisma";

type PrismaOuTransacao = Pick<typeof prisma, "registroAuditoria">;

function paraTexto(valor: unknown): string | null {
  if (valor === null || valor === undefined) return null;
  if (valor instanceof Date) return valor.toISOString();
  if (typeof valor === "object") return JSON.stringify(valor);
  return String(valor);
}

/**
 * Registra somente os campos que realmente mudaram.
 *
 * `autor` é o nome que a pessoa declarou no app, sem verificação nenhuma — o
 * app não tem login. Nulo quando ninguém se identificou.
 */
export async function registrarAlteracoes({
  autor,
  entidade,
  entidadeId,
  antes,
  depois,
  cliente = prisma,
}: {
  autor: string | null;
  entidade: string;
  entidadeId: string;
  antes: Record<string, unknown>;
  depois: Record<string, unknown>;
  cliente?: PrismaOuTransacao;
}): Promise<number> {
  const registros = Object.keys(depois)
    .map((campo) => ({
      campo,
      valorAnterior: paraTexto(antes[campo]),
      valorNovo: paraTexto(depois[campo]),
    }))
    .filter((r) => r.valorAnterior !== r.valorNovo)
    .map((r) => ({ ...r, autor, entidade, entidadeId }));

  if (registros.length === 0) return 0;

  await cliente.registroAuditoria.createMany({ data: registros });
  return registros.length;
}

export async function registrarEvento({
  autor,
  entidade,
  entidadeId,
  campo,
  descricao,
  cliente = prisma,
}: {
  autor: string | null;
  entidade: string;
  entidadeId: string;
  campo: string;
  descricao: string;
  cliente?: PrismaOuTransacao;
}) {
  await cliente.registroAuditoria.create({
    data: {
      autor,
      entidade,
      entidadeId,
      campo,
      valorAnterior: null,
      valorNovo: descricao,
    },
  });
}
