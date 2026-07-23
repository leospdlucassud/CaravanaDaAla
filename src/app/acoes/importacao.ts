"use server";

import ExcelJS from "exceljs";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { lerAutor } from "@/lib/autor";
import { registrarEvento } from "@/lib/auditoria";
import { analisarPlanilha, type Celula, type LinhaImportada } from "@/lib/importacao";
import {
  encontrarPossiveisDuplicatas,
  normalizarNome,
  type SugestaoDuplicata,
} from "@/lib/normalizar";
import { aplicarCapacidade } from "@/lib/fila";

/** ExcelJS devolve string, número, fórmula ou rich text — achatamos tudo. */
function valorDaCelula(valor: ExcelJS.CellValue): Celula {
  if (valor === null || valor === undefined) return null;
  if (typeof valor === "string" || typeof valor === "number") return String(valor);
  if (valor instanceof Date) return valor.toISOString();
  if (typeof valor === "object") {
    if ("richText" in valor && Array.isArray(valor.richText)) {
      return valor.richText.map((t) => t.text).join("");
    }
    if ("result" in valor) return valorDaCelula(valor.result as ExcelJS.CellValue);
    if ("text" in valor) return String(valor.text);
  }
  return null;
}

export type MembroCandidato = { id: string; nomeCompleto: string; unidadeNome: string };

export type LinhaComDuplicatas = LinhaImportada & {
  duplicatas: Array<SugestaoDuplicata<MembroCandidato>>;
};

export type PreviaDaImportacao = {
  tituloDaCaravana: string | null;
  linhas: LinhaComDuplicatas[];
  totalDeLinhasLidas: number;
  ignoradas: number;
  semNome: number;
  comDuplicataProvavel: number;
  unidades: Array<{ id: string; nome: string }>;
};

/**
 * Lê o arquivo e devolve a prévia. Nada é gravado aqui — a importação só
 * acontece depois que a pessoa confere, principalmente as linhas sem nome e as
 * possíveis duplicatas.
 */
export async function analisarArquivo(
  dadosDoFormulario: FormData,
): Promise<PreviaDaImportacao> {
  const arquivo = dadosDoFormulario.get("arquivo");
  if (!(arquivo instanceof File)) {
    throw new Error("Escolha um arquivo .xlsx para importar.");
  }

  const planilha = new ExcelJS.Workbook();
  await planilha.xlsx.load(await arquivo.arrayBuffer());

  const aba = planilha.worksheets[0];
  if (!aba) throw new Error("A planilha está vazia.");

  const matriz: Celula[][] = [];
  aba.eachRow({ includeEmpty: true }, (linha) => {
    const celulas: Celula[] = [];
    // `values` do ExcelJS é 1-based; a posição 0 vem vazia.
    const valores = linha.values as ExcelJS.CellValue[];
    for (let coluna = 1; coluna <= 11; coluna++) {
      celulas.push(valorDaCelula(valores?.[coluna] ?? null));
    }
    matriz.push(celulas);
  });

  const resultado = analisarPlanilha(matriz);

  const existentes = await prisma.membro.findMany({
    where: { ativo: true },
    select: {
      id: true,
      nomeCompleto: true,
      unidade: { select: { nome: true } },
    },
  });

  const candidatos: MembroCandidato[] = existentes.map((m) => ({
    id: m.id,
    nomeCompleto: m.nomeCompleto,
    unidadeNome: m.unidade.nome,
  }));

  const linhas: LinhaComDuplicatas[] = resultado.linhas.map((linha) => ({
    ...linha,
    duplicatas: linha.semNome
      ? []
      : encontrarPossiveisDuplicatas(
          linha.nomeSugerido,
          candidatos,
          (c) => c.nomeCompleto,
        ).slice(0, 3),
  }));

  const unidades = await prisma.unidade.findMany({
    orderBy: [{ ehPropria: "desc" }, { nome: "asc" }],
    select: { id: true, nome: true },
  });

  return {
    tituloDaCaravana: resultado.tituloDaCaravana,
    linhas,
    totalDeLinhasLidas: resultado.totalDeLinhasLidas,
    ignoradas: resultado.ignoradas,
    semNome: linhas.filter((l) => l.semNome).length,
    comDuplicataProvavel: linhas.filter((l) => l.duplicatas.length > 0).length,
    unidades,
  };
}

