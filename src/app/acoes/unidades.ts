"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

/** Cria uma unidade — a primeira da instalação, ou outra ala para caravana compartilhada. */
export async function criarUnidade(entrada: {
  nome: string;
  estaca: string | null;
  tipo: "ALA" | "RAMO";
}) {
  const dados = z
    .object({
      nome: z.string().trim().min(2, "Informe o nome da unidade."),
      estaca: z.string().trim().nullable(),
      tipo: z.enum(["ALA", "RAMO"]),
    })
    .parse(entrada);

  const unidade = await prisma.unidade.create({
    data: {
      nome: dados.nome,
      estaca: dados.estaca?.trim() || null,
      tipo: dados.tipo,
      // A primeira unidade cadastrada é a dona da instalação.
      ehPropria: (await prisma.unidade.count()) === 0,
    },
    select: { id: true, nome: true },
  });

  revalidatePath("/", "layout");
  return unidade;
}
