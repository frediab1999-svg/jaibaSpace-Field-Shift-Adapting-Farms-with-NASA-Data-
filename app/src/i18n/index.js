// Recursos de idioma (RF: español y maya). El maya está incompleto y marcado para
// validación con hablantes; mientras tanto se usa como acento junto al español.
import es from './es.js';
import myn from './myn.js';

const recursos = { es, myn };
let idioma = 'es';

export function usarIdioma(id) { if (recursos[id]) idioma = id; }
export const idiomaActual = () => idioma;

/** t('menu.semillas') → texto en el idioma activo, con respaldo en español. */
export function t(clave, vars = {}) {
  const buscar = (obj) => clave.split('.').reduce((o, k) => (o ? o[k] : undefined), obj);
  let texto = buscar(recursos[idioma]) ?? buscar(es) ?? clave;
  Object.entries(vars).forEach(([k, v]) => { texto = texto.replaceAll(`{${k}}`, v); });
  return texto;
}

/** Texto en maya si existe (para acentos bilingües). */
export const maya = (clave) => clave.split('.').reduce((o, k) => (o ? o[k] : undefined), myn) || null;
