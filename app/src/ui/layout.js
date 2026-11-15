// Piezas de layout compartidas por las pantallas (fondo, cabeza, hojas, diálogos).
import { html, crudo, pintar, delegar } from '../shared/dom.js';
import { IMG } from '../shared/assets.js';
import { icono, greca } from '../shared/icons.js';

export function fondo(variante = '') {
  return html`<div class="fondo ${variante}" aria-hidden="true">
    <img class="fondo__foto" src="${IMG.fondo}" alt="">
    <div class="fondo__velo"></div><div class="fondo__arriba"></div><div class="fondo__abajo"></div>
  </div>`;
}

/**
 * Cabeza de vidrio con flecha de regreso.
 * atras: href (string) o { act } para manejar en la pantalla.
 */
export function cabeza({ titulo, sub = '', atras = '#/menu', etiquetaAtras = 'Volver al menú', extra = '' }) {
  const boton = typeof atras === 'string'
    ? html`<a class="btn-oscuro" href="${atras}" aria-label="${etiquetaAtras}">${icono('atras')}</a>`
    : html`<button class="btn-oscuro" data-act="${atras.act}" aria-label="${etiquetaAtras}">${icono('atras')}</button>`;
  return html`<header class="cabeza">
    ${boton}
    <div class="cabeza__textos"><span class="cabeza__titulo">${titulo}</span>${sub ? html`<span class="cabeza__sub">${sub}</span>` : ''}</div>
    ${extra}
    ${greca({ id: 'grecaCabeza' })}
  </header>`;
}

export function barraMenu() {
  return html`<a class="barra-menu" href="#/menu" aria-label="Abrir menú">
    <span class="barra-menu__ico">${icono('menu', { color: '#17686e' })}</span>
    <span class="barra-menu__txt">Menú</span>
    <span class="barra-menu__flecha">${icono('arriba', { tam: 18 })}</span>
  </a>`;
}

export function hero({ imagen, etiqueta, mano }) {
  return html`<div class="hero entra d1">
    <span class="hero__aro" aria-hidden="true"><span class="hero__circulo"><img src="${imagen}" alt=""></span></span>
    <div class="columna" style="gap:4px">
      <span class="hero__etiqueta">${etiqueta}</span>
      <span class="mano" style="font-size:25px">${mano}</span>
    </div>
  </div>`;
}

export function avisoOjo(titulo, texto) {
  return html`<div class="aviso-ojo" role="note">
    <span class="aviso-ojo__ico">${icono('alerta', { color: '#ffd27a' })}</span>
    <div class="columna" style="gap:4px"><strong>${titulo}</strong><p>${texto}</p></div>
  </div>`;
}

/**
 * Abre una hoja inferior dentro de la pantalla.
 * @param {HTMLElement} pantalla
 * @param {{titulo:string, cuerpo:Function|object, papel?:boolean, alMontar?:Function, etiqueta?:string}} op
 * cuerpo puede ser función (estado) => html para repintar con hoja.repintar().
 * @returns {{cerrar:Function, nodo:HTMLElement, repintar:Function}}
 */
export function abrirHoja(pantalla, { titulo, cuerpo, papel = false, alMontar, alCerrar, etiqueta }) {
  const velo = document.createElement('button');
  velo.className = 'velo';
  velo.setAttribute('aria-label', 'Cerrar');
  velo.tabIndex = -1;
  const nodo = document.createElement('div');
  nodo.className = `hoja${papel ? ' hoja--papel' : ''}`;
  nodo.setAttribute('role', 'dialog');
  nodo.setAttribute('aria-modal', 'true');
  nodo.setAttribute('aria-label', etiqueta || titulo);
  const anterior = document.activeElement;
  const cerrar = () => {
    velo.remove(); nodo.remove();
    document.removeEventListener('keydown', tecla);
    if (alCerrar) alCerrar();
    if (anterior && anterior.focus) anterior.focus({ preventScroll: true });
  };
  const tecla = (e) => { if (e.key === 'Escape') cerrar(); };
  const repintar = () => {
    const contenido = typeof cuerpo === 'function' ? cuerpo() : cuerpo;
    pintar(nodo, html`<span class="hoja__asa" aria-hidden="true"></span>
      <div class="fila"><h2 class="hoja__titulo crece">${titulo}</h2>
      <button class="btn-oscuro hoja__cerrar" data-act="cerrarHoja" aria-label="Cerrar" style="${papel ? 'background:rgba(122,40,64,.1);color:#7a2840;border:0' : ''}">${icono('cerrar', { tam: 18 })}</button></div>
      ${contenido}`);
  };
  velo.addEventListener('click', cerrar);
  nodo.addEventListener('click', (e) => { if (e.target.closest('[data-act="cerrarHoja"]')) cerrar(); });
  document.addEventListener('keydown', tecla);
  repintar();
  pantalla.append(velo, nodo);
  const primero = nodo.querySelector('input, select, textarea, button:not([data-act="cerrarHoja"])');
  if (primero) setTimeout(() => primero.focus({ preventScroll: true }), 60);
  const hoja = { cerrar, nodo, repintar };
  if (alMontar) alMontar(nodo, hoja);
  return hoja;
}

/** Diálogo de confirmación. Devuelve una promesa con true/false. */
export function confirmar(pantalla, { titulo, texto, si = 'Sí', no = 'Cancelar', peligro = false }) {
  return new Promise((resolve) => {
    const velo = document.createElement('button');
    velo.className = 'velo'; velo.tabIndex = -1; velo.setAttribute('aria-label', 'Cerrar');
    const d = document.createElement('div');
    d.className = 'dialogo'; d.setAttribute('role', 'alertdialog'); d.setAttribute('aria-modal', 'true');
    pintar(d, html`<h2 style="font-size:21px">${titulo}</h2><p style="color:#4d4234">${texto}</p>
      <div class="fila" style="justify-content:flex-end"><button class="btn btn--texto" style="color:#4d4234" data-r="0">${no}</button>
      <button class="btn ${peligro ? 'btn--guinda' : 'btn--primario'}" data-r="1">${si}</button></div>`);
    const fin = (v) => { velo.remove(); d.remove(); resolve(v); };
    velo.addEventListener('click', () => fin(false));
    d.addEventListener('click', (e) => { const b = e.target.closest('[data-r]'); if (b) fin(b.dataset.r === '1'); });
    pantalla.append(velo, d);
    d.querySelector('[data-r="1"]').focus();
  });
}

export { crudo, delegar };
