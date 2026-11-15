// PREDICCIÓN DE LA TEMPORADA: lo más útil que se puede predecir con el clima de la NASA es
// CUÁNDO sembrar. Arriba, la mejor fecha para sembrar el maíz en el punto de la parcela (en
// cuántos años la sequía tocó la floración según la fecha). Abajo, como máximo tres señales:
// sequía y calor en la etapa delicada y cómo está la tierra. Lo demás, solo si tiene dato y plegado.
import { html, pintar, delegar } from '../../shared/dom.js';
import { IMG, letrero } from '../../shared/assets.js';
import { icono, subrayado } from '../../shared/icons.js';
import { fondo, cabeza, avisoOjo } from '../layout.js';
import { diagnosticoDe } from '../../modules/parcel/tierra.js';
import { enPalabras } from '../../motor/diagnostico.js';
import { textoOrigen } from '../../modules/climate/climaPunto.js';
import * as repos from '../../storage/repos.js';
import * as climaMod from '../../modules/climate/clima.js';
import * as parcelasMod from '../../modules/parcel/parcelas.js';
import { analizar, TIPO_TXT } from '../../motor/prediccion.js';
import * as reglasMod from '../../modules/strategies/reglas.js';
import { terreno } from '../componentes/terreno.js';
import { superficie, numero, fuenteLegible } from '../../shared/format.js';
import { t } from '../../i18n/index.js';

const NIVEL_TXT = { bien: 'Bien', atencion: 'Atención', riesgo: 'Riesgo', sin_dato: 'Sin dato' };
const NIVEL_SELLO = { bien: 'si', atencion: 'esp', riesgo: 'no', sin_dato: 'sin' };
const ICONO_IMG = { sol: 'sol', nube: 'nube', plaga: 'plaga', semilla: 'semilla', cosecha: 'cosecha' };

export async function montar(pantalla, params) {
  await Promise.all([climaMod.zonas(), reglasMod.reglas()]);
  const parcelas = repos.parcelasActivas();
  if (!params.id) return lista(pantalla, parcelas);
  return detalle(pantalla, params.id, parcelas);
}

function vacio() {
  return html`<div class="tarjeta vacio entra d3">
    <img src="${IMG.nodos.prediccion}" alt="" style="width:120px;height:120px;object-fit:contain">
    <h2 style="font-size:21px">Primero tu parcela</h2>
    <p>Para decirte cómo pinta la temporada necesitamos saber dónde está tu parcela y qué siembras.</p>
    <a class="btn btn--primario btn--bloque" href="#/parcelas/nueva">${icono('mas')}Agregar parcela</a>
    <a class="btn btn--texto" href="#/parcelas">Ver con parcelas de ejemplo</a>
  </div>`;
}

