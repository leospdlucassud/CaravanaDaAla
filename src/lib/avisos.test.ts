import { describe, expect, it } from "vitest";
import { calcularAvisos, type InscricaoParaAviso } from "./avisos";

const DIA_DA_CARAVANA = new Date("2026-11-07T00:00:00Z");

function inscricao(
  parcial: Partial<Omit<InscricaoParaAviso, "membro">> & {
    membro?: Partial<InscricaoParaAviso["membro"]>;
  } = {},
): InscricaoParaAviso {
  const { membro, ...resto } = parcial;
  return {
    participacao: "ORDENANCA",
    ordenanca: "BATISTERIO",
    situacao: "CONFIRMADA",
    acompanhanteId: null,
    ...resto,
    membro: {
      recomendacaoTipo: "MEMBRO_INVESTIDO",
      recomendacaoValidaAte: new Date("2027-12-31"),
      anoNascimento: 1980,
      recemConverso: false,
      ...membro,
    },
  };
}

const codigos = (i: InscricaoParaAviso) =>
  calcularAvisos(i, DIA_DA_CARAVANA).map((a) => a.codigo);

describe("calcularAvisos", () => {
  it("não avisa nada de quem está em dia", () => {
    expect(codigos(inscricao())).toEqual([]);
  });

  it("avisa, em grave, recomendação com tipo mas sem data de validade", () => {
    // Sem este aviso, apagar a data de uma recomendação vencida sumia com o
    // problema — e o resumo mostrava a pessoa como resolvida.
    const avisos = calcularAvisos(
      inscricao({ membro: { recomendacaoValidaAte: null } }),
      DIA_DA_CARAVANA,
    );
    expect(avisos).toEqual([
      expect.objectContaining({ codigo: "recomendacao-sem-data", gravidade: "alta" }),
    ]);
  });

  it("avisa recomendação vencida, e não a trata como sem data", () => {
    expect(
      codigos(inscricao({ membro: { recomendacaoValidaAte: new Date("2026-10-01") } })),
    ).toEqual(["recomendacao-vencida"]);
  });

  it("quem não tem recomendação recebe só o aviso de ausência", () => {
    expect(
      codigos(
        inscricao({ membro: { recomendacaoTipo: "NENHUMA", recomendacaoValidaAte: null } }),
      ),
    ).toEqual(["sem-recomendacao"]);
  });

  it("sem ordenança, só o aviso médio de ordenança indefinida", () => {
    const avisos = calcularAvisos(
      inscricao({ ordenanca: null, membro: { recomendacaoValidaAte: null } }),
      DIA_DA_CARAVANA,
    );
    expect(avisos.map((a) => [a.codigo, a.gravidade])).toEqual([
      ["ordenanca-indefinida", "media"],
    ]);
  });

  it("não avisa quem fica nos jardins nem quem está na fila", () => {
    const semData = { membro: { recomendacaoValidaAte: null } };
    expect(codigos(inscricao({ ...semData, participacao: "ACOMPANHANTE_JARDINS" }))).toEqual(
      [],
    );
    expect(codigos(inscricao({ ...semData, situacao: "FILA_ESPERA" }))).toEqual([]);
  });
});
