import type { StatusPagamento } from "@/generated/prisma/enums";

/**
 * Contas da caravana.
 *
 * Escopo deliberadamente estreito: o app registra "pagou a passagem" e nada
 * além disso. Nenhum outro dado financeiro da pessoa entra aqui.
 *
 * Módulo puro, para o relatório do secretário nunca depender de tela.
 */

export type ItemFinanceiro = {
  pagamentoStatus: StatusPagamento;
  valorPago: number | null;
  valorBeneficioArea: number | null;
  situacao: string;
};

export type ResumoFinanceiro = {
  /** Quantos assentos entram na conta (confirmados). */
  participantes: number;
  pagantes: number;
  pendentes: number;
  isentos: number;
  comBeneficioDaArea: number;
  arrecadado: number;
  beneficioDaArea: number;
  /** Arrecadado + benefício: o que de fato entrou. */
  totalEmCaixa: number;
  custoTotal: number;
  saldo: number;
  /** O que ainda falta entrar, estimado pelo valor por pessoa. */
  aReceber: number;
};

export function resumirFinanceiro(
  itens: ItemFinanceiro[],
  caravana: { custoTotalTransporte: number | null; valorPorPessoa: number | null },
): ResumoFinanceiro {
  const confirmados = itens.filter((i) => i.situacao === "CONFIRMADA");

  const soma = (pegar: (i: ItemFinanceiro) => number | null) =>
    confirmados.reduce((total, item) => total + (pegar(item) ?? 0), 0);

  const contar = (status: StatusPagamento) =>
    confirmados.filter((i) => i.pagamentoStatus === status).length;

  const arrecadado = soma((i) => i.valorPago);
  const beneficioDaArea = soma((i) => i.valorBeneficioArea);
  const custoTotal = caravana.custoTotalTransporte ?? 0;
  const pendentes = contar("PENDENTE");

  return {
    participantes: confirmados.length,
    pagantes: contar("PAGO"),
    pendentes,
    isentos: contar("ISENTO"),
    comBeneficioDaArea: contar("BENEFICIO_AREA"),
    arrecadado,
    beneficioDaArea,
    totalEmCaixa: arrecadado + beneficioDaArea,
    custoTotal,
    saldo: arrecadado + beneficioDaArea - custoTotal,
    // Estimativa, não promessa: quem está pendente ainda pode virar isento.
    aReceber: pendentes * (caravana.valorPorPessoa ?? 0),
  };
}

export function formatarDinheiro(valor: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor);
}

/** Texto corrido para o secretário — copiável, sem depender de anexo. */
export function montarRelatorio(
  caravana: { titulo: string; data: Date },
  resumo: ResumoFinanceiro,
): string {
  const data = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(
    caravana.data,
  );

  const linhas = [
    `${caravana.titulo} — ${data}`,
    "",
    `Participantes confirmados: ${resumo.participantes}`,
    `Pagaram: ${resumo.pagantes}`,
    `Pendentes: ${resumo.pendentes}`,
    `Isentos: ${resumo.isentos}`,
    `Com benefício da Área: ${resumo.comBeneficioDaArea}`,
    "",
    `Arrecadado dos participantes: ${formatarDinheiro(resumo.arrecadado)}`,
    `Benefício da Área: ${formatarDinheiro(resumo.beneficioDaArea)}`,
    `Total em caixa: ${formatarDinheiro(resumo.totalEmCaixa)}`,
    `Custo do transporte: ${formatarDinheiro(resumo.custoTotal)}`,
    `Saldo: ${formatarDinheiro(resumo.saldo)}`,
  ];

  if (resumo.pendentes > 0 && resumo.aReceber > 0) {
    linhas.push(
      "",
      `Ainda a receber (estimado): ${formatarDinheiro(resumo.aReceber)}`,
    );
  }

  return linhas.join("\n");
}
