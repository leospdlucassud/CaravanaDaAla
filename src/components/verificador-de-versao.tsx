"use client";

import { useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import { VERSAO, versaoEhMaior } from "@/lib/versao";

/**
 * Mantém o navegador na versão publicada no Vercel.
 *
 * A versão que este código roda foi embutida no build. O endpoint /api/versao
 * responde a versão do deploy atual. Quando o servidor está à frente, houve um
 * novo deploy: limpamos o cache do PWA e recarregamos, para o navegador pegar a
 * versão nova. "Instalar" um app web é isto — buscar os arquivos novos.
 *
 * Cuidados:
 * - Só recarrega quando o servidor está REALMENTE à frente (semver numérico),
 *   nunca por versão inválida ou igual.
 * - Guarda em sessionStorage a versão para a qual já recarregou, para não
 *   entrar em laço se a CDN demorar a propagar o build novo.
 * - A fila offline do embarque vive no localStorage e sobrevive ao reload, então
 *   recarregar não perde marcação de chamada.
 */

const INTERVALO_MS = 5 * 60 * 1000; // 5 min
const CHAVE_SESSAO = "caravana.versao.recarregando";

export function VerificadorDeVersao() {
  const ocupado = useRef(false);

  const verificar = useCallback(async () => {
    if (ocupado.current) return;

    try {
      const resposta = await fetch("/api/versao", { cache: "no-store" });
      if (!resposta.ok) return;

      const dados = (await resposta.json()) as { versao?: unknown };
      const publicada = typeof dados.versao === "string" ? dados.versao : "";

      if (!versaoEhMaior(publicada, VERSAO)) return;

      // Já tentamos recarregar para esta versão nesta sessão? Não insista.
      if (sessionStorage.getItem(CHAVE_SESSAO) === publicada) return;
      sessionStorage.setItem(CHAVE_SESSAO, publicada);
      ocupado.current = true;

      toast.info(`Atualizando para a versão ${publicada}…`, { duration: 3500 });

      try {
        if ("caches" in window) {
          const chaves = await caches.keys();
          await Promise.all(chaves.map((c) => caches.delete(c)));
        }
        if ("serviceWorker" in navigator) {
          const registros = await navigator.serviceWorker.getRegistrations();
          await Promise.all(registros.map((r) => r.update()));
        }
      } catch {
        // Sem cache/SW para limpar: recarregar ainda traz a versão nova.
      }

      setTimeout(() => window.location.reload(), 1500);
    } catch {
      // Sem rede ou endpoint fora do ar: tenta de novo no próximo ciclo.
    }
  }, []);

  useEffect(() => {
    void verificar();

    const timer = setInterval(() => void verificar(), INTERVALO_MS);
    // Voltar o foco à janela já é sinal de "usuário retornou": verifica sempre.
    const aoFocar = () => void verificar();
    const aoVisibilizar = () => {
      if (document.visibilityState === "visible") void verificar();
    };

    window.addEventListener("focus", aoFocar);
    document.addEventListener("visibilitychange", aoVisibilizar);

    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", aoFocar);
      document.removeEventListener("visibilitychange", aoVisibilizar);
    };
  }, [verificar]);

  return null;
}
