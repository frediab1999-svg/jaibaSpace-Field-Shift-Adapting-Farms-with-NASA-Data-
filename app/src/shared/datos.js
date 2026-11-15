// Carga de archivos de app/data con caché. Son los JSON que publica el pipeline
// (zonas, clima, reglas, planes) y los catálogos de ejemplo del prototipo.
const cache = new Map();

export function urlDatos(ruta) {
  return new URL(`../../data/${ruta}`, import.meta.url).href;
}

export async function json(ruta) {
  if (cache.has(ruta)) return cache.get(ruta);
  const promesa = fetch(urlDatos(ruta)).then((r) => {
    if (!r.ok) throw new Error(`No se pudo leer data/${ruta}`);
    return r.json();
  });
  cache.set(ruta, promesa);
  try { return await promesa; } catch (e) { cache.delete(ruta); throw e; }
}
