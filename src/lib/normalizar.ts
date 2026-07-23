/**
 * Normalização e deduplicação de nomes.
 *
 * A planilha de origem trazia nomes com quebra de linha, espaço sobrando,
 * CAIXA ALTA, e metadados enfiados entre parênteses ("Fulano (Pesquisador)",
 * "Beltrana (Rosa dos Ventos)"). Aqui isso vira dado estruturado.
 *
 * Módulo puro de propósito: nada aqui toca banco, para poder ser testado
 * isoladamente.
 */

/** Minúsculas, sem acento, sem pontuação, espaços colapsados. */
export function normalizarNome(bruto: string): string {
  return bruto
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** "  JOSE  da   silva\n" -> "Jose da Silva" */
export function capitalizarNome(bruto: string): string {
  const particulas = new Set(["de", "da", "do", "das", "dos", "e", "di", "du"]);
  return bruto
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase("pt-BR")
    .split(" ")
    .map((palavra, indice) => {
      if (indice > 0 && particulas.has(palavra)) return palavra;
      return palavra.charAt(0).toLocaleUpperCase("pt-BR") + palavra.slice(1);
    })
    .join(" ");
}

export type NomeExtraido = {
  /** Nome limpo, sem os parênteses. */
  nomeCompleto: string;
  /** O que estava entre parênteses e não foi reconhecido como marcador. */
  apelido: string | null;
  /** Detectado por marcadores como "(Pesquisador)". */
  ehPesquisador: boolean;
  /** Detectado quando o parêntese parece nome de unidade. */
  unidadeMencionada: string | null;
  /** Texto entre parênteses que virou observação (ex.: "Verificando Escala"). */
  observacao: string | null;
};

const MARCADORES_PESQUISADOR = /^pesquisador(a)?$/i;
const MARCADORES_OBSERVACAO =
  /verificando|confirmar|aguardando|talvez|pendente|escala/i;

/**
 * Separa o que estava dentro de parênteses do nome propriamente dito.
 *
 * Não tenta adivinhar demais: o que não casa com um marcador conhecido vira
 * apelido, e a tela de importação mostra tudo para revisão antes de gravar.
 */
export function extrairDadosDoNome(
  bruto: string,
  unidadesConhecidas: string[] = [],
): NomeExtraido {
  const semQuebras = bruto.replace(/[\r\n]+/g, " ");
  const parenteses: string[] = [];

  const semParenteses = semQuebras.replace(/\(([^)]*)\)/g, (_, conteudo) => {
    const texto = String(conteudo).trim();
    if (texto) parenteses.push(texto);
    return " ";
  });

  let ehPesquisador = false;
  let unidadeMencionada: string | null = null;
  let observacao: string | null = null;
  const restos: string[] = [];

  const normalizadasConhecidas = unidadesConhecidas.map((u) => ({
    original: u,
    normalizada: normalizarNome(u),
  }));

  for (const trecho of parenteses) {
    if (MARCADORES_PESQUISADOR.test(trecho)) {
      ehPesquisador = true;
      continue;
    }

    const trechoNormalizado = normalizarNome(trecho);
    const unidade = normalizadasConhecidas.find(
      (u) => u.normalizada === trechoNormalizado,
    );
    if (unidade) {
      unidadeMencionada = unidade.original;
      continue;
    }

    if (MARCADORES_OBSERVACAO.test(trecho)) {
      observacao = observacao ? `${observacao}; ${trecho}` : trecho;
      continue;
    }

    restos.push(trecho);
  }

  return {
    nomeCompleto: capitalizarNome(semParenteses),
    apelido: restos.length > 0 ? restos.join("; ") : null,
    ehPesquisador,
    unidadeMencionada,
    observacao,
  };
}

/**
 * Distância de Levenshtein, iterativa com duas linhas.
 * Usada só para sugerir duplicatas na importação — nunca para mesclar sozinha.
 */
export function distanciaLevenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  let anterior = Array.from({ length: b.length + 1 }, (_, i) => i);
  let atual = new Array<number>(b.length + 1);

  for (let i = 1; i <= a.length; i++) {
    atual[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const custo = a[i - 1] === b[j - 1] ? 0 : 1;
      atual[j] = Math.min(
        atual[j - 1] + 1, // inserção
        anterior[j] + 1, // remoção
        anterior[j - 1] + custo, // substituição
      );
    }
    [anterior, atual] = [atual, anterior];
  }

  return anterior[b.length];
}

/** 0 a 1, onde 1 é idêntico. Compara sempre a forma normalizada. */
export function similaridadeNome(a: string, b: string): number {
  const na = normalizarNome(a);
  const nb = normalizarNome(b);
  if (!na && !nb) return 1;
  const maior = Math.max(na.length, nb.length);
  if (maior === 0) return 1;
  return 1 - distanciaLevenshtein(na, nb) / maior;
}

/**
 * Acima disso, a importação sugere que são a mesma pessoa e pede confirmação.
 * Escolhido para pegar "Jose Roberto de Paula" vs "José Roberto De Paula"
 * sem casar irmãos com sobrenome igual.
 */
export const LIMIAR_DUPLICATA = 0.86;

export type SugestaoDuplicata<T> = { candidato: T; similaridade: number };

export function encontrarPossiveisDuplicatas<T>(
  nome: string,
  candidatos: T[],
  nomeDoCandidato: (c: T) => string,
  limiar = LIMIAR_DUPLICATA,
): SugestaoDuplicata<T>[] {
  return candidatos
    .map((candidato) => ({
      candidato,
      similaridade: similaridadeNome(nome, nomeDoCandidato(candidato)),
    }))
    .filter((s) => s.similaridade >= limiar)
    .sort((a, b) => b.similaridade - a.similaridade);
}
