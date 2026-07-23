/**
 * Regras de permissão, puras e testáveis.
 *
 * Separadas de autorizacao.ts de propósito: aqui não há sessão nem banco, só a
 * decisão. Assim dá para testar a matriz de papéis inteira sem subir nada.
 */

import type { Organizacao, Papel } from "@/generated/prisma/enums";

export type Ator = {
  id: string;
  nome: string | null;
  email: string;
  papel: Papel;
  organizacaoEscopo: Organizacao | null;
  unidadeId: string | null;
  ativo: boolean;
  tema: "CLARO" | "ESCURO" | "SISTEMA";
  escalaFonte: number;
};

type AlvoMembro = {
  unidadeId: string;
  organizacao: Organizacao | null;
};

export function podeAdministrar(ator: Ator): boolean {
  return ator.papel === "ADMINISTRADOR";
}

/** Organizador e administrador mexem na caravana inteira. */
export function podeOrganizar(ator: Ator): boolean {
  return ator.papel === "ADMINISTRADOR" || ator.papel === "ORGANIZADOR";
}

export function podeVerMembroDe(ator: Ator, membro: AlvoMembro): boolean {
  if (podeOrganizar(ator)) return true;
  if (ator.unidadeId !== membro.unidadeId) return false;

  if (ator.papel === "LIDER_ORGANIZACAO") {
    // Sem escopo definido, o líder não vê nada — falha fechada de propósito.
    if (!ator.organizacaoEscopo) return false;
    return membro.organizacao === ator.organizacaoEscopo;
  }

  return ator.papel === "VISUALIZADOR";
}

export function podeEditarMembroDe(ator: Ator, membro: AlvoMembro): boolean {
  if (ator.papel === "VISUALIZADOR") return false;
  return podeVerMembroDe(ator, membro);
}

export function podeEditarCaravanaDe(
  ator: Ator,
  caravana: { unidadeOrganizadoraId: string },
): boolean {
  if (podeAdministrar(ator)) return true;
  if (ator.papel !== "ORGANIZADOR") return false;
  return ator.unidadeId === caravana.unidadeOrganizadoraId;
}

/**
 * Situação de recomendação é assunto de dignidade. Numa caravana compartilhada
 * entre alas, o líder de uma ala não tem por que enxergar isso dos membros da
 * outra — ele precisa saber que a pessoa tem assento, não a vida dela.
 */
export function ehSensivel(ator: Ator, membro: AlvoMembro): boolean {
  if (podeAdministrar(ator)) return false;
  return ator.unidadeId !== membro.unidadeId;
}

export function podeGerenciarUsuarios(ator: Ator): boolean {
  return podeAdministrar(ator);
}

export function podeImportarPlanilha(ator: Ator): boolean {
  return podeAdministrar(ator);
}

export function podeAnonimizarMembro(ator: Ator): boolean {
  return podeAdministrar(ator);
}
