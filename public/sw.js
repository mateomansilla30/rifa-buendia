// Service worker mínimo para que la app sea instalable. No cachea nada: los datos tienen que estar siempre al día.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {});