// ---------------------------------------------------------------------
function lista(pantalla, parcelas) {
  const niveles = new Map();
  let vivo = true;

  const tarjeta = (p, i) => {
    const r = niveles.get(p.id);
    const siembras = parcelasMod.siembrasActuales(p.id);
    return html`<a class="tarjeta tarjeta--boton pred-card entra d${Math.min(i + 3, 7)} ${i === 0 ? 'ancha' : ''}" href="#/prediccion/${p.id}" style="text-decoration:none" aria-label="${p.nombre}: ${r ? NIVEL_TXT[r.nivel] : 'calculando'}">
      <div class="pred-card__mini">${terreno(p, siembras, { ancho: i === 0 ? 220 : 120, mini: true, leyenda: false })}</div>
      <strong style="font-family:var(--f-titulo);font-size:17px;line-height:1.15">${p.nombre}</strong>
      <div class="fila fila--entre" style="gap:6px">
        <span class="tarjeta__sub" style="font-size:13px">${superficie(p.superficieM2, p.unidadCaptura)}</span>
        ${r ? html`<span class="sello sello--2 sello--${NIVEL_SELLO[r.nivel]}">${NIVEL_TXT[r.nivel]}</span>` : html`<span class="sello sello--sin">Calculando…</span>`}
      </div>
      ${r?.mejor ? html`<span class="tarjeta__sub" style="font-size:12.5px">Mejor fecha: ${r.mejor}</span>` : ''}
      <span class="tarjeta__sub" style="font-size:12.5px">Tierra: ${diagnosticoDe(p).estado.corto.toLowerCase()}</span>
    </a>`;
  };

  function pintarTodo() {
    pintar(pantalla, html`
      ${fondo()}
      <div class="scroll">
        <div class="hero entra d1">
          <span class="hero__aro" aria-hidden="true"><span class="hero__circulo"><img src="${IMG.nodos.prediccion}" alt=""></span></span>
          <div class="columna" style="gap:4px"><span class="hero__etiqueta">K'iin</span><span class="mano" style="font-size:25px">Lo que dice la milpa</span></div>
        </div>
        <div class="entra d2" style="padding:0 4px"><h1 class="titulo-grande">¿Cuándo me conviene sembrar?</h1>${subrayado(190)}
          <p class="texto-intro" style="margin-top:6px">Toca una parcela: te decimos qué fecha de siembra aguantó mejor la sequía en su punto, con 28 años de datos de la NASA.</p></div>
        ${parcelas.length ? html`
          <figure class="polaroid entra d2" style="width:300px;align-self:center"><img src="${IMG.fotos.campesino}" alt="Productor caminando a la milpa"><figcaption>Camino a la milpa, temprano</figcaption></figure>
          <div class="tarjetas-2">${parcelas.map(tarjeta)}</div>
          ${avisoOjo('Ojo: esto no es un pronóstico de cosecha', 'Son señales basadas en datos para ayudarte a decidir. No garantizan lo que vas a cosechar: la decisión sigue siendo tuya y de tu técnico.')}
        ` : vacio()}
      </div>
      ${cabeza({ titulo: t('menu.prediccion'), sub: `${parcelas.length} ${parcelas.length === 1 ? 'parcela' : 'parcelas'}` })}
    `);
  }
  pintarTodo();
  (async () => {
    for (const p of parcelas) {
      try { const a = await analizar(p); niveles.set(p.id, { ...a.resumen, mejor: a.fechas?.fechas.find((f) => f.esMejor)?.etiqueta || null }); } catch (e) { console.warn(e); }
      if (vivo) pintarTodo();
    }
  })();
  return () => { vivo = false; };
}

