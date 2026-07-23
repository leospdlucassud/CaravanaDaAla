import { describe, expect, it } from "vitest";
import {
  analisarPlanilha,
  lerAgendamento,
  lerCartao,
  lerOrdenanca,
  lerOrganizacao,
  lerPagamento,
  lerRecomendacao,
  linhasQuePrecisamDeNome,
  type Celula,
} from "./importacao";

const CABECALHO: Celula[] = [
  "N°",
  "MEMBRO",
  "ORGANIZAÇÃO ",
  "RECÉM-CONVERSO",
  "CARTÃO/ORD.",
  "RECOMENDAÇÃO",
  "AGENDAMENTO",
  "ORDENANÇA",
  "PAGAMENTO",
  "BENEFÍCIO DA ÁREA ",
  "AGENDAMENTO EM GRUPO",
];

describe("lerOrganizacao", () => {
  it("aceita o acento errado que a própria validação da planilha propagou", () => {
    // A lista de validação trazia "Qúorum"; as 16 linhas herdaram o erro.
    expect(lerOrganizacao("Qúorum")).toBe("QUORUM_ELDERES");
    expect(lerOrganizacao("Quórum")).toBe("QUORUM_ELDERES");
  });

  it("expande a abreviação usada na planilha", () => {
    expect(lerOrganizacao("Soc")).toBe("SOCIEDADE_SOCORRO");
  });

  it("devolve nulo para organização desconhecida", () => {
    expect(lerOrganizacao("")).toBeNull();
    expect(lerOrganizacao("Escola Dominical")).toBeNull();
  });
});

describe("lerRecomendacao", () => {
  it("separa a ação do estado", () => {
    // Na planilha, marcar "Ajudar a agendar entrevista" apagava o status.
    const r = lerRecomendacao("Ajudar a agendar entrevista");
    expect(r.precisaAjudaEntrevista).toBe(true);
    expect(r.status).toBeNull();
  });

  it("traduz Inválida para vencida", () => {
    expect(lerRecomendacao("Inválida").status).toBe("VENCIDA");
  });

  it("trata '?' e vazio como a mesma pendência", () => {
    expect(lerRecomendacao("?").status).toBeNull();
    expect(lerRecomendacao("").status).toBeNull();
    expect(lerRecomendacao(null).status).toBeNull();
  });

  it("reconhece a abreviação de não se aplica", () => {
    expect(lerRecomendacao("Ñ se aplica").status).toBe("NAO_SE_APLICA");
  });
});

describe("lerAgendamento", () => {
  it("normaliza as variações de caixa e acento", () => {
    expect(lerAgendamento("Não ")).toBe("NAO");
    expect(lerAgendamento("nao")).toBe("NAO");
    expect(lerAgendamento("SIM")).toBe("SIM");
    expect(lerAgendamento("?")).toBeNull();
  });
});

describe("lerCartao", () => {
  it("transforma 'Precisa de ajuda' em sinalizador próprio", () => {
    const r = lerCartao("Precisa de ajuda");
    expect(r.nomesDeFamilia).toBe("PRECISA_DE_AJUDA");
    expect(r.precisaAjudaNomes).toBe(true);
  });

  it("trata 'Não' como pendente, não como negativa informativa", () => {
    // A coluna vinha com 'Não' em 46 de 46 linhas: variância zero.
    expect(lerCartao("Não").nomesDeFamilia).toBeNull();
  });
});

describe("lerOrdenanca", () => {
  it("reconhece a primeira investidura antes da investidura vicária", () => {
    expect(lerOrdenanca("1º Investidura").ordenanca).toBe("PRIMEIRA_INVESTIDURA");
    expect(lerOrdenanca("investidura").ordenanca).toBe("INVESTIDURA");
  });

  it("trata jardim como participação, não como ordenança", () => {
    const r = lerOrdenanca("jardim");
    expect(r.ordenanca).toBeNull();
    expect(r.participacao).toBe("ACOMPANHANTE_JARDINS");
  });

  it("devolve pendente para '?'", () => {
    expect(lerOrdenanca("?").ordenanca).toBeNull();
    expect(lerOrdenanca("?").participacao).toBe("ORDENANCA");
  });
});

