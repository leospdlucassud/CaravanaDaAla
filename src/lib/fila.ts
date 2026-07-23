/**
 * Capacidade do ônibus e fila de espera.
 *
 * A planilha numerava a fila à mão — e o resultado era a 1ª posição vazia com
 * quatro pessoas esperando embaixo dela. Aqui a ordem NUNCA é digitada: estas
 * funções recebem o estado atual e devolvem o estado renumerado, e quem chama
 * grava o resultado inteiro dentro de uma transação.
 *
 * Módulo puro: sem banco, sem I/O.
 */

import type { SituacaoInscricao } from "@/generated/prisma/enums";

export type ItemDaLista = {
  id: string;
  situacao: SituacaoInscricao;
  /** Ordem entre as confirmadas. */
  ordem: number;
  /** Posição na fila de espera; nulo quando não está na fila. */
  posicaoFila: number | null;
  /** Momento da inscrição — critério de desempate, para ser justo. */
  criadoEm: Date;
};

export type PosicaoRecalculada = {
  id: string;
  situacao: SituacaoInscricao;
  ordem: number;
  posicaoFila: number | null;
};

function porOrdemDeChegada(a: ItemDaLista, b: ItemDaLista): number {
  const diferenca = a.criadoEm.getTime() - b.criadoEm.getTime();
  // Empate de milissegundo (importação em lote) resolve pelo id, que é estável.
  return diferenca !== 0 ? diferenca : a.id.localeCompare(b.id);
}

/**
 * Renumera confirmadas (1..n) e fila (1..m), preservando a ordem relativa
 * existente e usando a data de inscrição como critério.
 *
 * Não move ninguém entre confirmada e fila — isso é decisão explícita, feita
 * por `promoverDaFila` / `moverParaFila` / `aplicarCapacidade`.
 */
export function renumerar(itens: ItemDaLista[]): PosicaoRecalculada[] {
  const confirmadas = itens
    .filter((i) => i.situacao === "CONFIRMADA")
    .sort((a, b) => a.ordem - b.ordem || porOrdemDeChegada(a, b));

  const fila = itens
    .filter((i) => i.situacao === "FILA_ESPERA")
    .sort(
      (a, b) =>
        (a.posicaoFila ?? Number.MAX_SAFE_INTEGER) -
          (b.posicaoFila ?? Number.MAX_SAFE_INTEGER) || porOrdemDeChegada(a, b),
    );

  const foraDaLista = itens.filter(
    (i) => i.situacao !== "CONFIRMADA" && i.situacao !== "FILA_ESPERA",
  );

  return [
    ...confirmadas.map((item, indice) => ({
      id: item.id,
      situacao: item.situacao,
      ordem: indice + 1,
      posicaoFila: null,
    })),
    ...fila.map((item, indice) => ({
      id: item.id,
      situacao: item.situacao,
      ordem: 0,
      posicaoFila: indice + 1,
    })),
    ...foraDaLista.map((item) => ({
      id: item.id,
      situacao: item.situacao,
      ordem: 0,
      posicaoFila: null,
    })),
  ];
}

export function vagasRestantes(
  itens: ItemDaLista[],
  capacidade: number,
): number {
  const confirmadas = itens.filter((i) => i.situacao === "CONFIRMADA").length;
  return Math.max(0, capacidade - confirmadas);
}

export function haVaga(itens: ItemDaLista[], capacidade: number): boolean {
  return vagasRestantes(itens, capacidade) > 0;
}

/**
 * Decide a situação de quem acabou de se inscrever: entra confirmado se há
 * assento, senão vai para o fim da fila. É o que a planilha não fazia sozinha.
 */
export function situacaoAoInscrever(
  itens: ItemDaLista[],
  capacidade: number,
): SituacaoInscricao {
  return haVaga(itens, capacidade) ? "CONFIRMADA" : "FILA_ESPERA";
}

/** Tira alguém da fila e confirma. Devolve a lista inteira já renumerada. */
export function promoverDaFila(
  itens: ItemDaLista[],
  idParaPromover: string,
): PosicaoRecalculada[] {
  const ajustados = itens.map((item) =>
    item.id === idParaPromover
      ? {
          ...item,
          situacao: "CONFIRMADA" as SituacaoInscricao,
          // Entra no fim das confirmadas.
          ordem: Number.MAX_SAFE_INTEGER,
          posicaoFila: null,
        }
      : item,
  );
  return renumerar(ajustados);
}

