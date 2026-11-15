// Paquete de datos publicado por FastAPI (GET /api/v1/bundle).
//
// Con red: pide el manifiesto, descarga cada documento, lo valida y, solo si el paquete está
// COMPLETO y es coherente, lo guarda en IndexedDB en una sola escritura. Así el teléfono
// conserva el contenido (no solo los enlaces) y el motor trabaja sin conexión.
// Si algo falla (sin red, un documento dañado, falta un archivo de clima), se conserva el
// último paquete completo; si nunca hubo uno, la app usa el respaldo local de app/data.
import * as db from '../storage/db.js';
import { apiBase, pedir } from './api/client.js';
import { usarPaquete } from '../shared/datos.js';

const ID = 'servidor';
export const REQUERIDOS = ['zonas.json', 'planes.json', 'reglas.json', 'catalogos/crops.json', 'catalogos/seeds.json', 'catalogos/soils.json', 'catalogos/municipios.json', 'catalogos/listas.json'];

const estado = { ultimoIntento: null, resultado: 'sin_intento', error: null, pendienteAlReabrir: null };
export const estadoContenido = () => ({ ...estado });

const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');

/** Comprobaciones de forma de cada documento (lo mínimo que el motor necesita para no fallar). */
export function validarDocumento(id, doc) {
  const es = (x) => !!x && typeof x === 'object';
  if (!es(doc)) return 'no es un objeto JSON';
  if (id === 'zonas.json') return Array.isArray(doc.zonas) && doc.zonas.every((z) => z.id && z.archivoClima && es(z.punto)) ? null : 'zonas sin id, punto o archivoClima';
  if (id === 'planes.json') return Array.isArray(doc.planes) && doc.planes.every((p) => p.id && Array.isArray(p.ciclos)) ? null : 'planes sin id o sin ciclos';
  if (id === 'reglas.json') return es(doc.cultivos) && es(doc.suelos) && Number.isFinite(doc.rachaRelevanteDias) ? null : 'reglas sin cultivos, suelos o rachaRelevanteDias';
  if (id.startsWith('clima/')) return es(doc.zona) && Array.isArray(doc.temporadas) && es(doc.definiciones) && es(doc.fuentes) ? null : 'clima sin zona, temporadas, definiciones o fuentes';
  if (id === 'catalogos/listas.json') return null;
  if (id.startsWith('catalogos/')) return Array.isArray(doc.items) ? null : 'catálogo sin items';
  return null;
}

/** Coherencia entre documentos: lo que impide mezclar cargas incompatibles. Devuelve el motivo o null. */
export function validarPaquete(documentos) {
  for (const r of REQUERIDOS) if (!(r in documentos)) return `falta ${r}`;
  for (const z of documentos['zonas.json'].zonas) {
    const clima = documentos[z.archivoClima];
    if (!clima) return `falta el clima de la zona ${z.id} (${z.archivoClima})`;
    if (clima.zona.id !== z.id) return `el clima ${z.archivoClima} es de la zona ${clima.zona.id}, no de ${z.id}`;
    if (clima.ubicacion?.lat !== z.punto.lat || clima.ubicacion?.lon !== z.punto.lon) return `el clima de ${z.id} no corresponde al punto de la zona`;
  }
  const reglas = documentos['reglas.json'];
  for (const plan of documentos['planes.json'].planes) {
    for (const ciclo of plan.ciclos) {
      for (const c of ciclo.cultivos || [ciclo]) {
        if (!reglas.cultivos[c.cultivo]) return `el plan ${plan.id} usa ${c.cultivo}, que no está en las reglas`;
      }
    }
  }
  return null;
}

