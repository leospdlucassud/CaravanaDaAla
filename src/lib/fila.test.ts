import { describe, expect, it } from "vitest";
import {
  aplicarCapacidade,
  moverParaFila,
  promoverDaFila,
  registrarDesistencia,
  renumerar,
  situacaoAoInscrever,
  vagasRestantes,
  type ItemDaLista,
} from "./fila";
import type { SituacaoInscricao } from "@/generated/prisma/enums";

/** Constrói uma lista com inscrições sequenciais, uma por minuto. */
function lista(
  descricoes: Array<{
    id: string;
    situacao: SituacaoInscricao;
    ordem?: number;
    posicaoFila?: number | null;
  }>,
): ItemDaLista[] {
  const base = new Date("2026-08-01T08:00:00Z").getTime();
  return descricoes.map((d, i) => ({
    id: d.id,
    situacao: d.situacao,
    ordem: d.ordem ?? 0,
    posicaoFila: d.posicaoFila ?? null,
    criadoEm: new Date(base + i * 60_000),
  }));
}

function situacoes(posicoes: ReturnType<typeof renumerar>) {
  return posicoes.map((p) => [p.id, p.situacao, p.ordem, p.posicaoFila]);
}

describe("renumerar", () => {
  it("fecha o buraco deixado por uma fila numerada à mão", () => {
    // O caso real da planilha: a 1ª posição vazia com gente esperando embaixo.
    const itens = lista([
      { id: "a", situacao: "FILA_ESPERA", posicaoFila: 2 },
      { id: "b", situacao: "FILA_ESPERA", posicaoFila: 3 },
      { id: "c", situacao: "FILA_ESPERA", posicaoFila: 4 },
    ]);

    const resultado = renumerar(itens);

    expect(resultado.map((r) => r.posicaoFila)).toEqual([1, 2, 3]);
    expect(resultado.map((r) => r.id)).toEqual(["a", "b", "c"]);
  });

  it("numera confirmadas a partir de 1 e zera a posição de fila delas", () => {
    const itens = lista([
      { id: "a", situacao: "CONFIRMADA", ordem: 7 },
      { id: "b", situacao: "CONFIRMADA", ordem: 9 },
    ]);

    expect(situacoes(renumerar(itens))).toEqual([
      ["a", "CONFIRMADA", 1, null],
      ["b", "CONFIRMADA", 2, null],
    ]);
  });

  it("desempata pela ordem de chegada quando a ordem colide", () => {
    const itens = lista([
      { id: "primeiro", situacao: "CONFIRMADA", ordem: 1 },
      { id: "segundo", situacao: "CONFIRMADA", ordem: 1 },
    ]);

    expect(renumerar(itens).map((r) => r.id)).toEqual(["primeiro", "segundo"]);
  });

  it("tira desistentes e cancelados de ambas as numerações", () => {
    const itens = lista([
      { id: "a", situacao: "CONFIRMADA", ordem: 1 },
      { id: "b", situacao: "DESISTIU" },
      { id: "c", situacao: "CANCELADA" },
    ]);

    const resultado = renumerar(itens);
    const fora = resultado.filter((r) => r.id !== "a");
    expect(fora.every((r) => r.ordem === 0 && r.posicaoFila === null)).toBe(true);
  });
});

describe("capacidade", () => {
  it("conta vagas apenas sobre confirmadas", () => {
    const itens = lista([
      { id: "a", situacao: "CONFIRMADA", ordem: 1 },
      { id: "b", situacao: "FILA_ESPERA", posicaoFila: 1 },
      { id: "c", situacao: "DESISTIU" },
    ]);

    expect(vagasRestantes(itens, 3)).toBe(2);
  });

  it("nunca devolve vaga negativa quando o ônibus encolhe", () => {
    const itens = lista([
      { id: "a", situacao: "CONFIRMADA", ordem: 1 },
      { id: "b", situacao: "CONFIRMADA", ordem: 2 },
    ]);

    expect(vagasRestantes(itens, 1)).toBe(0);
  });

  it("manda para a fila quem se inscreve com o ônibus cheio", () => {
    const cheio = lista([{ id: "a", situacao: "CONFIRMADA", ordem: 1 }]);
    expect(situacaoAoInscrever(cheio, 1)).toBe("FILA_ESPERA");
    expect(situacaoAoInscrever(cheio, 2)).toBe("CONFIRMADA");
  });
});

describe("promoverDaFila", () => {
  it("promove para o fim das confirmadas e fecha a fila atrás", () => {
    const itens = lista([
      { id: "a", situacao: "CONFIRMADA", ordem: 1 },
      { id: "b", situacao: "FILA_ESPERA", posicaoFila: 1 },
      { id: "c", situacao: "FILA_ESPERA", posicaoFila: 2 },
    ]);

    const resultado = promoverDaFila(itens, "b");

    expect(situacoes(resultado)).toEqual([
      ["a", "CONFIRMADA", 1, null],
      ["b", "CONFIRMADA", 2, null],
      ["c", "FILA_ESPERA", 0, 1],
    ]);
  });
});

