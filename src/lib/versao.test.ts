import { describe, expect, it } from "vitest";
import { analisarVersao, compararVersoes, versaoEhMaior, VERSAO } from "./versao";

describe("analisarVersao", () => {
  it("separa major, minor e patch", () => {
    expect(analisarVersao("1.2.3")).toEqual([1, 2, 3]);
  });

  it("ignora espaço e sufixos", () => {
    expect(analisarVersao("  10.0.5-beta")).toEqual([10, 0, 5]);
  });

  it("devolve nulo para texto inválido", () => {
    expect(analisarVersao("abc")).toBeNull();
    expect(analisarVersao("1.2")).toBeNull();
  });
});

describe("compararVersoes", () => {
  it("compara patch, minor e major na ordem certa", () => {
    expect(compararVersoes("1.0.1", "1.0.0")).toBe(1);
    expect(compararVersoes("1.1.0", "1.0.9")).toBe(1);
    expect(compararVersoes("2.0.0", "1.9.9")).toBe(1);
    expect(compararVersoes("1.0.0", "1.0.0")).toBe(0);
    expect(compararVersoes("1.0.0", "1.0.1")).toBe(-1);
  });

  it("não trata número maior de patch como major (comparação numérica, não texto)", () => {
    // "1.0.10" vs "1.0.9": como texto "10" < "9"; como número, 10 > 9.
    expect(compararVersoes("1.0.10", "1.0.9")).toBe(1);
  });

  it("versão inválida não dispara atualização — conta como igual", () => {
    expect(compararVersoes("", "1.0.0")).toBe(0);
    expect(compararVersoes("indefinida", "1.0.0")).toBe(0);
  });
});

describe("versaoEhMaior", () => {
  it("só é verdadeiro quando a candidata é realmente mais nova", () => {
    expect(versaoEhMaior("1.1.0", "1.0.0")).toBe(true);
    expect(versaoEhMaior("1.0.0", "1.0.0")).toBe(false);
    expect(versaoEhMaior("0.9.0", "1.0.0")).toBe(false);
  });
});

describe("VERSAO", () => {
  it("é uma versão semver válida", () => {
    expect(analisarVersao(VERSAO)).not.toBeNull();
  });
});
