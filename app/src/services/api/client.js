// Cliente HTTP de la API FastAPI (server/app/main.py, prefijo /api/v1).
// Sin secretos ni credenciales (RNF-12): la API del prototipo no tiene login.

/**
 * URL de la API cuando nadie la configuró:
 *  - Página servida por Vite (puerto 5173, desarrollo o `npm run preview`): mismo equipo, puerto 8000.
 *    Así sirve igual en la computadora (localhost) y en el celular (la IP de la computadora).
 *  - Página servida por FastAPI (PWA_DIST_DIR): mismo origen.
 */
function basePorDefecto() {
  try {
    if (location.port === '5173') return `${location.protocol}//${location.hostname}:8000/api/v1`;
    if (location.origin && location.origin !== 'null') return `${location.origin}/api/v1`;
  } catch { /* sin location (pruebas) */ }
  return 'http://localhost:8000/api/v1';
}
const CLAVE_BASE = 'jaibaspace.apiBase';

/**
 * Orden de prioridad para la URL de la API:
 * 1. ?api=https://... en la URL (útil para la demo), se recuerda en localStorage.
 * 2. localStorage jaibaspace.apiBase
 * 3. window.JAIBASPACE_API_BASE (config inyectada en index.html al desplegar)
 * 4. La misma computadora que sirve la página, puerto 8000 (ver basePorDefecto)
 */
export function apiBase() {
  try {
    const p = new URLSearchParams(location.search).get('api');
    if (p) { localStorage.setItem(CLAVE_BASE, p); return p.replace(/\/$/, ''); }
    const guardada = localStorage.getItem(CLAVE_BASE);
    if (guardada) return guardada.replace(/\/$/, '');
  } catch { /* sin localStorage */ }
  return (globalThis.JAIBASPACE_API_BASE || basePorDefecto()).replace(/\/$/, '');
}

export class ErrorApi extends Error {
  constructor(mensaje, { estado = 0, codigo = 'network_error', detalle = null } = {}) {
    super(mensaje);
    this.estado = estado; // 0 = sin conexión
    this.codigo = codigo;
    this.detalle = detalle;
  }
  get sinConexion() { return this.estado === 0; }
}

/** Petición JSON con tiempo límite. Los errores del servidor siguen {error:{code,message}}. */
export async function pedir(ruta, { metodo = 'GET', cuerpo, cabeceras = {}, limiteMs = 4500, params } = {}) {
  const url = new URL(apiBase() + ruta);
  if (params) Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null) url.searchParams.set(k, v); });
  const control = new AbortController();
  const t = setTimeout(() => control.abort(), limiteMs);
  let resp;
  try {
    resp = await fetch(url, {
      method: metodo,
      headers: { ...(cuerpo ? { 'Content-Type': 'application/json' } : {}), ...cabeceras },
      body: cuerpo ? JSON.stringify(cuerpo) : undefined,
      signal: control.signal,
      credentials: 'omit',
    });
  } catch (e) {
    throw new ErrorApi('Sin conexión con el servidor', { estado: 0 });
  } finally {
    clearTimeout(t);
  }
  let datos = null;
  try { datos = await resp.json(); } catch { /* respuesta vacía */ }
  if (!resp.ok) {
    const codigo = datos?.error?.code || datos?.detail || `http_${resp.status}`;
    const mensaje = datos?.error?.message || (typeof datos?.detail === 'string' ? datos.detail : 'Error del servidor');
    throw new ErrorApi(mensaje, { estado: resp.status, codigo, detalle: datos });
  }
  return datos;
}
