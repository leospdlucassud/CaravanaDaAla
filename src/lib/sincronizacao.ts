/**
 * Fila de check-ins feitos sem sinal.
 *
 * Guarda no próprio aparelho o que não conseguiu ir ao servidor e reenvia
 * quando a rede volta. Vale só para o embarque: a operação é um carimbo de
 * hora, então reenviar duas vezes dá no mesmo, e dois aparelhos marcando a
 * mesma pessoa chegam ao mesmo resultado. Não há conflito a resolver — foi por
 * isso que esta foi a única tela escolhida para funcionar offline.
 *
 * A chave é por inscrição + trecho: marcar e desmarcar antes de sincronizar
 * deixa só a última intenção na fila, que é o que a pessoa espera.
 */

const CHAVE = "caravana.embarque.pendente";

export type CheckinPendente = {
  inscricaoId: string;
  trecho: "IDA" | "VOLTA";
  presente: boolean;
  /** Momento em que a pessoa tocou no nome, não o do envio. */
  registradoEm: number;
};

function chaveDo(item: Pick<CheckinPendente, "inscricaoId" | "trecho">) {
  return `${item.inscricaoId}:${item.trecho}`;
}

export function lerFila(): CheckinPendente[] {
  if (typeof window === "undefined") return [];
  try {
    const bruto = window.localStorage.getItem(CHAVE);
    return bruto ? (JSON.parse(bruto) as CheckinPendente[]) : [];
  } catch {
    return [];
  }
}

function gravarFila(itens: CheckinPendente[]) {
  try {
    window.localStorage.setItem(CHAVE, JSON.stringify(itens));
  } catch {
    // Armazenamento cheio ou bloqueado: perder a fila é ruim, mas quebrar a
    // tela de embarque no meio da chamada é pior.
  }
}

export function enfileirar(item: CheckinPendente) {
  const fila = lerFila().filter((f) => chaveDo(f) !== chaveDo(item));
  gravarFila([...fila, item]);
}

export function removerDaFila(item: Pick<CheckinPendente, "inscricaoId" | "trecho">) {
  gravarFila(lerFila().filter((f) => chaveDo(f) !== chaveDo(item)));
}

/**
 * Tenta reenviar tudo. Devolve quantos foram e quantos continuam esperando —
 * a tela usa isso para dizer à pessoa se ainda há coisa presa no aparelho.
 */
export async function sincronizar(
  enviar: (item: CheckinPendente) => Promise<unknown>,
): Promise<{ enviados: number; pendentes: number }> {
  const fila = lerFila();
  let enviados = 0;

  for (const item of fila) {
    try {
      await enviar(item);
      removerDaFila(item);
      enviados++;
    } catch {
      // Ainda sem rede: para por aqui e tenta de novo na próxima.
      break;
    }
  }

  return { enviados, pendentes: lerFila().length };
}
