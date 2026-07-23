import { prisma } from "@/lib/prisma";
import type { Ator } from "@/lib/permissoes";

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
 * Guardamos o e-mail junto do id: se o usuário for removido um dia, o histórico
 * continua dizendo quem fez o quê.
 */
export async function registrarAlteracoes({
  ator,
  entidade,
  entidadeId,
  antes,
  depois,
  cliente = prisma,
}: {
  ator: Pick<Ator, "id" | "email">;
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
    .map((r) => ({
      ...r,
      usuarioId: ator.id,
      usuarioEmail: ator.email,
      entidade,
      entidadeId,
    }));

  if (registros.length === 0) return 0;

  await cliente.registroAuditoria.createMany({ data: registros });
  return registros.length;
}

export async function registrarEvento({
  ator,
  entidade,
  entidadeId,
  campo,
  descricao,
  cliente = prisma,
}: {
  ator: Pick<Ator, "id" | "email">;
  entidade: string;
  entidadeId: string;
  campo: string;
  descricao: string;
  cliente?: PrismaOuTransacao;
}) {
  await cliente.registroAuditoria.create({
    data: {
      usuarioId: ator.id,
      usuarioEmail: ator.email,
      entidade,
      entidadeId,
      campo,
      valorAnterior: null,
      valorNovo: descricao,
    },
  });
}
