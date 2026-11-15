// TU PLAN DE 2 AÑOS («Opciones para tu parcela»). Compara SIEMPRE tres estrategias para los
// próximos dos ciclos, incluida la actual (requisito del reto):
//   a) lo que el productor hace hoy (o, en tierra nueva, lo que se hace normalmente: maíz cada año),
//   b) maíz con canavalia intercalada en el mismo ciclo,
//   c) un ciclo de canavalia de cobertura y después maíz.
// El diagnóstico de la tierra (motor/diagnostico.js) decide el orden y cuál lleva el sello
// «Sugerida para tu tierra». Cada tarjeta dice, a la vista: por qué está, qué dicen los datos,
// qué gana la tierra, qué falta saber y qué revisar con un técnico. Lo técnico va plegado.
// Los números los calcula el motor en el teléfono. La app sugiere; el productor decide.
// Rutas: #/opciones (elegir parcela) · #/opciones/:id
import { html, pintar, delegar, presionado } from '../../shared/dom.js';
import { IMG, letrero } from '../../shared/assets.js';
import { icono, subrayado } from '../../shared/icons.js';
import { fondo, cabeza } from '../layout.js';
import * as repos from '../../storage/repos.js';
import * as catalogo from '../../modules/crops/catalogo.js';
import * as climaMod from '../../modules/climate/clima.js';
import { textoOrigen } from '../../modules/climate/climaPunto.js';
import { fraseRazones } from '../../motor/diagnostico.js';
import * as reglasMod from '../../modules/strategies/reglas.js';
import { registrarEvento } from '../../modules/harvests/temporadas.js';
import { franja24 } from '../componentes/franja24.js';
import { opcionesPara } from './opciones-datos.js';
import { decir, callar, hayHabla } from '../voz.js';
import { superficie, numero, MESES, MESES_CORTOS, fuenteLegible } from '../../shared/format.js';
import { avisar } from '../../app/estado.js';
import { ir } from '../../app/router.js';

// Textos en palabras de todos los días. Los números y la evidencia vienen del motor.
const TEXTOS = {
  actual: {
    titulo: 'Lo que haces hoy',
    queEs: 'Lo que registraste en tu parcela, repetido en los dos ciclos.',
    gana: 'Es la práctica que ya conoces',
    cuesta: 'Entre una cosecha y la siguiente siembra no hay cultivo en pie',
  },
  normal: {
    titulo: 'Lo que se hace normalmente',
    queEs: 'Tumbar, quemar y sembrar maíz cada año en el mismo terreno. Sirve para comparar.',
    gana: 'Dos cosechas de maíz en los dos ciclos',
    cuesta: 'La tierra queda descubierta entre una cosecha y la siguiente siembra y, año tras año, se cansa',
  },
  plantilla: {
    titulo: 'Maíz cada año (ejemplo)',
    queEs: 'No tenemos registrado lo que siembras hoy. Esta plantilla es maíz de milpa sembrado cada año.',
    gana: 'Dos cosechas de maíz en los dos ciclos',
    cuesta: 'Entre una cosecha y la siguiente siembra no hay cultivo en pie',
  },
  'milpa-canavalia': {
    titulo: 'Maíz con canavalia entre los surcos',
    queEs: 'Siembras tu maíz y, unos 30 días después, canavalia entre los surcos, en el mismo ciclo. En este escenario la cortas cuando empieza a florecer.',
    gana: 'El plan conserva tu ciclo de maíz y suma una leguminosa de cobertura',
    cuesta: 'La canavalia puede competir con el maíz',
    alOido: 'Las fechas de la canavalia son ilustrativas: confírmalas con tu técnico. Su semilla no se come sin tratarla.',
  },
  cobertura: {
    titulo: 'Un ciclo de canavalia, luego maíz',
    queEs: 'Un ciclo siembras solo canavalia de cobertura y la cortas cuando empieza a florecer. Al siguiente ciclo vuelves al maíz.',
    gana: 'Un ciclo completo con una leguminosa de cobertura en el terreno',
    cuesta: 'Renuncias a cosechar maíz en ese ciclo',
    alOido: 'Ojo: la semilla de canavalia no se come ni se da a los animales sin tratarla.',
  },
  'otro-grano': {
    titulo: 'Soya un ciclo, luego maíz',
    queEs: 'Un ciclo siembras soya y al siguiente vuelves al maíz. El paquete del INIFAP es mecanizado y para suelo rojo y profundo.',
    gana: 'Cosechas otro grano en el primer ciclo',
    cuesta: 'Necesita maquinaria, comprador y suelo profundo',
    alOido: 'Nunca desmontes monte para sembrarla.',
  },
};
export const textos = (e, nueva = false) => (e.esActual && nueva ? TEXTOS.normal : e.esPlantilla ? TEXTOS.plantilla : TEXTOS[e.id]) || { titulo: e.nombre, queEs: '', gana: '', cuesta: '' };

