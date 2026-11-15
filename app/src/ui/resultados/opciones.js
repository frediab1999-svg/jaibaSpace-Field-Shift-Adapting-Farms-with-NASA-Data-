// OPCIONES PARA TU PARCELA: «¿Qué siembro el próximo ciclo?». Compara tres alternativas para
// los próximos dos ciclos cuando la tierra tiene poco tiempo para descansar:
//   a) lo que el productor hace hoy (o «Maíz continuo de ejemplo» si no está registrado),
//   b) maíz con canavalia intercalada en el mismo ciclo,
//   c) un ciclo de canavalia de cobertura y después maíz.
// Los números los calcula el motor en el teléfono (motor/comparacion.js y motor/estrategias.js)
// con los datos publicados. La app no decide: compara. El productor elige y su elección se
// guarda en el dispositivo; elegir un plan NO registra una siembra ni se envía al servidor.
// Rutas: #/opciones (elegir parcela) · #/opciones/:id
import { html, pintar, delegar, presionado } from '../../shared/dom.js';
import { IMG } from '../../shared/assets.js';
import { icono, subrayado } from '../../shared/icons.js';
import { fondo, cabeza, avisoOjo } from '../layout.js';
import * as repos from '../../storage/repos.js';
import * as catalogo from '../../modules/crops/catalogo.js';
import * as climaMod from '../../modules/climate/clima.js';
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
  plantilla: {
    titulo: 'Maíz continuo de ejemplo',
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
const textos = (e) => (e.esPlantilla ? TEXTOS.plantilla : TEXTOS[e.id]) || { titulo: e.nombre, queEs: '', gana: '', cuesta: '' };

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
        <p class="texto-intro" style="margin-top:6px">Elige la parcela y comparamos tres formas de sembrarla los próximos dos ciclos.</p></div>
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
    ${cabeza({ titulo: 'Opciones para tu parcela', sub: '¿Qué siembro el próximo ciclo?' })}
  `);
  return null;
}

// =====================================================================
// OPCIONES DE UNA PARCELA
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

  // ---------------- Piezas ----------------
  const pila = () => html`<svg class="pila" viewBox="0 0 64 34" width="64" height="34" aria-hidden="true">
    <rect x="2" y="3" width="54" height="28" rx="6" fill="none" stroke="#f3ead6" stroke-width="3"/>
    <rect x="57" y="11" width="5" height="12" rx="2" fill="#f3ead6"/>
    <rect x="7" y="8" width="14" height="18" rx="3" fill="#ff8f7a"/>
    <path d="M30 9l-4 9h6l-4 8" fill="none" stroke="#f2cf7a" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;

  /** Nombres cortos de los cultivos que sí se pudieron evaluar en un indicador. */
  const evaluados = (x) => [...new Set(x.porCultivo.filter((c) => !c.sinEstimacion).map((c) => catalogo.cultivo(c.cultivo).name.toLowerCase()))];

  function indicador(e, clave) {
    const x = e[clave];
    const esAgua = clave === 'agua';
    const titulo = esAgua ? 'Rachas secas en la etapa sensible' : 'Calor fuerte en la etapa sensible';
    const img = esAgua ? IMG.iconos.nube : IMG.iconos.sol;
    if (x.sinEstimacion) {
      return html`<div class="indicador">
        <img class="parche parche--chico" src="${img}" alt="">
        <span class="columna" style="gap:1px"><small>${titulo}</small><strong>Sin estimación</strong><small>${MOTIVO[x.motivo] || 'faltan datos'}</small></span>
      </div>`;
    }
    return html`<div class="indicador">
      <img class="parche parche--chico" src="${img}" alt="">
      <span class="columna" style="gap:1px"><small>${titulo} (${evaluados(x).join(' y ')})</small>
      <strong>${x.aniosConCoincidencia} de ${x.aniosEvaluados} años</strong>
      <small>${pct(x.proporcionDias)} de los días de esa etapa</small></span>
    </div>`;
  }

  function sellos(e) {
    const p = parcela();
    const out = [];
    if (p.estrategiaElegida?.id === e.id) out.push(html`<span class="sello sello--si">${icono('check', { tam: 16 })}Plan guardado</span>`);
    if (e.esActual) out.push(html`<span class="sello sello--crema">${e.esPlantilla ? 'Plantilla de ejemplo' : 'Lo que haces hoy'}</span>`);
    if (e.escenarioIlustrativo) out.push(html`<span class="sello sello--esp">Fechas ilustrativas</span>`);
    if (e.masMeses) out.push(html`<span class="sello sello--si sello--2">${e.empateMeses ? 'Empata en meses con cultivo en pie' : 'Más meses con cultivo en pie'}</span>`);
    return out;
  }

  function chipsCultivos(e) {
    const ids = [...new Set(e.intervalos.map((x) => x.cultivo))];
    return html`<div class="semillas-chips">
      ${ids.map((c) => html`<span class="semilla-chip"><i style="background:${catalogo.cultivo(c).color}"></i>${catalogo.cultivo(c).name}</span>`)}
      ${e.sinReglas.map((n) => html`<span class="semilla-chip" style="opacity:.75"><i style="background:#9a8f7c"></i>${n} (sin cálculo)</span>`)}
    </div>`;
  }

  /** Calendario del plan en palabras: siembra, cosecha y fin de cobertura por separado. */
  function calendarioPlan(e) {
    return html`<ul>${e.intervalos.map((x) => {
      const nombre = catalogo.cultivo(x.cultivo).name.toLowerCase();
      const fin = x.tipoFin === 'fin_cobertura' ? `fin estimado de la cobertura el ${x.finTxt} (se corta; no es una cosecha)` : `cosecha estimada el ${x.finTxt}`;
      return html`<li>Ciclo ${x.ciclo}, ${nombre}: siembra el ${x.inicioTxt}; ${fin}.${x.supuesto ? html` <em>${x.supuesto}</em>` : ''}</li>`;
    })}</ul>`;
  }

  /** El dato climático de un indicador, con valor, unidad, periodo, años evaluados y definiciones. */
  function datoClimatico(e, clave) {
    const r = estado.r;
    const x = e[clave];
    const esAgua = clave === 'agua';
    const evento = esAgua
      ? `una racha de ${r.reglas.rachaRelevanteDias} días seguidos o más con menos de ${r.clima?.umbralDiaSecoMm ?? 1} mm de lluvia`
      : `un episodio de ${r.reglas.episodioCalorRelevanteDias} días seguidos o más con ${r.clima?.umbralCalorC ?? 35} °C o más`;
    if (!r.clima) return html`<li><strong>${esAgua ? 'Rachas secas' : 'Calor'}:</strong> Sin estimación. ${MOTIVO.sin_clima}.</li>`;
    return x.porCultivo.map((c) => {
      const nombre = catalogo.cultivo(c.cultivo).name;
      if (c.sinEstimacion) return html`<li><strong>${nombre} (ciclo ${c.ciclo}), ${esAgua ? 'rachas secas' : 'calor'}:</strong> Sin estimación, porque ${MOTIVO[c.motivo]}. No significa que no haya riesgo.</li>`;
      const s = c.etapa.siembra;
      return html`<li><strong>${nombre} (ciclo ${c.ciclo}), ${esAgua ? 'rachas secas' : 'calor'}:</strong>
        en ${c.aniosConCoincidencia} de ${c.aniosEvaluados} años evaluados (${c.periodo.desde}–${c.periodo.hasta}), ${evento} coincidió con «${c.etapa.nombre.toLowerCase()}»
        (días ${c.etapa.desdeDia} a ${c.etapa.hastaDia} después de sembrar el ${s.dia} de ${MESES[s.mes - 1]}).
        En promedio, ${pct(c.proporcionDias)} de los ${c.diasEtapa} días de esa etapa quedaron dentro de esos eventos.${c.noEvaluados.length ? ` No se evaluaron ${c.noEvaluados.join(', ')} por tener datos incompletos.` : ''}</li>`;
    });
  }

  function porQue(e) {
    const r = estado.r;
    const tc = e.cobertura;
    return html`
      <p style="font-weight:700;font-size:15px">Meses estimados con cultivo en pie: ${tc.meses} de ${tc.de}, de ${mesAnio(tc.ventana.desde)} a ${mesAnio(tc.ventana.hasta)}.</p>
      <span class="fuente">Es una estimación por calendario: un mes cuenta si hay al menos ${tc.diasMinimos} días con algún cultivo en pie (dos cultivos el mismo día cuentan una vez). No mide cuánto cubre la planta ni el rastrojo.</span>
      <span class="fuente"><strong>Calendario de este plan</strong> (si el maíz se siembra el ${r.escenario.siembraTexto})</span>
      ${calendarioPlan(e)}
      <span class="fuente"><strong>El dato del clima</strong></span>
      <ul>${datoClimatico(e, 'agua')}${datoClimatico(e, 'calor')}</ul>
      <span class="fuente">Mide lo que pasó otros años (exposición). No es la probabilidad de que el cultivo sobreviva, ni un rendimiento, ni un pronóstico del tiempo.</span>
      ${e.esActual && e.declarados.length ? html`<span class="fuente"><strong>Lo que registraste:</strong> ${e.declarados.join(', ').toLowerCase()}${e.sinReglas.length ? `. El cálculo no cubre ${e.sinReglas.join(', ').toLowerCase()}: todavía no hay reglas de etapas para esos cultivos` : ''}.</span>` : ''}
      ${e.beneficios.length ? html`<span class="fuente"><strong>El beneficio</strong></span><ul>${e.beneficios.map((x) => html`<li>${x}</li>`)}</ul>` : ''}
      ${e.riesgos.length ? html`<span class="fuente"><strong>La contrapartida</strong></span><ul>${e.riesgos.map((x) => html`<li>${x}</li>`)}</ul>` : ''}
      ${e.supuestos.length ? html`<span class="fuente"><strong>De dónde salen los supuestos</strong></span>
        <ul>${e.supuestos.map((s) => html`<li><strong>${ESTADO_TXT[s.estado] || s.estado}</strong> (${s.campo}${s.fuente ? `; ${fuenteLegible(s.fuente)}` : ''}): ${s.nota}</li>`)}</ul>` : ''}
      ${e.faltantes.map((x) => html`<span class="porconfirmar">Falta confirmar: ${x}</span>`)}
      <span class="fuente"><strong>Fuentes:</strong></span>
      <ul class="fuentes-lista">
        ${r.clima ? html`<li>Clima: ${r.clima.via}, lluvia ${r.clima.lluvia} y temperatura máxima ${r.clima.temperatura}; ${r.clima.aniosCompletos} años completos (${r.clima.periodo.desde}–${r.clima.periodo.hasta}), corte ${r.clima.corte}. Punto de referencia de la zona ${r.zona.nombre}: ${r.clima.punto.lat}, ${r.clima.punto.lon}. Es un dato regional, no una medición en tu parcela.</li>` : ''}
        ${e.fuentes.map((x) => html`<li>${x}</li>`)}
      </ul>`;
  }

  function tarjeta(e, i) {
    const t = textos(e);
    const tc = e.cobertura;
    const abierta = estado.abiertas.has(e.id);
    const hablando = estado.hablando === e.id;
    const elegida = parcela().estrategiaElegida?.id === e.id;
    const noApta = e.suelo.estado === 'no_recomendable';
    return html`<article class="tarjeta opcion-est entra d${Math.min(i + 4, 7)}" data-actual="${e.esActual ? 'true' : 'false'}" data-mejor="${e.masMeses ? 'true' : 'false'}" aria-labelledby="op-${e.id}">
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
      <p class="opcion-est__desnuda"><b>${tc.meses}</b><span>meses estimados con cultivo en pie<small>de ${tc.de} meses, ${mesAnioCorto(tc.ventana.desde)} a ${mesAnioCorto(tc.ventana.hasta)}; sin cultivo: ${tc.de - tc.meses}</small></span></p>
      <div class="indicadores">${indicador(e, 'agua')}${indicador(e, 'calor')}</div>
      <div class="gana-cuesta">
        <span class="gana">${icono('check', { tam: 18, color: '#9fd97a' })}<span><small>Beneficio</small>${t.gana}</span></span>
        <span class="cuesta">${icono('alerta', { tam: 18, color: '#ffd27a' })}<span><small>Contrapartida</small>${t.cuesta}</span></span>
      </div>
      ${noApta ? html`<span class="sello sello--no" style="align-self:flex-start">No recomendable en tu suelo</span>
        <span class="porconfirmar">El INIFAP ubica ${e.suelo.cultivos.map((c) => catalogo.cultivo(c).name.toLowerCase()).join(', ')} en suelos rojos y profundos (k'ankab y yaax-hom). Tu parcela es ${estado.r.suelo.local?.nombre || 'de otro suelo'} (${estado.r.suelo.wrb}).</span>` : ''}
      ${e.suelo.estado === 'sin_dato' ? html`<span class="porconfirmar">${estado.r.suelo.local ? `Reconocimos tu suelo como ${estado.r.suelo.local.nombre}, pero su equivalencia con una clase de suelo oficial falta confirmarla` : 'No sabemos el suelo de tu parcela'}: ${e.suelo.cultivos.map((c) => catalogo.cultivo(c).name.toLowerCase()).join(', ')} solo se recomienda en suelo rojo y profundo.</span>` : ''}
      <div class="acordeon opcion-est__porque" data-abierto="${abierta ? 'true' : 'false'}">
        <button class="acordeon__boton" data-act="porque" data-id="${e.id}" aria-expanded="${abierta ? 'true' : 'false'}" aria-controls="pq-${e.id}">
          ${icono('info', { color: '#9fd6db' })}<span class="crece" style="font-weight:700">¿Por qué?</span>${icono('abajo', { clase: 'acordeon__flecha', tam: 20 })}
        </button>
        ${abierta ? html`<div class="acordeon__cuerpo justificacion" id="pq-${e.id}">${porQue(e)}</div>` : ''}
      </div>
      ${elegida ? html`<div class="columna" style="gap:8px">
          <span class="fuente" role="status"><strong>Plan guardado en este dispositivo.</strong> Es tu plan para el ciclo ${parcela().estrategiaElegida.anioCiclo}; todavía no es una siembra registrada.</span>
          <a class="btn btn--vidrio btn--bloque" href="#/inicio?cal=${parcela().estrategiaElegida.anioCiclo}-06">${icono('calendario')}Ver las fechas en el calendario</a>
          <button class="btn btn--texto" data-act="quitar">Quitar este plan</button>
        </div>`
        : html`<button class="btn ${e.masMeses ? 'btn--dorado' : 'btn--vidrio'} btn--bloque" data-act="elegir" data-id="${e.id}">${icono('check')}${e.esActual ? 'Seguir con este plan' : 'Quiero explorar este plan'}</button>`}
    </article>`;
  }

  function resumenMeses() {
    const r = estado.r;
    return html`<section class="tarjeta columna entra d3" style="gap:10px" aria-labelledby="tituloMeses">
      <div class="fila fila--entre"><strong class="tarjeta__titulo" id="tituloMeses">Meses estimados con cultivo en pie</strong><span class="tarjeta__sub" style="font-size:12.5px">de ${r.ventana.meses} meses</span></div>
      <div class="desnuda-grid">${r.principales.map((e) => html`<div class="desnuda-item" data-actual="${e.esActual ? 'true' : 'false'}" data-oculta="false">
        <b>${e.cobertura.meses}</b><span>meses${e.esActual ? ', hoy' : ''}</span><small>${textos(e).titulo}</small>
        ${franja24(e.cobertura, { chica: true })}
      </div>`)}</div>
      <span class="fuente">Estimación por calendario para ${mesAnio(r.ventana.desde)} a ${mesAnio(r.ventana.hasta)}, si el maíz se siembra el ${r.escenario.siembraTexto}. Un mes cuenta con ${r.reglas.diasMinimosPorMes} días o más de cultivo en pie.</span>
    </section>`;
  }

  function escenario() {
    const r = estado.r;
    return html`<section class="columna entra d2" style="gap:8px">
      <div class="seccion"><span class="seccion__titulo">Escenario: ¿cuándo siembras el maíz?</span></div>
      <div class="chips prioridades" role="group" aria-label="Fecha de siembra del maíz en el escenario">${r.escenario.opciones.map((o) => html`<button type="button" class="chip" data-act="siembra" data-id="${o.valor}" aria-pressed="${presionado(r.escenario.siembra === o.valor)}">${o.etiqueta}${o.esRegistrada ? ' (tu fecha)' : ''}</button>`)}</div>
      <span class="fuente">${r.escenario.origen === 'registrada' ? 'Usamos la fecha de siembra que registraste.' : r.escenario.origen === 'plan' ? 'No hay fecha registrada: usamos la del plan de ejemplo.' : 'Estás probando otra fecha de siembra.'} Las demás fechas se mueven los mismos días. Cambia la fecha y los resultados se vuelven a calcular.</span>
    </section>`;
  }

  function avisos() {
    const r = estado.r;
    const p = parcela();
    const out = [];
    if (r.sinZona) out.push('Cobertura pendiente: tu parcela todavía no tiene una zona de clima asignada. Los meses con cultivo en pie se estiman por calendario; las rachas secas y el calor quedan «Sin estimación».');
    if (r.fueraDeAmbito) out.push(`Tu parcela está en la zona ${r.zona.nombre.split(' (')[0]}. ${r.notaAmbito || ''} Toma estas fechas como referencia.`);
    if (!r.sinZona && p.zonaDistanciaKm > 50) out.push(`El punto de clima de tu zona está a ${numero(p.zonaDistanciaKm, 0)} km de tu parcela: el clima es una referencia regional.`);
    return out.map((x) => html`<span class="porconfirmar" style="padding:0 4px">${x}</span>`);
  }

  function pieDatos() {
    const d = estado.r.datos;
    const v = estado.r.versiones;
    const origen = d.origen === 'servidor'
      ? `Datos descargados del servidor de jaibaSpace el ${new Date(d.descargadoEn).toLocaleString('es-MX')} (paquete ${d.version}, ${d.verificacion === 'sha256' ? 'verificado con SHA-256' : 'verificado por tamaño'}) y guardados en este dispositivo.`
      : 'Datos de la copia incluida en la app (respaldo local): no se ha podido descargar el paquete del servidor.';
    return html`<span class="fuente" style="padding:0 4px" data-origen-datos="${d.origen}">Calculado en tu teléfono. ${origen} Planes v${v.planes}, reglas v${v.reglas}${v.clima ? `, clima formato v${v.clima}` : ''}.</span>`;
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
          <span class="hero__etiqueta">Próximos dos ciclos · ${p.nombre}</span>
          <h1 class="titulo-grande">¿Qué siembro el próximo ciclo?</h1>${subrayado(220)}
          <p class="texto-intro" style="margin-top:6px">Tres formas de sembrar ${p.nombre} cuando la tierra tiene poco tiempo para descansar.</p>
        </div>

        ${hayHabla && r ? html`<button class="btn btn--jade btn--bloque entra d1" data-act="escucharTodo" aria-pressed="${presionado(estado.hablando === 'todo')}">${icono(estado.hablando === 'todo' ? 'alto' : 'bocina')}${estado.hablando === 'todo' ? 'Detener' : 'Escuchar las opciones'}</button>` : ''}

        <section class="tarjeta fila entra d2" style="gap:14px;align-items:center">
          ${pila()}
          <div class="columna" style="gap:4px"><strong class="tarjeta__titulo" style="font-size:16.5px">¿Qué comparamos?</strong>
          <p style="font-size:14.5px;color:var(--txt-2);line-height:1.45">Cuántos meses hay cultivo en pie en dos años y qué tan seguido la sequía o el calor tocaron la etapa delicada del cultivo. No promete cosechas ni que la tierra se recupere.</p></div>
        </section>

        ${estado.error ? html`<div class="tarjeta"><p><strong>No pudimos comparar las opciones.</strong></p><p class="ayuda">${estado.error}</p></div>`
          : !r ? html`<div class="tarjeta vacio"><p>Comparando el calendario y los años de lluvia y calor…</p></div>`
          : html`
            ${escenario()}
            ${resumenMeses()}
            ${avisos()}
            <div class="seccion"><span class="seccion__titulo">Tus tres opciones</span><span class="seccion__nota">Tú decides cuál explorar</span></div>
            ${r.principales.map((e, i) => tarjeta(e, i))}
            ${r.secundarias.length ? html`<div class="seccion"><span class="seccion__titulo">Otra opción documentada</span><span class="seccion__nota">Material secundario</span></div>
              ${r.secundarias.map((e, i) => tarjeta(e, i + 3))}` : ''}
          `}

        <div class="nota-papel">
          <span class="mano">La decisión es tuya y de tu técnico</span>
          <p style="margin-top:6px;font-size:15px;line-height:1.5">La app no decide por ti: compara. Platica estas opciones con alguien de confianza antes de sembrar.</p>
        </div>
        ${avisoOjo('Ojo: esto viene de lo que pasó otros años', `Usamos la lluvia y el calor de ${r?.clima ? `${r.clima.periodo.desde} a ${r.clima.periodo.hasta}` : 'años anteriores'} en tu zona. No es un pronóstico: el próximo año puede ser distinto.`)}
        ${r ? pieDatos() : ''}
      </div>
      ${cabeza({ titulo: 'Opciones para tu parcela', sub: `${p.nombre}, ${superficie(p.superficieM2, p.unidadCaptura)}`, atras: { act: 'volver' }, etiquetaAtras: 'Volver' })}
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
      b.setAttribute('aria-label', si ? 'Detener' : `Escuchar: ${e ? textos(e).titulo : ''}`);
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

  const fraseAgua = (e) => (e.agua.sinEstimacion
    ? 'Sobre las rachas secas no hay estimación.'
    : `En ${e.agua.aniosConCoincidencia} de ${e.agua.aniosEvaluados} años una racha seca tocó la etapa más delicada de ${evaluados(e.agua).join(' y ')}.`);

  function textoOpcion(e) {
    const t = textos(e);
    const tc = e.cobertura;
    return [
      `${t.titulo}.`, t.queEs,
      `Con este plan habría cultivo en pie ${tc.meses} de ${tc.de} meses, estimado por calendario.`,
      fraseAgua(e),
      `El beneficio: ${t.gana}.`, `La contrapartida: ${t.cuesta}.`, t.alOido || '',
    ].filter(Boolean).join(' ');
  }

  function textoTodo() {
    const p = parcela();
    const r = estado.r;
    return [
      `Opciones para ${p.nombre}, si siembras el maíz el ${r.escenario.siembraTexto}.`,
      ...r.principales.map((e) => `${textos(e).titulo}: cultivo en pie ${e.cobertura.meses} de ${e.cobertura.de} meses.`),
      'Son estimaciones por calendario. Toca la bocina de cada opción para escucharla completa. La decisión es tuya y de tu técnico.',
    ].join(' ');
  }

  // ---------------- Acciones ----------------
  const quitar = delegar(pantalla, 'click', {
    volver: () => { if (history.length > 1) history.back(); else ir(`#/parcelas/${id}`); },
    siembra: (el) => {
      if (estado.r?.escenario.siembra === el.dataset.id) return;
      detenerVoz?.();
      estado.siembra = el.dataset.id;
      cargar();
    },
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
      const t = textos(e);
      // La elección vive SOLO en este dispositivo (IndexedDB). No crea temporada ni siembras y
      // no se encola como contribución: un plan no es un registro de lo que ya se sembró.
      const guardada = repos.parcelas.guardar({
        ...p,
        estrategiaElegida: {
          id: e.id,
          nombre: t.titulo,
          esPlantilla: e.esPlantilla,
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
      avisar('Plan guardado en este dispositivo');
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

  pintarTodo();
  cargar();
  return () => { vivo = false; quitar(); detenerVoz?.(); callar(); };
}
