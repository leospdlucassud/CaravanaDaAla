import ExcelJS from "exceljs";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  ROTULO_NOMES_FAMILIA,
  ROTULO_ORDENANCA,
  ROTULO_ORGANIZACAO,
  ROTULO_PAGAMENTO,
  ROTULO_SITUACAO,
  ROTULO_STATUS_RECOMENDACAO,
  ROTULO_STATUS_SIMPLES,
} from "@/lib/dominio";
import { normalizarNome } from "@/lib/normalizar";

/**
 * Exporta a caravana em .xlsx.
 *
 * Sai com os rótulos em português, não com os códigos do banco: a planilha é
 * para ser lida por gente, e quem abrir não deveria precisar decifrar
 * "SOCIEDADE_SOCORRO" ou "NAO_SE_APLICA".
 */
export async function GET(
  _requisicao: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const caravana = await prisma.caravana.findUnique({
    where: { id },
    select: {
      titulo: true,
      data: true,
      templo: true,
      capacidadeAssentos: true,
      inscricoes: {
        orderBy: [{ situacao: "asc" }, { ordem: "asc" }, { posicaoFila: "asc" }],
        select: {
          situacao: true,
          ordem: true,
          posicaoFila: true,
          participacao: true,
          ordenanca: true,
          recomendacaoStatus: true,
          agendamentoStatus: true,
          nomesDeFamilia: true,
          pagamentoStatus: true,
          valorPago: true,
          observacoes: true,
          membro: {
            select: {
              nomeCompleto: true,
              organizacao: true,
              telefone: true,
              recemConverso: true,
              unidade: { select: { nome: true } },
            },
          },
        },
      },
    },
  });

  if (!caravana) notFound();

  const planilha = new ExcelJS.Workbook();
  planilha.creator = "Caravana ao Templo";
  const aba = planilha.addWorksheet("Inscritos");

  aba.columns = [
    { header: "N°", key: "numero", width: 6 },
    { header: "Situação", key: "situacao", width: 14 },
    { header: "Membro", key: "nome", width: 34 },
    { header: "Organização", key: "organizacao", width: 20 },
    { header: "Unidade", key: "unidade", width: 20 },
    { header: "Recém-converso", key: "recemConverso", width: 15 },
    { header: "Telefone", key: "telefone", width: 16 },
    { header: "Ordenança", key: "ordenanca", width: 22 },
    { header: "Recomendação", key: "recomendacao", width: 16 },
    { header: "Agendamento", key: "agendamento", width: 14 },
    { header: "Nomes de família", key: "nomes", width: 22 },
    { header: "Pagamento", key: "pagamento", width: 18 },
    { header: "Valor pago", key: "valorPago", width: 12 },
    { header: "Observações", key: "observacoes", width: 30 },
  ];

  aba.getRow(1).font = { bold: true };
  aba.views = [{ state: "frozen", ySplit: 1 }];

  for (const inscricao of caravana.inscricoes) {
    aba.addRow({
      numero:
        inscricao.situacao === "FILA_ESPERA" ? inscricao.posicaoFila : inscricao.ordem,
      situacao: ROTULO_SITUACAO[inscricao.situacao],
      nome: inscricao.membro.nomeCompleto,
      organizacao: inscricao.membro.organizacao
        ? ROTULO_ORGANIZACAO[inscricao.membro.organizacao]
        : "",
      unidade: inscricao.membro.unidade.nome,
      recemConverso: inscricao.membro.recemConverso ? "Sim" : "Não",
      telefone: inscricao.membro.telefone ?? "",
      ordenanca:
        inscricao.participacao === "ACOMPANHANTE_JARDINS"
          ? "Acompanhante (jardins)"
          : inscricao.ordenanca
            ? ROTULO_ORDENANCA[inscricao.ordenanca]
            : "A definir",
      recomendacao: inscricao.recomendacaoStatus
        ? ROTULO_STATUS_RECOMENDACAO[inscricao.recomendacaoStatus]
        : "Pendente",
      agendamento: inscricao.agendamentoStatus
        ? ROTULO_STATUS_SIMPLES[inscricao.agendamentoStatus]
        : "Pendente",
      nomes: inscricao.nomesDeFamilia
        ? ROTULO_NOMES_FAMILIA[inscricao.nomesDeFamilia]
        : "Pendente",
      pagamento: ROTULO_PAGAMENTO[inscricao.pagamentoStatus],
      valorPago: inscricao.valorPago ? Number(inscricao.valorPago.toString()) : null,
      observacoes: inscricao.observacoes ?? "",
    });
  }

  const buffer = await planilha.xlsx.writeBuffer();

  const nomeDoArquivo = `${normalizarNome(caravana.titulo).replace(/\s+/g, "-")}.xlsx`;

  return new Response(buffer as ArrayBuffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${nomeDoArquivo}"`,
      "Cache-Control": "no-store",
    },
  });
}
