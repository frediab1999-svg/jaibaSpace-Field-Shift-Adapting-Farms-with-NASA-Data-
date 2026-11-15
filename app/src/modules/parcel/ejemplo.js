// Carga y quita el perfil y las parcelas de DEMOSTRACIÓN (ficticios, sin credenciales).
// Origen, en este orden:
//  1) GET /api/v1/demo: el perfil y las parcelas que el servidor tiene en su base (python -m app.seed).
//  2) La última respuesta del servidor guardada en el teléfono (para abrir la demo sin conexión).
//  3) La copia incluida en la app (app/fixtures/ejemplo-milpa.json), que es la misma que carga el servidor.
import * as repos from '../../storage/repos.js';
import * as catalogo from '../crops/catalogo.js';
import * as api from '../../services/api/endpoints.js';
import { derivar } from './parcelas.js';
import { analizar, instantanea } from '../../motor/prediccion.js';

const URL_EJEMPLO = new URL('../../../fixtures/ejemplo-milpa.json', import.meta.url).href;
const CLAVE_GUARDADA = 'demoServidor';

export const hayEjemplo = () => repos.parcelas.todos().some((p) => p.esEjemplo);
/** De dónde salió la demo cargada: 'servidor' | 'servidor_guardado' | 'local' | null. */
export const origenDemo = () => repos.kv.get('demoOrigen', null);

const esDemoValida = (d) => !!d && Array.isArray(d.parcelas) && d.parcelas.length > 0 && Array.isArray(d.temporadas) && Array.isArray(d.siembras);

/** Pide la demo al servidor y la guarda para poder usarla sin conexión. No lanza errores. */
export async function precargarDemo() {
  try {
    const d = await api.demo();
    if (!esDemoValida(d)) return null;
    repos.kv.set(CLAVE_GUARDADA, { datos: d, obtenidoEn: new Date().toISOString() });
    return d;
  } catch { return null; }
}

async function datosDemo() {
  const delServidor = await precargarDemo();
  if (delServidor) return { datos: delServidor, origen: 'servidor' };
  const guardada = repos.kv.get(CLAVE_GUARDADA, null);
  if (esDemoValida(guardada?.datos)) return { datos: guardada.datos, origen: 'servidor_guardado' };
  return { datos: await (await fetch(URL_EJEMPLO)).json(), origen: 'local' };
}

export async function cargarEjemplo() {
  const { datos, origen } = await datosDemo();
  repos.kv.set('demoOrigen', { origen, perfil: datos.perfil || null, cargadoEn: new Date().toISOString() });
  const ahora = new Date().toISOString();
  for (const p of datos.parcelas) {
    repos.parcelas.guardar(derivar({ ...p, esEjemplo: true, actualizadoEn: p.creadoEn, eliminadaEn: null, motivoEliminacion: null }));
  }
  for (const t of datos.temporadas) {
    repos.temporadas.guardar({
      nombre: `Temporada ${t.anio}`, causa: null, causaNota: null, fechaCosecha: null, observaciones: null,
      prediccion: null, envios: {}, ...t, cosechas: datos.cosechas[t.id] || {}, esEjemplo: true, actualizadoEn: t.creadoEn,
    });
  }
  for (const s of datos.siembras) {
    const sem = catalogo.semilla(s.semillaId);
    repos.siembras.guardar({
      cultivoId: sem?.cultivoId, variedadId: sem?.variedadId || null, observaciones: null, eliminadaEn: null, motivo: null,
      ...s, creadoEn: ahora,
    });
  }
  for (const h of datos.historial) {
    const p = datos.parcelas.find((x) => x.id === h.parcelaId);
    repos.historial.guardar({ motivoId: null, motivoTexto: null, nota: null, ...h, parcelaNombre: p?.nombre || '', esEjemplo: true });
  }
  if (!repos.kv.get('usuario')) repos.kv.set('usuario', { nombreVisible: datos.usuario.nombreVisible });
  if (!repos.kv.get('parcelaActivaId')) repos.kv.set('parcelaActivaId', datos.parcelas[0].id);
  // "Lo que decía la predicción" al iniciar las temporadas en curso
  for (const t of repos.temporadas.donde((x) => x.esEjemplo && x.estado === 'en_curso')) {
    const p = repos.parcelas.porId(t.parcelaId);
    try {
      const a = await analizar(p);
      repos.temporadas.guardar({ ...repos.temporadas.porId(t.id), prediccion: { ...instantanea(a), fecha: t.creadoEn } });
    } catch (e) { console.warn('No se pudo calcular la predicción de ejemplo', e); }
  }
}

export function quitarEjemplo() {
  const ids = new Set(repos.parcelas.todos().filter((p) => p.esEjemplo).map((p) => p.id));
  repos.siembras.todos().filter((s) => ids.has(s.parcelaId)).forEach((s) => repos.siembras.borrar(s.id));
  repos.temporadas.todos().filter((t) => ids.has(t.parcelaId)).forEach((t) => repos.temporadas.borrar(t.id));
  repos.historial.todos().filter((h) => ids.has(h.parcelaId)).forEach((h) => repos.historial.borrar(h.id));
  ids.forEach((id) => repos.parcelas.borrar(id));
  const activa = repos.kv.get('parcelaActivaId');
  if (ids.has(activa)) repos.kv.set('parcelaActivaId', repos.parcelasActivas()[0]?.id || null);
}
