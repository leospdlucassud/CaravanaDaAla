import "server-only";
import { cookies } from "next/headers";

/**
 * Quem está mexendo no app.
 *
 * O app não tem contas nem login: quem abre o endereço usa. Mas o histórico de
 * alterações fica inútil se todo registro for anônimo, então pedimos um nome
 * uma única vez e guardamos no navegador.
 *
 * Isto NÃO é autenticação e não deve ser tratado como tal: qualquer um digita
 * qualquer nome, e ninguém é barrado por não preencher. Serve só para o
 * histórico dizer "foi a Irmã Fulana" em vez de não dizer nada.
 */

export const COOKIE_AUTOR = "caravana.autor";

const UM_ANO = 60 * 60 * 24 * 365;

export async function lerAutor(): Promise<string | null> {
  const jar = await cookies();
  const nome = jar.get(COOKIE_AUTOR)?.value?.trim();
  return nome ? nome.slice(0, 80) : null;
}

export async function gravarAutor(nome: string | null) {
  const jar = await cookies();
  const limpo = nome?.trim().slice(0, 80);

  if (!limpo) {
    jar.delete(COOKIE_AUTOR);
    return;
  }

  jar.set(COOKIE_AUTOR, limpo, { maxAge: UM_ANO, sameSite: "lax", path: "/" });
}
