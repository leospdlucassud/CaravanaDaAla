"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const esquema = z.object({
  inscricaoId: z.string().min(1),
  trecho: z.enum(["IDA", "VOLTA"]),
  presente: z.boolean(),
});

/**
 * Check-in de embarque.
 *
 * Operação deliberadamente simples: grava (ou apaga) um carimbo de hora. Duas
 * pessoas marcando o mesmo embarque chegam ao mesmo resultado, então não há
 * conflito a resolver — foi por isso que esta tela foi escolhida como a única
 * candidata a funcionar offline.
 */
export async function marcarEmbarque(entrada: z.input<typeof esquema>) {
  const dados = esquema.parse(entrada);

  const inscricao = await prisma.inscricao.update({
    where: { id: dados.inscricaoId },
    data:
      dados.trecho === "IDA"
        ? { checkinIda: dados.presente ? new Date() : null }
        : { checkinVolta: dados.presente ? new Date() : null },
    select: { caravanaId: true },
  });

  revalidatePath(`/caravanas/${inscricao.caravanaId}/embarque`);
}
