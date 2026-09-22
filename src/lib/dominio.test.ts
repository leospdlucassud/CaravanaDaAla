import { describe, expect, it } from "vitest";
import {
  atividadeDaInscricao,
  avisoDeRecomendacaoParaOrdenanca,
  camposDaAtividade,
  caravanaEstaAtiva,
  nomeDoTemplo,
  elegivelParaBatisterio,
  entraNoPedidoDeGrupo,
  exigeAgendamentoProprio,
  montarPedidoDeGrupo,
  rotuloGrupoCaravana,
  statusDaRecomendacao,
  validadeSugerida,
  venceAntesDaCaravana,
} from "./dominio";

describe("situação agrupada da caravana", () => {
  it("trata planejamento e confirmada como ativas", () => {
    expect(caravanaEstaAtiva("PLANEJAMENTO")).toBe(true);
    expect(caravanaEstaAtiva("CONFIRMADA")).toBe(true);
    expect(rotuloGrupoCaravana("PLANEJAMENTO")).toBe("Ativa");
    expect(rotuloGrupoCaravana("CONFIRMADA")).toBe("Ativa");
  });

  it("trata realizada e cancelada como inativas", () => {
    expect(caravanaEstaAtiva("REALIZADA")).toBe(false);
    expect(caravanaEstaAtiva("CANCELADA")).toBe(false);
    expect(rotuloGrupoCaravana("REALIZADA")).toBe("Inativo");
    expect(rotuloGrupoCaravana("CANCELADA")).toBe("Inativo");
  });
});

const DIA_DA_CARAVANA = new Date("2026-08-01T00:00:00Z");

describe("validade da recomendação", () => {
  it("sugere 1 ano para uso limitado e 2 anos para as demais", () => {
    const entrevista = new Date("2026-03-10T00:00:00Z");
    expect(validadeSugerida("USO_LIMITADO", entrevista)?.getFullYear()).toBe(2027);
    expect(validadeSugerida("MEMBRO_INVESTIDO", entrevista)?.getFullYear()).toBe(2028);
    expect(validadeSugerida("ORDENANCAS_PROPRIAS", entrevista)?.getFullYear()).toBe(2028);
  });

  it("não sugere data para quem não possui recomendação", () => {
    expect(validadeSugerida("NENHUMA", new Date())).toBeNull();
  });

  it("deriva o status da data guardada", () => {
    expect(
      statusDaRecomendacao("MEMBRO_INVESTIDO", new Date("2026-12-31"), DIA_DA_CARAVANA),
    ).toBe("VALIDA");
    expect(
      statusDaRecomendacao("MEMBRO_INVESTIDO", new Date("2026-07-31"), DIA_DA_CARAVANA),
    ).toBe("VENCIDA");
    expect(statusDaRecomendacao("NENHUMA", null, DIA_DA_CARAVANA)).toBe("NAO_POSSUI");
  });

  it("trata como não-possui quem tem tipo mas não tem data", () => {
    // Sem a data impressa não dá para afirmar que está válida.
    expect(statusDaRecomendacao("USO_LIMITADO", null, DIA_DA_CARAVANA)).toBe(
      "NAO_POSSUI",
    );
  });

  it("avisa com 45 dias de antecedência", () => {
    // Vence em 10/09, caravana em 01/08: dentro da janela, precisa agendar já.
    expect(venceAntesDaCaravana(new Date("2026-09-10"), DIA_DA_CARAVANA)).toBe(true);
    // Vence em 10/12: fora da janela.
    expect(venceAntesDaCaravana(new Date("2026-12-10"), DIA_DA_CARAVANA)).toBe(false);
  });
});

describe("matriz ordenança x recomendação", () => {
  it("aceita uso limitado no batistério", () => {
    expect(avisoDeRecomendacaoParaOrdenanca("USO_LIMITADO", "BATISTERIO")).toBeNull();
  });

  it("aceita membro investido no batistério", () => {
    expect(
      avisoDeRecomendacaoParaOrdenanca("MEMBRO_INVESTIDO", "BATISTERIO"),
    ).toBeNull();
  });

  it("avisa quando uso limitado é marcado para investidura", () => {
    const aviso = avisoDeRecomendacaoParaOrdenanca("USO_LIMITADO", "INVESTIDURA");
    expect(aviso?.codigo).toBe("recomendacao-incompativel");
    expect(aviso?.gravidade).toBe("alta");
  });

  it("avisa quando a 1ª investidura não tem recomendação de ordenanças próprias", () => {
    expect(
      avisoDeRecomendacaoParaOrdenanca("MEMBRO_INVESTIDO", "PRIMEIRA_INVESTIDURA")
        ?.codigo,
    ).toBe("recomendacao-incompativel");
    expect(
      avisoDeRecomendacaoParaOrdenanca("ORDENANCAS_PROPRIAS", "PRIMEIRA_INVESTIDURA"),
    ).toBeNull();
  });

  it("distingue ausência de recomendação de recomendação errada", () => {
    expect(avisoDeRecomendacaoParaOrdenanca("NENHUMA", "BATISTERIO")?.codigo).toBe(
      "sem-recomendacao",
    );
  });
});

