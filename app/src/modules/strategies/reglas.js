// Reglas agronómicas (reglas.json, Rol 3) y planes de dos ciclos (planes.json).
// Llegan en el paquete del servidor o del respaldo local (shared/datos.js). La comparación
// la calcula el motor (motor/estrategias.js y motor/comparacion.js) y la muestra la pantalla
// «Opciones para tu parcela» (ui/resultados/opciones.js).
import { json } from '../../shared/datos.js';

let reglasCache = null;
let planesCache = null;

export async function reglas() {
  if (!reglasCache) reglasCache = await json('reglas.json');
  return reglasCache;
}
export async function planes() {
  if (!planesCache) planesCache = await json('planes.json');
  return planesCache;
}
export const reglasSync = () => reglasCache;

/** Prioridades del productor (reglas.prioridades): agua, suelo, nitrógeno, ingreso. */
export function prioridades() {
  if (!reglasCache) return [];
  return Object.entries(reglasCache.prioridades).map(([id, p]) => ({ id, name: p.nombre }));
}

/** Etapas del cultivo con sensibilidad (o null si el cultivo no tiene reglas). */
export function etapas(reglasId) {
  return reglasCache?.cultivos?.[reglasId]?.etapas || null;
}
export function etapaSensible(reglasId) {
  const e = etapas(reglasId);
  if (!e) return null;
  return e.find((x) => x.sensibilidad === 'alta') || null;
}
export function cicloDias(reglasId) {
  const e = etapas(reglasId);
  return e ? e[e.length - 1].hastaDia : null;
}
export function fuentesCultivo(reglasId) {
  return reglasCache?.cultivos?.[reglasId]?.fuentes || [];
}
