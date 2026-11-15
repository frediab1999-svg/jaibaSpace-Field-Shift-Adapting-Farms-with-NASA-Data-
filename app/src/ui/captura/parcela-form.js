// CUESTIONARIO DE LA PARCELA (alta y edición), en 4 pasos cortos, una idea por pantalla:
//   1. ¿Dónde está?            nombre y ubicación (mapa, GPS o municipio)
//   2. ¿Cómo está tu tierra?   «Ya la he sembrado» (caso Pablo) o «Nunca se ha sembrado» (caso Juan)
//   3. Tu suelo y tamaño
//   4. ¿Qué buscas?            comer, vender o cuidar la tierra
// Las respuestas alimentan el diagnóstico (motor/diagnostico.js), que decide qué estrategia se
// sugiere. Al guardar se pide el clima del punto exacto (modules/climate/climaPunto.js).
import { html, pintar, esc, presionado } from '../../shared/dom.js';
import { icono, pinMapa } from '../../shared/icons.js';
import { IMG, letrero } from '../../shared/assets.js';
import { fondo, cabeza } from '../layout.js';
import * as repos from '../../storage/repos.js';
import * as catalogo from '../../modules/crops/catalogo.js';
import * as climaMod from '../../modules/climate/clima.js';
import * as climaPunto from '../../modules/climate/climaPunto.js';
import * as reglasMod from '../../modules/strategies/reglas.js';
import * as parcelasMod from '../../modules/parcel/parcelas.js';
import { PREGUNTAS, prioridadDeObjetivo } from '../../motor/diagnostico.js';
import { aM2, deM2, equivalencias, MESES, numero } from '../../shared/format.js';
import { crearMapa, ubicarPorGps } from './mapa.js';
import { ir } from '../../app/router.js';
import { avisar } from '../../app/estado.js';

const PASOS = [
  { id: 'lugar', titulo: '¿Dónde está tu parcela?', mano: 'Cuéntanos de tu tierra' },
  { id: 'tierra', titulo: '¿Cómo está tu tierra?', mano: 'Lo que ha vivido' },
  { id: 'suelo', titulo: 'Tu suelo y tamaño', mano: 'Cómo es' },
  { id: 'objetivo', titulo: '¿Qué buscas con tu parcela?', mano: 'Lo que te importa' },
];

const OBJETIVO_TXT = {
  comer: 'Asegurar el maíz y el frijol de la casa',
  vender: 'Sacar un ingreso de lo que siembro',
  cuidar: 'Que la tierra me dure muchos años',
};

