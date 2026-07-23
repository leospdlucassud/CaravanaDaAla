"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { gravarAutor } from "@/lib/autor";
import { COOKIE_ESCALA, COOKIE_TEMA, ESCALAS_DE_FONTE } from "@/lib/preferencias";

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
 * Sem contas, as preferências vivem só no cookie do aparelho. Quem abrir de
 * outro celular começa no padrão — é o preço de não ter login, e é barato.
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
}

/** Nome de quem está mexendo, para o histórico não ficar anônimo. */
export async function salvarAutor(nome: string) {
  await gravarAutor(nome);
  revalidatePath("/", "layout");
}
