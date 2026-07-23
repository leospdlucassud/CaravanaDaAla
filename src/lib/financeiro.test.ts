import { describe, expect, it } from "vitest";
import { montarRelatorio, resumirFinanceiro, type ItemFinanceiro } from "./financeiro";

const CARAVANA = { custoTotalTransporte: 1800, valorPorPessoa: 35 };

function item(parcial: Partial<ItemFinanceiro>): ItemFinanceiro {
  return {
    pagamentoStatus: "PENDENTE",
    valorPago: null,
    valorBeneficioArea: null,
    situacao: "CONFIRMADA",
    ...parcial,
  };
}

describe("resumirFinanceiro", () => {
  const resumo = resumirFinanceiro(
    [
      item({ pagamentoStatus: "PAGO", valorPago: 35 }),
      item({ pagamentoStatus: "PAGO", valorPago: 35 }),
      item({ pagamentoStatus: "BENEFICIO_AREA", valorBeneficioArea: 35 }),
      item({ pagamentoStatus: "ISENTO" }),
      item({ pagamentoStatus: "PENDENTE" }),
      item({ pagamentoStatus: "PENDENTE" }),
      // Fila de espera não ocupa assento nem entra na conta.
      item({ pagamentoStatus: "PAGO", valorPago: 35, situacao: "FILA_ESPERA" }),
    ],
    CARAVANA,
  );

  it("conta só quem está confirmado", () => {
    expect(resumo.participantes).toBe(6);
  });

  it("soma o que entrou, separando benefício da Área", () => {
    expect(resumo.arrecadado).toBe(70);
    expect(resumo.beneficioDaArea).toBe(35);
    expect(resumo.totalEmCaixa).toBe(105);
  });

  it("mostra o saldo negativo quando o ônibus custa mais que o arrecadado", () => {
    expect(resumo.saldo).toBe(105 - 1800);
  });

  it("estima o que falta receber pelos pendentes", () => {
    expect(resumo.pendentes).toBe(2);
    expect(resumo.aReceber).toBe(70);
  });

  it("não quebra quando a caravana não tem valores preenchidos", () => {
    const semValores = resumirFinanceiro([item({})], {
      custoTotalTransporte: null,
      valorPorPessoa: null,
    });
    expect(semValores.custoTotal).toBe(0);
    expect(semValores.saldo).toBe(0);
    expect(semValores.aReceber).toBe(0);
  });
});

describe("montarRelatorio", () => {
  it("gera um texto que o secretário consegue ler sem abrir o app", () => {
    const texto = montarRelatorio(
      { titulo: "Caravana de 1º de agosto", data: new Date("2026-08-01T00:00:00Z") },
      resumirFinanceiro([item({ pagamentoStatus: "PAGO", valorPago: 35 })], CARAVANA),
    );

    expect(texto).toContain("Caravana de 1º de agosto — 01/08/2026");
    expect(texto).toContain("Arrecadado dos participantes: R$");
    expect(texto).toContain("Saldo: -R$");
  });
});