// --- Confirmação ------------------------------------------------------------

const esquemaDeLinha = z.object({
  incluir: z.boolean(),
  nomeCompleto: z.string().trim(),
  apelido: z.string().trim().nullable(),
  /** Quando preenchido, reaproveita o cadastro existente em vez de criar outro. */
  membroExistenteId: z.string().nullable(),
  organizacao: z
    .enum(["QUORUM_ELDERES", "SOCIEDADE_SOCORRO", "MOCAS", "RAPAZES", "PRIMARIA"])
    .nullable(),
  ehPesquisador: z.boolean(),
  recemConverso: z.boolean(),
  observacao: z.string().nullable(),
  participacao: z.enum(["ORDENANCA", "ACOMPANHANTE_JARDINS"]),
  ordenanca: z
    .enum([
      "BATISTERIO",
      "INICIATORIA",
      "INVESTIDURA",
      "PRIMEIRA_INVESTIDURA",
      "SELAMENTO_CONJUGE",
      "SELAMENTO_FAMILIA",
    ])
    .nullable(),
  recomendacaoStatus: z
    .enum(["VALIDA", "VENCIDA", "NAO_POSSUI", "NAO_SE_APLICA"])
    .nullable(),
  agendamentoStatus: z.enum(["SIM", "NAO", "NAO_SE_APLICA"]).nullable(),
  nomesDeFamilia: z
    .enum(["PROPRIOS_PRONTOS", "USARA_NOMES_DO_TEMPLO", "PRECISA_DE_AJUDA"])
    .nullable(),
  pagamentoStatus: z.enum(["PENDENTE", "PAGO", "ISENTO", "BENEFICIO_AREA"]),
  incluidoNoAgendamentoGrupo: z.boolean(),
  precisaAjudaEntrevista: z.boolean(),
  precisaAjudaNomes: z.boolean(),
  naFilaDeEspera: z.boolean(),
});

const esquemaDaImportacao = z.object({
  caravana: z.object({
    titulo: z.string().trim().min(3),
    data: z.string().min(1),
    templo: z.string().trim().min(2),
    capacidadeAssentos: z.number().int().min(1).max(500),
    unidadeOrganizadoraId: z.string().min(1),
  }),
  linhas: z.array(esquemaDeLinha),
});

export type EntradaDaImportacao = z.input<typeof esquemaDaImportacao>;

export type ResultadoDaImportacao = {
  caravanaId: string;
  membrosCriados: number;
  membrosReaproveitados: number;
  inscricoesCriadas: number;
  naFila: number;
};

