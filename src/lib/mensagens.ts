/**
 * Mensagens de lembrete para o WhatsApp.
 *
 * Duas regras que não são detalhe:
 *
 * 1. O texto NUNCA menciona situação de recomendação. Mandar "sua recomendação
 *    está vencida" por WhatsApp é vazar assunto de entrevista para um canal que
 *    a família toda lê. A mensagem convida a procurar o bispo, e só.
 * 2. O app não envia nada. Gera o texto e abre a conversa; quem aperta enviar é
 *    a pessoa.
 *
 * Módulo puro.
 */

import type { Ordenanca } from "@/generated/prisma/enums";
import { nomeDoTemplo, ROTULO_ORDENANCA } from "@/lib/dominio";

export type TipoDePendencia =
  | "entrevista"
  | "agendamento"
  | "nomes"
  | "pagamento"
  | "ordenanca";

export const ROTULO_PENDENCIA: Record<TipoDePendencia, string> = {
  entrevista: "Precisa falar com o bispo",
  agendamento: "Agendamento a confirmar",
  nomes: "Nomes de família",
  pagamento: "Pagamento pendente",
  ordenanca: "Ordenança a definir",
};

export type DadosDaMensagem = {
  primeiroNome: string;
  tituloDaCaravana: string;
  dataFormatada: string;
  templo: string;
  valorPorPessoa: number | null;
  ordenanca: Ordenanca | null;
};

export function primeiroNomeDe(nomeCompleto: string): string {
  return nomeCompleto.trim().split(/\s+/)[0] ?? nomeCompleto;
}

const dinheiro = (valor: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor);

export function montarMensagem(
  tipo: TipoDePendencia,
  dados: DadosDaMensagem,
): string {
  const abertura = `Olá, ${dados.primeiroNome}! Sobre a ${dados.tituloDaCaravana} (${dados.dataFormatada}, ${nomeDoTemplo(dados.templo)}):`;

  const corpo: Record<TipoDePendencia, string> = {
    // Neutra de propósito: nada sobre a situação da recomendação.
    entrevista:
      "podemos marcar um horário com o bispo antes da viagem? Me avise um dia e horário que fiquem bons para você.",
    agendamento:
      "ainda falta confirmar seu horário no templo. Você já conseguiu agendar? Se precisar de ajuda, me chame.",
    nomes: dados.ordenanca
      ? `você vai levar nomes da sua própria família para ${ROTULO_ORDENANCA[dados.ordenanca].toLowerCase()}, ou prefere usar os nomes do templo? Se quiser ajuda para preparar os seus, o consultor de história da família da ala pode orientar.`
      : "você vai levar nomes da sua própria família, ou prefere usar os nomes do templo? Se quiser ajuda para preparar os seus, o consultor de história da família da ala pode orientar.",
    pagamento: dados.valorPorPessoa
      ? `a passagem está ${dinheiro(dados.valorPorPessoa)}. Quando puder acertar, me avise!`
      : "ainda falta acertar a passagem. Quando puder, me avise!",
    ordenanca:
      "o que você pretende fazer no templo nesse dia? Preciso saber para incluir você no pedido de agendamento.",
  };

  return `${abertura} ${corpo[tipo]}`;
}

/**
 * Normaliza o telefone para o formato que o wa.me espera: só dígitos, com o
 * código do país. Números da ala costumam vir escritos como (21) 99999-8888.
 */
export function paraNumeroDoWhatsApp(telefone: string | null): string | null {
  if (!telefone) return null;

  const digitos = telefone.replace(/\D/g, "");
  if (digitos.length < 10) return null;

  // 10 ou 11 dígitos = número brasileiro sem o código do país.
  if (digitos.length <= 11) return `55${digitos}`;
  return digitos;
}

export function linkDoWhatsApp(
  telefone: string | null,
  mensagem: string,
): string | null {
  const numero = paraNumeroDoWhatsApp(telefone);
  if (!numero) return null;
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`;
}
