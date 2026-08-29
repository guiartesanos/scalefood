// Service worker mínimo — o app depende de dados ao vivo (Supabase), não
// faz sentido cachear tudo pra funcionar offline. Isso aqui só existe pra
// satisfazer o critério de "instalável" do Chrome/Android (precisa ter um
// service worker registrado com um handler de fetch).
const CACHE = "food-scale-shell-v1";
const SHELL = ["/manifest.json", "/icon-192", "/icon-512"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Network-first simples: tenta a rede (dados sempre atuais), só cai pro
// cache do "shell" se estiver de fato offline.
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
