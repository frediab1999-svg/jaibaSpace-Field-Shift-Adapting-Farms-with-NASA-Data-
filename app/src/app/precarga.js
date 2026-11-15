// Precarga para usar la app SIN INTERNET.
// Los datos del motor (zonas, clima, reglas, planes y catálogos) llegan del servidor como un
// paquete que se guarda en IndexedDB (services/contenido.js). Esto de aquí guarda lo demás:
// al abrir la app (con red), carga en segundo plano todas las pantallas, el respaldo local de las
// tres zonas, las parcelas de ejemplo y todas las imágenes. Pasan por el service worker,
// que las guarda; así, en modo avión, se puede entrar a cualquier pantalla aunque no se
// haya visitado antes. En el build, el service worker además guarda todo al instalarse.
import { IMG, imagenCultivo } from '../shared/assets.js';
import { urlDatos } from '../shared/datos.js';
import * as climaMod from '../modules/climate/clima.js';
import * as catalogo from '../modules/crops/catalogo.js';
import * as repos from '../storage/repos.js';
import { avisar } from './estado.js';
import { precargarDemo } from '../modules/parcel/ejemplo.js';

const URL_EJEMPLO = new URL('../../fixtures/ejemplo-milpa.json', import.meta.url).href;
const MARCA = 'precargaSinInternet';

function urlsDeImagenes() {
  const urls = new Set();
  const recorrer = (v) => {
    if (typeof v === 'string') urls.add(v);
    else if (v && typeof v === 'object') Object.values(v).forEach(recorrer);
  };
  recorrer({ ...IMG, porNombre: null });
  catalogo.cultivos().forEach((c) => c.imagen && urls.add(imagenCultivo(c.imagen)));
  catalogo.semillas().forEach((s) => urls.add(imagenCultivo(catalogo.imagenSemilla(s))));
  return [...urls];
}

const enReposo = (fn) => (globalThis.requestIdleCallback ? requestIdleCallback(fn, { timeout: 3000 }) : setTimeout(fn, 1200));

/** Importa todas las pantallas (quedan en memoria aunque se vaya la red en esta sesión). */
async function pantallas(cargadores) {
  await Promise.allSettled(cargadores.map((c) => c()));
}

const DATOS = ['zonas.json', 'reglas.json', 'planes.json', 'catalogos/crops.json', 'catalogos/seeds.json', 'catalogos/soils.json', 'catalogos/listas.json', 'catalogos/municipios.json'];

/** Pide datos e imágenes (sin pasar por la memoria de la app) para que el service worker los guarde. */
async function recursos() {
  const zonas = await climaMod.zonas().catch(() => []);
  const archivos = [...DATOS, ...zonas.map((z) => z.archivoClima).filter(Boolean)];
  // Todo lo que la app ya cargó antes de que el service worker tomara control (en desarrollo,
  // los módulos de cada pantalla); al pedirlo otra vez queda guardado.
  const yaCargados = performance.getEntriesByType('resource').map((e) => e.name)
    .filter((u) => u.startsWith(location.origin) && !u.includes('/sw.js'));
  await Promise.allSettled([
    ...[...new Set(yaCargados)].map((u) => fetch(u)),
    ...archivos.map((a) => fetch(urlDatos(a))),
    fetch(URL_EJEMPLO),
    ...urlsDeImagenes().map((u) => fetch(u)),
  ]);
}

/**
 * @param {Array<() => Promise>} cargadores funciones import() de cada pantalla
 */
export function precargar(cargadores) {
  enReposo(async () => {
    await pantallas(cargadores);
    precargarDemo(); // perfil y parcelas de demostración del servidor, para abrirlos sin conexión
    const sw = navigator.serviceWorker;
    if (!sw) return;
    const conSW = async () => {
      await recursos();
      const version = (await caches.keys().catch(() => [])).find((k) => k.startsWith('milpa-')) || 'milpa';
      if (repos.kv.get(MARCA) !== version) {
        repos.kv.set(MARCA, version);
        avisar('Lista para usar sin internet');
      }
    };
    if (sw.controller) conSW();
    else sw.addEventListener('controllerchange', conSW, { once: true });
  });
}