export async function montar(pantalla, params) {
  await Promise.all([climaMod.zonas(), reglasMod.reglas()]);
  const editando = params.id ? repos.parcelas.porId(params.id) : null;
  if (params.id && !editando) { ir('#/parcelas'); return null; }
  const anioActual = new Date().getFullYear();
  const L = catalogo.listas();

  const f = {
    nombre: editando?.nombre || '',
    unidad: editando?.unidadCaptura || 'ha',
    valor: editando ? String(Math.round(deM2(editando.superficieM2, editando.unidadCaptura || 'ha') * 100) / 100) : '',
    conDimensiones: !!editando?.dimensiones,
    largo: editando?.dimensiones?.largoM || '',
    ancho: editando?.dimensiones?.anchoM || '',
    sueloTexto: editando?.sueloTexto || '',
    usadaAntes: editando?.usadaAntes ?? null,
    aniosSeguidos: editando?.aniosSeguidos || null,
    descanso: editando?.descanso || null,
    quema: editando?.quema || null,
    senales: [...(editando?.senales || [])],
    resultado: editando?.resultadoReciente || null,
    cultivos: editando?.practica?.cultivos ? [...editando.practica.cultivos] : [],
    mes: editando?.practica?.mes || 6,
    usoPrevio: editando?.usoPrevio || null,
    desmonte: editando?.desmonte || null,
    plan: editando?.plan ? { cultivos: [...editando.plan.cultivos], mes: editando.plan.mes || 6 } : { cultivos: [], mes: 6 },
    objetivo: editando?.objetivo || null,
    ubicacion: editando?.ubicacion || null,
    ubicacionConfirmada: !!editando?.ubicacion,
  };
  const estado = { paso: 0, errores: {} };
  let mapa = null;

  const m2Actual = () => (f.conDimensiones ? (Number(f.largo) > 0 && Number(f.ancho) > 0 ? Number(f.largo) * Number(f.ancho) : null) : aM2(f.valor, f.unidad));

  // ---------- Piezas ----------
  const chips = (lista, act, sel, { multi = false } = {}) => html`<div class="chips">${lista.map((x) => html`<button type="button" class="chip" data-act="${act}" data-id="${x.id}" aria-pressed="${presionado(multi ? sel.includes(x.id) : sel === x.id)}">${x.name}</button>`)}</div>`;
  const chipsCultivos = (sel, act) => html`<div class="chips">${catalogo.cultivos().map((c) => html`<button type="button" class="chip" data-act="${act}" data-id="${c.id}" aria-pressed="${presionado(sel.includes(c.id))}"><span class="chip__punto" style="background:${c.color}"></span>${c.name}</button>`)}</div>`;
  const pregunta = (titulo, cuerpo, nota = '') => html`<div class="campo-grupo pregunta"><span class="etiqueta">${titulo}</span>${cuerpo}${nota ? html`<span class="ayuda">${nota}</span>` : ''}</div>`;
  const error = (k) => (estado.errores[k] ? html`<span class="error-txt" role="alert">${estado.errores[k]}</span>` : '');

  function bloqueLugar() {
    if (!f.ubicacion) return html`<span class="ayuda">Mueve el mapa hasta que el pin quede sobre tu parcela, o usa tu ubicación.</span>`;
    const m = f.ubicacion.origen === 'municipio'
      ? catalogo.municipios().find((x) => x.id === f.ubicacion.municipioId)
      : parcelasMod.municipioCercano(f.ubicacion)?.m;
    const listo = !!climaPunto.guardado(f.ubicacion);
    return html`<div class="mapa-pick__lugar">
      ${icono('pin', { color: '#f2cf7a', tam: 20 })}
      <span class="columna" style="gap:0"><strong>${f.ubicacion.origen === 'municipio' ? 'Municipio de' : 'Cerca de'} ${m?.name || 'tu comunidad'}${m?.estado ? `, ${m.estado}` : ''}</strong>
      <span>${listo ? 'Ya tenemos el clima de este punto.' : 'Al guardar traemos el clima de este punto (NASA, 1998 a 2025).'}</span></span>
    </div>`;
  }

  function bloqueSuperficie() {
    return html`
      ${f.conDimensiones ? html`<div class="fila" style="gap:8px">
          <div class="campo-grupo crece"><label class="etiqueta" for="largo">Largo <small>(metros)</small></label><input id="largo" class="campo" inputmode="decimal" value="${esc(f.largo)}" placeholder="Ej. 150"></div>
          <div class="campo-grupo crece"><label class="etiqueta" for="ancho">Ancho <small>(metros)</small></label><input id="ancho" class="campo" inputmode="decimal" value="${esc(f.ancho)}" placeholder="Ej. 158"></div>
        </div>` : html`<div class="columna" style="gap:8px">
          <label class="sr" for="valorSup">Superficie</label>
          <input id="valorSup" class="campo" inputmode="decimal" value="${esc(f.valor)}" placeholder="Ej. 2.5" aria-invalid="${estado.errores.superficie ? 'true' : 'false'}">
          <div class="segmento crece" role="group" aria-label="Unidad de superficie">${L.unidadesSuperficie.map((u) => html`<button type="button" data-act="unidad" data-u="${u.id}" aria-pressed="${presionado(f.unidad === u.id)}">${u.name}</button>`)}</div>
        </div>`}
      <span class="ayuda" id="eqSup">${textoEquivalencia()}</span>
      ${error('superficie')}
      <button type="button" class="btn btn--texto" data-act="dimensiones" style="align-self:flex-start;padding:0">${f.conDimensiones ? 'Mejor escribo la superficie' : '¿Sabes el largo y el ancho? Escríbelos'}</button>`;
  }
  function textoEquivalencia() {
    const m2 = m2Actual();
    if (!m2) return 'En metros cuadrados, mecates (20 × 20 m) o hectáreas.';
    return f.conDimensiones ? `${numero(m2, 0)} m². ${equivalencias(m2, 'm2')}` : equivalencias(m2, f.unidad);
  }

  function bloqueSuelo() {
    const r = catalogo.reconocerSuelo(f.sueloTexto);
    let msg = '';
    if (r.estado === 'reconocido') msg = html`<p class="nota-info" style="color:#cfe9c4">${icono('check', { color: '#9fd97a', tam: 18 })}<span>Lo reconocemos como <strong style="color:#fff">${r.suelo.name}</strong>: ${r.suelo.descripcion.toLowerCase()}.</span></p>`;
    else if (r.estado === 'parcial') msg = html`<p class="nota-info">${icono('info', { color: '#f2cf7a', tam: 18 })}<span>Parece <strong style="color:#fff">${r.suelo.name}</strong> (${r.suelo.descripcion.toLowerCase()}).</span></p>`;
    else if (r.estado === 'ambiguo') msg = html`<p class="nota-info">${icono('info', { color: '#f2cf7a', tam: 18 })}<span>Parece ${r.candidatos.map((c) => c.name).join(' o ')}. Toca el que se parezca más.</span></p>`;
    else if (r.estado === 'desconocido') msg = html`<p class="nota-info">${icono('info', { color: '#f2cf7a', tam: 18 })}<span>No lo reconocemos todavía: lo guardamos como lo escribiste.</span></p>`;
    return html`${msg}<div class="chips" aria-label="Suelos conocidos">${catalogo.suelos().map((s) => html`<button type="button" class="chip" data-act="sueloSug" data-v="${s.name}">${s.name}</button>`)}<button type="button" class="chip" data-act="sueloSug" data-v="">No sé</button></div>`;
  }

  // ---------- Pasos ----------
  function pasoLugar() {
    return html`
      <section class="tarjeta columna" style="gap:12px">
        <div class="campo-grupo">
          <label class="etiqueta" for="nombre">¿Cómo le dices a tu parcela?</label>
          <input id="nombre" class="campo" maxlength="60" value="${esc(f.nombre)}" placeholder="Ej. Milpa del cenote" aria-invalid="${estado.errores.nombre ? 'true' : 'false'}" autocomplete="off">
          ${error('nombre')}
        </div>
      </section>
      <div class="mapa-pick" id="mapaPick" data-moviendo="false">
        <div class="mapa-pick__lienzo" id="lienzoMapa"></div>
        <span class="mapa-pick__burbuja">Tu parcela está aquí</span>
        ${pinMapa()}<span class="mapa-pick__sombra"></span>
        <div class="mapa-pick__capa" role="group" aria-label="Tipo de mapa"><button type="button" data-act="capa" data-c="mapa" aria-pressed="true">Mapa</button><button type="button" data-act="capa" data-c="satelite" aria-pressed="false">Satélite</button></div>
        <div class="mapa-pick__acciones"><button type="button" class="btn-mapa" data-act="gps" aria-label="Usar mi ubicación">${icono('gps', { tam: 22 })}</button></div>
      </div>
      <div class="tarjeta" id="bloqueLugar" style="padding:12px 14px">${bloqueLugar()}</div>
      ${error('ubicacion')}
      <div class="campo-grupo">
        <label class="etiqueta" for="municipio">¿No carga el mapa? Elige tu municipio</label>
        <select id="municipio" class="campo"><option value="">Elige…</option>${catalogo.municipios().map((m) => html`<option value="${m.id}" ${f.ubicacion?.municipioId === m.id ? 'selected' : ''}>${m.name}, ${m.estado}</option>`)}</select>
      </div>
      <p class="nota-info">${icono('info', { color: '#9fd6db', tam: 18 })}<span>La ubicación exacta se queda en tu teléfono.</span></p>`;
  }

  function pasoTierra() {
    const sembrada = f.usadaAntes === true;
    const nueva = f.usadaAntes === false;
    return html`
      <div class="opciones-2" role="radiogroup" aria-label="¿Esta tierra ya se ha sembrado?">
        <button type="button" class="opcion" role="radio" data-act="usada" data-v="si" aria-pressed="${presionado(sembrada)}" aria-checked="${presionado(sembrada)}"><strong>Ya la he sembrado</strong><span>Varias veces o de años</span></button>
        <button type="button" class="opcion" role="radio" data-act="usada" data-v="no" aria-pressed="${presionado(nueva)}" aria-checked="${presionado(nueva)}"><strong>Nunca se ha sembrado</strong><span>Es monte, acahual o potrero</span></button>
      </div>
      ${error('usada')}
      ${sembrada ? html`<section class="tarjeta columna desplegable" style="gap:18px">
        ${pregunta('¿Qué siembras ahí?', chipsCultivos(f.cultivos, 'cultivo'))}
        <div class="campo-grupo pregunta"><label class="etiqueta" for="mesPractica">¿En qué mes siembras?</label>
          <select id="mesPractica" class="campo"><option value="">No me acuerdo</option>${MESES.map((m, i) => html`<option value="${i + 1}" ${f.mes === i + 1 ? 'selected' : ''}>${m}</option>`)}</select></div>
        ${pregunta('¿Cuántos años seguidos la has sembrado?', chips(L.aniosSeguidos, 'aniosSeguidos', f.aniosSeguidos))}
        ${pregunta('¿La dejas descansar?', chips(PREGUNTAS.descanso, 'descanso', f.descanso))}
        ${pregunta('¿Quemas antes de sembrar?', chips(PREGUNTAS.quema, 'quema', f.quema))}
        ${pregunta('¿Cómo te fue la última vez?', html`<div class="opciones-letrero" role="radiogroup" aria-label="Cómo te fue la última vez">
          ${[['bueno', 'bien', 'Bien'], ['regular', 'atencion', 'Regular'], ['malo', 'riesgo', 'Mal']].map(([id, img, txt]) => html`<button type="button" class="opcion-letrero" role="radio" data-act="resultado" data-id="${id}" aria-pressed="${presionado(f.resultado === id)}" aria-checked="${presionado(f.resultado === id)}"><img src="${letrero(img)}" alt="">${txt}</button>`)}
        </div>`)}
        ${pregunta('¿Has notado algo de esto?', chips(PREGUNTAS.senales, 'senal', f.senales, { multi: true }), 'Puedes elegir varias o ninguna.')}
      </section>` : ''}
      ${nueva ? html`<section class="tarjeta columna desplegable" style="gap:18px">
        ${pregunta('¿Qué hay hoy en el terreno?', chips(L.usoPrevio, 'usoPrevio', f.usoPrevio))}
        ${f.usoPrevio === 'monte' || f.usoPrevio === 'acahual' ? pregunta('¿Vas a tumbar todo el monte?', chips(PREGUNTAS.desmonte, 'desmonte', f.desmonte)) : ''}
        ${pregunta('¿Qué piensas sembrar?', chipsCultivos(f.plan.cultivos, 'planCultivo'))}
        <div class="campo-grupo pregunta"><label class="etiqueta" for="planMes">¿Cuándo piensas sembrar?</label>
          <select id="planMes" class="campo">${MESES.map((m, i) => html`<option value="${i + 1}" ${f.plan.mes === i + 1 ? 'selected' : ''}>${m}</option>`)}</select></div>
      </section>` : ''}`;
  }

  function pasoSuelo() {
    return html`<section class="tarjeta columna" style="gap:18px">
      <div class="campo-grupo"><span class="etiqueta">¿Qué tan grande es?</span><div id="bloqueSuperficie" class="columna" style="gap:8px">${bloqueSuperficie()}</div></div>
      <div class="campo-grupo">
        <label class="etiqueta" for="suelo">¿Qué tipo de suelo tiene? <small>(como tú le dices)</small></label>
        <input id="suelo" class="campo" maxlength="80" value="${esc(f.sueloTexto)}" placeholder="Ej. tsek'el con piedra, k'ankab rojo…" autocomplete="off">
        <div id="bloqueSuelo" class="columna" style="gap:8px">${bloqueSuelo()}</div>
      </div>
    </section>`;
  }

  function pasoObjetivo() {
    return html`<div class="columna" style="gap:10px" role="radiogroup" aria-label="¿Qué buscas con tu parcela?">
      ${PREGUNTAS.objetivo.map((o) => html`<button type="button" class="opcion opcion--ancha" role="radio" data-act="objetivo" data-id="${o.id}" aria-pressed="${presionado(f.objetivo === o.id)}" aria-checked="${presionado(f.objetivo === o.id)}">
        <strong>${o.name}</strong><span>${OBJETIVO_TXT[o.id]}</span></button>`)}
      ${error('objetivo')}
      <p class="nota-info">${icono('info', { color: '#9fd6db', tam: 18 })}<span>Con esto ordenamos las opciones que te mostramos. Puedes cambiarlo después.</span></p>
    </div>`;
  }

  const CUERPO = [pasoLugar, pasoTierra, pasoSuelo, pasoObjetivo];

  // ---------- Pantalla ----------
  function pintarTodo({ foco = false } = {}) {
    if (mapa) { mapa.destruir(); mapa = null; }
    const p = PASOS[estado.paso];
    const ultimo = estado.paso === PASOS.length - 1;
    pintar(pantalla, html`
      ${fondo()}
      <form class="scroll" id="formParcela" novalidate style="padding-bottom:130px">
        <div class="pasos entra d1" aria-label="Paso ${estado.paso + 1} de ${PASOS.length}">
          ${PASOS.map((x, i) => html`<span class="pasos__barra" data-estado="${i < estado.paso ? 'hecho' : i === estado.paso ? 'actual' : 'falta'}"></span>`)}
        </div>
        <div class="entra d1" style="padding:0 4px">
          <span class="hero__etiqueta">Paso ${estado.paso + 1} de ${PASOS.length} · ${p.mano}</span>
          <h1 class="titulo-grande" data-enfoque>${p.titulo}</h1>
        </div>
        <div class="columna entra d2" style="gap:14px">${CUERPO[estado.paso]()}</div>
        <div class="pasos__acciones">
          ${estado.paso > 0 ? html`<button type="button" class="btn btn--vidrio" data-act="atras">${icono('izq', { tam: 18 })}Atrás</button>` : ''}
          ${ultimo ? html`<button type="submit" class="btn btn--primario crece">${icono('check')}${editando ? 'Guardar cambios' : 'Ver cómo está mi tierra'}</button>`
            : html`<button type="button" class="btn btn--primario crece" data-act="siguiente">Siguiente${icono('der', { tam: 18 })}</button>`}
        </div>
        ${editando && !ultimo ? html`<button type="submit" class="btn btn--texto" style="align-self:center">Guardar cambios ahora</button>` : ''}
      </form>
      ${cabeza({ titulo: editando ? 'Editar parcela' : 'Tu parcela', sub: editando ? editando.nombre : 'Cuatro preguntas', atras: { act: 'salir' }, etiquetaAtras: 'Salir' })}
    `);
    if (estado.paso === 0) montarMapa();
    if (foco) pantalla.querySelector('h1')?.focus({ preventScroll: true });
    pantalla.querySelector('#formParcela')?.scrollTo?.({ top: 0 });
  }

  function montarMapa() {
    const pick = pantalla.querySelector('#mapaPick');
    if (!pick) return;
    crearMapa(pick, {
      inicial: f.ubicacion,
      alCambiar: (p) => {
        f.ubicacion = { lat: p.lat, lon: p.lon, precisionM: null, origen: 'mapa' };
        f.ubicacionConfirmada = true;
        delete estado.errores.ubicacion;
        const b = pantalla.querySelector('#bloqueLugar');
        if (b) pintar(b, bloqueLugar());
      },
      alError: (tipo) => {
        if (tipo === 'sin_leaflet') pintar(pantalla.querySelector('#lienzoMapa'), html`<div class="mapa-fallback" style="background-image:url('${IMG.mapa}');background-size:contain;background-color:#3e4631"></div>`);
        avisar('Sin internet el mapa no carga. Usa tu ubicación o elige tu municipio.');
      },
    }).then((m) => { mapa = m; });
  }

  // ---------- Validación por paso ----------
  function validar(paso) {
    const e = {};
    if (paso === 0) {
      if (!f.nombre.trim()) e.nombre = 'Ponle un nombre a tu parcela.';
      if (!f.ubicacionConfirmada) e.ubicacion = 'Mueve el mapa hasta tu parcela, usa tu ubicación o elige tu municipio.';
    }
    if (paso === 1 && f.usadaAntes === null) e.usada = 'Elige una de las dos.';
    if (paso === 2 && !m2Actual()) e.superficie = 'Escribe cuánto mide (solo números).';
    if (paso === 3 && !f.objetivo) e.objetivo = 'Elige lo que más buscas.';
    estado.errores = e;
    return !Object.keys(e).length;
  }

  // ---------- Guardar ----------
  function guardar() {
    for (let i = 0; i < PASOS.length; i++) {
      if (!validar(i)) { estado.paso = i; pintarTodo(); avisar('Falta un dato. Revisa lo que está en rojo.'); return; }
    }
    const m2 = m2Actual();
    const sembrada = f.usadaAntes === true;
    const datos = {
      nombre: f.nombre.trim(),
      superficieM2: Math.round(m2 * 100) / 100,
      unidadCaptura: f.conDimensiones ? (m2 >= 10000 ? 'ha' : 'mecate') : f.unidad,
      dimensiones: f.conDimensiones ? { largoM: Number(f.largo), anchoM: Number(f.ancho) } : null,
      sueloTexto: f.sueloTexto.trim() || null,
      usadaAntes: f.usadaAntes,
      // Caso Pablo: tierra sembrada
      aniosSeguidos: sembrada ? f.aniosSeguidos : null,
      descanso: sembrada ? f.descanso : null,
      quema: sembrada ? f.quema : null,
      senales: sembrada ? f.senales : [],
      resultadoReciente: sembrada ? f.resultado : null,
      practica: sembrada && f.cultivos.length ? { cultivos: f.cultivos, mes: f.mes || null } : null,
      // Caso Juan: tierra nueva
      usoPrevio: sembrada ? null : f.usoPrevio,
      desmonte: !sembrada && (f.usoPrevio === 'monte' || f.usoPrevio === 'acahual') ? f.desmonte : null,
      plan: !sembrada && f.plan.cultivos.length ? f.plan : null,
      objetivo: f.objetivo,
      prioridad: prioridadDeObjetivo(f.objetivo),
      ubicacion: f.ubicacion,
    };
    let p;
    if (editando) {
      p = parcelasMod.actualizar(editando.id, datos);
      avisar('Cambios guardados');
    } else {
      p = parcelasMod.crear(datos, {
        // Lo que siembra hoy queda como su última temporada: es la «estrategia actual» de la comparación
        anterior: sembrada && f.cultivos.length ? { cultivos: f.cultivos, anio: anioActual - 1, mes: f.mes || null, resultado: f.resultado || 'regular', causa: null, cantidad: null } : null,
      });
      repos.kv.set('parcelaActivaId', p.id);
    }
    climaPunto.asegurar(p); // en segundo plano: el diagnóstico se actualiza cuando llegue
    ir(`#/diagnostico/${p.id}${editando ? '' : '?nueva=1'}`);
  }

  // ---------- Eventos ----------
  const alternar = (lista, id) => { const i = lista.indexOf(id); if (i >= 0) lista.splice(i, 1); else lista.push(id); };
  const marcar = (cont, sel) => cont.querySelectorAll('[data-act]').forEach((b) => { b.setAttribute('aria-pressed', presionado(sel(b))); if (b.getAttribute('role') === 'radio') b.setAttribute('aria-checked', presionado(sel(b))); });

  const onInput = (e) => {
    const id = e.target.id;
    if (id === 'nombre') f.nombre = e.target.value;
    if (id === 'valorSup') { f.valor = e.target.value; pintar(pantalla.querySelector('#eqSup'), textoEquivalencia()); }
    if (id === 'largo' || id === 'ancho') { f[id] = e.target.value; pintar(pantalla.querySelector('#eqSup'), textoEquivalencia()); }
    if (id === 'suelo') { f.sueloTexto = e.target.value; pintar(pantalla.querySelector('#bloqueSuelo'), bloqueSuelo()); }
  };
  const onChange = (e) => {
    const id = e.target.id;
    if (id === 'mesPractica') f.mes = e.target.value ? Number(e.target.value) : null;
    if (id === 'planMes') f.plan.mes = Number(e.target.value);
    if (id === 'municipio' && e.target.value) {
      const m = catalogo.municipios().find((x) => x.id === e.target.value);
      f.ubicacion = { lat: m.lat, lon: m.lon, precisionM: 5000, origen: 'municipio', municipioId: m.id };
      f.ubicacionConfirmada = true;
      mapa?.irA(f.ubicacion, 13);
      pintar(pantalla.querySelector('#bloqueLugar'), bloqueLugar());
    }
  };
  const onClick = async (e) => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const act = b.dataset.act;
    const id = b.dataset.id;
    if (act === 'siguiente') {
      if (!validar(estado.paso)) { pintarTodo(); avisar('Falta un dato. Revisa lo que está en rojo.'); return; }
      estado.paso++; pintarTodo({ foco: true });
    } else if (act === 'atras') { estado.errores = {}; estado.paso--; pintarTodo({ foco: true }); }
    else if (act === 'salir') { if (history.length > 1) history.back(); else ir(editando ? `#/parcelas/${editando.id}` : '#/parcelas'); }
    else if (act === 'usada') { f.usadaAntes = b.dataset.v === 'si'; delete estado.errores.usada; pintarTodo(); }
    else if (act === 'cultivo') { alternar(f.cultivos, id); b.setAttribute('aria-pressed', presionado(f.cultivos.includes(id))); }
    else if (act === 'planCultivo') { alternar(f.plan.cultivos, id); b.setAttribute('aria-pressed', presionado(f.plan.cultivos.includes(id))); }
    else if (act === 'senal') { alternar(f.senales, id); b.setAttribute('aria-pressed', presionado(f.senales.includes(id))); }
    else if (['aniosSeguidos', 'descanso', 'quema', 'desmonte'].includes(act)) { f[act] = id; marcar(b.parentElement, (x) => x.dataset.id === id); }
    else if (act === 'usoPrevio') { f.usoPrevio = id; pintarTodo(); }
    else if (act === 'resultado') { f.resultado = id; marcar(b.parentElement, (x) => x.dataset.id === id); }
    else if (act === 'objetivo') { f.objetivo = id; delete estado.errores.objetivo; marcar(b.parentElement, (x) => x.dataset.id === id); }
    else if (act === 'unidad') {
      const m2 = aM2(f.valor, f.unidad);
      f.unidad = b.dataset.u;
      if (m2) f.valor = String(Math.round(deM2(m2, f.unidad) * 100) / 100);
      pintar(pantalla.querySelector('#bloqueSuperficie'), bloqueSuperficie());
    } else if (act === 'dimensiones') { f.conDimensiones = !f.conDimensiones; pintar(pantalla.querySelector('#bloqueSuperficie'), bloqueSuperficie()); }
    else if (act === 'sueloSug') { f.sueloTexto = b.dataset.v; pantalla.querySelector('#suelo').value = f.sueloTexto; pintar(pantalla.querySelector('#bloqueSuelo'), bloqueSuelo()); }
    else if (act === 'capa') { mapa?.usarCapa(b.dataset.c); marcar(b.parentElement, (x) => x.dataset.c === b.dataset.c); }
    else if (act === 'gps') {
      b.disabled = true;
      try {
        const p = await ubicarPorGps();
        f.ubicacion = p; f.ubicacionConfirmada = true; delete estado.errores.ubicacion;
        mapa?.irA(p, 17);
        pintar(pantalla.querySelector('#bloqueLugar'), bloqueLugar());
        avisar('Listo, te ubicamos.');
      } catch (err) { avisar(err.message); } finally { b.disabled = false; }
    }
  };
  const onSubmit = (e) => { e.preventDefault(); guardar(); };
  pantalla.addEventListener('input', onInput);
  pantalla.addEventListener('change', onChange);
  pantalla.addEventListener('click', onClick);
  pantalla.addEventListener('submit', onSubmit);

  pintarTodo();
  return () => {
    mapa?.destruir();
    pantalla.removeEventListener('input', onInput);
    pantalla.removeEventListener('change', onChange);
    pantalla.removeEventListener('click', onClick);
    pantalla.removeEventListener('submit', onSubmit);
  };
}
