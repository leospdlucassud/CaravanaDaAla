"use server";

import { cookies } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { usuarioAtual } from "@/lib/autorizacao";
import {
  COOKIE_ESCALA,
  COOKIE_TEMA,
  ESCALAS_DE_FONTE,
} from "@/lib/preferencias";

const esquema = z.object({
  tema: z.enum(["CLARO", "ESCURO", "SISTEMA"]).optional(),
  escalaFonte: z
    .number()
    .refine((n): n is (typeof ESCALAS_DE_FONTE)[number] =>
      (ESCALAS_DE_FONTE as readonly number[]).includes(n),
    )
    .optional(),
});

const UM_ANO = 60 * 60 * 24 * 365;

/**
 * Grava no cookie (para o servidor renderizar certo já na próxima navegação) e,
 * se houver usuário logado, também no banco — assim a preferência acompanha a
 * pessoa em qualquer aparelho.
 */
export async function salvarPreferencias(entrada: {
  tema?: "CLARO" | "ESCURO" | "SISTEMA";
  escalaFonte?: number;
}) {
  const dados = esquema.parse(entrada);
  const jar = await cookies();

  if (dados.tema) {
    jar.set(COOKIE_TEMA, dados.tema, { maxAge: UM_ANO, sameSite: "lax", path: "/" });
  }
  if (dados.escalaFonte) {
    jar.set(COOKIE_ESCALA, String(dados.escalaFonte), {
      maxAge: UM_ANO,
      sameSite: "lax",
      path: "/",
    });
  }

  const ator = await usuarioAtual();
  if (ator) {
    await prisma.usuario.update({
      where: { id: ator.id },
      data: {
        ...(dados.tema ? { tema: dados.tema } : {}),
        ...(dados.escalaFonte ? { escalaFonte: dados.escalaFonte } : {}),
      },
    });
  }
}
