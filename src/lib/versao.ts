/**
 * Versão do app, em semver (Major.Minor.Patch).
 *
 * Fonte única: mude AQUI a cada publicação, e mantenha o mesmo número em
 * package.json. Como bumpar:
 *   - PATCH (1.0.0 -> 1.0.1): correção que não muda comportamento.
 *   - MINOR (1.0.1 -> 1.1.0): recurso novo, sem quebrar o que existia.
 *   - MAJOR (1.1.0 -> 2.0.0): mudança que quebra uso anterior.
 *
 * O número é embutido no build. Um navegador aberto guarda a versão de quando
 * carregou; o servidor, após um novo deploy, passa a responder a versão nova.
 * É essa diferença que o verificador usa para saber que há atualização.
 */
export const VERSAO = "1.3.0";

/** [major, minor, patch] ou null se o texto não for uma versão válida. */
export function analisarVersao(v: string): [number, number, number] | null {
  const m = /^\s*(\d+)\.(\d+)\.(\d+)/.exec(v);
  if (!m) return null;
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

/** -1 se a < b, 0 se iguais, 1 se a > b. Versão inválida conta como igual. */
export function compararVersoes(a: string, b: string): number {
  const pa = analisarVersao(a);
  const pb = analisarVersao(b);
  if (!pa || !pb) return 0;

  for (let i = 0; i < 3; i++) {
    if (pa[i] > pb[i]) return 1;
    if (pa[i] < pb[i]) return -1;
  }
  return 0;
}

/** true quando `candidata` é mais nova que `atual`. */
export function versaoEhMaior(candidata: string, atual: string): boolean {
  return compararVersoes(candidata, atual) === 1;
}
