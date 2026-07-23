import { describe, expect, it } from "vitest";
import {
  ehSensivel,
  podeEditarCaravanaDe,
  podeEditarMembroDe,
  podeVerMembroDe,
  type Ator,
} from "./permissoes";
import type { Organizacao, Papel } from "@/generated/prisma/enums";

function ator(
  papel: Papel,
  opcoes: { unidadeId?: string | null; escopo?: Organizacao | null } = {},
): Ator {
  return {
    id: "u1",
    nome: "Fulano",
    email: "fulano@exemplo.com",
    papel,
    organizacaoEscopo: opcoes.escopo ?? null,
    unidadeId: opcoes.unidadeId === undefined ? "ala-a" : opcoes.unidadeId,
    ativo: true,
    tema: "SISTEMA",
    escalaFonte: 100,
  };
}

const membroDaAlaA = { unidadeId: "ala-a", organizacao: "MOCAS" as Organizacao };
const membroDaAlaB = { unidadeId: "ala-b", organizacao: "MOCAS" as Organizacao };
const membroDoQuorum = {
  unidadeId: "ala-a",
  organizacao: "QUORUM_ELDERES" as Organizacao,
};

describe("visibilidade", () => {
  it("administrador vê qualquer membro, de qualquer unidade", () => {
    expect(podeVerMembroDe(ator("ADMINISTRADOR"), membroDaAlaB)).toBe(true);
  });

  it("organizador vê membros de outra ala na caravana compartilhada", () => {
    expect(podeVerMembroDe(ator("ORGANIZADOR"), membroDaAlaB)).toBe(true);
  });

  it("líder de organização só vê a própria organização", () => {
    const lider = ator("LIDER_ORGANIZACAO", { escopo: "MOCAS" });
    expect(podeVerMembroDe(lider, membroDaAlaA)).toBe(true);
    expect(podeVerMembroDe(lider, membroDoQuorum)).toBe(false);
  });

  it("líder de organização não vê membro de outra unidade nem da própria organização", () => {
    const lider = ator("LIDER_ORGANIZACAO", { escopo: "MOCAS" });
    expect(podeVerMembroDe(lider, membroDaAlaB)).toBe(false);
  });

  it("líder sem escopo definido não vê nada — falha fechada", () => {
    const lider = ator("LIDER_ORGANIZACAO", { escopo: null });
    expect(podeVerMembroDe(lider, membroDaAlaA)).toBe(false);
  });

  it("usuário sem unidade não alcança membros de unidade alguma", () => {
    const solto = ator("VISUALIZADOR", { unidadeId: null });
    expect(podeVerMembroDe(solto, membroDaAlaA)).toBe(false);
  });
});

describe("edição", () => {
  it("visualizador nunca edita, mesmo vendo", () => {
    const leitor = ator("VISUALIZADOR");
    expect(podeVerMembroDe(leitor, membroDaAlaA)).toBe(true);
    expect(podeEditarMembroDe(leitor, membroDaAlaA)).toBe(false);
  });

  it("líder edita dentro do próprio escopo e só ali", () => {
    const lider = ator("LIDER_ORGANIZACAO", { escopo: "MOCAS" });
    expect(podeEditarMembroDe(lider, membroDaAlaA)).toBe(true);
    expect(podeEditarMembroDe(lider, membroDoQuorum)).toBe(false);
  });

  it("organizador só edita caravana da própria unidade", () => {
    const organizador = ator("ORGANIZADOR", { unidadeId: "ala-a" });
    expect(podeEditarCaravanaDe(organizador, { unidadeOrganizadoraId: "ala-a" })).toBe(
      true,
    );
    expect(podeEditarCaravanaDe(organizador, { unidadeOrganizadoraId: "ala-b" })).toBe(
      false,
    );
  });

  it("administrador edita caravana de qualquer unidade", () => {
    expect(
      podeEditarCaravanaDe(ator("ADMINISTRADOR"), { unidadeOrganizadoraId: "ala-b" }),
    ).toBe(true);
  });

  it("líder de organização não edita a caravana em si", () => {
    const lider = ator("LIDER_ORGANIZACAO", { escopo: "MOCAS" });
    expect(podeEditarCaravanaDe(lider, { unidadeOrganizadoraId: "ala-a" })).toBe(false);
  });
});

describe("dados sensíveis em caravana compartilhada", () => {
  it("esconde situação de recomendação de membro de outra ala", () => {
    expect(ehSensivel(ator("ORGANIZADOR"), membroDaAlaB)).toBe(true);
  });

  it("mostra para membros da própria ala", () => {
    expect(ehSensivel(ator("ORGANIZADOR"), membroDaAlaA)).toBe(false);
  });

  it("administrador enxerga tudo", () => {
    expect(ehSensivel(ator("ADMINISTRADOR"), membroDaAlaB)).toBe(false);
  });
});
