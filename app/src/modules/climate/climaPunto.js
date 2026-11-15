// Clima histórico del PUNTO EXACTO de la parcela (NASA POWER, 1998–2025).
//
// Antes cada parcela usaba el punto de clima de su zona (solo hay 3), así que mover el pin no
// cambiaba nada. Ahora:
//  1. Con internet, al guardar la parcela se pide el clima de su punto: primero al servidor
//     (GET /climate/point, que consulta a la NASA y guarda en caché) y, si no responde, directo
//     a la API de NASA POWER. Se procesa igual que data-pipeline/clima.py.
//  2. Se guarda en el teléfono: después funciona sin conexión.
//  3. Sin internet se usa el clima de la zona como referencia y se reintenta al volver la red.
// El documento tiene la misma forma que app/data/clima/<zona>.json: el motor no cambia.
import * as repos from '../../storage/repos.js';
import * as api from '../../services/api/endpoints.js';
import { zonaPorId, clima as climaZona } from './clima.js';

const PARAMS = ['IMERG_PRECTOT', 'T2M_MAX'];
const INICIO = '19980101';
const FIN = '20251231';
const UMBRAL_SECO_MM = 1.0;
const MIN_RACHA = 3;
const UMBRAL_CALOR_C = 35.0;
const MIN_CALOR = 1;
const VENT = ['06-01', '08-31'];

export const urlPower = (lat, lon) => `https://power.larc.nasa.gov/api/temporal/daily/point?parameters=${PARAMS.join(',')}&community=AG&longitude=${lon}&latitude=${lat}&start=${INICIO}&end=${FIN}&format=JSON&time-standard=UTC`;

/** Dos decimales (~1 km), igual que la caché del servidor. */
export const claveDe = (u) => (u && Number.isFinite(u.lat) && Number.isFinite(u.lon) ? `${u.lat.toFixed(2)},${u.lon.toFixed(2)}` : null);
const kvClave = (clave) => `climaPunto:${clave}`;

