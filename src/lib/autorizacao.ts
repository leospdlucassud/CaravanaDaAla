import { cache } from "react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  ehSensivel,
  podeEditarMembroDe,
  podeEditarCaravanaDe,
  podeVerMembroDe,
  type Ator,
} from "@/lib/permissoes";

export type { Ator } from "@/lib/permissoes";
export * from "@/lib/permissoes";

/**
 * Caminho único de acesso a "quem é o usuário e o que ele pode".
 *
 * O papel vem SEMPRE do banco, nunca do token de sessão: assim, tirar o acesso
 * de alguém tem efeito imediato, sem esperar um JWT expirar.
 *
 * `cache` do React evita repetir a consulta dentro da mesma requisição.
 */
export const usuarioAtual = cache(async (): Promise<Ator | null> => {
  const sessao = await auth();
  const id = sessao?.user?.id;
  if (!id) return null;

  const usuario = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      nome: true,
      email: true,
      papel: true,
      organizacaoEscopo: true,
      unidadeId: true,
      ativo: true,
      tema: true,
      escalaFonte: true,
    },
  });

  if (!usuario || !usuario.ativo) return null;
  return usuario;
});

export class SemPermissao extends Error {
  constructor(mensagem = "Você não tem permissão para esta ação.") {
    super(mensagem);
    this.name = "SemPermissao";
  }
}

export class NaoAutenticado extends Error {
  constructor(mensagem = "Faça login para continuar.") {
    super(mensagem);
    this.name = "NaoAutenticado";
  }
}

export async function exigirUsuario(): Promise<Ator> {
  const usuario = await usuarioAtual();
  if (!usuario) throw new NaoAutenticado();
  return usuario;
}

export async function exigirPodeEditarMembro(membroId: string) {
  const ator = await exigirUsuario();
  const membro = await prisma.membro.findUnique({
    where: { id: membroId },
    select: { unidadeId: true, organizacao: true },
  });
  if (!membro) throw new SemPermissao("Membro não encontrado.");
  if (!podeEditarMembroDe(ator, membro)) throw new SemPermissao();
  return { ator, membro };
}

export async function exigirPodeEditarInscricao(inscricaoId: string) {
  const ator = await exigirUsuario();
  const inscricao = await prisma.inscricao.findUnique({
    where: { id: inscricaoId },
    select: {
      id: true,
      caravanaId: true,
      membro: { select: { unidadeId: true, organizacao: true } },
    },
  });
  if (!inscricao) throw new SemPermissao("Inscrição não encontrada.");
  if (!podeEditarMembroDe(ator, inscricao.membro)) throw new SemPermissao();
  return { ator, inscricao };
}

export async function exigirPodeEditarCaravana(caravanaId: string) {
  const ator = await exigirUsuario();
  const caravana = await prisma.caravana.findUnique({
    where: { id: caravanaId },
    select: { id: true, unidadeOrganizadoraId: true },
  });
  if (!caravana) throw new SemPermissao("Caravana não encontrada.");
  if (!podeEditarCaravanaDe(ator, caravana)) throw new SemPermissao();
  return { ator, caravana };
}

/**
 * Cláusula `where` do Prisma com o recorte de visibilidade do usuário.
 * Usar SEMPRE que listar membros, para o recorte não depender da tela.
 */
export function filtroDeMembrosVisiveis(ator: Ator) {
  if (ator.papel === "ADMINISTRADOR" || ator.papel === "ORGANIZADOR") {
    return {};
  }

  if (ator.papel === "LIDER_ORGANIZACAO") {
    return {
      unidadeId: ator.unidadeId ?? "__sem_unidade__",
      ...(ator.organizacaoEscopo ? { organizacao: ator.organizacaoEscopo } : {}),
    };
  }

  // VISUALIZADOR: lê tudo da própria unidade.
  return { unidadeId: ator.unidadeId ?? "__sem_unidade__" };
}

export { ehSensivel, podeVerMembroDe };
