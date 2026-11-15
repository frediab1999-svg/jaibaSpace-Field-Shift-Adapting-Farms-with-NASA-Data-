// MENÚ: acceso directo a tu tierra y los cuatro nodos unidos por la raíz (diseño Stitch adaptado).
import { html, pintar } from '../../shared/dom.js';
import { IMG, letrero } from '../../shared/assets.js';
import { icono } from '../../shared/icons.js';
import { t } from '../../i18n/index.js';
import { hayVoz, escuchar, interpretar, decir } from '../voz.js';
import { ir } from '../../app/router.js';
import * as repos from '../../storage/repos.js';
import { marcarEscucha } from '../voz.js';
import { diagnosticoDe } from '../../modules/parcel/tierra.js';

/** Acceso directo a lo principal: cómo está tu tierra y tu plan de 2 años. */
function tarjetaTierra(activa) {
  if (!activa) {
    return html`<a class="tierra-menu" href="#/parcelas/nueva">
      <span class="tierra-menu__ico" style="background:#d81159">${icono('mas', { color: '#fff', tam: 20, grosor: 2.4 })}</span>
      <span class="columna crece" style="gap:1px"><small>Empieza aquí</small><strong>Registra tu parcela</strong><span>Cuatro preguntas y te decimos qué le conviene a tu tierra.</span></span>
      ${icono('der', { color: '#8f2d56', tam: 18 })}
    </a>`;
  }
  const { estado } = diagnosticoDe(activa);
  return html`<a class="tierra-menu" href="#/diagnostico/${activa.id}" style="--c:${estado.color}">
    <img class="tierra-menu__letrero" src="${letrero(estado.letrero)}" alt="">
    <span class="columna crece" style="gap:1px"><small>${activa.nombre}${activa.esEjemplo ? ' (ejemplo)' : ''}</small><strong>${estado.id === 'sin_dato' ? 'Cuéntanos cómo está tu tierra' : `Tu tierra: ${estado.corto.toLowerCase()}`}</strong><span>Ver el diagnóstico y tu plan de 2 años</span></span>
    ${icono('der', { color: '#8f2d56', tam: 18 })}
  </a>`;
}

const NODOS = [
  { ruta: '#/semillas', img: 'semillas', etiqueta: 'Ixi\'im, maíz ancestral', nombre: () => t('menu.semillas'), color: '#218380', texto: '#1b6e6b' },
  { ruta: '#/parcelas', img: 'parcelas', etiqueta: 'Lu\'um, la tierra milpera', nombre: () => t('menu.parcelas'), color: '#d81159', texto: '#a30f45' },
  { ruta: '#/prediccion', img: 'prediccion', etiqueta: 'K\'iin, lo que viene', nombre: () => t('menu.prediccion'), color: '#8f2d56', texto: '#8f2d56' },
  { ruta: '#/informacion', img: 'informacion', etiqueta: 'Na\'at, lo que hemos vivido', nombre: () => t('menu.informacion'), color: '#218380', texto: '#8f2d56' },
];
const RAICES = [['#218380', '#d81159'], ['#d81159', '#8f2d56'], ['#8f2d56', '#218380']];

export function montar(pantalla) {
  const n = repos.parcelasActivas().length;
  const activa = repos.parcelasActivas().find((p) => p.id === repos.kv.get('parcelaActivaId')) || repos.parcelasActivas()[0] || null;

  pintar(pantalla, html`
    <div class="pantalla menu">
      <img class="menu__fondo" src="${IMG.fondo}" alt="" aria-hidden="true">
      <div class="menu__lavado" aria-hidden="true"></div>
      <nav class="menu__scroll" aria-label="Menú principal">
        ${tarjetaTierra(activa)}
        <h1 style="margin:12px 0 22px;font-size:34px;font-weight:800;letter-spacing:-.03em;line-height:1.05;color:#2c3338">Todo nace aquí.</h1>
        ${NODOS.map((nd, i) => html`
          <a class="nodo" href="${nd.ruta}">
            <span class="nodo__circulo"><img src="${IMG.nodos[nd.img]}" alt=""></span>
            <span class="nodo__flecha" style="background:${nd.color};box-shadow:0 8px 18px ${nd.color}73">${icono('flecha', { tam: 18, grosor: 2.4 })}</span>
            <span class="nodo__raicilla" aria-hidden="true" style="background:${nd.color}"></span>
            <span class="nodo__etiqueta" style="color:${nd.texto}">${nd.etiqueta}</span>
            <span class="nodo__nombre">${nd.nombre()}</span>
            ${nd.img === 'parcelas' ? html`<span style="font-size:13px;color:#4f5a60">${n ? `${n} ${n === 1 ? 'parcela registrada' : 'parcelas registradas'}` : 'Aún sin parcelas'}</span>` : ''}
          </a>
          ${i < RAICES.length ? html`<div class="raiz" aria-hidden="true">
            <span class="raiz__linea" style="background:linear-gradient(180deg, ${RAICES[i][0]}, ${RAICES[i][1]})"></span>
            <span class="raiz__punto" style="${i === 1 ? 'border-color:#d81159' : ''}"></span>
            ${i === 0 ? html`<span class="raiz__pista"><strong>Sigue la raíz, ch'i'ibal</strong><span>Desliza hacia abajo ↓</span></span>` : ''}
          </div>` : ''}
        `)}
        <span class="raiz__linea" aria-hidden="true" style="width:2px;height:34px;margin-top:8px;background:linear-gradient(180deg,#218380,rgba(33,131,128,0))"></span>
        <span style="margin-top:14px;font-size:11px;font-weight:600;letter-spacing:.22em;color:#8f2d56">K'IN TUUKUL</span>
      </nav>
      <header class="menu__cabeza">
        <div class="columna crece" style="gap:2px"><strong>Menú</strong><small>YUCATÁN</small></div>
        <a class="btn-claro" href="#/inicio" aria-label="Cerrar menú y volver al inicio">${icono('cerrar', { tam: 18, grosor: 2.4 })}</a>
      </header>
      <svg class="menu__franja" aria-hidden="true" viewBox="0 0 390 16" preserveAspectRatio="none"><defs><pattern id="grecaMenu" width="26" height="10" patternUnits="userSpaceOnUse"><path d="M0 9h5V2h10v4h-5M15 9h11" fill="none" stroke="#218380" stroke-width="1.6"/></pattern></defs><rect y="0" width="390" height="2" fill="#ffbc42" opacity=".85"/><rect y="3" width="390" height="10" fill="url(#grecaMenu)"/><rect y="14" width="390" height="2" fill="#d81159" opacity=".55"/></svg>
      <button class="mic-flota" data-act="voz" aria-label="Preguntar hablando">${icono('mic', { tam: 26 })}</button>
    </div>`);

  const boton = pantalla.querySelector('[data-act="voz"]');
  let detener = null;
  const alClick = () => {
    if (!hayVoz) { ir('#/inicio'); return; }
    if (detener) { detener(); return; }
    marcarEscucha(boton, true);
    detener = escuchar({
      alTexto: (txt) => { const d = interpretar(txt); if (d) { decir('Va.'); ir(d); } else decir('No te entendí.'); },
      alFin: () => { marcarEscucha(boton, false); detener = null; },
    });
  };
  boton.addEventListener('click', alClick);
  return () => boton.removeEventListener('click', alClick);
}