// ---------------- Proceso (igual que data-pipeline/clima.py) ----------------
const z2 = (n) => String(n).padStart(2, '0');
const isoDe = (k) => `${k.slice(0, 4)}-${k.slice(4, 6)}-${k.slice(6, 8)}`;
const masDias = (iso, n) => { const d = new Date(`${iso}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };

function serie(raw, param) {
  const fill = raw.header.fill_value;
  return Object.entries(raw.properties.parameter[param])
    .map(([k, v]) => [isoDe(k), v === fill || v == null ? null : Math.round(v * 100) / 100])
    .sort((a, b) => a[0].localeCompare(b[0]));
}

function corridas(dias, cumple, minimo) {
  const out = [];
  let ini = null;
  let n = 0;
  for (const [d, v] of [...dias, [null, null]]) {
    if (v !== null && d !== null && cumple(v)) { ini = ini || d; n++; } else {
      if (n >= minimo) out.push({ inicio: ini, fin: masDias(ini, n - 1), dias: n });
      ini = null; n = 0;
    }
  }
  return out;
}

const mediana = (xs) => { const s = [...xs].sort((a, b) => a - b); const m = s.length >> 1; return s.length ? (s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2) : null; };

/** Convierte la respuesta de NASA POWER en el documento de clima que usa la app. */
export function procesarPower(raw, lat, lon, hoyIso = new Date().toISOString().slice(0, 10)) {
  const lluvia = serie(raw, PARAMS[0]);
  const tmax = serie(raw, PARAMS[1]);
  const anios = [...new Set(lluvia.map(([d]) => Number(d.slice(0, 4))))].sort((a, b) => a - b);
  const temporadas = [];
  for (const anio of anios) {
    const dl = lluvia.filter(([d]) => Number(d.slice(0, 4)) === anio);
    const dt = tmax.filter(([d]) => Number(d.slice(0, 4)) === anio);
    if (dl.every(([, v]) => v === null)) continue;
    const vi = `${anio}-${VENT[0]}`;
    const vf = `${anio}-${VENT[1]}`;
    const vent = dl.filter(([d]) => d >= vi && d <= vf);
    const validos = vent.map(([, v]) => v).filter((v) => v !== null);
    const rv = corridas(vent, (v) => v < UMBRAL_SECO_MM, MIN_RACHA);
    const conDato = dl.filter(([, v]) => v !== null).length;
    temporadas.push({
      anio,
      completa: conDato === dl.length && dt.every(([, v]) => v !== null),
      diasConDato: conDato,
      diasEsperados: dl.length,
      ventana: {
        diasConDato: validos.length,
        diasEsperados: vent.length,
        lluviaMm: Math.round(validos.reduce((s, v) => s + v, 0) * 100) / 100,
        rachaMasLarga: rv.reduce((m, r) => (!m || r.dias > m.dias ? r : m), null),
      },
      rachas: corridas(dl, (v) => v < UMBRAL_SECO_MM, MIN_RACHA),
      episodiosCalor: corridas(dt, (v) => v >= UMBRAL_CALOR_C, MIN_CALOR),
    });
  }
  const completas = temporadas.filter((t) => t.ventana.diasConDato === t.ventana.diasEsperados && t.ventana.rachaMasLarga);
  const peores = [...completas].sort((a, b) => b.ventana.rachaMasLarga.dias - a.ventana.rachaMasLarga.dias).slice(0, 3);
  const validosDe = (s) => s.filter(([, v]) => v !== null).map(([d]) => d);
  const fuente = (p, producto, res, s) => ({
    nombre: 'NASA POWER Daily API', versionApi: raw.header?.api?.version ?? null, producto, parametro: p,
    unidades: raw.parameters?.[p]?.units ?? null, resolucionAprox: res, url: urlPower(lat, lon), timeStandard: 'UTC',
    fechaDescarga: hoyIso, fechaCorte: validosDe(s).at(-1) ?? null, primerDatoValido: validosDe(s)[0] ?? null,
  });
  return {
    version: '0.2',
    esEjemplo: false,
    zona: { id: 'punto', nombre: 'Punto de tu parcela', estado: null },
    ubicacion: { lat, lon, elevacionM: raw.geometry?.coordinates?.[2] ?? null },
    fuentes: {
      lluvia: fuente(PARAMS[0], 'GPM IMERG', '0.1° (~10 km)', lluvia),
      temperatura: fuente(PARAMS[1], 'MERRA-2', '0.5° x 0.625° (~50 km)', tmax),
    },
    definiciones: {
      umbralDiaSecoMm: UMBRAL_SECO_MM, rachaMinimaReportadaDias: MIN_RACHA, umbralCalorC: UMBRAL_CALOR_C, calorMinimoReportadoDias: MIN_CALOR,
      ventanaResumen: { inicio: VENT[0], fin: VENT[1] }, tratamientoFaltantes: 'null; un día null corta la racha o el episodio y no cuenta',
    },
    temporadas,
    resumen: {
      aniosCompletos: completas.length,
      medianaLluviaVentanaMm: completas.length ? Math.round(mediana(completas.map((t) => t.ventana.lluviaMm)) * 100) / 100 : null,
      medianaRachaMasLargaDias: completas.length ? mediana(completas.map((t) => t.ventana.rachaMasLarga.dias)) : null,
      peoresAnios: peores.map((t) => ({ anio: t.anio, ...t.ventana.rachaMasLarga })),
    },
  };
}

/** Comprueba que el documento sirve para el motor (evita guardar una respuesta rota). */
export function esValido(doc) {
  return !!(doc && Array.isArray(doc.temporadas) && doc.temporadas.some((t) => t.completa) && doc.fuentes?.lluvia && doc.definiciones);
}

// ---------------- Descarga y guardado ----------------
const enCurso = new Map();

export const guardado = (ubicacion) => { const c = claveDe(ubicacion); return c ? repos.kv.get(kvClave(c), null) : null; };

async function descargar(lat, lon) {
  try {
    const doc = await api.climaPunto(lat, lon);
    if (esValido(doc)) return { doc, via: 'servidor' };
  } catch { /* servidor apagado o NASA sin respuesta: se intenta directo */ }
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 90000);
  try {
    const r = await fetch(urlPower(lat, lon), { signal: ctl.signal });
    if (!r.ok) throw new Error(`NASA POWER respondió ${r.status}`);
    const doc = procesarPower(await r.json(), lat, lon);
    if (!esValido(doc)) throw new Error('Respuesta de NASA POWER incompleta');
    return { doc, via: 'nasa_directo' };
  } finally { clearTimeout(t); }
}

/**
 * Se asegura de que la parcela tenga el clima de su punto. No lanza: devuelve el estado.
 * @returns {Promise<'listo'|'pendiente'|'sin_ubicacion'>}
 */
export async function asegurar(parcela) {
  const clave = claveDe(parcela?.ubicacion);
  if (!clave) return 'sin_ubicacion';
  const marcar = (estado, extra = {}) => {
    const p = repos.parcelas.porId(parcela.id);
    if (p && (p.climaPunto?.estado !== estado || p.climaPunto?.clave !== clave)) repos.parcelas.guardar({ ...p, climaPunto: { estado, clave, ...extra } });
  };
  if (repos.kv.get(kvClave(clave))) { marcar('listo', parcela.climaPunto?.clave === clave ? { descargadoEn: parcela.climaPunto.descargadoEn, via: parcela.climaPunto.via } : {}); return 'listo'; }
  if (globalThis.navigator?.onLine === false) { marcar('pendiente'); return 'pendiente'; }
  if (!enCurso.has(clave)) {
    const [lat, lon] = clave.split(',').map(Number);
    enCurso.set(clave, descargar(lat, lon).finally(() => enCurso.delete(clave)));
  }
  try {
    const { doc, via } = await enCurso.get(clave);
    repos.kv.set(kvClave(clave), doc);
    marcar('listo', { descargadoEn: new Date().toISOString(), via });
    return 'listo';
  } catch (e) {
    console.warn('[jaibaSpace] clima del punto pendiente:', e.message || e);
    marcar('pendiente');
    return 'pendiente';
  }
}

/** Intenta completar el clima de todas las parcelas (al abrir la app y al volver la red). */
export async function asegurarTodas() {
  const lista = repos.parcelasActivas().filter((p) => p.ubicacion && !guardado(p.ubicacion));
  const r = [];
  for (const p of lista) r.push(await asegurar(p)); // una por una: no saturar la API de la NASA
  return r;
}

/**
 * El clima que usa todo el motor para una parcela.
 * @returns {Promise<{ clima: object|null, origen: 'punto'|'zona'|null, zona: object|null }>}
 */
export async function climaDeParcela(parcela) {
  const zona = zonaPorId(parcela?.zonaId) || null;
  const punto = parcela ? guardado(parcela.ubicacion) : null;
  if (punto) return { clima: punto, origen: 'punto', zona };
  if (zona) return { clima: await climaZona(zona.id), origen: 'zona', zona };
  return { clima: null, origen: null, zona: null };
}

/** Frase corta y honesta sobre de dónde sale el clima, para mostrar en pantalla. */
export function textoOrigen(origen, zona) {
  if (origen === 'punto') return 'Clima de tu punto: NASA POWER, 1998 a 2025.';
  if (origen === 'zona') return `Por ahora usamos el clima de referencia de ${zona?.nombre?.split(' (')[0] || 'tu zona'}. Se afinará a tu punto cuando tengas internet.`;
  return 'Marca dónde está tu parcela para ver su clima.';
}


