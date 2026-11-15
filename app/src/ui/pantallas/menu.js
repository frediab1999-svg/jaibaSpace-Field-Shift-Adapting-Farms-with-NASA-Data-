// MENÚ: los cuatro nodos unidos por la raíz (diseño Stitch adaptado).
import { html, pintar } from '../../shared/dom.js';
import { IMG } from '../../shared/assets.js';
import { icono } from '../../shared/icons.js';
import * as catalogo from '../../modules/crops/catalogo.js';
import { t } from '../../i18n/index.js';
import { hayVoz, escuchar, interpretar, decir } from '../voz.js';
import { ir } from '../../app/router.js';
import * as repos from '../../storage/repos.js';
import * as climaMod from '../../modules/climate/clima.js';
import * as reglasMod from '../../modules/strategies/reglas.js';
import { estacionDelAnio } from '../../motor/climaDia.js';
import { MESES, MESES_CORTOS, hoy } from '../../shared/format.js';
import { marcarEscucha } from '../voz.js';

// Color de cada temporada en la franja del año (con texto siempre: el color no es la única pista)
const COLOR_TEMPORADA = { nortes: '#3d7ea6', secas: '#d9902a', lluvias: '#218380' };

/**
 * Temporada actual como lugar en el año: franja de 12 meses, el mes de hoy marcado, cuánto falta
 * y qué sigue. El dato de clima solo aparece con una parcela con zona (NASA POWER de esa zona).
 */
function estacion(temporadas, mes, anio) {
  const e = estacionDelAnio(temporadas, mes);
  if (!e) return '';
  const color = (t) => COLOR_TEMPORADA[t?.id] || '#8f2d56';
  const faltan = e.mesesRestantes === 0 ? 'Último mes' : `Faltan ${e.mesesRestantes} ${e.mesesRestantes === 1 ? 'mes' : 'meses'}`;
  return html`<a class="estacion" href="#/inicio?cal=${anio}-${String(mes).padStart(2, '0')}" aria-label="${e.actual.name}, mes ${e.posicion} de ${e.duracion}. ${faltan}. Abrir el calendario.">
    <span class="estacion__cabeza">
      <span class="estacion__ico" style="background:${color(e.actual)}">${icono('nube', { color: '#fff', tam: 18, grosor: 2 })}</span>
      <span class="estacion__titulo"><small>Ahora, ${MESES[mes - 1]}</small><strong>${e.actual.name}</strong></span>
      <span class="estacion__paso">Mes ${e.posicion} de ${e.duracion}</span>
    </span>
    <span class="estacion__anio" aria-hidden="true">
      ${MESES_CORTOS.map((m, i) => {
        const t = temporadas.find((x) => x.meses.includes(i + 1));
        return html`<span class="estacion__mes" data-hoy="${i + 1 === mes ? 'true' : 'false'}" style="--c:${color(t)}"><i></i><b>${m.slice(0, 1).toUpperCase()}</b></span>`;
      })}
    </span>
    <span class="estacion__leyenda" aria-hidden="true">${temporadas.map((t) => html`<span><i style="background:${color(t)}"></i>${((n) => n.charAt(0).toUpperCase() + n.slice(1))(t.name.replace(/^Temporada de /i, ''))}</span>`)}</span>
    <span class="estacion__pie">${faltan}${e.siguiente && e.siguiente.id !== e.actual.id ? `. Después: ${e.siguiente.name.toLowerCase()} (${e.siguiente.rango}).` : '.'}</span>
    <span class="estacion__dato" id="estacionDato"></span>
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
  const mes = hoy().getMonth() + 1;
  const temporadas = catalogo.listas().temporadasDelAnio || [];
  const n = repos.parcelasActivas().length;
  const activa = repos.parcelasActivas().find((p) => p.id === repos.kv.get('parcelaActivaId')) || repos.parcelasActivas()[0] || null;

  pintar(pantalla, html`
    <div class="pantalla menu">
      <img class="menu__fondo" src="${IMG.fondo}" alt="" aria-hidden="true">
      <div class="menu__lavado" aria-hidden="true"></div>
      <nav class="menu__scroll" aria-label="Menú principal">
        ${estacion(temporadas, mes, hoy().getFullYear())}
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

  // Dato de la zona de la parcela (si tiene): cuántos años tuvo racha seca este mes, con NASA POWER.
  (async () => {
    const caja = pantalla.querySelector('#estacionDato');
    if (!caja) return;
    const zona = climaMod.zonaPorId(activa?.zonaId);
    if (!zona) {
      pintar(caja, html`${icono('pin', { color: '#7a2840', tam: 16 })}<span>${activa ? `Completa la ubicación de ${activa.nombre} para ver cómo suele ser ${MESES[mes - 1]} en su zona.` : `Agrega tu parcela para ver cómo suele ser ${MESES[mes - 1]} en tu zona.`}</span>`);
      return;
    }
    try {
      const [c] = await Promise.all([climaMod.clima(zona.id), reglasMod.reglas()]);
      const reglas = reglasMod.reglasSync();
      const f = climaMod.frecuenciaMensual(c, mes, { umbralRacha: reglas.rachaRelevanteDias, minCalor: reglas.episodioCalorRelevanteDias });
      pintar(caja, html`${icono('lluvia', { color: '#7a2840', tam: 16 })}<span>En ${climaMod.NOMBRE_CORTO_ZONA[zona.id]}, <strong>${f.rachas} de ${f.total} años</strong> tuvieron en ${MESES[mes - 1]} al menos ${reglas.rachaRelevanteDias} días seguidos sin lluvia. <small>NASA POWER, ${c.temporadas.find((t) => t.completa)?.anio}–${climaMod.ultimoAnioCompleto(c)}.</small></span>`);
    } catch { caja.remove(); }
  })();

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
