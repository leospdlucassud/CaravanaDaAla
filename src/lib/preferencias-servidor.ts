import "server-only";
import { cookies } from "next/headers";
import {
  COOKIE_ESCALA,
  COOKIE_TEMA,
  PREFERENCIAS_PADRAO,
  ehEscalaValida,
  ehTemaValido,
  type Preferencias,
} from "@/lib/preferencias";

/**
 * As preferências ficam em cookie para o servidor já renderizar certo — sem
 * isso a página pisca em branco antes do JavaScript corrigir, o que é péssimo
 * justamente para quem escolheu tema escuro. O banco guarda a preferência do
 * usuário para segui-lo entre aparelhos; o cookie é o espelho local.
 */
export async function lerPreferencias(): Promise<Preferencias> {
  const jar = await cookies();
  const tema = jar.get(COOKIE_TEMA)?.value;
  const escalaBruta = Number(jar.get(COOKIE_ESCALA)?.value);

  return {
    tema: ehTemaValido(tema) ? tema : PREFERENCIAS_PADRAO.tema,
    escalaFonte: ehEscalaValida(escalaBruta)
      ? escalaBruta
      : PREFERENCIAS_PADRAO.escalaFonte,
  };
}

/**
 * Script que roda antes da primeira pintura.
 *
 * Só é indispensável para o tema "seguir o sistema", que o servidor não tem
 * como saber. Nos outros casos o cookie já resolveu e este script confirma.
 */
export function scriptAntiPiscada(preferencias: Preferencias): string {
  return `
(function(){
  try {
    var tema = ${JSON.stringify(preferencias.tema)};
    var escuroDoSistema = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var escuro = tema === 'ESCURO' || (tema === 'SISTEMA' && escuroDoSistema);
    document.documentElement.classList.toggle('dark', escuro);
    document.documentElement.style.fontSize = ${JSON.stringify(
      `${preferencias.escalaFonte}%`,
    )};
  } catch (e) {}
})();
`.trim();
}