export async function confirmarImportacao(
  entrada: EntradaDaImportacao,
): Promise<ResultadoDaImportacao> {
  const autor = await lerAutor();
  const dados = esquemaDaImportacao.parse(entrada);
  const aImportar = dados.linhas.filter((l) => l.incluir);

  const semNome = aImportar.filter((l) => l.nomeCompleto.length < 2);
  if (semNome.length > 0) {
    throw new Error(
      `${semNome.length} linha(s) ainda estão sem nome. Preencha ou desmarque antes de importar.`,
    );
  }

  const resultado = await prisma.$transaction(
    async (cliente) => {
      const caravana = await cliente.caravana.create({
        data: {
          titulo: dados.caravana.titulo,
          data: new Date(dados.caravana.data),
          templo: dados.caravana.templo,
          capacidadeAssentos: dados.caravana.capacidadeAssentos,
          unidadeOrganizadoraId: dados.caravana.unidadeOrganizadoraId,
          status: "PLANEJAMENTO",
          responsavel: autor,
        },
        select: { id: true },
      });

      let membrosCriados = 0;
      let membrosReaproveitados = 0;

      for (const [indice, linha] of aImportar.entries()) {
        let membroId = linha.membroExistenteId;

        if (membroId) {
          membrosReaproveitados++;
        } else {
          const criado = await cliente.membro.create({
            data: {
              nomeCompleto: linha.nomeCompleto,
              nomeNormalizado: normalizarNome(linha.nomeCompleto),
              apelido: linha.apelido,
              unidadeId: dados.caravana.unidadeOrganizadoraId,
              organizacao: linha.organizacao,
              tipoVinculo: linha.ehPesquisador ? "PESQUISADOR" : "MEMBRO",
              recemConverso: linha.recemConverso,
              observacoes: linha.observacao,
            },
            select: { id: true },
          });
          membroId = criado.id;
          membrosCriados++;
        }

        await cliente.inscricao.create({
          data: {
            caravanaId: caravana.id,
            membroId,
            // A situação definitiva sai de aplicarCapacidade, logo abaixo.
            situacao: linha.naFilaDeEspera ? "FILA_ESPERA" : "CONFIRMADA",
            ordem: indice + 1,
            posicaoFila: linha.naFilaDeEspera ? indice + 1 : null,
            participacao: linha.participacao,
            ordenanca: linha.ordenanca,
            recomendacaoStatus: linha.recomendacaoStatus,
            agendamentoStatus: linha.agendamentoStatus,
            nomesDeFamilia: linha.nomesDeFamilia,
            pagamentoStatus: linha.pagamentoStatus,
            incluidoNoAgendamentoGrupo: linha.incluidoNoAgendamentoGrupo,
            precisaAjudaEntrevista: linha.precisaAjudaEntrevista,
            precisaAjudaNomes: linha.precisaAjudaNomes,
            observacoes: linha.observacao,
          },
        });
      }

      // Renumera do zero: a planilha vinha com a fila furada (1ª posição vazia
      // com gente esperando embaixo) e não queremos herdar isso.
      const inscricoes = await cliente.inscricao.findMany({
        where: { caravanaId: caravana.id },
        select: {
          id: true,
          situacao: true,
          ordem: true,
          posicaoFila: true,
          criadoEm: true,
        },
      });

      const posicoes = aplicarCapacidade(
        inscricoes,
        dados.caravana.capacidadeAssentos,
      );

      for (const p of posicoes) {
        await cliente.inscricao.update({
          where: { id: p.id },
          data: { situacao: p.situacao, ordem: p.ordem, posicaoFila: p.posicaoFila },
        });
      }

      return {
        caravanaId: caravana.id,
        membrosCriados,
        membrosReaproveitados,
        inscricoesCriadas: aImportar.length,
        naFila: posicoes.filter((p) => p.situacao === "FILA_ESPERA").length,
      };
    },
    { timeout: 120_000 },
  );

  await registrarEvento({
    autor,
    entidade: "Caravana",
    entidadeId: resultado.caravanaId,
    campo: "importacao",
    descricao: `Importada da planilha: ${resultado.inscricoesCriadas} inscrições, ${resultado.membrosCriados} membros novos`,
  });

  revalidatePath("/");
  revalidatePath("/membros");

  return resultado;
}

/** Cria uma unidade — a primeira, ou outra ala numa caravana compartilhada. */
export async function criarUnidade(entrada: {
  nome: string;
  estaca: string | null;
  tipo: "ALA" | "RAMO";
}) {
  const unidade = await prisma.unidade.create({
    data: {
      nome: entrada.nome.trim(),
      estaca: entrada.estaca?.trim() || null,
      tipo: entrada.tipo,
      ehPropria: (await prisma.unidade.count()) === 0,
    },
    select: { id: true, nome: true },
  });

  revalidatePath("/", "layout");
  return unidade;
}
