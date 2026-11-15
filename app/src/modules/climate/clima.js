// Clima histórico por zona (NASA POWER vía data-pipeline/clima.py → app/data/clima/*.json)
// y escenarios (GET /api/v1/climate/datasets?kind=projection, hoy vacío).
// Aquí no se predicen cosechas: se mide exposición histórica.
import { json } from '../../shared/datos.js';
import * as api from '../../services/api/endpoints.js';

let zonasCache = null;
const climaCache = new Map();

export async function zonas() {
  if (!zonasCache) zonasCache = (await json('zonas.json')).zonas;
  return zonasCache;
}
export const zonaPorId = (id) => (zonasCache || []).find((z) => z.id === id) || null;

/** Zona de referencia cuando la parcela no tiene zona: la primera de zonas.json. Siempre se avisa en pantalla. */
export const zonaPorDefecto = () => (zonasCache || [])[0] || null;

export const COLOR_ZONA = { 'yuc-sur': '#218380', 'qroo-centro': '#ffbc42', 'camp-chenes': '#8f2d56' };
export const NOMBRE_CORTO_ZONA = { 'yuc-sur': 'Sur de Yucatán', 'qroo-centro': 'Zona maya', 'camp-chenes': 'Los Chenes' };

export async function clima(zonaId) {
  if (climaCache.has(zonaId)) return climaCache.get(zonaId);
  const z = (await zonas()).find((x) => x.id === zonaId);
  if (!z) return null;
  // El archivo debe ser el de esa zona y el de ese punto: no se usa una serie solo porque comparte nombre
  const p = json(z.archivoClima).then((c) => {
    if (c?.zona?.id !== zonaId) throw new Error(`El archivo ${z.archivoClima} no es de la zona ${zonaId}`);
    if (c.ubicacion?.lat !== z.punto.lat || c.ubicacion?.lon !== z.punto.lon) throw new Error(`El clima de ${zonaId} no corresponde al punto de la zona`);
    return c;
  });
  p.catch(() => climaCache.delete(zonaId));
  climaCache.set(zonaId, p);
  return p;
}