// ---------------------------------------------------------------------
function detalle(pantalla, id, parcelas) {
  const p = repos.parcelas.porId(id);
  if (!p) { location.hash = '#/prediccion'; return; }
  const idx = parcelas.findIndex((x) => x.id === id);
  const abiertas = new Set();
  let analisis = null;
  let vivo = true;

  const barras = (j) => {
    if (!j.barras?.length) return '';
    const max = Math.max(...j.barras.map((b) => b.valor), 1);
    return html`<div class="columna" style="gap:4px">
      <span class="fuente"><strong>${j.barrasTitulo}</strong></span>
      <div class="mini-barras" aria-hidden="true">${j.barras.map((b) => html`<i style="height:${Math.max(3, (b.valor / max) * 100)}%" data-marca="${b.marca ? 'true' : 'false'}" data-ultimo="${b.ultimo ? 'true' : 'false'}" title="${b.anio}: ${numero(b.valor, 0)}"></i>`)}</div>
      <div class="mini-barras__eje"><span>${j.barras[0].anio}</span><span>${j.barras[j.barras.length - 1].anio}</span></div>
    </div>`;
  };

  const variable = (v) => {
    const abierta = abiertas.has(v.id);
    const j = v.justificacion;
    return html`<div class="tarjeta acordeon variable" data-abierto="${abierta ? 'true' : 'false'}">
      <button class="acordeon__boton" data-act="variable" data-id="${v.id}" aria-expanded="${abierta ? 'true' : 'false'}" aria-controls="var-${v.id}">
        <img class="parche" src="${IMG.iconos[ICONO_IMG[v.icono]] || IMG.iconos.semilla}" alt="">
        <span class="columna crece" style="gap:6px">
          <span class="variable__nombre">${v.nombre}</span>
          <span class="variable__frase">${v.frase}</span>
          <span class="variable__dato"><span class="dato dato--${v.tipo}">${TIPO_TXT[v.tipo]}</span></span>
        </span>
        ${v.nivel === 'sin_dato' ? html`<span class="sello sello--sin">Sin dato</span>` : html`<img class="letrero letrero--chico" src="${letrero(v.nivel)}" alt="${NIVEL_TXT[v.nivel]}">`}
        ${icono('abajo', { clase: 'acordeon__flecha', tam: 20 })}
      </button>
      ${abierta ? html`<div class="acordeon__cuerpo justificacion" id="var-${v.id}">
        <hr class="linea-sep">
        ${j.parrafos.map((x) => html`<p style="color:var(--txt-2)">${x}</p>`)}
        ${j.lista?.length ? html`${j.tituloLista ? html`<span class="fuente"><strong>${j.tituloLista}</strong></span>` : ''}<ul>${j.lista.map((x) => html`<li>${x}</li>`)}</ul>` : ''}
        ${barras(j)}
        <span class="fuente"><strong>Fuente:</strong> ${fuenteLegible(j.fuente)}${j.periodo ? html`<br><strong>Periodo:</strong> ${j.periodo}` : ''}${j.n ? html`<br><strong>Con:</strong> ${j.n}` : ''}</span>
        ${(j.porConfirmar || []).map((x) => html`<span class="porconfirmar">Por confirmar: ${x}</span>`)}
      </div>` : ''}
    </div>`;
  };

  /** La mejor fecha para sembrar el maíz en el punto de la parcela, con una barra por fecha. */
  function mejorFecha(a) {
    const f = a.fechas;
    if (!f) return '';
    const mejor = f.fechas.find((x) => x.esMejor);
    const tuya = f.fechas.find((x) => x.esTuya);
    const total = mejor.aniosEvaluados;
    const lugar = a.origenClima === 'punto' ? 'en tu parcela' : 'en tu zona';
    return html`<section class="tarjeta columna fecha-card entra d2" style="gap:12px">
      <span class="hero__etiqueta">Mejor fecha para sembrar maíz</span>
      <p class="fecha-card__titular"><b>${mejor.etiqueta}</b></p>
      <p class="fecha-card__frase">Sembrando ese día, la sequía tocó la floración ${lugar} en <strong>${mejor.aniosConRacha} de ${total} años</strong> (${enPalabras(mejor.aniosConRacha, total)}).${tuya && !tuya.esMejor ? html` Con tu fecha (${tuya.etiqueta}${f.tuFechaDeMes ? ', a mitad del mes' : ''}), en <strong>${tuya.aniosConRacha} de ${tuya.aniosEvaluados}</strong>.` : tuya ? ' Es tu misma fecha: vas bien.' : ''}</p>
      <div class="fechas-barras" role="list" aria-label="Años con sequía en la floración, según la fecha de siembra">
        ${f.fechas.map((x) => html`<div class="fechas-barras__fila" role="listitem" data-mejor="${x.esMejor ? 'true' : 'false'}" data-tuya="${x.esTuya ? 'true' : 'false'}">
          <span class="fechas-barras__etq">${x.etiqueta}${x.esTuya ? html` <small>tu fecha</small>` : ''}</span>
          <span class="fechas-barras__pista" aria-hidden="true"><i style="width:${Math.round((x.aniosConRacha / x.aniosEvaluados) * 100)}%"></i></span>
          <span class="fechas-barras__num">${x.aniosConRacha}/${x.aniosEvaluados}</span>
        </div>`)}
      </div>
      <span class="fuente">Años en que hubo ${reglasMod.reglasSync().rachaRelevanteDias} días seguidos o más sin lluvia durante la floración y el llenado del grano (días ${f.etapa.desdeDia} a ${f.etapa.hastaDia} después de sembrar), con ${total} años de NASA POWER. Solo fechas dentro de la ventana de siembra de temporal (hasta el 15 de julio).</span>
    </section>`;
  }

  function pintarTodo() {
    const a = analisis;
    pintar(pantalla, html`
      ${fondo()}
      <div class="scroll" id="scrollPred">
        <div class="fila entra d1" style="gap:10px">
          <a class="flecha-nav" href="#/prediccion/${parcelas[idx - 1]?.id || ''}" aria-label="Parcela anterior" ${idx <= 0 ? html`aria-disabled="true" tabindex="-1" style="opacity:.35;pointer-events:none"` : ''}>${icono('izq', { tam: 18 })}</a>
          <div class="puntos-nav" aria-hidden="true">${parcelas.map((x) => html`<span data-activo="${x.id === id ? 'true' : 'false'}"></span>`)}</div>
          <a class="flecha-nav" href="#/prediccion/${parcelas[idx + 1]?.id || ''}" aria-label="Parcela siguiente" ${idx >= parcelas.length - 1 ? html`aria-disabled="true" tabindex="-1" style="opacity:.35;pointer-events:none"` : ''}>${icono('der', { tam: 18 })}</a>
        </div>
        ${!a ? html`<div class="tarjeta vacio"><p>Revisando el clima de 28 años y tu historial…</p></div>` : a.sinClima ? html`<div class="tarjeta columna" style="gap:10px">
            <strong class="tarjeta__titulo">Falta saber dónde está ${p.nombre}</strong>
            <p style="color:var(--txt-2)">Con su ubicación traemos el clima de su punto (NASA) y te decimos qué fecha de siembra aguantó mejor la sequía.</p>
            <a class="btn btn--primario btn--chico" href="#/parcelas/${p.id}/editar">${icono('pin', { tam: 18 })}Marcar la ubicación</a></div>` : html`
          ${mejorFecha(a)}
          <div class="seccion"><span class="seccion__titulo">Lo que conviene vigilar</span><span class="seccion__nota">Toca para ver por qué</span></div>
          <div class="columna" style="gap:10px">${a.variables.map(variable)}</div>
          ${a.extras.length ? html`<details class="mas-senales"><summary>Más datos de ${p.nombre} (${a.extras.length})</summary><div class="columna" style="gap:10px;margin-top:10px">${a.extras.map(variable)}</div></details>` : ''}
          <a class="tarjeta tarjeta--boton fila tarjeta--opciones" href="#/opciones/${p.id}" style="text-decoration:none;gap:12px">
            <img class="parche" src="${IMG.nodos.semillas}" alt="">
            <div class="columna crece" style="gap:2px"><strong class="tarjeta__titulo">Tu plan de 2 años</strong><span class="tarjeta__sub">Qué sembrar para que la tierra de ${p.nombre} no se siga cansando</span></div>
            ${icono('der', { color: '#f2cf7a' })}
          </a>
          ${a.resumen.peor && a.resumen.peor.nivel !== 'bien' ? html`<div class="nota-papel">
            <span class="mano">Para platicar con tu técnico</span>
            <p style="margin-top:6px;font-size:15px;line-height:1.5">Lo que más pesa en ${p.nombre} es <strong>${a.resumen.peor.nombre.toLowerCase()}</strong>. Antes de decidir qué y cuándo sembrar, revisa esa señal con alguien de confianza.</p>
          </div>` : ''}
          ${avisoOjo('Ojo: viene de lo que pasó otros años', 'El próximo año puede ser distinto. Úsalo para decidir con tu técnico, no como pronóstico.')}
          <span class="fuente" style="padding:0 4px">${textoOrigen(a.origenClima, a.zona)} Calculado el ${new Date(a.generadoEn).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}.</span>
        `}
      </div>
      ${cabeza({ titulo: p.nombre, sub: `${superficie(p.superficieM2, p.unidadCaptura)}${p.municipioNombre ? `, ${p.municipioNombre}` : ''}`, atras: '#/prediccion', etiquetaAtras: 'Volver a la lista de parcelas',
      })}
    `);
  }

  const quitar = delegar(pantalla, 'click', {
    variable: (el) => {
      const vid = el.dataset.id;
      if (abiertas.has(vid)) abiertas.delete(vid); else abiertas.add(vid);
      const sc = pantalla.querySelector('#scrollPred');
      const y = sc.scrollTop;
      pintarTodo();
      const sc2 = pantalla.querySelector('#scrollPred');
      sc2.scrollTop = y;
      sc2.querySelector(`[data-act="variable"][data-id="${vid}"]`)?.focus({ preventScroll: true });
    },
  });
  pintarTodo();
  analizar(p).then((a) => { analisis = a; if (vivo) pintarTodo(); }).catch((e) => {
    console.error(e);
    if (vivo) pintar(pantalla.querySelector('#scrollPred'), html`<div class="tarjeta" style="margin-top:20px"><p>No pudimos calcular: ${e.message}</p></div>`);
  });
  return () => { vivo = false; quitar(); };
}

