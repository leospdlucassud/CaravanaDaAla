import { describe, expect, it } from "vitest";
import {
  linkDoWhatsApp,
  montarMensagem,
  paraNumeroDoWhatsApp,
  primeiroNomeDe,
} from "./mensagens";

const DADOS = {
  primeiroNome: "Ana",
  tituloDaCaravana: "Caravana de 1º de agosto",
  dataFormatada: "01/08/2026",
  templo: "Rio de Janeiro",
  valorPorPessoa: 35,
  ordenanca: null,
};

describe("montarMensagem", () => {
  it("nunca menciona a situação da recomendação", () => {
    // A regra que mais importa: isso vaza assunto de entrevista para um canal
    // que a família toda lê.
    const todas = (["entrevista", "agendamento", "nomes", "pagamento", "ordenanca"] as const)
      .map((tipo) => montarMensagem(tipo, DADOS))
      .join(" ")
      .toLowerCase();

    for (const proibido of ["recomendação", "vencida", "inválida", "digno", "indigno"]) {
      expect(todas).not.toContain(proibido);
    }
  });

  it("convida a falar com o bispo sem dizer por quê", () => {
    const texto = montarMensagem("entrevista", DADOS);
    expect(texto).toContain("horário com o bispo");
  });

  it("inclui o valor da passagem quando a caravana tem valor", () => {
    expect(montarMensagem("pagamento", DADOS)).toContain("R$");
  });

  it("não inventa valor quando a caravana não tem", () => {
    const texto = montarMensagem("pagamento", { ...DADOS, valorPorPessoa: null });
    expect(texto).not.toContain("R$");
  });

  it("cita a ordenança na mensagem de nomes, quando ela é conhecida", () => {
    const texto = montarMensagem("nomes", { ...DADOS, ordenanca: "BATISTERIO" });
    expect(texto).toContain("batistério");
  });

  it("sempre abre com o nome e a caravana", () => {
    expect(montarMensagem("agendamento", DADOS)).toContain("Olá, Ana!");
    expect(montarMensagem("agendamento", DADOS)).toContain("Caravana de 1º de agosto");
  });
});

describe("primeiroNomeDe", () => {
  it("pega só o primeiro nome", () => {
    expect(primeiroNomeDe("Ana Júlia dos Santos de Aguiar")).toBe("Ana");
  });

  it("aguenta espaço sobrando", () => {
    expect(primeiroNomeDe("  Pericles  De Melo ")).toBe("Pericles");
  });
});

describe("paraNumeroDoWhatsApp", () => {
  it("aceita o formato que as pessoas escrevem", () => {
    expect(paraNumeroDoWhatsApp("(21) 99999-8888")).toBe("5521999998888");
  });

  it("não duplica o código do país quando ele já veio", () => {
    expect(paraNumeroDoWhatsApp("5521999998888")).toBe("5521999998888");
  });

  it("devolve nulo para telefone ausente ou curto demais", () => {
    expect(paraNumeroDoWhatsApp(null)).toBeNull();
    expect(paraNumeroDoWhatsApp("9999")).toBeNull();
  });
});

describe("linkDoWhatsApp", () => {
  it("codifica a mensagem na URL", () => {
    const link = linkDoWhatsApp("(21) 99999-8888", "Olá, Ana!");
    expect(link).toBe("https://wa.me/5521999998888?text=Ol%C3%A1%2C%20Ana!");
  });

  it("devolve nulo quando não há telefone — a tela mostra 'copiar' no lugar", () => {
    expect(linkDoWhatsApp(null, "oi")).toBeNull();
  });
});