async function descargar(manifiesto) {
  const documentos = {};
  let conHuella = true;
  await Promise.all(manifiesto.documents.map(async (d) => {
    const resp = await fetch(apiBase() + d.url, { credentials: 'omit' });
    if (!resp.ok) throw new Error(`${d.doc_id}: el servidor respondió ${resp.status}`);
    const buf = await resp.arrayBuffer();
    if (buf.byteLength !== d.bytes) throw new Error(`${d.doc_id}: llegaron ${buf.byteLength} bytes y se esperaban ${d.bytes}`);
    // crypto.subtle solo existe en contexto seguro (https o localhost). Si no está, queda la comprobación de tamaño.
    if (globalThis.crypto?.subtle) {
      const h = hex(await crypto.subtle.digest('SHA-256', buf));
      if (h !== d.sha256) throw new Error(`${d.doc_id}: la huella SHA-256 no coincide`);
    } else conHuella = false;
    const doc = JSON.parse(new TextDecoder('utf-8').decode(buf));
    const falla = validarDocumento(d.doc_id, doc);
    if (falla) throw new Error(`${d.doc_id}: ${falla}`);
    documentos[d.doc_id] = doc;
  }));
  const falla = validarPaquete(documentos);
  if (falla) throw new Error(`Paquete incoherente: ${falla}`);
  return {
    id: ID,
    version: manifiesto.bundle_version,
    descargadoEn: new Date().toISOString(),
    api: apiBase(),
    verificacion: conHuella ? 'sha256' : 'tamano',
    manifiesto: manifiesto.documents.map(({ doc_id, kind, format_version, sha256, bytes }) => ({ doc_id, kind, format_version, sha256, bytes })),
    documentos,
  };
}

async function actualizar(guardado) {
  estado.ultimoIntento = new Date().toISOString();
  let manifiesto;
  try {
    manifiesto = await pedir('/bundle', { limiteMs: 4000 });
  } catch (e) {
    estado.resultado = e.sinConexion ? 'sin_servidor' : 'error';
    estado.error = e.sinConexion ? null : `${e.codigo}: ${e.message}`;
    return null;
  }
  if (!manifiesto || !Array.isArray(manifiesto.documents) || !manifiesto.documents.length) {
    estado.resultado = 'servidor_sin_datos'; // la base está vacía: falta correr la carga de demo
    return null;
  }
  if (guardado && guardado.version === manifiesto.bundle_version) {
    estado.resultado = 'al_dia';
    return null;
  }
  try {
    const nuevo = await descargar(manifiesto);
    await db.guardar('contenido', nuevo); // una sola escritura: o queda el paquete entero o el anterior
    estado.resultado = 'actualizado';
    estado.error = null;
    return nuevo;
  } catch (e) {
    console.warn('[contenido] se conserva el paquete anterior:', e.message);
    estado.resultado = 'error';
    estado.error = String(e.message || e);
    return null;
  }
}

/**
 * Se llama al arrancar, ANTES de cargar catálogos, reglas o clima.
 * Aplica el paquete guardado y, si el servidor responde a tiempo con uno nuevo, lo aplica
 * también. Si la descarga tarda más que `limiteMs`, sigue en segundo plano y el paquete
 * nuevo se usa la próxima vez que se abra la app (así no cambian los datos a media sesión).
 */
export async function iniciar({ limiteMs = 7000 } = {}) {
  let guardado = null;
  try {
    guardado = (await db.todos('contenido')).find((r) => r.id === ID) || null;
    if (guardado && validarPaquete(guardado.documentos || {})) guardado = null; // copia vieja o dañada: no se usa
  } catch { guardado = null; }
  if (guardado) usarPaquete(guardado);
  const descarga = actualizar(guardado);
  const tarde = new Promise((resolve) => { setTimeout(() => resolve('tarde'), limiteMs); });
  const r = await Promise.race([descarga, tarde]);
  if (r === 'tarde') {
    descarga.then((nuevo) => { if (nuevo) estado.pendienteAlReabrir = nuevo.version; });
  } else if (r) {
    usarPaquete(r);
  }
  return estadoContenido();
}
