/**
 * Mensagem para quem usa o app quando uma ação no servidor falha.
 *
 * Nunca se mostra `e.message`: em produção o Next não repassa a mensagem do
 * erro lançado numa Server Action — o navegador recebe um texto genérico em
 * inglês ("An error occurred in the Server Components render…") — e, sem
 * internet, o erro é "Failed to fetch". Nenhum dos dois ajuda quem está com o
 * celular na mão. O erro original vai para o console, para quem for depurar.
 */
export function mensagemDeFalha(erro: unknown, oQueFalhou: string): string {
  console.error(erro);
  return `Não foi possível ${oQueFalhou}. Recarregue a página e tente de novo.`;
}
