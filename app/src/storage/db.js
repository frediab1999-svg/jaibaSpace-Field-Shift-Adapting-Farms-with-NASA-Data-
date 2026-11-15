// Almacenamiento local (RNF offline-first): IndexedDB con respaldo en localStorage.
// Todo lo que captura el productor vive primero en su teléfono.

const NOMBRE_DB = 'jaibaspace-milpa';
// v2: agrega 'contenido' (el paquete de datos publicado por el servidor, completo, para usarlo sin conexión)
const VERSION = 2;
export const STORES = ['parcelas', 'temporadas', 'siembras', 'historial', 'cola', 'kv', 'contenido'];

let dbPromesa = null;
let modoRespaldo = false;

function abrir() {
  if (dbPromesa) return dbPromesa;
  dbPromesa = new Promise((resolve) => {
    if (!('indexedDB' in globalThis)) { modoRespaldo = true; resolve(null); return; }
    let req;
    try { req = indexedDB.open(NOMBRE_DB, VERSION); } catch (e) { modoRespaldo = true; resolve(null); return; }
    req.onupgradeneeded = () => {
      const db = req.result;
      for (const s of STORES) {
        if (!db.objectStoreNames.contains(s)) db.createObjectStore(s, { keyPath: s === 'kv' ? 'clave' : 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => { modoRespaldo = true; resolve(null); };
    req.onblocked = () => { modoRespaldo = true; resolve(null); };
  });
  return dbPromesa;
}

const claveLS = (store) => `${NOMBRE_DB}:${store}`;
function leerLS(store) {
  try { return JSON.parse(localStorage.getItem(claveLS(store)) || '[]'); } catch { return []; }
}
function escribirLS(store, lista) {
  try { localStorage.setItem(claveLS(store), JSON.stringify(lista)); } catch { /* sin espacio */ }
}

export async function todos(store) {
  const db = await abrir();
  if (!db) return leerLS(store);
  return new Promise((resolve) => {
    const tx = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => resolve([]);
  });
}

export async function guardar(store, registro) {
  const db = await abrir();
  if (!db) {
    const k = store === 'kv' ? 'clave' : 'id';
    const lista = leerLS(store).filter((r) => r[k] !== registro[k]);
    lista.push(registro);
    escribirLS(store, lista);
    return;
  }
  return new Promise((resolve) => {
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).put(registro);
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });
}

export async function borrar(store, id) {
  const db = await abrir();
  if (!db) {
    const k = store === 'kv' ? 'clave' : 'id';
    escribirLS(store, leerLS(store).filter((r) => r[k] !== id));
    return;
  }
  return new Promise((resolve) => {
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });
}

export async function vaciarTodo() {
  const db = await abrir();
  if (!db) { STORES.forEach((s) => localStorage.removeItem(claveLS(s))); return; }
  await Promise.all(STORES.map((s) => new Promise((resolve) => {
    const tx = db.transaction(s, 'readwrite');
    tx.objectStore(s).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  })));
}

export const usandoRespaldo = () => modoRespaldo;