// ---------- Asignación de zona: punto de referencia más cercano (contexto general, paso 2) ----------
export function distanciaKm(a, b) {
  const R = 6371;
  const rad = (g) => (g * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function zonaMasCercana(punto) {
  if (!zonasCache || !punto) return null;
  return zonasCache
    .map((z) => ({ zona: z, km: distanciaKm(punto, z.punto) }))
    .sort((a, b) => a.km - b.km)[0];
}

// ---------- Escenarios climáticos (proyección) ----------
export async function escenarios(zonaId) {
  try {
    const r = await api.conjuntosClimaticos(zonaId, 'projection');
    return { conexion: true, items: r.items || [] };
  } catch {
    return { conexion: false, items: [] };
  }
}

// ---------- Análisis de exposición histórica ----------
const dia = (iso) => { const [a, m, d] = iso.split('-').map(Number); return new Date(a, m - 1, d); };
const seSolapan = (i1, f1, i2, f2) => i1 <= f2 && f1 >= i2;

/**
 * Cuenta en cuántos años una racha seca (≥ umbralDias) o un episodio de calor (≥ minCalor)
 * tocó la ventana [desdeDia, hastaDia] después de una siembra en (mes, dia).
 */
export function exposicion(datosClima, { mesSiembra, diaSiembra, desdeDia, hastaDia, umbralRacha = 5, minCalor = 3 }) {
  const completas = datosClima.temporadas.filter((t) => t.completa);
  const conDatos = new Set(completas.map((t) => t.anio));
  // Las ventanas pueden cruzar de un año al siguiente (siembra tardía): se juntan los eventos de todos los años
  const todasRachas = completas.flatMap((t) => t.rachas.filter((r) => r.dias >= umbralRacha));
  const todosCalor = completas.flatMap((t) => t.episodiosCalor.filter((e) => e.dias >= minCalor));
  const anios = [];
  let conRacha = 0;
  let conCalor = 0;
  const detalle = [];
  for (const t of completas) {
    const siembra = new Date(t.anio, mesSiembra - 1, diaSiembra);
    const ini = new Date(siembra); ini.setDate(ini.getDate() + desdeDia);
    const fin = new Date(siembra); fin.setDate(fin.getDate() + hastaDia);
    if (!conDatos.has(ini.getFullYear()) || !conDatos.has(fin.getFullYear())) continue; // ventana sin datos completos
    anios.push(t);
    const rachas = todasRachas.filter((r) => seSolapan(dia(r.inicio), dia(r.fin), ini, fin));
    const calor = todosCalor.filter((e) => seSolapan(dia(e.inicio), dia(e.fin), ini, fin));
    if (rachas.length) conRacha++;
    if (calor.length) conCalor++;
    const peor = rachas.sort((a, b) => b.dias - a.dias)[0] || null;
    detalle.push({ anio: t.anio, racha: peor, calor: calor.length, lluviaVentana: t.ventana?.lluviaMm ?? null });
  }
  return { total: anios.length, conRacha, conCalor, detalle, desde: anios[0]?.anio, hasta: anios[anios.length - 1]?.anio };
}

/** Lluvia junio–agosto: mediana histórica y último año con datos. */
export function lluviaTemporada(datosClima) {
  const anios = datosClima.temporadas.filter((t) => t.completa && t.ventana?.lluviaMm != null);
  const ultimo = anios[anios.length - 1];
  return {
    mediana: datosClima.resumen?.medianaLluviaVentanaMm ?? null,
    serie: anios.map((t) => ({ anio: t.anio, mm: t.ventana.lluviaMm })),
    ultimo: ultimo ? { anio: ultimo.anio, mm: ultimo.ventana.lluviaMm, racha: ultimo.ventana.rachaMasLarga } : null,
    ventana: datosClima.definiciones?.ventanaResumen,
  };
}

/** Datos observados de un año concreto (para comparar con lo que vivió el productor). */
export function anioObservado(datosClima, anio) {
  const t = datosClima.temporadas.find((x) => x.anio === anio);
  if (!t) return null;
  return {
    anio,
    completa: t.completa,
    lluviaMm: t.ventana?.lluviaMm ?? null,
    rachaMasLarga: t.ventana?.rachaMasLarga ?? null,
    diasCalor: t.episodiosCalor.filter((e) => e.dias >= 3).reduce((s, e) => s + e.dias, 0),
  };
}

/** Rachas (≥ umbral) y episodios de calor (≥ minCalor) de un año que tocan un mes. */
export function eventosDelMes(datosClima, anio, mes, { umbralRacha = 5, minCalor = 3 } = {}) {
  const t = datosClima.temporadas.find((x) => x.anio === anio);
  if (!t) return { rachas: [], calor: [] };
  const ini = new Date(anio, mes - 1, 1);
  const fin = new Date(anio, mes, 0);
  return {
    rachas: t.rachas.filter((r) => r.dias >= umbralRacha && seSolapan(dia(r.inicio), dia(r.fin), ini, fin)),
    calor: t.episodiosCalor.filter((e) => e.dias >= minCalor && seSolapan(dia(e.inicio), dia(e.fin), ini, fin)),
  };
}

/** En cuántos años hubo al menos una racha relevante dentro de un mes. */
export function frecuenciaMensual(datosClima, mes, { umbralRacha = 5, minCalor = 3 } = {}) {
  const anios = datosClima.temporadas.filter((t) => t.completa);
  let rachas = 0;
  let calor = 0;
  for (const t of anios) {
    const e = eventosDelMes(datosClima, t.anio, mes, { umbralRacha, minCalor });
    if (e.rachas.length) rachas++;
    if (e.calor.length) calor++;
  }
  return { total: anios.length, rachas, calor };
}

export const ultimoAnioCompleto = (datosClima) => {
  const c = datosClima.temporadas.filter((t) => t.completa);
  return c[c.length - 1]?.anio;
};

export function fuenteTexto(datosClima) {
  const f = datosClima.fuentes;
  return `NASA POWER (${f.lluvia.producto} para lluvia, ${f.temperatura.producto} para temperatura), corte ${f.lluvia.fechaCorte}`;
}
