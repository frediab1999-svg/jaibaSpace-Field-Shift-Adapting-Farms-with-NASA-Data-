// Service worker de la PWA: después de la primera visita, la app completa (pantallas,
// datos de NASA, reglas, catálogos, imágenes y letras) funciona SIN INTERNET.
//
// - Con `npm run build`, el plugin de vite.config.js escribe aquí la lista de TODOS los
//   archivos del build (en la constante PRECARGA) y una versión nueva. Se guardan al
//   instalar, así que basta con abrir la app una vez con red.
// - En desarrollo (`npm run dev`) la lista va vacía: se guarda lo que la app va pidiendo
//   (la app precarga todas sus pantallas y datos al abrir; ver src/app/precarga.js).
// - Estrategia: primero la red y, si no hay, lo guardado. Así en desarrollo siempre ves el
//   código nuevo y en modo avión todo sale de la copia. Los archivos con huella del build
//   (/assets/…) no cambian nunca: se sirven directo de la copia.
// - No guarda respuestas de la API ni teselas de mapas (otros dominios).
const VERSION = 'milpa-dev';
const PRECARGA = /*PRECARGA*/[]/*FIN*/;
const BASICOS = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png'];
const ESPERA_RED_MS = 4000;
// ignoreVary: el servidor puede mandar «Vary: Origin» y los scripts del navegador piden con
// Origin; sin esto la copia guardada no se encontraría en modo avión.

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(VERSION);
    // Uno por uno: si un archivo falla, los demás sí quedan guardados
    await Promise.allSettled([...new Set([...BASICOS, ...PRECARGA])].map((u) => cache.add(new Request(u, { cache: 'reload' }))));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const claves = await caches.keys();
    await Promise.all(claves.filter((k) => k !== VERSION).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

/** Red con tiempo límite; si falla o tarda, lo guardado. Guarda cada respuesta buena. */
async function redPrimero(request, { clave } = {}) {
  const cache = await caches.open(VERSION);
  const guardada = () => cache.match(clave || request, { ignoreSearch: !!clave, ignoreVary: true });
  try {
    const red = fetch(request).then((r) => {
      if (r && r.ok && r.type === 'basic') cache.put(clave || request, r.clone());
      return r;
    });
    red.catch(() => { /* si gana el tiempo límite, el error de red no importa */ });
    const limite = new Promise((resolve) => setTimeout(() => resolve(null), ESPERA_RED_MS));
    const r = await Promise.race([red, limite]);
    if (r) return r;
    return (await guardada()) || (await red);
  } catch {
    const g = await guardada();
    if (g) return g;
    throw new Error('Sin red y sin copia guardada');
  }
}

/** Para archivos con huella (no cambian): lo guardado y, si no está, la red. */
async function copiaPrimero(request) {
  const cache = await caches.open(VERSION);
  const g = await cache.match(request, { ignoreVary: true });
  if (g) return g;
  const r = await fetch(request);
  if (r && r.ok && r.type === 'basic') cache.put(request, r.clone());
  return r;
}

self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // API, mapas y otros dominios: directo a la red
  // El «ping» de Vite en desarrollo: si lo respondiera la copia, Vite recargaría la página sin fin en modo avión
  if ((request.headers.get('accept') || '').includes('text/x-vite-ping')) return;

  if (request.mode === 'navigate') {
    // Cualquier página de la app sale de index.html (las rutas van en el #)
    e.respondWith(redPrimero(request, { clave: new URL('./index.html', self.registration.scope).href }).catch(() => caches.match('./index.html', { ignoreVary: true })));
    return;
  }
  if (/\/assets\/[^/]+-[\w-]{8}\.\w+$/.test(url.pathname)) {
    e.respondWith(copiaPrimero(request));
    return;
  }
  e.respondWith(redPrimero(request));
});
