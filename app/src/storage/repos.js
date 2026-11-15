// Repositorios locales con caché en memoria (lecturas síncronas, escrituras a IndexedDB).
// Las entidades siguen el modelo entidad-relación de docs/diagramas y el contrato
// propuesto en shared/schemas.
import * as db from './db.js';

const cache = { parcelas: [], temporadas: [], siembras: [], historial: [], cola: [], kv: {} };
const oyentes = new Set();

export async function cargar() {
  const [parcelas, temporadas, siembras, historial, cola, kv] = await Promise.all(
    ['parcelas', 'temporadas', 'siembras', 'historial', 'cola', 'kv'].map((s) => db.todos(s)),
  );
  Object.assign(cache, { parcelas, temporadas, siembras, historial, cola });
  cache.kv = Object.fromEntries(kv.map((r) => [r.clave, r.valor]));
}

export function alCambiar(fn) { oyentes.add(fn); return () => oyentes.delete(fn); }
function avisar(que) { oyentes.forEach((fn) => { try { fn(que); } catch (e) { console.error(e); } }); }

function coleccion(store) {
  return {
    todos: () => cache[store].slice(),
    porId: (id) => cache[store].find((r) => r.id === id) || null,
    donde: (fn) => cache[store].filter(fn),
    guardar(registro) {
      const i = cache[store].findIndex((r) => r.id === registro.id);
      if (i >= 0) cache[store][i] = registro; else cache[store].push(registro);
      db.guardar(store, registro);
      avisar(store);
      return registro;
    },
    borrar(id) {
      cache[store] = cache[store].filter((r) => r.id !== id);
      db.borrar(store, id);
      avisar(store);
    },
  };
}

export const parcelas = coleccion('parcelas');
export const temporadas = coleccion('temporadas');
export const siembras = coleccion('siembras');
export const historial = coleccion('historial');
export const cola = coleccion('cola');

export const kv = {
  get: (clave, porDefecto = null) => (clave in cache.kv ? cache.kv[clave] : porDefecto),
  set(clave, valor) {
    cache.kv[clave] = valor;
    db.guardar('kv', { clave, valor });
    avisar('kv');
  },
};

export async function borrarTodo() {
  await db.vaciarTodo();
  Object.assign(cache, { parcelas: [], temporadas: [], siembras: [], historial: [], cola: [], kv: {} });
  avisar('todo');
}

// ---- Consultas de conveniencia ----
export const parcelasActivas = () => cache.parcelas.filter((p) => !p.eliminadaEn).sort((a, b) => a.creadoEn.localeCompare(b.creadoEn));
export const temporadasDe = (parcelaId) => cache.temporadas.filter((t) => t.parcelaId === parcelaId);
export const temporadaEnCurso = (parcelaId) => cache.temporadas.find((t) => t.parcelaId === parcelaId && (t.estado === 'en_curso' || t.estado === 'planeada')) || null;
export const siembrasDe = (temporadaId, { incluirEliminadas = false } = {}) =>
  cache.siembras.filter((s) => s.temporadaId === temporadaId && (incluirEliminadas || !s.eliminadaEn));
export const historialDe = (parcelaId) => cache.historial.filter((h) => !parcelaId || h.parcelaId === parcelaId).sort((a, b) => b.fecha.localeCompare(a.fecha));
