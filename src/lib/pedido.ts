import { ROTULO_ORDENANCA, type LinhaDoPedidoDeGrupo } from "@/lib/dominio";

/**
 * Texto do pedido de agendamento que a ala envia ao templo.
 *
 * Alas e estacas reservam por e-mail ou telefone — o agendamento on-line em
 * grupo atende só grupos pequenos. O pedido informa a contagem por ordenança e
 * por sexo, que é exatamente o que esta função monta.
 *
 * Módulo puro: devolve string, não envia nada.
 */

export type DadosDaCaravanaNoPedido = {
  unidade: string;
  templo: string;
  data: Date;
  horaSaida: string | null;
  responsavel: string | null;
  totalDeAssentos: number;
};

const formatarData = (data: Date) =>
  new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(data);

export function montarTextoDoPedido(
  caravana: DadosDaCaravanaNoPedido,
  linhas: LinhaDoPedidoDeGrupo[],
): string {
  const total = linhas.reduce((s, l) => s + l.total, 0);

  const corpo = linhas.map((linha) => {
    const partes = [`${linha.homens} homem(ns)`, `${linha.mulheres} mulher(es)`];
    if (linha.semSexoInformado > 0) {
      partes.push(`${linha.semSexoInformado} sem sexo informado`);
    }
    return `- ${ROTULO_ORDENANCA[linha.ordenanca]}: ${linha.total} pessoa(s) — ${partes.join(", ")}`;
  });

  const linhasDoTexto = [
    `Prezados irmãos do Templo de ${caravana.templo},`,
    "",
    `Somos da ${caravana.unidade} e gostaríamos de agendar uma visita em grupo para ${formatarData(caravana.data)}.`,
    "",
    `Total de participantes: ${total}`,
    "",
    "Distribuição por ordenança:",
    ...corpo,
    "",
  ];

  if (caravana.horaSaida) {
    linhasDoTexto.push(
      `Nossa saída está prevista para as ${caravana.horaSaida}.`,
      "",
    );
  }

  linhasDoTexto.push(
    "Por favor, confirmem o horário disponível e a quantidade de vagas por ordenança.",
    "",
    "Agradecemos desde já.",
  );

  if (caravana.responsavel) {
    linhasDoTexto.push("", caravana.responsavel);
  }

  return linhasDoTexto.join("\n");
}

/**
 * Ordenanças próprias (1ª investidura, selamento) exigem agendamento separado,
 * por telefone. Esta lista vira o lembrete ao lado do texto do pedido.
 */
export function pendenciasDeAgendamentoProprio(
  pessoas: Array<{ nome: string; ordenanca: string }>,
): string[] {
  return pessoas.map(
    (p) => `${p.nome} — ${p.ordenanca}: ligar para o templo e agendar à parte.`,
  );
}