const MOTIVO = {
  sin_reglas: 'no hay reglas de etapas para este cultivo',
  sin_etapa_sensible: 'no tiene una etapa sensible documentada',
  sin_anios_evaluables: 'no hay años con datos completos para esa etapa',
  sin_clima: 'la parcela todavía no tiene zona de clima',
};
const ESTADO_TXT = {
  verificado_fuente: 'Publicado por una fuente',
  calculado: 'Calculado',
  simulado_demo: 'Supuesto de la demo',
  decision_modelo: 'Regla del modelo',
  pendiente_validacion_campo: 'Falta validarlo en campo',
  registrado_productor: 'Registrado por ti',
};
const pct = (p) => `${numero(p * 100, 1)} %`;
const mesAnio = (aaaamm) => { const [a, m] = aaaamm.split('-').map(Number); return `${MESES[m - 1]} de ${a}`; };
const mesAnioCorto = (aaaamm) => { const [a, m] = aaaamm.split('-').map(Number); return `${MESES_CORTOS[m - 1]} ${a}`; };

export async function montar(pantalla, params) {
  await Promise.all([reglasMod.reglas(), reglasMod.planes(), climaMod.zonas()]);
  if (!params.id) return elegirParcela(pantalla);
  return opciones(pantalla, params.id);
}

// =====================================================================
// SIN PARCELA: elegir para cuál
// =====================================================================
function elegirParcela(pantalla) {
  const lista = repos.parcelasActivas();
  if (lista.length === 1) { location.replace(`#/opciones/${lista[0].id}`); return null; }
  pintar(pantalla, html`
    ${fondo()}
    <div class="scroll">
      <div class="entra d1" style="padding:0 4px"><span class="hero__etiqueta">Próximos dos ciclos</span>
        <h1 class="titulo-grande">¿Para qué parcela?</h1>${subrayado(180)}
        <p class="texto-intro" style="margin-top:6px">Elige la parcela y te mostramos tres formas de sembrarla los próximos dos años.</p></div>
      ${lista.length ? lista.map((p, i) => {
        const suelo = catalogo.suelos().find((s) => s.id === p.tipoSueloId);
        return html`<a class="tarjeta tarjeta--boton fila entra d${Math.min(i + 2, 7)}" href="#/opciones/${p.id}" style="text-decoration:none;gap:12px">
          <img class="parche" src="${IMG.nodos.parcelas}" alt="">
          <span class="columna crece" style="gap:2px"><strong class="tarjeta__titulo">${p.nombre}</strong>
          <span class="tarjeta__sub">${superficie(p.superficieM2, p.unidadCaptura)}${suelo ? `, ${suelo.name}` : ''}</span></span>
          ${p.esEjemplo ? html`<span class="sello sello--ejemplo">Demostración</span>` : ''}
          ${icono('der', { color: '#f2cf7a' })}
        </a>`;
      }) : html`<div class="tarjeta vacio entra d2">
        <img src="${IMG.nodos.parcelas}" alt="" style="width:110px;height:110px;object-fit:contain">
        <h2 style="font-size:21px">Primero tu parcela</h2>
        <p>Para comparar opciones necesitamos saber dónde está y qué siembras.</p>
        <a class="btn btn--primario btn--bloque" href="#/parcelas/nueva">${icono('mas')}Agregar parcela</a>
      </div>`}
    </div>
    ${cabeza({ titulo: 'Tu plan de 2 años', sub: '¿Qué siembro el próximo ciclo?' })}
  `);
  return null;
}

