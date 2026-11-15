// Catálogos de cultivos, semillas, suelos, municipios y listas de captura.
// Salen del paquete que publica FastAPI (GET /api/v1/catalogs/{nombre}, descargado por
// services/contenido.js) o, si nunca se pudo descargar, del respaldo local de
// app/data/catalogos. Los catálogos siguen marcados esEjemplo: son del prototipo.
import { json, origenDatos } from '../../shared/datos.js';
import { normalizar } from '../../shared/format.js';

const estado = { crops: null, seeds: null, listas: null, soils: null, municipios: null, origen: {} };

async function cargarCatalogo(nombre) {
  const doc = await json(`catalogos/${nombre}.json`);
  estado.origen[nombre] = doc.esEjemplo ? 'ejemplo' : origenDatos().origen;
  return doc.items;
}

export async function cargar() {
  const [crops, seeds, listas, soils, municipios] = await Promise.all([
    cargarCatalogo('crops'),
    cargarCatalogo('seeds'),
    json('catalogos/listas.json'),
    json('catalogos/soils.json'),
    json('catalogos/municipios.json'),
  ]);
  Object.assign(estado, { crops, seeds, listas, soils: soils.items, municipios: municipios.items });
  return estado;
}

export const cultivos = () => estado.crops || [];
export const semillas = () => estado.seeds || [];
export const listas = () => estado.listas || {};
export const suelos = () => estado.soils || [];
export const municipios = () => estado.municipios || [];
export const origen = (nombre) => estado.origen[nombre] || 'ejemplo';

export const cultivo = (id) => cultivos().find((c) => c.id === id) || { id, name: id, color: '#c9a44a' };
export const semilla = (id) => semillas().find((s) => s.id === id) || null;
export function imagenSemilla(s) {
  const c = cultivo(s?.cultivoId);
  return c.imagen || 'ico-semilla.jpg';
}

/** Busca semillas por nombre común, maya o variedad. */
export function buscar(texto) {
  const q = normalizar(texto);
  if (!q) return semillas();
  return semillas().filter((s) => {
    const c = cultivo(s.cultivoId);
    return [s.name, c.name, c.nombreMaya, s.variedadId, s.descripcion].some((v) => normalizar(v).includes(q));
  });
}

// ---------------------------------------------------------------
// Suelo escrito por el productor → catálogo (para afinar la proyección)
// ---------------------------------------------------------------
export function reconocerSuelo(texto) {
  const t = normalizar(texto);
  if (!t) return { estado: 'vacio', suelo: null };
  const compacto = t.replace(/\s/g, '');
  // Puntaje: una coincidencia por palabra clave y dos extra si escribió el nombre del suelo
  const puntajes = suelos()
    .map((s) => {
      const nombre = normalizar(s.name).replace(/\s/g, '');
      const n = s.palabras.filter((p) => t.includes(p) || compacto.includes(p.replace(/\s/g, ''))).length + (compacto.includes(nombre) ? 2 : 0);
      return { s, n };
    })
    .filter((x) => x.n > 0)
    .sort((a, b) => b.n - a.n);
  if (!puntajes.length) return { estado: 'desconocido', suelo: null };
  if (puntajes.length > 1 && puntajes[0].n === puntajes[1].n) {
    return { estado: 'ambiguo', suelo: null, candidatos: puntajes.filter((x) => x.n === puntajes[0].n).map((x) => x.s) };
  }
  const s = puntajes[0].s;
  return { estado: s.reglasId ? 'reconocido' : 'parcial', suelo: s };
}

// ---------------------------------------------------------------
// ¿Conviene sembrar esta semilla en el mes m (1-12) en la zona z?
// Regla del prototipo (documentada): ventana de siembra de temporal + aptitud del suelo
// predominante de la zona según reglas.json. "Espera" = la ventana abre en ≤ 2 meses.
// ---------------------------------------------------------------
const mesDe = (mmdd) => Number(mmdd.slice(0, 2));
const diaDe = (mmdd) => Number(mmdd.slice(3, 5));

export function enVentana(s, mes, dia = 15) {
  const v = s.ventanaSiembra;
  if (!v) return false;
  const actual = mes * 100 + dia;
  const desde = mesDe(v.desde) * 100 + diaDe(v.desde);
  const hasta = mesDe(v.hasta) * 100 + diaDe(v.hasta);
  return desde <= hasta ? actual >= desde && actual <= hasta : actual >= desde || actual <= hasta;
}

export function mesesParaVentana(s, mes) {
  const desde = mesDe(s.ventanaSiembra.desde);
  return (desde - mes + 12) % 12;
}

/**
 * @returns {{estado:'si'|'esp'|'no', razones:string[], fuentes:string[]}}
 */
export function viabilidad(s, { mes, dia = 15, zona = null, reglas = null }) {
  const razones = [];
  const fuentes = [];
  let est;
  if (enVentana(s, mes, dia)) {
    est = 'si';
    razones.push(`Estás dentro de la ventana de siembra de temporal (${rangoVentana(s)}).`);
  } else {
    const faltan = mesesParaVentana(s, mes);
    est = faltan > 0 && faltan <= 2 ? 'esp' : 'no';
    razones.push(est === 'esp'
      ? `La ventana de siembra abre pronto (${rangoVentana(s)}). Ve preparando la semilla.`
      : `Fuera de temporada: se siembra ${rangoVentana(s)}.`);
  }
  if (s.source) fuentes.push(s.source);

  // Aptitud del suelo predominante de la zona (zonas.json + reglas.json)
  const c = cultivo(s.cultivoId);
  if (zona && reglas && c.reglasId) {
    // zonas.json nombra los suelos con la clave WRB de reglas.json (leptosol, luvisol), no con el nombre local
    const aptitudes = (zona.suelosPredominantes || [])
      .filter((id) => reglas.suelos[id]?.aptitud)
      .map((id) => ({ suelo: { name: reglas.suelos[id].equivalenteWRB || id }, apt: reglas.suelos[id].aptitud[c.reglasId] }))
      .filter((x) => x.apt);
    if (aptitudes.length) {
      const mejor = aptitudes.sort((a, b) => rangoApt(b.apt) - rangoApt(a.apt))[0];
      razones.push(`En ${zona.nombre.split(' (')[0]} predomina ${mejor.suelo.name}: aptitud ${mejor.apt} para ${c.name.toLowerCase()}.`);
      fuentes.push('reglas.json (suelos, INEGI/INIFAP)');
      if (mejor.apt === 'baja' && est === 'si') est = 'esp';
    } else {
      razones.push('El suelo de esta zona aún no tiene aptitud documentada para este cultivo.');
    }
  } else if (!c.reglasId) {
    razones.push('Las etapas de este cultivo están por confirmar.');
  }
  return { estado: est, razones, fuentes };
}
const rangoApt = (a) => ({ alta: 3, media: 2, baja: 1 }[a] || 0);

const MESES_TXT = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
export function rangoVentana(s) {
  const v = s.ventanaSiembra;
  if (!v) return 'sin fecha';
  const f = (mmdd) => `${diaDe(mmdd)} de ${MESES_TXT[mesDe(mmdd) - 1]}`;
  return `del ${f(v.desde)} al ${f(v.hasta)}`;
}

export const ESTADO_TXT = { si: 'Sí conviene', esp: 'Espera', no: 'No por ahora' };
export const ESTADO_COLOR = { si: '#5d9e4b', esp: '#efc24d', no: '#a8392a' };
export const ESTADO_LETRERO = { si: 'bien', esp: 'atencion', no: 'riesgo' };
