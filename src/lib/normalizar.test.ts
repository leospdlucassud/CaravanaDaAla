import { describe, expect, it } from "vitest";
import {
  capitalizarNome,
  encontrarPossiveisDuplicatas,
  extrairDadosDoNome,
  normalizarNome,
  similaridadeNome,
} from "./normalizar";

describe("normalizarNome", () => {
  it("remove acento, caixa e espaço sobrando", () => {
    expect(normalizarNome("  JOSÉ  da   Silva ")).toBe("jose da silva");
  });

  it("achata quebra de linha, que a planilha trazia colada no nome", () => {
    expect(normalizarNome("Emilly dos Santos Almeida\n")).toBe(
      "emilly dos santos almeida",
    );
  });

  it("descarta pontuação", () => {
    expect(normalizarNome("Maria-do-Carmo (2)")).toBe("maria do carmo 2");
  });
});

describe("capitalizarNome", () => {
  it("arruma CAIXA ALTA mantendo as partículas minúsculas", () => {
    expect(capitalizarNome("JOSE ROBERTO OLIVEIRA DE PAULA")).toBe(
      "Jose Roberto Oliveira de Paula",
    );
  });

  it("mantém a primeira palavra maiúscula mesmo sendo partícula", () => {
    expect(capitalizarNome("da silva")).toBe("Da Silva");
  });

  it("colapsa espaço duplo", () => {
    expect(capitalizarNome("Emile  neta")).toBe("Emile Neta");
  });
});

describe("extrairDadosDoNome", () => {
  it("reconhece o marcador de pesquisador e limpa o nome", () => {
    const r = extrairDadosDoNome("Rogerio ( Pesquisador) ");
    expect(r.nomeCompleto).toBe("Rogerio");
    expect(r.ehPesquisador).toBe(true);
    expect(r.apelido).toBeNull();
  });

  it("reconhece pesquisadora no feminino", () => {
    expect(extrairDadosDoNome("Nair (Pesquisadora)").ehPesquisador).toBe(true);
  });

  it("separa a unidade de origem quando ela é conhecida", () => {
    const r = extrairDadosDoNome("Fabio Alves ( Rosa dos Ventos) ", [
      "Rosa dos Ventos",
    ]);
    expect(r.nomeCompleto).toBe("Fabio Alves");
    expect(r.unidadeMencionada).toBe("Rosa dos Ventos");
  });

  it("guarda como apelido o parêntese que não é marcador conhecido", () => {
    const r = extrairDadosDoNome("Manuela (Machado)");
    expect(r.nomeCompleto).toBe("Manuela");
    expect(r.apelido).toBe("Machado");
  });

  it("transforma anotação de pendência em observação, não em apelido", () => {
    const r = extrairDadosDoNome("Raquel ( Verificando Escala)");
    expect(r.nomeCompleto).toBe("Raquel");
    expect(r.observacao).toBe("Verificando Escala");
    expect(r.apelido).toBeNull();
  });

  it("lida com nome que tem parêntese de parentesco", () => {
    const r = extrairDadosDoNome("Emile  neta ( maria do carmo)");
    expect(r.nomeCompleto).toBe("Emile Neta");
    expect(r.apelido).toBe("maria do carmo");
  });
});

describe("similaridade e duplicatas", () => {
  it("considera o mesmo nome com e sem acento como idêntico", () => {
    expect(similaridadeNome("José Roberto", "Jose Roberto")).toBe(1);
  });

  it("sugere duplicata para variação pequena de grafia", () => {
    const sugestoes = encontrarPossiveisDuplicatas(
      "Pericles De Melo Dantas",
      [{ nome: "Péricles de Melo Dantas" }, { nome: "Celia Maria da Silva" }],
      (c) => c.nome,
    );
    expect(sugestoes).toHaveLength(1);
    expect(sugestoes[0].candidato.nome).toBe("Péricles de Melo Dantas");
  });

  it("não junta irmãos que compartilham sobrenome", () => {
    const sugestoes = encontrarPossiveisDuplicatas(
      "Erika Porfirio Da Silva",
      [{ nome: "Haroldo Porfirio Da Silva" }],
      (c) => c.nome,
    );
    expect(sugestoes).toHaveLength(0);
  });

  it("ordena as sugestões da mais parecida para a menos", () => {
    const sugestoes = encontrarPossiveisDuplicatas(
      "Ana Julia dos Santos",
      [{ nome: "Ana Julia dos Santoss" }, { nome: "Ana Júlia dos Santos" }],
      (c) => c.nome,
    );
    expect(sugestoes[0].candidato.nome).toBe("Ana Júlia dos Santos");
    expect(sugestoes[0].similaridade).toBeGreaterThanOrEqual(
      sugestoes[1].similaridade,
    );
  });
});
