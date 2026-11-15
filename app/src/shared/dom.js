// Utilidades mínimas de DOM, sin framework.

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** Escapa texto para insertarlo en HTML. */
export function esc(valor) {
  if (valor === null || valor === undefined) return '';
  return String(valor).replace(/[&<>"']/g, (c) => ESCAPES[c]);
}

/** Marca un fragmento como HTML seguro (ya escapado). */
export class Seguro {
  constructor(html) { this.html = html; }
  toString() { return this.html; }
}
export const crudo = (html) => new Seguro(html);

/**
 * Plantilla etiquetada: escapa cada valor salvo los marcados con crudo()
 * o los arreglos de fragmentos seguros.
 */
export function html(partes, ...valores) {
  let salida = '';
  partes.forEach((parte, i) => {
    salida += parte;
    if (i < valores.length) salida += aTexto(valores[i]);
  });
  return new Seguro(salida);
}
function aTexto(v) {
  if (v instanceof Seguro) return v.html;
  if (Array.isArray(v)) return v.map(aTexto).join('');
  if (v === false || v === null || v === undefined) return '';
  return esc(v);
}

export const $ = (sel, raiz = document) => raiz.querySelector(sel);
export const $$ = (sel, raiz = document) => Array.from(raiz.querySelectorAll(sel));

/** Reemplaza el contenido de un nodo con HTML seguro. */
export function pintar(nodo, contenido) {
  if (!nodo) return;
  nodo.innerHTML = aTexto(contenido);
}

/**
 * Delegación de eventos: escucha `tipo` en `raiz` y llama al manejador
 * cuyo nombre está en data-act del elemento más cercano.
 */
export function delegar(raiz, tipo, manejadores) {
  const fn = (ev) => {
    const el = ev.target.closest('[data-act]');
    if (!el || !raiz.contains(el)) return;
    const nombre = el.dataset.act;
    const h = manejadores[nombre];
    if (h) h(el, ev);
  };
  raiz.addEventListener(tipo, fn);
  return () => raiz.removeEventListener(tipo, fn);
}

/** Atributo aria-pressed listo para la plantilla. */
export const presionado = (cond) => (cond ? 'true' : 'false');
