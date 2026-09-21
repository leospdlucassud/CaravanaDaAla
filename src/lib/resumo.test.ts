import { describe, expect, it } from "vitest";
import { PENDENCIAS, resumir, type InscricaoParaResumo } from "./resumo";

type Inscricao = InscricaoParaResumo & { pagamentoStatus: string; valorPago: unknown };

function inscricao(parcial: Partial<Inscricao>): Inscricao {
  return {
    situacao: "CONFIRMADA",
    participacao: "ORDENANCA",
    ordenanca: "BATISTERIO",
    recomendacaoStatus: "VALIDA",
    agendamentoStatus: "SIM",
    avisos: [],
    pagamentoStatus: "PAGO",
    valorPago: 35,
    ...parcial,
  };
}

describe("PENDENCIAS", () => {
  it("fila conta só quem está na fila de espera", () => {
    expect(PENDENCIAS.fila(inscricao({ situacao: "FILA_ESPERA" }))).toBe(true);
    expect(PENDENCIAS.fila(inscricao({}))).toBe(false);
    expect(PENDENCIAS.fila(inscricao({ situacao: "DESISTIU" }))).toBe(false);
  });

  it("atenção conta só aviso grave de quem está confirmado", () => {
    const grave = [{ gravidade: "alta" as const }];
    const leve = [{ gravidade: "media" as const }];
    expect(PENDENCIAS.atencao(inscricao({ avisos: grave }))).toBe(true);
    expect(PENDENCIAS.atencao(inscricao({ avisos: leve }))).toBe(false);
    // Quem espera na fila ainda não viaja: o aviso não entra na conta.
    expect(
      PENDENCIAS.atencao(inscricao({ situacao: "FILA_ESPERA", avisos: grave })),
    ).toBe(false);
  });

  it("ordenança, recomendação e agendamento pendentes contam nulo", () => {
    expect(PENDENCIAS.ordenanca(inscricao({ ordenanca: null }))).toBe(true);
    expect(PENDENCIAS.recomendacao(inscricao({ recomendacaoStatus: null }))).toBe(true);
    expect(PENDENCIAS.agendamento(inscricao({ agendamentoStatus: null }))).toBe(true);
    expect(PENDENCIAS.ordenanca(inscricao({}))).toBe(false);
  });

  it("quem só acompanha nos jardins não tem ordenança, recomendação nem agendamento a resolver", () => {
    const jardins = inscricao({
      participacao: "ACOMPANHANTE_JARDINS",
      ordenanca: null,
      recomendacaoStatus: null,
      agendamentoStatus: null,
    });
    expect(PENDENCIAS.ordenanca(jardins)).toBe(false);
    expect(PENDENCIAS.recomendacao(jardins)).toBe(false);
    expect(PENDENCIAS.agendamento(jardins)).toBe(false);
  });

  it("quem está na fila não conta como pendência de ordenança", () => {
    expect(
      PENDENCIAS.ordenanca(inscricao({ situacao: "FILA_ESPERA", ordenanca: null })),
    ).toBe(false);
  });
});

describe("resumir", () => {
  const inscritos: Inscricao[] = [
    inscricao({}),
    inscricao({ ordenanca: null, recomendacaoStatus: null }),
    inscricao({ agendamentoStatus: null, avisos: [{ gravidade: "alta" }] }),
    inscricao({ participacao: "ACOMPANHANTE_JARDINS", ordenanca: null, pagamentoStatus: "PENDENTE", valorPago: null }),
    inscricao({ situacao: "FILA_ESPERA", ordenanca: null }),
    inscricao({ situacao: "DESISTIU", ordenanca: null }),
  ];
  const resumo = resumir(inscritos, { capacidadeAssentos: 5, custoTotalTransporte: 100 });

  it("o número de cada card é exatamente quem a lista do card mostra", () => {
    // A garantia central: card e diálogo contam pelas mesmas regras.
    const contar = (chave: keyof typeof PENDENCIAS) =>
      inscritos.filter(PENDENCIAS[chave]).length;

    expect(resumo.naFila).toBe(contar("fila"));
    expect(resumo.comAvisoAlto).toBe(contar("atencao"));
    expect(resumo.ordenancaPendente).toBe(contar("ordenanca"));
    expect(resumo.recomendacaoPendente).toBe(contar("recomendacao"));
    expect(resumo.agendamentoPendente).toBe(contar("agendamento"));
  });

  it("conta os valores esperados neste cenário", () => {
    expect(resumo.confirmados).toBe(4);
    expect(resumo.naFila).toBe(1);
    expect(resumo.desistentes).toBe(1);
    expect(resumo.vagasRestantes).toBe(1);
    expect(resumo.ordenancaPendente).toBe(1);
    expect(resumo.recomendacaoPendente).toBe(1);
    expect(resumo.agendamentoPendente).toBe(1);
    expect(resumo.comAvisoAlto).toBe(1);
    expect(resumo.pagamentoPendente).toBe(1);
    expect(resumo.totalArrecadado).toBe(105);
    expect(resumo.custoTotal).toBe(100);
  });

  it("vagas nunca ficam negativas quando o ônibus passa da capacidade", () => {
    const cheio = resumir([inscricao({}), inscricao({})], {
      capacidadeAssentos: 1,
      custoTotalTransporte: null,
    });
    expect(cheio.vagasRestantes).toBe(0);
  });
});