describe("elegibilidade para o batistério", () => {
  it("qualifica no ano em que a pessoa completa 12, não na data", () => {
    // Nasceu em 2014: completa 12 em 2026, elegível desde janeiro de 2026.
    expect(elegivelParaBatisterio(2014, DIA_DA_CARAVANA)).toBe(true);
    // Nasceu em 2015: completa 12 só em 2027.
    expect(elegivelParaBatisterio(2015, DIA_DA_CARAVANA)).toBe(false);
  });

  it("devolve nulo quando não sabemos o ano — pendência, não impedimento", () => {
    expect(elegivelParaBatisterio(null, DIA_DA_CARAVANA)).toBeNull();
  });
});

describe("pedido de agendamento em grupo", () => {
  it("exclui ordenanças próprias, que se agendam por telefone", () => {
    expect(exigeAgendamentoProprio("PRIMEIRA_INVESTIDURA")).toBe(true);
    expect(exigeAgendamentoProprio("BATISTERIO")).toBe(false);
    expect(entraNoPedidoDeGrupo("ORDENANCA", "PRIMEIRA_INVESTIDURA")).toBe(false);
  });

  it("exclui quem só acompanha nos jardins — ocupa assento, não vaga no templo", () => {
    expect(entraNoPedidoDeGrupo("ACOMPANHANTE_JARDINS", null)).toBe(false);
  });

  it("exclui quem ainda não tem ordenança definida", () => {
    expect(entraNoPedidoDeGrupo("ORDENANCA", null)).toBe(false);
  });

  it("conta por ordenança e por sexo, que é o que o templo pede", () => {
    const linhas = montarPedidoDeGrupo([
      { participacao: "ORDENANCA", ordenanca: "BATISTERIO", sexo: "MASCULINO", situacao: "CONFIRMADA" },
      { participacao: "ORDENANCA", ordenanca: "BATISTERIO", sexo: "FEMININO", situacao: "CONFIRMADA" },
      { participacao: "ORDENANCA", ordenanca: "BATISTERIO", sexo: "FEMININO", situacao: "CONFIRMADA" },
      { participacao: "ORDENANCA", ordenanca: "BATISTERIO", sexo: null, situacao: "CONFIRMADA" },
      { participacao: "ORDENANCA", ordenanca: "INVESTIDURA", sexo: "MASCULINO", situacao: "CONFIRMADA" },
      // Não deve entrar: está na fila de espera.
      { participacao: "ORDENANCA", ordenanca: "BATISTERIO", sexo: "MASCULINO", situacao: "FILA_ESPERA" },
      // Não deve entrar: ordenança própria.
      { participacao: "ORDENANCA", ordenanca: "PRIMEIRA_INVESTIDURA", sexo: "MASCULINO", situacao: "CONFIRMADA" },
      // Não deve entrar: fica nos jardins.
      { participacao: "ACOMPANHANTE_JARDINS", ordenanca: null, sexo: "FEMININO", situacao: "CONFIRMADA" },
    ]);

    expect(linhas).toEqual([
      { ordenanca: "BATISTERIO", homens: 1, mulheres: 2, semSexoInformado: 1, total: 4 },
      { ordenanca: "INVESTIDURA", homens: 1, mulheres: 0, semSexoInformado: 0, total: 1 },
    ]);
  });

  it("expõe quem está sem sexo informado em vez de escondê-lo na contagem", () => {
    // O templo pede a divisão por sexo; um total que não fecha precisa aparecer.
    const [linha] = montarPedidoDeGrupo([
      { participacao: "ORDENANCA", ordenanca: "BATISTERIO", sexo: null, situacao: "CONFIRMADA" },
    ]);
    expect(linha.semSexoInformado).toBe(1);
    expect(linha.homens + linha.mulheres).toBe(0);
  });
});

