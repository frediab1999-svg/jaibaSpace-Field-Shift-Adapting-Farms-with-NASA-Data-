// Cola de cambios pendientes (clase CambioPendiente del diagrama de dominio, RF-09).
// Estados visibles para el productor: pendiente → enviada | error.
// - Sin conexión: se queda "pendiente" y se reintenta al volver la red.
// - El servidor rechaza (4xx): pasa a "error" con el motivo, para que la persona decida.
import * as repos from '../../storage/repos.js';
import * as api from '../api/endpoints.js';
import { uuid } from '../../shared/uuid.js';
import { poner } from '../../app/estado.js';

let enviando = false;

/** Encola un envío. tipoEntidad: 'consent' | 'contribution'. */
export function encolar({ tipoEntidad, entidadId, payload, referencia = null }) {
  const existente = repos.cola.donde((c) => c.tipoEntidad === tipoEntidad && c.entidadId === entidadId)[0];
  if (existente) return existente;
  return repos.cola.guardar({
    id: uuid(),
    tipoEntidad,
    entidadId,
    accion: 'POST',
    payload,
    referencia, // ids locales para mostrar a qué temporada pertenece
    estado: 'pendiente',
    intentos: 0,
    ultimoError: null,
    creadoEn: new Date().toISOString(),
    enviadoEn: null,
  });
}

export const pendientes = () => repos.cola.donde((c) => c.estado === 'pendiente');
export const resumen = () => {
  const todos = repos.cola.todos().filter((c) => c.tipoEntidad === 'contribution');
  return {
    total: todos.length,
    pendiente: todos.filter((c) => c.estado === 'pendiente').length,
    enviada: todos.filter((c) => c.estado === 'enviada').length,
    error: todos.filter((c) => c.estado === 'error').length,
  };
};
export const estadoDe = (entidadId) => repos.cola.donde((c) => c.entidadId === entidadId)[0]?.estado || null;

/** Envía en orden: primero consentimientos, luego contribuciones. */
export async function procesar() {
  if (enviando) return;
  enviando = true;
  try {
    const orden = (c) => (c.tipoEntidad === 'consent' ? 0 : 1);
    const lista = pendientes().sort((a, b) => orden(a) - orden(b) || a.creadoEn.localeCompare(b.creadoEn));
    for (const item of lista) {
      if (item.tipoEntidad === 'contribution') {
        const consentimiento = repos.cola.donde((c) => c.tipoEntidad === 'consent' && c.entidadId === item.payload.consent_id)[0];
        if (consentimiento && consentimiento.estado !== 'enviada') continue; // espera a que llegue el consentimiento
      }
      try {
        if (item.tipoEntidad === 'consent') await api.registrarConsentimiento(item.payload);
        else await api.enviarContribucion(item.payload);
        repos.cola.guardar({ ...item, estado: 'enviada', intentos: item.intentos + 1, enviadoEn: new Date().toISOString(), ultimoError: null });
        poner({ conexion: 'ok' });
      } catch (e) {
        if (e.sinConexion) { poner({ conexion: 'local' }); break; }
        // 409 en consentimiento = ya existe en el servidor: se considera enviado.
        if (item.tipoEntidad === 'consent' && e.estado === 409) {
          repos.cola.guardar({ ...item, estado: 'enviada', intentos: item.intentos + 1, enviadoEn: new Date().toISOString() });
          continue;
        }
        repos.cola.guardar({ ...item, estado: 'error', intentos: item.intentos + 1, ultimoError: `${e.codigo}: ${e.message}` });
      }
    }
  } finally {
    enviando = false;
  }
}

/** Devuelve un elemento con error a pendiente para reintentarlo. */
export function reintentar(id) {
  const item = repos.cola.porId(id);
  if (item) repos.cola.guardar({ ...item, estado: 'pendiente' });
  return procesar();
}

export function iniciar() {
  globalThis.addEventListener('online', () => procesar());
  procesar();
}
