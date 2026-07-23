/**
 * Service worker enxuto, de propósito.
 *
 * Só existe para a tela de embarque funcionar sem sinal — dentro do templo e no
 * ônibus a rede costuma cair. O resto do app continua exigindo internet.
 *
 * Não fazemos offline-first de verdade (escrever em qualquer tela e sincronizar
 * depois): isso exigiria resolver conflito entre dois líderes editando a mesma
 * lista, e o modo de falha desse tipo de sistema é o pior possível — o dado
 * some sem ninguém perceber. O check-in é a única operação sem conflito
 * possível: dois aparelhos marcando o mesmo embarque chegam ao mesmo resultado.
 */

const CACHE = "caravana-v1";
const ESSENCIAIS = ["/manifest.webmanifest"];

self.addEventListener("install", (evento) => {
  evento.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ESSENCIAIS)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((chaves) =>
        Promise.all(chaves.filter((c) => c !== CACHE).map((c) => caches.delete(c))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (evento) => {
  const requisicao = evento.request;

  // Só interceptamos leitura. Gravação offline é tratada na própria tela, com
  // fila no aparelho — o service worker não tem contexto para isso.
  if (requisicao.method !== "GET") return;

  const url = new URL(requisicao.url);
  if (url.origin !== self.location.origin) return;

  const ehEmbarque = url.pathname.includes("/embarque");
  const ehEstatico = url.pathname.startsWith("/_next/static");

  if (!ehEmbarque && !ehEstatico) return;

  // Rede primeiro para ter o dado fresco; cache só quando a rede falha.
  evento.respondWith(
    fetch(requisicao)
      .then((resposta) => {
        if (resposta.ok) {
          const copia = resposta.clone();
          caches.open(CACHE).then((cache) => cache.put(requisicao, copia));
        }
        return resposta;
      })
      .catch(() => caches.match(requisicao).then((c) => c ?? Response.error())),
  );
});