// =====================================================================
// PLAN DE 2 AÑOS DE UNA PARCELA
// =====================================================================
function opciones(pantalla, id) {
  const p0 = repos.parcelas.porId(id);
  if (!p0 || p0.eliminadaEn) { location.replace('#/opciones'); return null; }
  // Si ya había un plan guardado, se vuelve a abrir con la misma fecha de siembra del escenario
  const estado = { siembra: p0.estrategiaElegida?.siembraEscenario || null, r: null, error: null, abiertas: new Set(), hablando: null };
  let vivo = true;
  let detenerVoz = null;

  const parcela = () => repos.parcelas.porId(id);
  const todas = () => (estado.r ? [...estado.r.principales, ...estado.r.secundarias] : []);
  const buscar = (eid) => todas().find((x) => x.id === eid);
  const esNueva = () => estado.r?.diagnostico?.estado.id === 'nueva';
  const tx = (e) => textos(e, esNueva());
  const actual = () => estado.r?.principales.find((e) => e.esActual) || null;

  /** Nombres cortos de los cultivos que sí se pudieron evaluar en un indicador. */
  const evaluados = (x) => [...new Set(x.porCultivo.filter((c) => !c.sinEstimacion).map((c) => catalogo.cultivo(c.cultivo).name.toLowerCase()))];
  const lugarClima = () => (estado.r?.origenClima === 'punto' ? 'en tu punto' : 'en tu zona');

  function chipsCultivos(e) {
    const ids = [...new Set(e.intervalos.map((x) => x.cultivo))];
    return html`<div class="semillas-chips">
      ${ids.map((c) => html`<span class="semilla-chip"><i style="background:${catalogo.cultivo(c).color}"></i>${catalogo.cultivo(c).name}</span>`)}
      ${e.sinReglas.map((n) => html`<span class="semilla-chip" style="opacity:.75"><i style="background:#9a8f7c"></i>${n}</span>`)}
    </div>`;
  }

  function sellos(e) {
    const p = parcela();
    const out = [];
    if (e.sugerida) out.push(html`<span class="sello sello--sugerida">${icono('estrella', { tam: 15 })}Sugerida para tu tierra</span>`);
    if (e.esActual) out.push(html`<span class="sello sello--crema">${esNueva() ? 'Para comparar' : e.esPlantilla ? 'Ejemplo para comparar' : 'Lo que haces hoy'}</span>`);
    if (p.estrategiaElegida?.id === e.id) out.push(html`<span class="sello sello--si sello--2">${icono('check', { tam: 16 })}Plan guardado</span>`);
    return out;
  }

  // ---------------- Las cinco líneas de cada estrategia ----------------
  function lineaDatos(e) {
    const x = e.agua;
    const ref = actual();
    const meses = e.cobertura.meses;
    const difMeses = ref && !e.esActual ? meses - ref.cobertura.meses : 0;
    const cubierta = `Tierra con cultivo ${meses} de ${e.cobertura.de} meses${difMeses > 0 ? ` (${difMeses} más que ${esNueva() ? 'lo normal' : 'hoy'})` : ''}.`;
    if (x.sinEstimacion) return `${cubierta} Sobre la sequía no hay estimación: ${MOTIVO[x.motivo] || 'faltan datos'}.`;
    return `${cubierta} ${lugarClima() === 'en tu punto' ? 'En tu punto' : 'En tu zona'}, una racha seca tocó la etapa delicada de${evaluados(x).length === 1 ? 'l' : ' los cultivos:'} ${evaluados(x).join(' y ')} en ${x.aniosConCoincidencia} de ${x.aniosEvaluados} años (NASA, ${x.periodo.desde}–${x.periodo.hasta}).`;
  }

  function lineaFalta(e) {
    if (e.sinReglas.length) return `Todavía no medimos ${e.sinReglas.join(', ').toLowerCase()} con el clima: solo el maíz.`;
    const f = e.faltantes.find((x) => !/^De .* solo se conoce|^No se conoce/.test(x)) || e.faltantes[0];
    if (f) return `${f.charAt(0).toUpperCase()}${f.slice(1)}${/[.?]$/.test(f) ? '' : '.'}`;
    return 'Cómo responde tu parcela en particular: los datos son de varios años y de la región.';
  }

  function lineaTecnico(e) {
    const t = tx(e);
    const suelo = e.suelo.estado === 'no_recomendable'
      ? ` En tu suelo (${estado.r.suelo.local?.nombre || 'pedregoso'}) el INIFAP no lo recomienda.`
      : e.suelo.estado === 'sin_dato' ? ' Solo va en suelo rojo y profundo: confirma el tuyo.' : '';
    return `${t.cuesta}.${t.alOido ? ` ${t.alOido}` : ''}${suelo}`;
  }

  function cinco(e) {
    const t = tx(e);
    const fila = (ico, color, titulo, texto) => html`<li><span class="cinco__ico" style="color:${color}">${icono(ico, { tam: 18, color })}</span><span><small>${titulo}</small>${texto}</span></li>`;
    return html`<ul class="cinco">
      ${fila('info', '#9fd6db', e.sugerida ? 'Por qué te la sugerimos' : 'Por qué está aquí', e.porQue)}
      ${fila('grafica', '#f2cf7a', 'Lo que dicen los datos', lineaDatos(e))}
      ${fila('brote', '#9fd97a', 'Qué gana tu tierra', `${t.gana}.`)}
      ${fila('buscar', '#cfc6b3', 'Lo que todavía no sabemos', lineaFalta(e))}
      ${fila('alerta', '#ffd27a', 'Revísalo con tu técnico', lineaTecnico(e))}
    </ul>`;
  }

  // ---------------- Detalle técnico (plegado) ----------------
  function calendarioPlan(e) {
    return html`<ul>${e.intervalos.map((x) => {
      const nombre = catalogo.cultivo(x.cultivo).name.toLowerCase();
      const fin = x.tipoFin === 'fin_cobertura' ? `se corta el ${x.finTxt} (no es cosecha)` : `cosecha estimada el ${x.finTxt}`;
      return html`<li>Año ${x.ciclo}, ${nombre}: siembra el ${x.inicioTxt}; ${fin}.${x.supuesto ? html` <em>${x.supuesto}</em>` : ''}</li>`;
    })}</ul>`;
  }

  function datoClimatico(e, clave) {
    const r = estado.r;
    const x = e[clave];
    const esAgua = clave === 'agua';
    if (!r.clima) return html`<li>${esAgua ? 'Rachas secas' : 'Calor'}: sin estimación (${MOTIVO.sin_clima}).</li>`;
    const evento = esAgua
      ? `${r.reglas.rachaRelevanteDias}+ días seguidos con menos de ${r.clima.umbralDiaSecoMm} mm`
      : `${r.reglas.episodioCalorRelevanteDias}+ días seguidos con ${r.clima.umbralCalorC} °C o más`;
    return x.porCultivo.map((c) => {
      const nombre = catalogo.cultivo(c.cultivo).name;
      if (c.sinEstimacion) return html`<li>${nombre} (año ${c.ciclo}): sin estimación, porque ${MOTIVO[c.motivo]}. No significa que no haya riesgo.</li>`;
      const s = c.etapa.siembra;
      return html`<li>${nombre} (año ${c.ciclo}), ${esAgua ? 'sequía' : 'calor'}: ${evento} tocaron «${c.etapa.nombre.toLowerCase()}» (días ${c.etapa.desdeDia} a ${c.etapa.hastaDia} después de sembrar el ${s.dia} de ${MESES[s.mes - 1]}) en ${c.aniosConCoincidencia} de ${c.aniosEvaluados} años; ${pct(c.proporcionDias)} de esos días en promedio.</li>`;
    });
  }

  function detalleTecnico(e) {
    const r = estado.r;
    return html`
      <span class="fuente"><strong>Fechas de este plan</strong> (si el maíz se siembra el ${r.escenario.siembraTexto})</span>
      ${calendarioPlan(e)}
      <span class="fuente"><strong>Clima en la etapa delicada</strong></span>
      <ul>${datoClimatico(e, 'agua')}${datoClimatico(e, 'calor')}</ul>
      <span class="fuente">Un mes cuenta «con cultivo» si hay al menos ${e.cobertura.diasMinimos} días con algo sembrado. Es lo que pasó otros años, no un pronóstico ni un rendimiento.</span>
      ${e.beneficios.length ? html`<span class="fuente"><strong>Beneficios documentados</strong></span><ul>${e.beneficios.map((x) => html`<li>${x}</li>`)}</ul>` : ''}
      ${e.riesgos.length ? html`<span class="fuente"><strong>Riesgos documentados</strong></span><ul>${e.riesgos.map((x) => html`<li>${x}</li>`)}</ul>` : ''}
      ${e.supuestos.length ? html`<span class="fuente"><strong>De dónde sale cada supuesto</strong></span>
        <ul>${e.supuestos.map((s) => html`<li><strong>${ESTADO_TXT[s.estado] || s.estado}</strong>${s.fuente ? ` (${fuenteLegible(s.fuente)})` : ''}: ${s.nota}</li>`)}</ul>` : ''}
      ${e.faltantes.length ? html`<span class="fuente"><strong>Falta confirmar</strong></span><ul>${e.faltantes.map((x) => html`<li>${x}</li>`)}</ul>` : ''}
      <span class="fuente"><strong>Fuentes</strong></span>
      <ul class="fuentes-lista">
        ${r.clima ? html`<li>Clima: ${r.clima.via}, lluvia ${r.clima.lluvia} y temperatura ${r.clima.temperatura}; ${r.clima.aniosCompletos} años completos (${r.clima.periodo.desde}–${r.clima.periodo.hasta}). ${r.origenClima === 'punto' ? `Punto de tu parcela: ${r.clima.punto.lat}, ${r.clima.punto.lon}.` : `Punto de referencia de la zona ${r.zona?.nombre || ''}.`}</li>` : ''}
        ${e.fuentes.map((x) => html`<li>${fuenteLegible(x)}</li>`)}
      </ul>`;
  }

  function tarjeta(e, i) {
    const t = tx(e);
    const tc = e.cobertura;
    const abierta = estado.abiertas.has(e.id);
    const hablando = estado.hablando === e.id;
    const elegida = parcela().estrategiaElegida?.id === e.id;
    return html`<article class="tarjeta opcion-est entra d${Math.min(i + 3, 7)}" data-actual="${e.esActual ? 'true' : 'false'}" data-sugerida="${e.sugerida ? 'true' : 'false'}" aria-labelledby="op-${e.id}">
      <div class="fila fila--entre" style="align-items:flex-start;gap:8px">
        <div class="opcion-est__sellos">${sellos(e)}</div>
        ${hayHabla ? html`<button class="btn-escuchar" data-act="escuchar" data-id="${e.id}" aria-pressed="${presionado(hablando)}" aria-label="${hablando ? 'Detener' : `Escuchar: ${t.titulo}`}">${icono(hablando ? 'alto' : 'bocina', { tam: 20 })}<span>${hablando ? 'Detener' : 'Escuchar'}</span></button>` : ''}
      </div>
      <div class="columna" style="gap:4px">
        <h2 class="opcion-est__titulo" id="op-${e.id}">${t.titulo}</h2>
        ${chipsCultivos(e)}
        ${t.queEs ? html`<p class="opcion-est__que">${t.queEs}</p>` : ''}
      </div>
      ${franja24(tc)}
      <p class="opcion-est__desnuda"><b>${tc.meses}</b><span>de ${tc.de} meses con cultivo en pie<small>Sin cultivo: ${tc.de - tc.meses} meses (rayados)</small></span></p>
      ${cinco(e)}
      <div class="acordeon opcion-est__porque" data-abierto="${abierta ? 'true' : 'false'}">
        <button class="acordeon__boton" data-act="porque" data-id="${e.id}" aria-expanded="${abierta ? 'true' : 'false'}" aria-controls="pq-${e.id}">
          ${icono('libro', { color: '#9fd6db' })}<span class="crece" style="font-weight:700">Fuentes y supuestos</span>${icono('abajo', { clase: 'acordeon__flecha', tam: 20 })}
        </button>
        ${abierta ? html`<div class="acordeon__cuerpo justificacion" id="pq-${e.id}">${detalleTecnico(e)}</div>` : ''}
      </div>
      ${elegida ? html`<div class="columna" style="gap:8px">
          <span class="fuente" role="status"><strong>Plan guardado en este teléfono</strong> para el ciclo ${parcela().estrategiaElegida.anioCiclo}. Todavía no es una siembra registrada.</span>
          <a class="btn btn--vidrio btn--bloque" href="#/inicio?cal=${parcela().estrategiaElegida.anioCiclo}-06">${icono('calendario')}Ver las fechas en el calendario</a>
          <button class="btn btn--texto" data-act="quitar">Quitar este plan</button>
        </div>`
        : html`<button class="btn ${e.sugerida ? 'btn--dorado' : 'btn--vidrio'} btn--bloque" data-act="elegir" data-id="${e.id}">${icono('check')}${e.esActual && !esNueva() ? 'Seguir como hoy' : 'Quiero este plan'}</button>`}
    </article>`;
  }

  /** Arriba: el tiempo que la tierra queda cubierta con cada estrategia, en un vistazo. */
  function resumenMeses() {
    const r = estado.r;
    return html`<section class="tarjeta columna entra d2" style="gap:10px" aria-labelledby="tituloMeses">
      <div class="fila fila--entre"><strong class="tarjeta__titulo" id="tituloMeses">¿Cuánto tiempo queda cubierta tu tierra?</strong></div>
      <div class="desnuda-grid">${r.principales.map((e) => html`<div class="desnuda-item" data-actual="${e.esActual ? 'true' : 'false'}" data-sugerida="${e.sugerida ? 'true' : 'false'}">
        <b>${e.cobertura.meses}</b><span>de ${e.cobertura.de} meses</span><small>${tx(e).titulo}</small>
        ${franja24(e.cobertura, { chica: true })}
      </div>`)}</div>
      <span class="fuente">De ${mesAnio(r.ventana.desde)} a ${mesAnio(r.ventana.hasta)}. Rayado = meses sin cultivo, cuando la tierra queda expuesta al sol y a la lluvia.</span>
    </section>`;
  }

  /** El diagnóstico que explica el orden, en una línea, con enlace. */
  function diagnosticoCorto() {
    const d = estado.r.diagnostico;
    const razones = fraseRazones(d.estado.razones, 2);
    return html`<a class="diag-chip entra d1" href="#/diagnostico/${id}" style="--c:${d.estado.color}">
      <img src="${letrero(d.estado.letrero)}" alt="">
      <span class="columna crece" style="gap:1px"><small>Tu tierra</small><strong>${d.estado.corto}</strong>${razones ? html`<em>${razones}.</em>` : ''}</span>
      ${icono('der', { color: '#f2cf7a', tam: 18 })}
    </a>`;
  }

  function consejos() {
    const notas = estado.r.diagnostico.sugerencia.notas;
    if (!notas.length) return '';
    return html`<div class="nota-papel entra d3"><span class="mano">Para cuidar tu tierra</span>
      <ul style="margin:6px 0 0;padding-left:18px;font-size:15px;line-height:1.5">${notas.map((n) => html`<li>${n}</li>`)}</ul></div>`;
  }

  function avisos() {
    const r = estado.r;
    const out = [];
    if (r.sinZona && !r.clima) out.push('Marca dónde está tu parcela para medir la sequía y el calor. Por ahora solo contamos los meses con cultivo.');
    else out.push(textoOrigen(r.origenClima, r.zona));
    if (r.fueraDeAmbito) out.push('Las fechas de siembra de estos planes se revisaron para el sur de Yucatán: en tu zona tómalas como referencia.');
    return out.map((x) => html`<span class="fuente" style="padding:0 4px">${x}</span>`);
  }

  function pieDatos() {
    const d = estado.r.datos;
    const v = estado.r.versiones;
    const origen = d.origen === 'servidor' ? `Datos del servidor de jaibaSpace (paquete ${d.version}).` : 'Datos de la copia incluida en la app.';
    return html`<span class="fuente" style="padding:0 4px" data-origen-datos="${d.origen}">Calculado en tu teléfono. ${origen} Planes v${v.planes}, reglas v${v.reglas}.</span>`;
  }

  function pintarTodo() {
    const p = parcela();
    if (!p) return;
    const sc = pantalla.querySelector('#scrollOpc');
    const y = sc?.scrollTop || 0;
    const r = estado.r;
    pintar(pantalla, html`
      ${fondo()}
      <div class="scroll" id="scrollOpc">
        <div class="entra d1" style="padding:0 4px">
          <span class="hero__etiqueta">Próximos dos años · ${p.nombre}</span>
          <h1 class="titulo-grande">Tu plan de 2 años</h1>${subrayado(200)}
          <p class="texto-intro" style="margin-top:6px">Tres formas de sembrar ${p.nombre}. Una la sugerimos por cómo está tu tierra; las otras dos son para comparar.</p>
        </div>
        ${estado.error ? html`<div class="tarjeta"><p><strong>No pudimos comparar las opciones.</strong></p><p class="ayuda">${estado.error}</p></div>`
          : !r ? html`<div class="tarjeta vacio"><p>Comparando el calendario y los años de lluvia y calor…</p></div>`
          : html`
            ${diagnosticoCorto()}
            ${hayHabla ? html`<button class="btn btn--jade btn--bloque entra d1" data-act="escucharTodo" aria-pressed="${presionado(estado.hablando === 'todo')}">${icono(estado.hablando === 'todo' ? 'alto' : 'bocina')}${estado.hablando === 'todo' ? 'Detener' : 'Escuchar las opciones'}</button>` : ''}
            ${resumenMeses()}
            ${avisos()}
            ${r.principales.map((e, i) => html`${tarjeta(e, i)}${i === 0 ? consejos() : ''}`)}
            ${r.secundarias.length ? html`<div class="seccion"><span class="seccion__titulo">Otra opción para vender</span><span class="seccion__nota">Material secundario</span></div>
              ${r.secundarias.map((e, i) => tarjeta(e, i + 3))}` : ''}
          `}
        <div class="nota-papel">
          <span class="mano">La decisión es tuya y de tu técnico</span>
          <p style="margin-top:6px;font-size:15px;line-height:1.5">La app sugiere con lo que pasó otros años; no promete cosechas. Platica estas opciones con alguien de confianza antes de sembrar.</p>
        </div>
        ${r ? pieDatos() : ''}
      </div>
      ${cabeza({ titulo: 'Tu plan de 2 años', sub: `${p.nombre}, ${superficie(p.superficieM2, p.unidadCaptura)}`, atras: { act: 'volver' }, etiquetaAtras: 'Volver' })}
    `);
    const sc2 = pantalla.querySelector('#scrollOpc');
    if (sc2) sc2.scrollTop = y;
  }

  async function cargar() {
    try {
      estado.error = null;
      estado.r = await opcionesPara(parcela(), { siembra: estado.siembra });
    } catch (e) {
      console.error(e);
      estado.error = String(e.message || e);
    }
    if (vivo) pintarTodo();
  }

  // ---------------- Voz ----------------
  function marcarHablando(cual) {
    estado.hablando = cual;
    pantalla.querySelectorAll('[data-act="escuchar"]').forEach((b) => {
      const si = b.dataset.id === cual;
      b.setAttribute('aria-pressed', presionado(si));
      const e = buscar(b.dataset.id);
      b.setAttribute('aria-label', si ? 'Detener' : `Escuchar: ${e ? tx(e).titulo : ''}`);
      b.innerHTML = `${icono(si ? 'alto' : 'bocina', { tam: 20 })}<span>${si ? 'Detener' : 'Escuchar'}</span>`;
    });
    const todo = pantalla.querySelector('[data-act="escucharTodo"]');
    if (todo) {
      const si = cual === 'todo';
      todo.setAttribute('aria-pressed', presionado(si));
      todo.innerHTML = `${icono(si ? 'alto' : 'bocina')}${si ? 'Detener' : 'Escuchar las opciones'}`;
    }
  }

  function hablar(cual, texto) {
    if (estado.hablando === cual) { detenerVoz?.(); return; }
    detenerVoz?.();
    marcarHablando(cual);
    detenerVoz = decir(texto, { alFin: () => { if (vivo && estado.hablando === cual) marcarHablando(null); } });
  }

  function textoOpcion(e) {
    const t = tx(e);
    return [`${t.titulo}.`, e.porQue, t.queEs, lineaDatos(e), `Qué gana tu tierra: ${t.gana}.`, `Revísalo con tu técnico: ${lineaTecnico(e)}`].filter(Boolean).join(' ');
  }

  function textoTodo() {
    const p = parcela();
    const r = estado.r;
    const s = r.principales.find((e) => e.sugerida);
    return [
      `Tu tierra en ${p.nombre}: ${r.diagnostico.estado.corto.toLowerCase()}.`,
      s ? `Te sugerimos: ${tx(s).titulo}. ${s.porQue}` : '',
      ...r.principales.map((e) => `${tx(e).titulo}: tierra con cultivo ${e.cobertura.meses} de ${e.cobertura.de} meses.`),
      'Toca la bocina de cada opción para escucharla completa. La decisión es tuya y de tu técnico.',
    ].filter(Boolean).join(' ');
  }

  // ---------------- Acciones ----------------
  const quitar = delegar(pantalla, 'click', {
    volver: () => { if (history.length > 1) history.back(); else ir(`#/parcelas/${id}`); },
    porque: (el) => {
      const eid = el.dataset.id;
      if (estado.abiertas.has(eid)) estado.abiertas.delete(eid); else estado.abiertas.add(eid);
      pintarTodo();
      pantalla.querySelector(`[data-act="porque"][data-id="${eid}"]`)?.focus({ preventScroll: true });
    },
    escuchar: (el) => {
      const e = buscar(el.dataset.id);
      if (e) hablar(e.id, textoOpcion(e));
    },
    escucharTodo: () => hablar('todo', textoTodo()),
    elegir: (el) => {
      const e = buscar(el.dataset.id);
      if (!e) return;
      detenerVoz?.();
      const p = parcela();
      const r = estado.r;
      const t = tx(e);
      // La elección vive SOLO en este dispositivo (IndexedDB). No crea temporada ni siembras y
      // no se encola como contribución: un plan no es un registro de lo que ya se sembró.
      const guardada = repos.parcelas.guardar({
        ...p,
        estrategiaElegida: {
          id: e.id,
          nombre: t.titulo,
          esPlantilla: e.esPlantilla,
          eraSugerida: !!e.sugerida,
          anioCiclo: r.escenario.anioBase,
          siembraEscenario: r.escenario.siembra,
          meses: e.cobertura.meses,
          de: e.cobertura.de,
          ventana: e.cobertura.ventana,
          marcas: e.marcas,
          datos: { origen: r.datos.origen, paquete: r.datos.version, ...r.versiones },
          fecha: new Date().toISOString(),
        },
        actualizadoEn: new Date().toISOString(),
      });
      registrarEvento(guardada, { tipo: 'estrategia_elegida', titulo: `Guardaste el plan: ${t.titulo}`, detalle: `Para el ciclo ${r.escenario.anioBase}. Es un plan, no una siembra registrada. La decisión es tuya y de tu técnico.` });
      repos.kv.set('parcelaActivaId', p.id);
      avisar('Plan guardado en este teléfono');
      pintarTodo();
    },
    quitar: () => {
      const p = parcela();
      repos.parcelas.guardar({ ...p, estrategiaElegida: null, actualizadoEn: new Date().toISOString() });
      registrarEvento(p, { tipo: 'estrategia_quitada', titulo: 'Quitaste el plan guardado' });
      avisar('Plan quitado');
      pintarTodo();
    },
  });

  // Si el clima del punto llega mientras la pantalla está abierta, se vuelve a calcular
  const dejarDeOir = repos.alCambiar((que) => {
    if (que !== 'parcelas' || !vivo || !estado.r) return;
    if (parcela()?.climaPunto?.estado === 'listo' && estado.r.origenClima !== 'punto') cargar();
  });

  pintarTodo();
  cargar();
  return () => { vivo = false; quitar(); dejarDeOir(); detenerVoz?.(); callar(); };
}
