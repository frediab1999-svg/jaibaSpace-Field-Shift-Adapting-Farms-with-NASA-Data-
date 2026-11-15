// OPCIONES PARA TU PARCELA: «¿Qué siembro el próximo ciclo para que mi tierra no se siga
// gastando?». Pone lado a lado lo que hace hoy y las opciones para usar el tiempo de descanso
// que ya no tiene. La app no decide: compara. El productor elige.
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
import { opcionesPara, FUENTE, zonaDeLosNumeros } from './opciones-datos.js';
import { decir, callar, hayHabla } from '../voz.js';
import { superficie, hoy } from '../../shared/format.js';
import { avisar } from '../../app/estado.js';
import { ir } from '../../app/router.js';

const PRIORIDADES = [
  { id: 'agua', corto: 'Cuidar el agua', icono: 'lluvia', frase: 'cuidar el agua' },
  { id: 'suelo', corto: 'Cuidar el suelo', icono: 'hoja', frase: 'cuidar el suelo' },
  { id: 'nitrogeno', corto: 'Dar nitrógeno', icono: 'brote', frase: 'darle nitrógeno a la tierra' },
  { id: 'ingreso', corto: 'Más ingreso', icono: 'bolsa', frase: 'tener más ingreso' },
];
const MEJOR_PARA = { agua: 'Mejor para cuidar el agua', suelo: 'Mejor para cuidar el suelo', nitrogeno: 'Mejor para dar nitrógeno', ingreso: 'Mejor para tu ingreso' };

// Textos en palabras de todos los días. Los números y la evidencia vienen del motor.
const TEXTOS = {
  actual: {
    titulo: 'Tu milpa de siempre',
    queEs: 'Maíz, frijol y calabaza cada año, sin descanso. Es lo que haces hoy.',
    gana: 'Cosechas cada año',
    cuesta: 'La tierra se sigue gastando',
    cultivos: ['maiz', 'frijol', 'calabaza'],
  },
  'milpa-canavalia': {
    titulo: 'Milpa con canavalia entre el maíz',
    queEs: 'Siembras tu maíz y, un mes después, canavalia entre los surcos. Se queda tapando la tierra hasta marzo.',
    gana: 'Cosechas tu maíz y la tierra se recarga',
    cuesta: 'Si la siembras muy pronto, le quita fuerza al maíz',
    cultivos: ['maiz', 'canavalia'],
    alOido: 'Siembra la canavalia unos treinta días después del maíz; el día exacto confírmalo con tu técnico.',
  },
  cobertura: {
    titulo: 'Canavalia como descanso corto',
    queEs: 'Un año siembras solo canavalia para que la tierra descanse; al siguiente vuelves al maíz.',
    gana: 'Es la que más recarga la tierra',
    cuesta: 'Un año sin cosecha de maíz',
    cultivos: ['canavalia', 'maiz'],
    alOido: 'Ojo: la semilla de canavalia no se come ni se da a los animales sin tratarla.',
  },
  'otro-grano': {
    titulo: 'Soya un año, luego maíz',
    queEs: 'Un año siembras soya y al siguiente vuelves al maíz. Solo conviene en tierra roja y profunda.',
    gana: 'Puede dar más dinero',
    cuesta: 'Necesita comprador, máquina y buena lluvia',
    cultivos: ['soya', 'maiz'],
    alOido: 'Nunca desmontes monte para sembrarla.',
  },
};
const textos = (e) => TEXTOS[e.id] || { titulo: e.nombre, queEs: '', gana: '', cuesta: '', cultivos: [] };

