// De dónde sale cada JSON de datos (zonas, clima, reglas, planes y catálogos).
//
// 1) PAQUETE DEL SERVIDOR: lo descarga services/contenido.js de FastAPI, lo valida completo
//    y lo guarda en el teléfono (IndexedDB). Si existe, TODOS los datos salen de él.
// 2) RESPALDO LOCAL: los mismos archivos de app/data, empaquetados con la app. Se usa cuando
//    nunca se pudo descargar un paquete completo.
// Nunca se mezclan: o todo sale del paquete del servidor o todo sale del respaldo local,
// para no cruzar reglas de una carga con clima de otra.
const cache = new Map();
let paquete = null;

/** Activa un paquete completo del servidor (o null para volver al respaldo local). */
export function usarPaquete(p) {
  paquete = p && p.documentos ? p : null;
  cache.clear();
}

/** Qué datos está usando la app en este momento (para mostrarlo y poder comprobarlo). */
export function origenDatos() {
  if (!paquete) return { origen: 'local', version: null, descargadoEn: null, verificacion: null, api: null, documentos: [] };
  return {
    origen: 'servidor',
    version: paquete.version,
    descargadoEn: paquete.descargadoEn,
    verificacion: paquete.verificacion,
    api: paquete.api,
    documentos: paquete.manifiesto || [],
  };
}

export function urlDatos(ruta) {
  return new URL(`../../data/${ruta}`, import.meta.url).href;
}

export async function json(ruta) {
  if (paquete) {
    const doc = paquete.documentos[ruta];
    if (doc === undefined) throw new Error(`El paquete del servidor no trae ${ruta}`);
    return doc;
  }
  if (cache.has(ruta)) return cache.get(ruta);
  const promesa = fetch(urlDatos(ruta)).then((r) => {
    if (!r.ok) throw new Error(`No se pudo leer data/${ruta}`);
    return r.json();
  });
  cache.set(ruta, promesa);
  try { return await promesa; } catch (e) { cache.delete(ruta); throw e; }
}
