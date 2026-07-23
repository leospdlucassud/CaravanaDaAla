"use client";

import { useEffect } from "react";

/**
 * Registra o service worker que faz a tela de embarque sobreviver sem sinal.
 *
 * Só em produção: em desenvolvimento ele atrapalha o hot reload, servindo
 * versão velha do app e fazendo parecer que a alteração não pegou.
 */
export function RegistrarServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Sem service worker o app continua funcionando — só perde o offline.
    });
  }, []);

  return null;
}