describe("lerPagamento", () => {
  it("benefício da área tem precedência sobre o pagamento comum", () => {
    expect(lerPagamento("Não", "Sim")).toBe("BENEFICIO_AREA");
  });

  it("normaliza as quatro grafias de não que a planilha tinha", () => {
    for (const variacao of ["não", "Não ", "NÃO", "nao"]) {
      expect(lerPagamento(variacao, null)).toBe("PENDENTE");
    }
  });

  it("aceita sim em qualquer caixa", () => {
    expect(lerPagamento("sim", null)).toBe("PAGO");
    expect(lerPagamento("Sim", null)).toBe("PAGO");
  });
});

describe("analisarPlanilha", () => {
  const matriz: Celula[][] = [
    ["CARAVANA - 01 DE AGOSTO"],
    [],
    CABECALHO,
    [
      1,
      "Felipe Lino Dos Santos",
      "Rapazes",
      "Sim",
      "Não",
      "Ñ se aplica",
      null,
      "investidura",
      "NÃO",
    ].map((v) => (v === null ? null : String(v))),
    [
      "2",
      "Rogerio ( Pesquisador) ",
      "Qúorum",
      null,
      "Não",
      "Ajudar a agendar entrevista",
      null,
      "batistério",
      "Não ",
    ],
    ["3", "Esther Aguiar ", "Moças", "Não", "Não", "Ñ se aplica", "Ñ se aplica", "jardim", "nao"],
    // Linha sem nome: existe na planilha com organização e status preenchidos.
    ["4", null, "Primária", "não", "Não", "Válida", "Não", "?", "Não "],
    ["F. ESPERA 1°"],
    ["F. ESPERA 2°", "Raquel ( Verificando Escala)"],
    ["F. ESPERA 3°", "Valcilene Glória Rangel Alves ( Rosa dos Ventos)"],
  ];

  const resultado = analisarPlanilha(matriz);

  it("acha o cabeçalho mesmo com título mesclado por cima", () => {
    expect(resultado.tituloDaCaravana).toBe("CARAVANA - 01 DE AGOSTO");
    expect(resultado.linhas).toHaveLength(6);
  });

  it("limpa o nome e sinaliza o pesquisador", () => {
    const rogerio = resultado.linhas[1];
    expect(rogerio.nomeSugerido).toBe("Rogerio");
    expect(rogerio.ehPesquisador).toBe(true);
    expect(rogerio.precisaAjudaEntrevista).toBe(true);
  });

  it("marca quem fica nos jardins como acompanhante", () => {
    const esther = resultado.linhas[2];
    expect(esther.participacao).toBe("ACOMPANHANTE_JARDINS");
    expect(esther.ordenanca).toBeNull();
  });

  it("preserva a linha sem nome em vez de descartá-la, e a sinaliza", () => {
    const semNome = resultado.linhas[3];
    expect(semNome.semNome).toBe(true);
    expect(semNome.organizacao).toBe("PRIMARIA");
    expect(semNome.recomendacaoStatus).toBe("VALIDA");
    expect(linhasQuePrecisamDeNome(resultado)).toHaveLength(1);
  });

  it("identifica a fila de espera e ignora as posições vazias", () => {
    const naFila = resultado.linhas.filter((l) => l.naFilaDeEspera);
    expect(naFila.map((l) => l.nomeSugerido)).toEqual([
      "Raquel",
      "Valcilene Glória Rangel Alves",
    ]);
    // "F. ESPERA 1°" estava vazia — não vira pessoa.
    expect(resultado.ignoradas).toBe(1);
  });

  it("guarda a anotação de pendência como observação, fora do nome", () => {
    const raquel = resultado.linhas.find((l) => l.nomeSugerido === "Raquel");
    expect(raquel?.observacao).toBe("Verificando Escala");
  });

  it("aponta a linha de origem para conferência na planilha", () => {
    expect(resultado.linhas[0].linhaNaPlanilha).toBe(4);
  });

  it("devolve vazio, sem quebrar, quando não acha cabeçalho", () => {
    const semCabecalho = analisarPlanilha([["qualquer coisa"], ["outra"]]);
    expect(semCabecalho.linhas).toHaveLength(0);
  });
});
