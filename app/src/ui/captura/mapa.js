// Mapa para poner la ubicación exacta de la parcela, al estilo "mueve el mapa, el pin se queda".
// Usa Leaflet (incluido en src/vendor, sin CDN). Teselas: OpenStreetMap y, opcional, satélite de Esri.
// Sin internet las teselas no cargan: se ofrece GPS o elegir municipio.

const URL_LEAFLET_JS = new URL('../../vendor/leaflet/leaflet.js', import.meta.url).href;
const URL_LEAFLET_CSS = new URL('../../vendor/leaflet/leaflet.css', import.meta.url).href;
const CENTRO_PENINSULA = { lat: 20.25, lon: -89.1 };

let cargaLeaflet = null;
function cargarLeaflet() {
  if (globalThis.L) return Promise.resolve(globalThis.L);
  if (cargaLeaflet) return cargaLeaflet;
  cargaLeaflet = new Promise((resolve, reject) => {
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = URL_LEAFLET_CSS;
    document.head.appendChild(css);
    const s = document.createElement('script');
    s.src = URL_LEAFLET_JS;
    s.onload = () => (globalThis.L ? resolve(globalThis.L) : reject(new Error('Leaflet no disponible')));
    s.onerror = () => reject(new Error('No se pudo cargar Leaflet'));
    document.head.appendChild(s);
  });
  return cargaLeaflet;
}

const CAPAS = {
  mapa: { url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', attr: '&copy; colaboradores de OpenStreetMap', max: 19 },
  satelite: { url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', attr: 'Imágenes &copy; Esri', max: 18 },
};

/**
 * @param {HTMLElement} contenedor  elemento .mapa-pick
 * @param {{inicial?:{lat,lon}, alCambiar:Function, alError?:Function}} op
 */
export async function crearMapa(contenedor, { inicial = null, alCambiar, alError }) {
  const lienzo = contenedor.querySelector('.mapa-pick__lienzo');
  let L;
  try { L = await cargarLeaflet(); } catch (e) { alError?.('sin_leaflet'); return null; }
  const centro = inicial || CENTRO_PENINSULA;
  const mapa = L.map(lienzo, { zoomControl: false, attributionControl: true, tap: true }).setView([centro.lat, centro.lon], inicial ? 16 : 8);
  let capaActual = null;
  let errores = 0;
  const usarCapa = (id) => {
    if (capaActual) mapa.removeLayer(capaActual);
    const c = CAPAS[id];
    capaActual = L.tileLayer(c.url, { maxZoom: c.max, attribution: c.attr, crossOrigin: true });
    capaActual.on('tileerror', () => { errores++; if (errores === 4) alError?.('sin_teselas'); });
    capaActual.addTo(mapa);
  };
  usarCapa('mapa');
  L.control.zoom({ position: 'topright' }).addTo(mapa);

  mapa.on('movestart', () => { contenedor.dataset.moviendo = 'true'; });
  mapa.on('moveend', () => {
    contenedor.dataset.moviendo = 'false';
    const c = mapa.getCenter();
    alCambiar?.({ lat: Math.round(c.lat * 1e5) / 1e5, lon: Math.round(c.lng * 1e5) / 1e5, origen: 'mapa', zoom: mapa.getZoom() });
  });
  // Leaflet necesita recalcular tamaño cuando el contenedor ya está visible
  setTimeout(() => mapa.invalidateSize(), 120);

  return {
    usarCapa,
    irA(p, zoom = 16) { mapa.setView([p.lat, p.lon], zoom); },
    centro: () => { const c = mapa.getCenter(); return { lat: c.lat, lon: c.lng }; },
    destruir: () => mapa.remove(),
  };
}

/** Ubicación por GPS del teléfono. */
export function ubicarPorGps() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) { reject(new Error('Este teléfono no comparte su ubicación con el navegador.')); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: Math.round(pos.coords.latitude * 1e5) / 1e5, lon: Math.round(pos.coords.longitude * 1e5) / 1e5, precisionM: Math.round(pos.coords.accuracy), origen: 'gps' }),
      (err) => reject(new Error(err.code === 1 ? 'No diste permiso para usar tu ubicación.' : 'No pudimos obtener tu ubicación.')),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
    );
  });
}