/** Move uma inscrição confirmada de volta para o fim da fila. */
export function moverParaFila(
  itens: ItemDaLista[],
  idParaMover: string,
): PosicaoRecalculada[] {
  const ajustados = itens.map((item) =>
    item.id === idParaMover
      ? {
          ...item,
          situacao: "FILA_ESPERA" as SituacaoInscricao,
          ordem: 0,
          posicaoFila: Number.MAX_SAFE_INTEGER,
        }
      : item,
  );
  return renumerar(ajustados);
}

/**
 * Marca alguém como desistente e promove automaticamente o primeiro da fila,
 * se havia fila e a desistência abriu assento.
 *
 * Devolve também quem foi promovido, para a tela poder avisar: "Fulano subiu
 * da fila e precisa ser comunicado".
 */
export function registrarDesistencia(
  itens: ItemDaLista[],
  idDesistente: string,
  capacidade: number,
): { posicoes: PosicaoRecalculada[]; promovidoId: string | null } {
  const semDesistente = itens.map((item) =>
    item.id === idDesistente
      ? {
          ...item,
          situacao: "DESISTIU" as SituacaoInscricao,
          ordem: 0,
          posicaoFila: null,
        }
      : item,
  );

  if (!haVaga(semDesistente, capacidade)) {
    return { posicoes: renumerar(semDesistente), promovidoId: null };
  }

  const primeiroDaFila = renumerar(semDesistente)
    .filter((p) => p.situacao === "FILA_ESPERA")
    .sort((a, b) => (a.posicaoFila ?? 0) - (b.posicaoFila ?? 0))[0];

  if (!primeiroDaFila) {
    return { posicoes: renumerar(semDesistente), promovidoId: null };
  }

  return {
    posicoes: promoverDaFila(semDesistente, primeiroDaFila.id),
    promovidoId: primeiroDaFila.id,
  };
}

/**
 * Reconcilia a lista com a capacidade — usado quando o ônibus muda de tamanho.
 * Sobrando assento, sobe gente da fila; faltando, os últimos confirmados voltam
 * para o começo da fila (os últimos a entrar são os primeiros a sair).
 */
export function aplicarCapacidade(
  itens: ItemDaLista[],
  capacidade: number,
): PosicaoRecalculada[] {
  let estado: ItemDaLista[] = renumerar(itens).map((p) => {
    const original = itens.find((i) => i.id === p.id);
    if (!original) throw new Error(`Inscrição ${p.id} sumiu ao renumerar.`);
    return { ...original, ...p };
  });

  // Falta assento: rebaixa do fim das confirmadas para o começo da fila.
  let confirmadas = estado.filter((i) => i.situacao === "CONFIRMADA");
  while (confirmadas.length > capacidade) {
    const ultima = confirmadas[confirmadas.length - 1];
    estado = estado.map((item) =>
      item.id === ultima.id
        ? {
            ...item,
            situacao: "FILA_ESPERA" as SituacaoInscricao,
            ordem: 0,
            // Menos que 1 garante que fica na frente de quem já esperava.
            posicaoFila: 0,
          }
        : item,
    );
    estado = renumerar(estado).map((p) => {
      const original = estado.find((i) => i.id === p.id)!;
      return { ...original, ...p };
    });
    confirmadas = estado.filter((i) => i.situacao === "CONFIRMADA");
  }

  // Sobra assento: promove da fila enquanto couber.
  let fila = estado
    .filter((i) => i.situacao === "FILA_ESPERA")
    .sort((a, b) => (a.posicaoFila ?? 0) - (b.posicaoFila ?? 0));

  while (confirmadas.length < capacidade && fila.length > 0) {
    const proximo = fila[0];
    estado = promoverDaFila(estado, proximo.id).map((p) => {
      const original = estado.find((i) => i.id === p.id)!;
      return { ...original, ...p };
    });
    confirmadas = estado.filter((i) => i.situacao === "CONFIRMADA");
    fila = estado
      .filter((i) => i.situacao === "FILA_ESPERA")
      .sort((a, b) => (a.posicaoFila ?? 0) - (b.posicaoFila ?? 0));
  }

  return renumerar(estado);
}
