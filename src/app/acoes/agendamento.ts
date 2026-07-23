"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { lerAutor } from "@/lib/autor";
import { registrarEvento } from "@/lib/auditoria";

const ORDENANCAS = [
  "BATISTERIO",
  "INICIATORIA",
  "INVESTIDURA",
  "PRIMEIRA_INVESTIDURA",
  "SELAMENTO_CONJUGE",
  "SELAMENTO_FAMILIA",
] as const;

const esquema = z.object({
  caravanaId: z.string().min(1),
  canal: z.enum(["EMAIL", "TELEFONE", "ONLINE"]),
  enviado: z.boolean(),
  confirmado: z.boolean(),
  referencia: z.string().trim().max(200).nullable(),
  observacoes: z.string().trim().max(1000).nullable(),
  /** Vagas que o templo confirmou por ordenança. */
  vagas: z.array(
    z.object({
      ordenanca: z.enum(ORDENANCAS),
      vagasConfirmadas: z.number().int().min(0).max(500),
    }),
  ),
});

export type EntradaDoPedido = z.input<typeof esquema>;

export async function salvarPedidoDeAgendamento(entrada: EntradaDoPedido) {
  const dados = esquema.parse(entrada);
  const autor = await lerAutor();

  const anterior = await prisma.pedidoAgendamento.findUnique({
    where: { caravanaId: dados.caravanaId },
    select: { enviadoEm: true, confirmadoEm: true },
  });

  // Preserva a data do primeiro envio: marcar e desmarcar não deve reescrever
  // quando o pedido saiu.
  const enviadoEm = dados.enviado
    ? (anterior?.enviadoEm ?? new Date())
    : null;
  const confirmadoEm = dados.confirmado
    ? (anterior?.confirmadoEm ?? new Date())
    : null;

  await prisma.$transaction(async (cliente) => {
    const pedido = await cliente.pedidoAgendamento.upsert({
      where: { caravanaId: dados.caravanaId },
      create: {
        caravanaId: dados.caravanaId,
        canal: dados.canal,
        enviadoEm,
        confirmadoEm,
        referencia: dados.referencia,
        observacoes: dados.observacoes,
      },
      update: {
        canal: dados.canal,
        enviadoEm,
        confirmadoEm,
        referencia: dados.referencia,
        observacoes: dados.observacoes,
      },
      select: { id: true },
    });

    await cliente.vagaAgendamentoGrupo.deleteMany({
      where: { pedidoAgendamentoId: pedido.id },
    });

    const comVagas = dados.vagas.filter((v) => v.vagasConfirmadas > 0);
    if (comVagas.length > 0) {
      await cliente.vagaAgendamentoGrupo.createMany({
        data: comVagas.map((v) => ({ ...v, pedidoAgendamentoId: pedido.id })),
      });
    }
  });

  await registrarEvento({
    autor,
    entidade: "Caravana",
    entidadeId: dados.caravanaId,
    campo: "agendamento",
    descricao: dados.confirmado
      ? `Agendamento confirmado pelo templo${dados.referencia ? ` (${dados.referencia})` : ""}`
      : dados.enviado
        ? "Pedido de agendamento enviado ao templo"
        : "Pedido de agendamento atualizado",
  });

  revalidatePath(`/caravanas/${dados.caravanaId}`);
  revalidatePath(`/caravanas/${dados.caravanaId}/agendamento`);
}