const NIVEL = {
  nitrogeno: { bajo: { n: 1, txt: 'Poco' }, medio: { n: 2, txt: 'Algo' }, alto: { n: 3, txt: 'Mucho' } },
  ingreso: { bajo: { n: 1, txt: 'Menor' }, medio: { n: 2, txt: 'Medio' }, alto: { n: 3, txt: 'Mayor' } },
};
const COLOR_NIVEL = { 1: '#ff8f7a', 2: '#efc24d', 3: '#9fd97a' };

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
      <div class="entra d1" style="padding:0 4px"><span class="hero__etiqueta">Próximo ciclo</span>
        <h1 class="titulo-grande">¿Para qué parcela?</h1>${subrayado(180)}
        <p class="texto-intro" style="margin-top:6px">Elige la parcela y te mostramos qué sembrar para que su tierra no se siga gastando.</p></div>
      ${lista.length ? lista.map((p, i) => {
        const suelo = catalogo.suelos().find((s) => s.id === p.tipoSueloId);
        return html`<a class="tarjeta tarjeta--boton fila entra d${Math.min(i + 2, 7)}" href="#/opciones/${p.id}" style="text-decoration:none;gap:12px">
          <img class="parche" src="${IMG.nodos.parcelas}" alt="">
          <span class="columna crece" style="gap:2px"><strong class="tarjeta__titulo">${p.nombre}</strong>
          <span class="tarjeta__sub">${superficie(p.superficieM2, p.unidadCaptura)}${suelo ? `, ${suelo.name}` : ''}</span></span>
          ${p.esEjemplo ? html`<span class="sello sello--ejemplo">Ejemplo</span>` : ''}
          ${icono('der', { color: '#f2cf7a' })}
        </a>`;
      }) : html`<div class="tarjeta vacio entra d2">
        <img src="${IMG.nodos.parcelas}" alt="" style="width:110px;height:110px;object-fit:contain">
        <h2 style="font-size:21px">Primero tu parcela</h2>
        <p>Para decirte qué sembrar necesitamos saber dónde está y qué suelo tiene.</p>
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
  const estado = { prioridad: p0.prioridad || 'agua', lista: null, error: null, abiertas: new Set(), hablando: null };
  let vivo = true;
  let detenerVoz = null;

  const parcela = () => repos.parcelas.porId(id);
  const prio = () => PRIORIDADES.find((x) => x.id === estado.prioridad) || PRIORIDADES[0];
  const visibles = () => (estado.lista || []).filter((e) => e.visible);
  const ocultas = () => (estado.lista || []).filter((e) => !e.visible);

  /** Las que empatan con la primera (incluida ella) si hay empate; si no, vacío. */
  function empatadas() {
    const v = visibles();
    const primera = v[0];
    if (!primera || !primera.empateCon?.length) return new Set();
    return new Set([primera.id, ...primera.empateCon.filter((x) => v.some((o) => o.id === x))]);
  }

  // ---------------- Piezas ----------------
  const pila = () => html`<svg class="pila" viewBox="0 0 64 34" width="64" height="34" aria-hidden="true">
    <rect x="2" y="3" width="54" height="28" rx="6" fill="none" stroke="#f3ead6" stroke-width="3"/>
    <rect x="57" y="11" width="5" height="12" rx="2" fill="#f3ead6"/>
    <rect x="7" y="8" width="14" height="18" rx="3" fill="#ff8f7a"/>
    <path d="M30 9l-4 9h6l-4 8" fill="none" stroke="#f2cf7a" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;

  const puntos = (n, color) => html`<span class="puntos3" aria-hidden="true">${[1, 2, 3].map((k) => html`<i style="${k <= n ? `background:${color};border-color:${color}` : ''}"></i>`)}</span>`;

  function indicadores(e) {
    const a = e.criterios.agua;
    const fr = a.deAnios ? a.aniosAfectados / a.deAnios : 0;
    const nivelSequia = fr <= 1 / 3 ? 3 : fr <= 2 / 3 ? 2 : 1;
    const calorPct = Math.round((e.criterios.calor?.valor || 0) * 1000) / 10;
    const n = NIVEL.nitrogeno[e.criterios.nitrogeno] || NIVEL.nitrogeno.medio;
    const ing = NIVEL.ingreso[e.criterios.ingreso] || NIVEL.ingreso.medio;
    return html`<div class="indicadores">
      <div class="indicador">
        <img class="parche parche--chico" src="${IMG.iconos.nube}" alt="">
        <span class="columna" style="gap:1px"><small>Sequía en la etapa clave</small><strong>${a.aniosAfectados} de ${a.deAnios} años</strong>${puntos(nivelSequia, COLOR_NIVEL[nivelSequia])}</span>
      </div>
      <div class="indicador">
        <img class="parche parche--chico" src="${IMG.iconos.sol}" alt="">
        <span class="columna" style="gap:1px"><small>Calor fuerte en esa etapa</small><strong>${calorPct.toLocaleString('es-MX')} % de los días</strong>${puntos(calorPct <= 5 ? 3 : calorPct <= 15 ? 2 : 1, COLOR_NIVEL[calorPct <= 5 ? 3 : calorPct <= 15 ? 2 : 1])}</span>
      </div>
      <div class="indicador">
        <span class="indicador__ico">${icono('brote', { color: '#9fd97a', tam: 22 })}</span>
        <span class="columna" style="gap:1px"><small>Nitrógeno que regresa</small><strong>${n.txt}</strong>${puntos(n.n, COLOR_NIVEL[n.n])}</span>
      </div>
      <div class="indicador">
        <span class="indicador__ico">${icono('bolsa', { color: '#f2cf7a', tam: 22 })}</span>
        <span class="columna" style="gap:1px"><small>Ingreso de referencia</small><strong>${ing.txt}</strong>${puntos(ing.n, COLOR_NIVEL[ing.n])}</span>
      </div>
    </div>
    <span class="fuente" style="margin-top:-2px">El ingreso es variable: puede no cumplirse y el cultivo puede fallar.</span>`;
  }

  function sellos(e, tie) {
    const p = parcela();
    const out = [];
    if (p.estrategiaElegida?.id === e.id) out.push(html`<span class="sello sello--si">${icono('check', { tam: 16 })}La que elegiste</span>`);
    if (e.esActual) out.push(html`<span class="sello sello--crema">Lo que haces hoy</span>`);
    if (tie.has(e.id)) out.push(html`<span class="sello sello--esp sello--2">Empate en ${prio().corto.toLowerCase()}</span>`);
    else if (e.posicion === 1) out.push(html`<span class="sello sello--si sello--2">${MEJOR_PARA[estado.prioridad]}</span>`);
    return out;
  }

  function tarjeta(e, i, tie) {
    const t = textos(e);
    const tc = e.criterios.tierraCubierta;
    const desnudos = tc.de - tc.meses;
    const abierta = estado.abiertas.has(e.id);
    const hablando = estado.hablando === e.id;
    const elegida = parcela().estrategiaElegida?.id === e.id;
    return html`<article class="tarjeta opcion-est entra d${Math.min(i + 4, 7)}" data-actual="${e.esActual ? 'true' : 'false'}" data-mejor="${e.posicion === 1 ? 'true' : 'false'}" aria-labelledby="op-${e.id}">
      <div class="fila fila--entre" style="align-items:flex-start;gap:8px">
        <div class="opcion-est__sellos">${sellos(e, tie)}</div>
        ${hayHabla ? html`<button class="btn-escuchar" data-act="escuchar" data-id="${e.id}" aria-pressed="${presionado(hablando)}" aria-label="${hablando ? 'Detener' : `Escuchar: ${t.titulo}`}">${icono(hablando ? 'alto' : 'bocina', { tam: 20 })}<span>${hablando ? 'Detener' : 'Escuchar'}</span></button>` : ''}
      </div>
      <div class="columna" style="gap:4px">
        <h2 class="opcion-est__titulo" id="op-${e.id}">${t.titulo}</h2>
        <div class="semillas-chips">${t.cultivos.map((c) => html`<span class="semilla-chip"><i style="background:${catalogo.cultivo(c).color}"></i>${catalogo.cultivo(c).name}</span>`)}</div>
        ${t.queEs ? html`<p class="opcion-est__que">${t.queEs}</p>` : ''}
      </div>
      ${franja24(tc)}
      <p class="opcion-est__desnuda"><b>${desnudos}</b><span>${desnudos === 1 ? 'mes' : 'meses'} con la tierra desnuda<small>${tc.meses} de ${tc.de} meses cubierta</small></span></p>
      ${indicadores(e)}
      <div class="gana-cuesta">
        <span class="gana">${icono('check', { tam: 18, color: '#9fd97a' })}<span><small>Gana</small>${t.gana}</span></span>
        <span class="cuesta">${icono('alerta', { tam: 18, color: '#ffd27a' })}<span><small>Cuesta</small>${t.cuesta}</span></span>
      </div>
      ${e.avisoSuelo ? html`<span class="porconfirmar">${e.avisoSuelo}</span>` : ''}
      <div class="acordeon opcion-est__porque" data-abierto="${abierta ? 'true' : 'false'}">
        <button class="acordeon__boton" data-act="porque" data-id="${e.id}" aria-expanded="${abierta ? 'true' : 'false'}" aria-controls="pq-${e.id}">
          ${icono('info', { color: '#9fd6db' })}<span class="crece" style="font-weight:700">¿Por qué?</span>${icono('abajo', { clase: 'acordeon__flecha', tam: 20 })}
        </button>
        ${abierta ? html`<div class="acordeon__cuerpo justificacion" id="pq-${e.id}">
          <p style="font-weight:700;font-size:15px">${e.porQue}</p>
          ${e.beneficios?.length ? html`<span class="fuente"><strong>Lo bueno</strong></span><ul>${e.beneficios.map((x) => html`<li>${x}</li>`)}</ul>` : ''}
          ${e.riesgos?.length ? html`<span class="fuente"><strong>Los riesgos</strong></span><ul>${e.riesgos.map((x) => html`<li>${x}</li>`)}</ul>` : ''}
          ${(e.faltantes || []).map((x) => html`<span class="porconfirmar">Falta confirmar: ${x}</span>`)}
          ${e.advertenciaIngreso ? html`<span class="fuente"><strong>Sobre el ingreso:</strong> ${e.advertenciaIngreso}</span>` : ''}
          ${e.fuentes?.length ? html`<span class="fuente"><strong>Fuentes:</strong></span><ul class="fuentes-lista">${e.fuentes.map((x) => html`<li>${x}</li>`)}</ul>` : ''}
        </div>` : ''}
      </div>
      ${elegida ? html`<a class="btn btn--vidrio btn--bloque" href="#/inicio?cal=${parcela().estrategiaElegida.anioCiclo}-06">${icono('calendario')}Verla en el calendario</a>`
        : html`<button class="btn ${e.posicion === 1 ? 'btn--dorado' : 'btn--vidrio'} btn--bloque" data-act="elegir" data-id="${e.id}">${icono('check')}${e.esActual ? 'Seguir con mi milpa' : 'Quiero probar esta'}</button>`}
    </article>`;
  }

  function oculta(e) {
    const t = textos(e);
    return html`<div class="tarjeta opcion-est opcion-est--oculta">
      <div class="fila" style="gap:10px;align-items:flex-start">
        <span class="indicador__ico" style="background:rgba(168,57,42,.35)">${icono('cerrar', { color: '#ffb3a6', tam: 20 })}</span>
        <span class="columna crece" style="gap:2px"><strong>${t.titulo}</strong><span class="sello sello--no" style="align-self:flex-start;margin:4px 0">No recomendable en tu suelo</span>
        <span class="tarjeta__sub">${e.motivoOculto || ''}</span></span>
      </div>
    </div>`;
  }

  function resumenDesnuda() {
    const v = [...visibles(), ...ocultas()];
    if (!v.length) return '';
    return html`<section class="tarjeta columna entra d3" style="gap:10px" aria-labelledby="tituloDesnuda">
      <div class="fila fila--entre"><strong class="tarjeta__titulo" id="tituloDesnuda">Tierra desnuda en 2 años</strong><span class="tarjeta__sub" style="font-size:12.5px">menos es mejor</span></div>
      <div class="desnuda-grid">${v.map((e) => {
        const tc = e.criterios.tierraCubierta;
        const n = tc.de - tc.meses;
        return html`<div class="desnuda-item" data-actual="${e.esActual ? 'true' : 'false'}" data-oculta="${e.visible ? 'false' : 'true'}">
          <b>${n}</b><span>meses${e.esActual ? ', hoy' : ''}</span><small>${textos(e).titulo}</small>
          ${franja24(tc, { chica: true })}
          ${e.visible ? '' : html`<em>No apta en tu suelo</em>`}
        </div>`;
      })}</div>
      ${FUENTE === 'ejemplo' ? html`<span class="fuente">Números del equipo con datos de NASA de 1998 a 2025 para Umán, Noroeste de Yucatán.</span>` : ''}
    </section>`;
  }

  function pintarTodo() {
    const p = parcela();
    if (!p) return;
    const sc = pantalla.querySelector('#scrollOpc');
    const y = sc?.scrollTop || 0;
    const tie = empatadas();
    const zonaNums = zonaDeLosNumeros();
    pintar(pantalla, html`
      ${fondo()}
      <div class="scroll" id="scrollOpc">
        <div class="entra d1" style="padding:0 4px">
          <span class="hero__etiqueta">Próximo ciclo · ${p.nombre}</span>
          <h1 class="titulo-grande">¿Qué siembro el próximo ciclo?</h1>${subrayado(220)}
          <p class="texto-intro" style="margin-top:6px">Para que la tierra de ${p.nombre} no se siga gastando.</p>
        </div>

        ${hayHabla ? html`<button class="btn btn--jade btn--bloque entra d1" data-act="escucharTodo" aria-pressed="${presionado(estado.hablando === 'todo')}">${icono(estado.hablando === 'todo' ? 'alto' : 'bocina')}${estado.hablando === 'todo' ? 'Detener' : 'Escuchar las opciones'}</button>` : ''}

        <section class="tarjeta fila entra d2" style="gap:14px;align-items:center">
          ${pila()}
          <div class="columna" style="gap:4px"><strong class="tarjeta__titulo" style="font-size:16.5px">¿Por qué tu tierra se cansa?</strong>
          <p style="font-size:14.5px;color:var(--txt-2);line-height:1.45">Cada cosecha de maíz la gasta, como a una pila. Antes el monte la recargaba en 15 a 30 años de descanso; hoy descansa 7 o menos y no le alcanza.</p></div>
        </section>

        <section class="columna entra d2" style="gap:8px">
          <div class="seccion"><span class="seccion__titulo">¿Qué te importa más?</span></div>
          <div class="chips prioridades" role="group" aria-label="Lo que más te importa">${PRIORIDADES.map((x) => html`<button type="button" class="chip" data-act="prioridad" data-id="${x.id}" aria-pressed="${presionado(estado.prioridad === x.id)}">${icono(x.icono, { tam: 18 })}${x.corto}</button>`)}</div>
        </section>

        ${estado.error ? html`<div class="tarjeta"><p><strong>No pudimos comparar las opciones.</strong></p><p class="ayuda">${estado.error}</p></div>`
          : !estado.lista ? html`<div class="tarjeta vacio"><p>Comparando 28 años de lluvia y calor…</p></div>`
          : html`
            ${resumenDesnuda()}
            ${zonaNums && p.zonaId && p.zonaId !== zonaNums ? html`<span class="porconfirmar" style="padding:0 4px">Tu parcela está en la zona ${climaMod.NOMBRE_CORTO_ZONA[p.zonaId] || ''}. Estos números son de Umán (Noroeste); los de tu zona los calculará la app con el motor.</span>` : ''}
            <div class="seccion"><span class="seccion__titulo">Tus opciones</span><span class="seccion__nota">Ordenadas por ${prio().frase}</span></div>
            ${visibles().map((e, i) => tarjeta(e, i, tie))}
            ${ocultas().map(oculta)}
          `}

        <div class="nota-papel">
          <span class="mano">La decisión es tuya y de tu técnico</span>
          <p style="margin-top:6px;font-size:15px;line-height:1.5">La app no decide por ti: compara. Platica estas opciones con alguien de confianza antes de sembrar.</p>
        </div>
        ${avisoOjo('Ojo: esto viene de lo que pasó otros años', 'Usamos la lluvia y el calor de 1998 a 2025 en tu zona. No es un pronóstico: el próximo año puede ser distinto.')}
        <span class="fuente" style="padding:0 4px">${FUENTE === 'ejemplo' ? 'Números calculados por el equipo (Rol 3) con NASA GPM IMERG y MERRA-2 para Umán. Todavía no los calcula la app en tu teléfono.' : 'Calculado en tu teléfono con NASA GPM IMERG y MERRA-2 (1998–2025) y las reglas de cultivo (reglas.json).'}</span>
      </div>
      ${cabeza({ titulo: 'Opciones para tu parcela', sub: `${p.nombre}, ${superficie(p.superficieM2, p.unidadCaptura)}`, atras: { act: 'volver' }, etiquetaAtras: 'Volver' })}
    `);
    const sc2 = pantalla.querySelector('#scrollOpc');
    if (sc2) sc2.scrollTop = y;
  }

  async function cargar() {
    try {
      estado.error = null;
      estado.lista = await opcionesPara(parcela(), estado.prioridad);
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
      const t = textos((estado.lista || []).find((x) => x.id === b.dataset.id) || { id: b.dataset.id });
      b.setAttribute('aria-label', si ? 'Detener' : `Escuchar: ${t.titulo}`);
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
    const t = textos(e);
    const tc = e.criterios.tierraCubierta;
    const tie = empatadas();
    const lugar = tie.has(e.id) ? `Empata con otra opción para ${prio().frase}.` : e.posicion === 1 ? `Es la mejor para ${prio().frase}.` : '';
    return [
      `${t.titulo}.`, t.queEs, e.esActual ? '' : lugar,
      `Con esta opción tu tierra queda sin cubrir ${tc.de - tc.meses} de ${tc.de} meses.`,
      `En ${e.criterios.agua.aniosAfectados} de los últimos ${e.criterios.agua.deAnios} años faltó lluvia en la etapa más delicada.`,
      `Lo que ganas: ${t.gana}.`, `Lo que cuesta: ${t.cuesta}.`, t.alOido || '',
    ].filter(Boolean).join(' ');
  }

  function textoTodo() {
    const p = parcela();
    const v = visibles();
    const tie = empatadas();
    const nombres = (ids) => v.filter((e) => ids.has(e.id)).map((e) => textos(e).titulo);
    const cabezaTxt = tie.size
      ? `Para ${prio().frase} empatan: ${nombres(tie).join(' y ')}.`
      : v[0] ? `La mejor para ${prio().frase} es: ${textos(v[0]).titulo}.` : '';
    return [
      `Opciones para ${p.nombre}. Lo que más te importa es ${prio().frase}.`,
      cabezaTxt,
      ...v.map((e) => { const tc = e.criterios.tierraCubierta; return `${textos(e).titulo}: la tierra queda sin cubrir ${tc.de - tc.meses} meses de ${tc.de}.`; }),
      ...ocultas().map((e) => `${textos(e).titulo}: no se recomienda en tu suelo.`),
      'Toca la bocina de cada opción para escucharla completa. La decisión es tuya y de tu técnico.',
    ].filter(Boolean).join(' ');
  }

  // ---------------- Acciones ----------------
  const quitar = delegar(pantalla, 'click', {
    volver: () => { if (history.length > 1) history.back(); else ir(`#/parcelas/${id}`); },
    prioridad: (el) => {
      if (estado.prioridad === el.dataset.id) return;
      detenerVoz?.();
      estado.prioridad = el.dataset.id;
      const p = parcela();
      repos.parcelas.guardar({ ...p, prioridad: estado.prioridad, actualizadoEn: new Date().toISOString() });
      cargar();
    },
    porque: (el) => {
      const eid = el.dataset.id;
      if (estado.abiertas.has(eid)) estado.abiertas.delete(eid); else estado.abiertas.add(eid);
      pintarTodo();
      pantalla.querySelector(`[data-act="porque"][data-id="${eid}"]`)?.focus({ preventScroll: true });
    },
    escuchar: (el) => {
      const e = (estado.lista || []).find((x) => x.id === el.dataset.id);
      if (e) hablar(e.id, textoOpcion(e));
    },
    escucharTodo: () => hablar('todo', textoTodo()),
    elegir: (el) => {
      const e = (estado.lista || []).find((x) => x.id === el.dataset.id);
      if (!e) return;
      detenerVoz?.();
      const p = parcela();
      const t = textos(e);
      const f = hoy();
      const anioCiclo = f.getMonth() + 1 >= 7 ? f.getFullYear() + 1 : f.getFullYear();
      const guardada = repos.parcelas.guardar({ ...p, estrategiaElegida: { id: e.id, nombre: t.titulo, anioCiclo, fecha: new Date().toISOString() }, actualizadoEn: new Date().toISOString() });
      registrarEvento(guardada, { tipo: 'estrategia_elegida', titulo: `Elegiste: ${t.titulo}`, detalle: `Para el ciclo ${anioCiclo}. La decisión es tuya y de tu técnico.` });
      repos.kv.set('parcelaActivaId', p.id);
      avisar(e.esActual ? 'Guardado: sigues con tu milpa.' : 'Guardada. Te la marcamos en el calendario.');
      ir(`#/inicio?cal=${anioCiclo}-06`);
    },
  });

  pintarTodo();
  cargar();
  return () => { vivo = false; quitar(); detenerVoz?.(); callar(); };
}