describe("moverParaFila", () => {
  it("rebaixa para o fim da fila e reordena as confirmadas", () => {
    const itens = lista([
      { id: "a", situacao: "CONFIRMADA", ordem: 1 },
      { id: "b", situacao: "CONFIRMADA", ordem: 2 },
      { id: "c", situacao: "FILA_ESPERA", posicaoFila: 1 },
    ]);

    expect(situacoes(moverParaFila(itens, "a"))).toEqual([
      ["b", "CONFIRMADA", 1, null],
      ["c", "FILA_ESPERA", 0, 1],
      ["a", "FILA_ESPERA", 0, 2],
    ]);
  });
});

describe("registrarDesistencia", () => {
  it("promove o primeiro da fila quando abre assento", () => {
    const itens = lista([
      { id: "a", situacao: "CONFIRMADA", ordem: 1 },
      { id: "b", situacao: "CONFIRMADA", ordem: 2 },
      { id: "c", situacao: "FILA_ESPERA", posicaoFila: 1 },
      { id: "d", situacao: "FILA_ESPERA", posicaoFila: 2 },
    ]);

    const { posicoes, promovidoId } = registrarDesistencia(itens, "a", 2);

    expect(promovidoId).toBe("c");
    expect(situacoes(posicoes)).toEqual([
      ["b", "CONFIRMADA", 1, null],
      ["c", "CONFIRMADA", 2, null],
      ["d", "FILA_ESPERA", 0, 1],
      ["a", "DESISTIU", 0, null],
    ]);
  });

  it("não promove ninguém quando a fila está vazia", () => {
    const itens = lista([{ id: "a", situacao: "CONFIRMADA", ordem: 1 }]);
    const { promovidoId } = registrarDesistencia(itens, "a", 10);
    expect(promovidoId).toBeNull();
  });

  it("não promove quando o ônibus continua estourado", () => {
    // Capacidade 1, duas confirmadas (o ônibus encolheu): a desistência de uma
    // apenas devolve a lista ao tamanho certo, sem abrir vaga para a fila.
    const itens = lista([
      { id: "a", situacao: "CONFIRMADA", ordem: 1 },
      { id: "b", situacao: "CONFIRMADA", ordem: 2 },
      { id: "c", situacao: "FILA_ESPERA", posicaoFila: 1 },
    ]);

    const { promovidoId } = registrarDesistencia(itens, "a", 1);
    expect(promovidoId).toBeNull();
  });
});

describe("aplicarCapacidade", () => {
  it("sobe gente da fila quando o ônibus cresce", () => {
    const itens = lista([
      { id: "a", situacao: "CONFIRMADA", ordem: 1 },
      { id: "b", situacao: "FILA_ESPERA", posicaoFila: 1 },
      { id: "c", situacao: "FILA_ESPERA", posicaoFila: 2 },
    ]);

    expect(situacoes(aplicarCapacidade(itens, 3))).toEqual([
      ["a", "CONFIRMADA", 1, null],
      ["b", "CONFIRMADA", 2, null],
      ["c", "CONFIRMADA", 3, null],
    ]);
  });

  it("rebaixa os últimos confirmados quando o ônibus encolhe", () => {
    const itens = lista([
      { id: "a", situacao: "CONFIRMADA", ordem: 1 },
      { id: "b", situacao: "CONFIRMADA", ordem: 2 },
      { id: "c", situacao: "CONFIRMADA", ordem: 3 },
    ]);

    expect(situacoes(aplicarCapacidade(itens, 2))).toEqual([
      ["a", "CONFIRMADA", 1, null],
      ["b", "CONFIRMADA", 2, null],
      ["c", "FILA_ESPERA", 0, 1],
    ]);
  });

  it("rebaixado entra na frente de quem já esperava", () => {
    const itens = lista([
      { id: "a", situacao: "CONFIRMADA", ordem: 1 },
      { id: "b", situacao: "CONFIRMADA", ordem: 2 },
      { id: "jaEsperava", situacao: "FILA_ESPERA", posicaoFila: 1 },
    ]);

    const resultado = aplicarCapacidade(itens, 1);
    const fila = resultado
      .filter((r) => r.situacao === "FILA_ESPERA")
      .sort((x, y) => (x.posicaoFila ?? 0) - (y.posicaoFila ?? 0));

    expect(fila.map((f) => f.id)).toEqual(["b", "jaEsperava"]);
  });

  it("é idempotente: aplicar duas vezes não muda nada", () => {
    const itens = lista([
      { id: "a", situacao: "CONFIRMADA", ordem: 1 },
      { id: "b", situacao: "CONFIRMADA", ordem: 2 },
      { id: "c", situacao: "FILA_ESPERA", posicaoFila: 1 },
    ]);

    const primeira = aplicarCapacidade(itens, 2);
    const reconstruido: ItemDaLista[] = primeira.map((p) => ({
      ...p,
      criadoEm: itens.find((i) => i.id === p.id)!.criadoEm,
    }));

    expect(aplicarCapacidade(reconstruido, 2)).toEqual(primeira);
  });
});
