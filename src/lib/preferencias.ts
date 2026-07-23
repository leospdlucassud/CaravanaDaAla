/**
 * Tema e tamanho de fonte — parte compartilhada entre servidor e navegador.
 *
 * Sem `next/headers` aqui: este módulo é importado também pelo controle de
 * exibição, que roda no cliente. A leitura dos cookies vive em
 * `preferencias-servidor.ts`.
 *
 * O tema não é mais um enum do banco: sem contas, ele existe só no cookie.
 */
export type Tema = "CLARO" | "ESCURO" | "SISTEMA";

export const COOKIE_TEMA = "caravana.tema";
export const COOKIE_ESCALA = "caravana.escala";

/** Quatro níveis, de 90% a 150%. Boa parte dos líderes é de idade. */
export const ESCALAS_DE_FONTE = [90, 100, 125, 150] as const;
export type EscalaDeFonte = (typeof ESCALAS_DE_FONTE)[number];

export const ROTULO_ESCALA: Record<EscalaDeFonte, string> = {
  90: "Compacto",
  100: "Padrão",
  125: "Grande",
  150: "Muito grande",
};

export const ROTULO_TEMA: Record<Tema, string> = {
  CLARO: "Claro",
  ESCURO: "Escuro",
  SISTEMA: "Seguir o sistema",
};

export function ehTemaValido(valor: string | undefined): valor is Tema {
  return valor === "CLARO" || valor === "ESCURO" || valor === "SISTEMA";
}

export function ehEscalaValida(valor: number): valor is EscalaDeFonte {
  return (ESCALAS_DE_FONTE as readonly number[]).includes(valor);
}

export type Preferencias = {
  tema: Tema;
  escalaFonte: EscalaDeFonte;
};

export const PREFERENCIAS_PADRAO: Preferencias = {
  tema: "SISTEMA",
  escalaFonte: 100,
};