describe("nomeDoTemplo", () => {
  it("não duplica o \"Templo\" quando o nome já vem completo", () => {
    // O defeito original: a tela colava "Templo de" na frente do nome completo.
    expect(nomeDoTemplo("Templo do rio de janeiro")).toBe("Templo do Rio de Janeiro");
    expect(nomeDoTemplo("Templo do rio de janeiro")).not.toContain("Templo de Templo");
  });

  it("completa o prefixo quando só veio a cidade", () => {
    expect(nomeDoTemplo("Campinas")).toBe("Templo de Campinas");
  });

  it("usa \"do\" para o Rio de Janeiro, como se fala em português", () => {
    expect(nomeDoTemplo("Rio de Janeiro")).toBe("Templo do Rio de Janeiro");
    expect(nomeDoTemplo("rio de janeiro")).toBe("Templo do Rio de Janeiro");
  });

  it("não põe artigo nas outras cidades que começam com Rio", () => {
    expect(nomeDoTemplo("Rio Branco")).toBe("Templo de Rio Branco");
    expect(nomeDoTemplo("Rio Verde")).toBe("Templo de Rio Verde");
    expect(nomeDoTemplo("Riozinho")).toBe("Templo de Riozinho");
  });

  it("não desfaz a grafia de quem digitou com maiúsculas", () => {
    expect(nomeDoTemplo("Templo de Washington D.C.")).toBe("Templo de Washington D.C.");
    expect(nomeDoTemplo("Templo de Campinas - SP")).toBe("Templo de Campinas - SP");
    expect(nomeDoTemplo("Templo de McAllen Texas")).toBe("Templo de McAllen Texas");
    expect(nomeDoTemplo("Templo de Porto Moresby Papua-Nova Guiné")).toBe(
      "Templo de Porto Moresby Papua-Nova Guiné",
    );
    expect(nomeDoTemplo("Templo da Cidade do México")).toBe("Templo da Cidade do México");
  });

  it("conserta o que veio todo em maiúsculas", () => {
    expect(nomeDoTemplo("TEMPLO DE CAMPINAS")).toBe("Templo de Campinas");
    expect(nomeDoTemplo("RIO DE JANEIRO")).toBe("Templo do Rio de Janeiro");
    expect(nomeDoTemplo("CAMPINAS")).toBe("Templo de Campinas");
  });

  it("aceita qualquer caixa e espaço sobrando", () => {
    expect(nomeDoTemplo("  TEMPLO   do  Rio de Janeiro ")).toBe(
      "Templo do Rio de Janeiro",
    );
  });

  it("é idempotente — aplicar duas vezes não muda nada", () => {
    for (const nome of [
      "Templo do rio de janeiro",
      "Campinas",
      "Rio de Janeiro",
      "Rio Branco",
      "Templo de São Paulo Brasil",
      "Templo de Washington D.C.",
      "TEMPLO DE CAMPINAS",
      "templo",
    ]) {
      expect(nomeDoTemplo(nomeDoTemplo(nome))).toBe(nomeDoTemplo(nome));
    }
  });

  it("devolve vazio para texto vazio", () => {
    expect(nomeDoTemplo("   ")).toBe("");
  });
});

describe("atividade no templo", () => {
  it("jardins vira participação de acompanhante, sem ordenança", () => {
    expect(camposDaAtividade("JARDINS")).toEqual({
      participacao: "ACOMPANHANTE_JARDINS",
      ordenanca: null,
    });
  });

  it("uma ordenança volta a ser participação de ordenança", () => {
    // Antes não havia como sair de "jardins" pela tela; esta é a volta.
    expect(camposDaAtividade("BATISTERIO")).toEqual({
      participacao: "ORDENANCA",
      ordenanca: "BATISTERIO",
    });
  });

  it("pendente continua pendente", () => {
    expect(camposDaAtividade(null)).toEqual({ participacao: "ORDENANCA", ordenanca: null });
  });

  it("ida e volta dão o mesmo resultado", () => {
    for (const atividade of ["JARDINS", "INVESTIDURA", null] as const) {
      expect(atividadeDaInscricao(camposDaAtividade(atividade))).toBe(atividade);
    }
  });

  it("quem está nos jardins aparece como jardins, mesmo com ordenança antiga gravada", () => {
    expect(
      atividadeDaInscricao({ participacao: "ACOMPANHANTE_JARDINS", ordenanca: "BATISTERIO" }),
    ).toBe("JARDINS");
  });
});
