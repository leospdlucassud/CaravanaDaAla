import { describe, expect, it } from "vitest";
import { montarTextoDoPedido, pendenciasDeAgendamentoProprio } from "./pedido";

const CARAVANA = {
  unidade: "Ala Jardim Ipê",
  templo: "Rio de Janeiro",
  data: new Date("2026-08-01T00:00:00Z"),
  horaSaida: "05:30",
  responsavel: "Irmão Lucas",
  totalDeAssentos: 46,
};

describe("montarTextoDoPedido", () => {
  const texto = montarTextoDoPedido(CARAVANA, [
    { ordenanca: "BATISTERIO", homens: 8, mulheres: 12, semSexoInformado: 0, total: 20 },
    { ordenanca: "INVESTIDURA", homens: 3, mulheres: 4, semSexoInformado: 1, total: 8 },
  ]);

  it("traz a contagem por sexo, que é o que o templo pede", () => {
    expect(texto).toContain("Batistério: 20 pessoa(s) — 8 homem(ns), 12 mulher(es)");
  });

  it("não esconde quem está sem sexo informado", () => {
    expect(texto).toContain("1 sem sexo informado");
  });

  it("soma o total de participantes", () => {
    expect(texto).toContain("Total de participantes: 28");
  });

  it("identifica a unidade e a data por extenso", () => {
    expect(texto).toContain("Ala Jardim Ipê");
    expect(texto).toContain("agosto de 2026");
  });

  it("assina com o responsável quando existe", () => {
    expect(texto.trimEnd().endsWith("Irmão Lucas")).toBe(true);
  });

  it("omite a saída e a assinatura quando não há dados", () => {
    const enxuto = montarTextoDoPedido(
      { ...CARAVANA, horaSaida: null, responsavel: null },
      [{ ordenanca: "BATISTERIO", homens: 1, mulheres: 0, semSexoInformado: 0, total: 1 }],
    );
    expect(enxuto).not.toContain("saída");
    expect(enxuto).not.toContain("Irmão Lucas");
  });
});

describe("nome do templo no pedido", () => {
  it("não repete \"Templo\" quando a caravana guarda o nome completo", () => {
    const texto = montarTextoDoPedido(
      { ...CARAVANA, templo: "Templo do rio de janeiro" },
      [{ ordenanca: "BATISTERIO", homens: 1, mulheres: 0, semSexoInformado: 0, total: 1 }],
    );
    expect(texto).toContain("Prezados irmãos do Templo do Rio de Janeiro,");
    expect(texto).not.toContain("Templo de Templo");
  });
});

describe("pendenciasDeAgendamentoProprio", () => {
  it("lembra que ordenança própria se agenda por telefone, à parte", () => {
    const linhas = pendenciasDeAgendamentoProprio([
      { nome: "Jair Coimbra", ordenanca: "1ª investidura (própria)" },
    ]);
    expect(linhas).toEqual([
      "Jair Coimbra — 1ª investidura (própria): ligar para o templo e agendar à parte.",
    ]);
  });

  it("devolve lista vazia quando não há ordenança própria", () => {
    expect(pendenciasDeAgendamentoProprio([])).toEqual([]);
  });
});
