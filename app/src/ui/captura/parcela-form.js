// Formulario de parcela (alta y edición). Captura: nombre, superficie (m², mecates o
// hectáreas), suelo en texto libre, si ya se sembró antes (con preguntas que cambian
// según la respuesta), prioridad, foto opcional y ubicación exacta en el mapa.
import { html, pintar, esc, presionado } from '../../shared/dom.js';
import { icono, pinMapa, subrayado } from '../../shared/icons.js';
import { IMG, letrero } from '../../shared/assets.js';
import { fondo, cabeza } from '../layout.js';
import * as repos from '../../storage/repos.js';
import * as catalogo from '../../modules/crops/catalogo.js';
import * as climaMod from '../../modules/climate/clima.js';
import * as reglasMod from '../../modules/strategies/reglas.js';
import * as parcelasMod from '../../modules/parcel/parcelas.js';
import { aM2, deM2, equivalencias, MESES, numero } from '../../shared/format.js';
import { crearMapa, ubicarPorGps } from './mapa.js';
import { ir } from '../../app/router.js';
import { avisar } from '../../app/estado.js';

export async function montar(pantalla, params) {
  await Promise.all([climaMod.zonas(), reglasMod.reglas()]);
  const editando = params.id ? repos.parcelas.porId(params.id) : null;
  if (params.id && !editando) { ir('#/parcelas'); return; }
  const anioActual = new Date().getFullYear();

  const f = editando ? {
    nombre: editando.nombre,
    unidad: editando.unidadCaptura || 'ha',
    valor: String(Math.round(deM2(editando.superficieM2, editando.unidadCaptura || 'ha') * 100) / 100),
    conDimensiones: !!editando.dimensiones,
    largo: editando.dimensiones?.largoM || '',
    ancho: editando.dimensiones?.anchoM || '',
    sueloTexto: editando.sueloTexto || '',
    usadaAntes: editando.usadaAntes,
    aniosSeguidos: editando.aniosSeguidos || null,
    usoPrevio: editando.usoPrevio || null,
    plan: editando.plan || { cultivos: [], mes: 6 },
    prioridad: editando.prioridad || null,
    ubicacion: editando.ubicacion || null,
    ubicacionConfirmada: !!editando.ubicacion,
    foto: editando.foto || null,
    anterior: null,
  } : {
    nombre: '', unidad: 'ha', valor: '', conDimensiones: false, largo: '', ancho: '', sueloTexto: '',
    usadaAntes: null, aniosSeguidos: null, usoPrevio: null, plan: { cultivos: [], mes: 6 }, prioridad: null,
    ubicacion: null, ubicacionConfirmada: false, foto: null,
    anterior: { cultivos: [], anio: anioActual - 1, mes: 6, resultado: null, causa: null, cantidad: '', unidadCosecha: 'kg', esEstimacion: true },
  };
  const errores = {};
  let mapa = null;

  const m2Actual = () => (f.conDimensiones ? (Number(f.largo) > 0 && Number(f.ancho) > 0 ? Number(f.largo) * Number(f.ancho) : null) : aM2(f.valor, f.unidad));
  const L = catalogo.listas();

  // ---------- Bloques que se repintan solos ----------
  const bloqueSuperficie = () => html`
    ${f.conDimensiones ? html`
      <div class="fila" style="gap:8px">
        <div class="campo-grupo crece"><label class="etiqueta" for="largo">Largo <small>(metros)</small></label><input id="largo" class="campo" inputmode="decimal" value="${esc(f.largo)}" placeholder="Ej. 150"></div>
        <div class="campo-grupo crece"><label class="etiqueta" for="ancho">Ancho <small>(metros)</small></label><input id="ancho" class="campo" inputmode="decimal" value="${esc(f.ancho)}" placeholder="Ej. 158"></div>
      </div>` : html`
      <div class="columna" style="gap:8px">
        <label class="sr" for="valorSup">Superficie</label>
        <input id="valorSup" class="campo" inputmode="decimal" value="${esc(f.valor)}" placeholder="Ej. 2.37" aria-invalid="${errores.superficie ? 'true' : 'false'}" aria-describedby="eqSup">
        <div class="segmento crece" role="group" aria-label="Unidad de superficie">
          ${L.unidadesSuperficie.map((u) => html`<button type="button" data-act="unidad" data-u="${u.id}" aria-pressed="${presionado(f.unidad === u.id)}">${u.name}</button>`)}
        </div>
      </div>`}
    <span class="ayuda" id="eqSup">${textoEquivalencia()}</span>
    ${errores.superficie ? html`<span class="error-txt">${errores.superficie}</span>` : ''}
    <button type="button" class="btn btn--texto" data-act="dimensiones" style="align-self:flex-start;padding:0">${f.conDimensiones ? 'Mejor escribo la superficie' : '¿Sabes el largo y el ancho? Escríbelos'}</button>`;

  function textoEquivalencia() {
    const m2 = m2Actual();
    if (!m2) return 'Puedes usar metros cuadrados, mecates (20 × 20 m) o hectáreas.';
    return f.conDimensiones ? `${numero(m2, 0)} m². ${equivalencias(m2, 'm2')}` : equivalencias(m2, f.unidad);
  }

  const bloqueSuelo = () => {
    const r = catalogo.reconocerSuelo(f.sueloTexto);
    const sug = catalogo.suelos();
    let msg = '';
    if (r.estado === 'reconocido') msg = html`<p class="nota-info" style="color:#cfe9c4">${icono('check', { color: '#9fd97a', tam: 18 })}<span>Lo reconocemos como <strong style="color:#fff">${r.suelo.name}${r.suelo.equivalenteWRB ? ` (${r.suelo.equivalenteWRB})` : ''}</strong>: ${r.suelo.descripcion.toLowerCase()}. Con esto afinamos la predicción.</span></p>`;
    else if (r.estado === 'parcial') msg = html`<p class="nota-info">${icono('info', { color: '#f2cf7a', tam: 18 })}<span>Parece <strong style="color:#fff">${r.suelo.name}</strong> (${r.suelo.descripcion.toLowerCase()}). Todavía no tenemos datos de cómo se porta con cada cultivo.</span></p>`;
    else if (r.estado === 'ambiguo') msg = html`<p class="nota-info">${icono('info', { color: '#f2cf7a', tam: 18 })}<span>Parece ${r.candidatos.map((c) => c.name).join(' o ')}. Toca abajo el que se parezca más.</span></p>`;
    else if (r.estado === 'desconocido') msg = html`<p class="nota-info">${icono('info', { color: '#f2cf7a', tam: 18 })}<span>No lo reconocemos todavía. Lo guardamos tal cual lo escribiste y no lo usaremos para calcular.</span></p>`;
    return html`${msg}<div class="chips" aria-label="Suelos conocidos">${sug.map((s) => html`<button type="button" class="chip" data-act="sueloSug" data-v="${s.name}" style="min-height:38px;font-size:14px">${s.name}</button>`)}<button type="button" class="chip" data-act="sueloSug" data-v="" style="min-height:38px;font-size:14px">No sé</button></div>`;
  };

  const chipsCultivos = (sel, act) => html`<div class="chips">${catalogo.cultivos().map((c) => html`<button type="button" class="chip" data-act="${act}" data-id="${c.id}" aria-pressed="${presionado(sel.includes(c.id))}"><span class="chip__punto" style="background:${c.color}"></span>${c.name}</button>`)}</div>`;

  const bloqueUso = () => {
    if (f.usadaAntes === null || f.usadaAntes === undefined) return '';
    if (f.usadaAntes) {
      const a = f.anterior;
      return html`<div class="columna desplegable" style="gap:16px">
        ${a ? html`
          <div class="campo-grupo"><span class="etiqueta">¿Qué sembraste la última vez?</span>${chipsCultivos(a.cultivos, 'antCultivo')}
            ${errores.anterior ? html`<span class="error-txt">${errores.anterior}</span>` : ''}</div>
          <div class="fila" style="gap:8px">
            <div class="campo-grupo crece"><label class="etiqueta" for="antAnio">¿En qué año?</label>
              <select id="antAnio" class="campo">${Array.from({ length: 12 }, (_, i) => anioActual - i).map((y) => html`<option value="${y}" ${a.anio === y ? 'selected' : ''}>${y}</option>`)}</select></div>
            <div class="campo-grupo crece"><label class="etiqueta" for="antMes">¿En qué mes?</label>
              <select id="antMes" class="campo"><option value="">No me acuerdo</option>${MESES.map((m, i) => html`<option value="${i + 1}" ${a.mes === i + 1 ? 'selected' : ''}>${m}</option>`)}</select></div>
          </div>
          <div class="campo-grupo"><span class="etiqueta">¿Cómo te fue?</span>
            <div class="opciones-letrero" role="radiogroup" aria-label="Cómo te fue">
              ${[['bueno', 'bien', 'Bien'], ['regular', 'atencion', 'Regular'], ['malo', 'riesgo', 'Mal']].map(([id, img, txt]) => html`<button type="button" class="opcion-letrero" role="radio" data-act="antResultado" data-id="${id}" aria-pressed="${presionado(a.resultado === id)}" aria-checked="${presionado(a.resultado === id)}"><img src="${letrero(img)}" alt="">${txt}</button>`)}
            </div></div>
          ${a.resultado === 'regular' || a.resultado === 'malo' ? html`<div class="campo-grupo desplegable"><span class="etiqueta">¿Qué crees que pasó?</span>
            <div class="chips">${L.causasPercibidas.map((c) => html`<button type="button" class="chip" data-act="antCausa" data-id="${c.id}" aria-pressed="${presionado(a.causa === c.id)}">${c.name}</button>`)}</div></div>` : ''}
          <div class="campo-grupo"><label class="etiqueta" for="antCantidad">¿Cuánto cosechaste? <small>(opcional)</small></label>
            <div class="campo-unidad"><input id="antCantidad" class="campo" inputmode="decimal" value="${esc(a.cantidad)}" placeholder="Ej. 18" style="max-width:120px">
              <label class="sr" for="antUnidad">Unidad</label><select id="antUnidad" class="campo">${L.unidadesCosecha.map((u) => html`<option value="${u.id}" ${a.unidadCosecha === u.id ? 'selected' : ''}>${u.name}</option>`)}</select></div>
            <label class="fila" style="gap:8px;font-size:14.5px;min-height:44px"><input type="checkbox" id="antEstimacion" ${a.esEstimacion ? 'checked' : ''} style="width:22px;height:22px;accent-color:#d81159">Es un cálculo aproximado</label></div>
        ` : html`<p class="nota-info">${icono('info', { color: '#9fd6db', tam: 18 })}<span>Tus temporadas pasadas se editan en Información.</span></p>`}
        <div class="campo-grupo"><span class="etiqueta">¿Cuántos años seguidos la has sembrado?</span>
          <div class="chips">${L.aniosSeguidos.map((x) => html`<button type="button" class="chip" data-act="aniosSeguidos" data-id="${x.id}" aria-pressed="${presionado(f.aniosSeguidos === x.id)}">${x.name}</button>`)}</div></div>
        ${a ? html`<p class="nota-info">${icono('historial', { color: '#9fd6db', tam: 18 })}<span>Esa siembra queda guardada como tu primera temporada en Información.</span></p>` : ''}
      </div>`;
    }
    return html`<div class="columna desplegable" style="gap:16px">
      <div class="campo-grupo"><span class="etiqueta">¿Qué había antes en este terreno?</span>
        <div class="chips">${L.usoPrevio.map((x) => html`<button type="button" class="chip" data-act="usoPrevio" data-id="${x.id}" aria-pressed="${presionado(f.usoPrevio === x.id)}">${x.name}</button>`)}</div></div>
      <div class="campo-grupo"><span class="etiqueta">¿Qué piensas sembrar?</span>${chipsCultivos(f.plan.cultivos, 'planCultivo')}</div>
      <div class="campo-grupo"><label class="etiqueta" for="planMes">¿Cuándo piensas sembrar?</label>
        <select id="planMes" class="campo">${MESES.map((m, i) => html`<option value="${i + 1}" ${f.plan.mes === i + 1 ? 'selected' : ''}>${m}</option>`)}</select></div>
    </div>`;
  };

  const bloqueLugar = () => {
    if (!f.ubicacion) return html`<span class="ayuda">Mueve el mapa hasta que el pin quede sobre tu parcela.</span>`;
    if (f.ubicacion.origen === 'municipio') {
      // Solo se conoce el municipio: la zona sale del catálogo municipal si existe; si no, queda pendiente
      const m = catalogo.municipios().find((x) => x.id === f.ubicacion.municipioId);
      const zona = m?.zonaId ? climaMod.zonaPorId(m.zonaId) : null;
      return html`<div class="mapa-pick__lugar">
        <span style="width:12px;height:12px;border-radius:50%;flex-shrink:0;background:${zona ? climaMod.COLOR_ZONA[zona.id] : '#9a8f7c'};box-shadow:0 0 0 3px rgba(255,255,255,.85)"></span>
        <span class="columna" style="gap:0"><strong>Municipio de ${m?.name || ''}, ${m?.estado || ''}</strong>
        <span>${zona ? `Zona ${climaMod.NOMBRE_CORTO_ZONA[zona.id]}, por tu municipio. No tenemos el punto exacto de tu parcela.` : 'No tenemos el punto exacto de tu parcela.'}</span></span>
      </div>
      ${zona ? '' : html`<p class="porconfirmar" style="margin-top:8px">Cobertura pendiente: este municipio todavía no tiene una zona de clima asignada. Si puedes, marca tu parcela en el mapa para usar el punto de clima más cercano.</p>`}`;
    }
    const z = climaMod.zonaMasCercana(f.ubicacion);
    const mun = parcelasMod.municipioCercano(f.ubicacion);
    return html`<div class="mapa-pick__lugar">
      <span style="width:12px;height:12px;border-radius:50%;flex-shrink:0;background:${climaMod.COLOR_ZONA[z.zona.id]};box-shadow:0 0 0 3px rgba(255,255,255,.85)"></span>
      <span class="columna" style="gap:0"><strong>Cerca de ${mun?.m.name || 'tu comunidad'}, ${mun?.m.estado || ''}</strong>
      <span>Zona ${climaMod.NOMBRE_CORTO_ZONA[z.zona.id]}, a ${numero(z.km, 1)} km del punto de clima de ${z.zona.nombre.match(/\(([^)]+)\)/)?.[1] || z.zona.nombre}. ${f.ubicacion.lat.toFixed(4)}, ${f.ubicacion.lon.toFixed(4)}${f.ubicacion.precisionM ? `, precisión ${f.ubicacion.precisionM} m` : ''}</span></span>
    </div>
    ${z.km > 50 ? html`<p class="porconfirmar" style="margin-top:8px">Tu parcela queda lejos del punto de clima más cercano. Por ahora solo hay datos de 3 de las 7 zonas: tómalo como referencia regional.</p>` : ''}`;
  };

  const repintar = (id, contenido) => pintar(pantalla.querySelector(id), contenido);

  // ---------- Pantalla ----------
  pintar(pantalla, html`
    ${fondo()}
    <form class="scroll" id="formParcela" novalidate style="padding-bottom:120px">
      <div class="hero entra d1">
        <span class="hero__aro" aria-hidden="true"><span class="hero__circulo"><img src="${IMG.nodos.parcelas}" alt=""></span></span>
        <div class="columna" style="gap:4px"><span class="hero__etiqueta">Lu'um</span><span class="mano" style="font-size:25px">${editando ? 'Ajusta tu parcela' : 'Cuéntanos de tu tierra'}</span></div>
      </div>
      <div class="entra d2" style="padding:0 4px"><h1 class="titulo-grande">${editando ? `Editar ${editando.nombre}` : 'Nueva parcela'}</h1>${subrayado(170)}</div>

      <section class="tarjeta columna entra d3" style="gap:18px">
        <div class="campo-grupo">
          <label class="etiqueta" for="nombre">¿Cómo le dices a tu parcela?</label>
          <input id="nombre" class="campo" maxlength="60" value="${esc(f.nombre)}" placeholder="Ej. Milpa del cenote" aria-invalid="${errores.nombre ? 'true' : 'false'}" autocomplete="off">
          <span id="errNombre"></span>
        </div>
        <div class="campo-grupo"><span class="etiqueta">¿Qué tan grande es?</span><div id="bloqueSuperficie" class="columna" style="gap:8px">${bloqueSuperficie()}</div></div>
        <div class="campo-grupo">
          <label class="etiqueta" for="suelo">¿Qué tipo de suelo tiene? <small>(escríbelo como tú le dices)</small></label>
          <input id="suelo" class="campo" maxlength="80" value="${esc(f.sueloTexto)}" placeholder="Ej. tsek'el con piedra, k'ankab rojo…" autocomplete="off">
          <div id="bloqueSuelo" class="columna" style="gap:8px">${bloqueSuelo()}</div>
        </div>
      </section>

      <section class="tarjeta columna entra d4" style="gap:14px">
        <span class="etiqueta" style="font-size:17px">¿Esta tierra ya se ha sembrado antes?</span>
        <div class="opciones-2" role="radiogroup" aria-label="¿Esta tierra ya se ha sembrado antes?">
          <button type="button" class="opcion" role="radio" data-act="usada" data-v="si" aria-pressed="${presionado(f.usadaAntes === true)}" aria-checked="${presionado(f.usadaAntes === true)}"><strong>Sí, ya se usó</strong><span>Te pregunto cómo le fue</span></button>
          <button type="button" class="opcion" role="radio" data-act="usada" data-v="no" aria-pressed="${presionado(f.usadaAntes === false)}" aria-checked="${presionado(f.usadaAntes === false)}"><strong>No, es nueva</strong><span>Te pregunto qué había</span></button>
        </div>
        <div id="bloqueUso">${bloqueUso()}</div>
        <div class="campo-grupo"><span class="etiqueta">¿Qué te importa más esta temporada?</span>
          <div class="chips" id="bloquePrioridad">${reglasMod.prioridades().map((p) => html`<button type="button" class="chip" data-act="prioridad" data-id="${p.id}" aria-pressed="${presionado(f.prioridad === p.id)}">${p.name}</button>`)}</div>
          <span class="ayuda">Nos ayuda a ordenar lo que te mostramos. Puedes cambiarlo después.</span></div>
      </section>

      <section class="tarjeta columna entra d5" style="gap:12px">
        <span class="etiqueta" style="font-size:17px">Foto de tu parcela <small>(opcional)</small></span>
        <div id="bloqueFoto">${f.foto ? html`<figure class="polaroid polaroid--izq" style="width:220px"><img src="${f.foto}" alt="Foto de la parcela"><figcaption>${f.nombre || 'Mi parcela'}</figcaption></figure>` : ''}</div>
        <label class="btn btn--vidrio" style="align-self:flex-start">${icono('mas')}${f.foto ? 'Cambiar foto' : 'Tomar o elegir foto'}<input type="file" accept="image/*" capture="environment" id="foto" class="sr"></label>
        <span class="ayuda">Se queda en tu teléfono. No se envía.</span>
      </section>

      <section class="columna entra d6" style="gap:10px">
        <div class="seccion"><span class="seccion__titulo">¿Dónde está?</span><span class="seccion__nota">Mueve el mapa</span></div>
        <div class="mapa-pick" id="mapaPick" data-moviendo="false">
          <div class="mapa-pick__lienzo" id="lienzoMapa"></div>
          <span class="mapa-pick__burbuja">Tu parcela está aquí</span>
          ${pinMapa()}<span class="mapa-pick__sombra"></span>
          <div class="mapa-pick__capa" role="group" aria-label="Tipo de mapa"><button type="button" data-act="capa" data-c="mapa" aria-pressed="true">Mapa</button><button type="button" data-act="capa" data-c="satelite" aria-pressed="false">Satélite</button></div>
          <div class="mapa-pick__acciones"><button type="button" class="btn-mapa" data-act="gps" aria-label="Usar mi ubicación">${icono('gps', { tam: 22 })}</button></div>
        </div>
        <div class="tarjeta" id="bloqueLugar" style="padding:12px 14px">${bloqueLugar()}</div>
        <div class="campo-grupo">
          <label class="etiqueta" for="municipio">¿No carga el mapa? Elige tu municipio</label>
          <select id="municipio" class="campo"><option value="">Elige…</option>${catalogo.municipios().map((m) => html`<option value="${m.id}">${m.name}, ${m.estado}</option>`)}</select>
        </div>
        <span id="errUbicacion"></span>
        <p class="nota-info">${icono('info', { color: '#9fd6db', tam: 18 })}<span>La ubicación exacta se queda en tu teléfono. Si decides compartir tus cosechas, solo viaja la zona.</span></p>
      </section>
      <button type="submit" class="btn btn--primario btn--bloque" style="position:sticky;bottom:12px;z-index:3;min-height:58px;font-size:17.5px">${icono('check')}${editando ? 'Guardar cambios' : 'Guardar parcela'}</button>
    </form>
    ${cabeza({ titulo: editando ? 'Editar parcela' : 'Agregar parcela', sub: 'Tus parcelas', atras: editando ? `#/parcelas/${editando.id}` : '#/parcelas', etiquetaAtras: 'Volver' })}
  `);

  // ---------- Mapa ----------
  const pick = pantalla.querySelector('#mapaPick');
  crearMapa(pick, {
    inicial: f.ubicacion,
    alCambiar: (p) => { f.ubicacion = { lat: p.lat, lon: p.lon, precisionM: null, origen: 'mapa' }; f.ubicacionConfirmada = true; repintar('#bloqueLugar', bloqueLugar()); repintar('#errUbicacion', ''); },
    alError: (tipo) => {
      if (tipo === 'sin_leaflet') pintar(pantalla.querySelector('#lienzoMapa'), html`<div class="mapa-fallback" style="background-image:url('${IMG.mapa}');background-size:contain;background-color:#3e4631"></div>`);
      avisar('Sin internet el mapa no carga. Usa tu ubicación o elige tu municipio.');
    },
  }).then((m) => { mapa = m; if (!f.ubicacion && m) { /* espera a que la persona mueva el mapa */ } });

  // ---------- Eventos ----------
  const form = pantalla.querySelector('#formParcela');
  const onInput = (e) => {
    const id = e.target.id;
    if (id === 'nombre') f.nombre = e.target.value;
    if (id === 'valorSup') { f.valor = e.target.value; repintar('#eqSup', textoEquivalencia()); }
    if (id === 'largo' || id === 'ancho') { f[id] = e.target.value; repintar('#eqSup', textoEquivalencia()); }
    if (id === 'suelo') { f.sueloTexto = e.target.value; repintar('#bloqueSuelo', bloqueSuelo()); }
    if (id === 'antCantidad') f.anterior.cantidad = e.target.value;
  };
  const onChange = async (e) => {
    const id = e.target.id;
    if (id === 'antAnio') f.anterior.anio = Number(e.target.value);
    if (id === 'antMes') f.anterior.mes = e.target.value ? Number(e.target.value) : null;
    if (id === 'antUnidad') f.anterior.unidadCosecha = e.target.value;
    if (id === 'antEstimacion') f.anterior.esEstimacion = e.target.checked;
    if (id === 'planMes') f.plan.mes = Number(e.target.value);
    if (id === 'municipio' && e.target.value) {
      const m = catalogo.municipios().find((x) => x.id === e.target.value);
      f.ubicacion = { lat: m.lat, lon: m.lon, precisionM: 5000, origen: 'municipio', municipioId: m.id };
      f.ubicacionConfirmada = true;
      mapa?.irA(f.ubicacion, 13);
      repintar('#bloqueLugar', bloqueLugar());
    }
    if (id === 'foto' && e.target.files?.[0]) {
      f.foto = await reducirFoto(e.target.files[0]);
      repintar('#bloqueFoto', html`<figure class="polaroid polaroid--izq" style="width:220px"><img src="${f.foto}" alt="Foto de la parcela"><figcaption>${f.nombre || 'Mi parcela'}</figcaption></figure>`);
    }
  };
  const marcar = (cont, sel) => cont.querySelectorAll('[data-act]').forEach((b) => b.setAttribute('aria-pressed', presionado(sel(b))));
  const onClick = async (e) => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const act = b.dataset.act;
    if (act === 'unidad') {
      const m2 = aM2(f.valor, f.unidad);
      f.unidad = b.dataset.u;
      if (m2) f.valor = String(Math.round(deM2(m2, f.unidad) * 100) / 100);
      repintar('#bloqueSuperficie', bloqueSuperficie());
    } else if (act === 'dimensiones') {
      f.conDimensiones = !f.conDimensiones;
      repintar('#bloqueSuperficie', bloqueSuperficie());
    } else if (act === 'sueloSug') {
      f.sueloTexto = b.dataset.v;
      pantalla.querySelector('#suelo').value = f.sueloTexto;
      repintar('#bloqueSuelo', bloqueSuelo());
    } else if (act === 'usada') {
      f.usadaAntes = b.dataset.v === 'si';
      marcar(b.parentElement, (x) => (x.dataset.v === 'si') === f.usadaAntes);
      b.parentElement.querySelectorAll('[role="radio"]').forEach((x) => x.setAttribute('aria-checked', x.getAttribute('aria-pressed')));
      repintar('#bloqueUso', bloqueUso());
    } else if (act === 'antCultivo') {
      const l = f.anterior.cultivos; const i = l.indexOf(b.dataset.id); if (i >= 0) l.splice(i, 1); else l.push(b.dataset.id);
      b.setAttribute('aria-pressed', presionado(l.includes(b.dataset.id)));
    } else if (act === 'antResultado') {
      f.anterior.resultado = b.dataset.id; if (f.anterior.resultado === 'bueno') f.anterior.causa = null;
      repintar('#bloqueUso', bloqueUso());
    } else if (act === 'antCausa') {
      f.anterior.causa = b.dataset.id; marcar(b.parentElement, (x) => x.dataset.id === f.anterior.causa);
    } else if (act === 'aniosSeguidos') {
      f.aniosSeguidos = b.dataset.id; marcar(b.parentElement, (x) => x.dataset.id === f.aniosSeguidos);
    } else if (act === 'usoPrevio') {
      f.usoPrevio = b.dataset.id; marcar(b.parentElement, (x) => x.dataset.id === f.usoPrevio);
    } else if (act === 'planCultivo') {
      const l = f.plan.cultivos; const i = l.indexOf(b.dataset.id); if (i >= 0) l.splice(i, 1); else l.push(b.dataset.id);
      b.setAttribute('aria-pressed', presionado(l.includes(b.dataset.id)));
    } else if (act === 'prioridad') {
      f.prioridad = b.dataset.id; marcar(b.parentElement, (x) => x.dataset.id === f.prioridad);
    } else if (act === 'capa') {
      mapa?.usarCapa(b.dataset.c);
      marcar(b.parentElement, (x) => x.dataset.c === b.dataset.c);
    } else if (act === 'gps') {
      b.disabled = true;
      try {
        const p = await ubicarPorGps();
        f.ubicacion = p; f.ubicacionConfirmada = true;
        mapa?.irA(p, 17);
        repintar('#bloqueLugar', bloqueLugar());
        avisar('Listo, te ubicamos.');
      } catch (err) { avisar(err.message); } finally { b.disabled = false; }
    }
  };
  const onSubmit = (e) => {
    e.preventDefault();
    Object.keys(errores).forEach((k) => delete errores[k]);
    const m2 = m2Actual();
    if (!f.nombre.trim()) errores.nombre = 'Ponle un nombre a tu parcela.';
    if (!m2) errores.superficie = 'Escribe cuánto mide (solo números).';
    if (!f.ubicacionConfirmada) errores.ubicacion = 'Mueve el mapa hasta tu parcela, usa tu ubicación o elige tu municipio.';
    if (!editando && f.usadaAntes && f.anterior.resultado && !f.anterior.cultivos.length) errores.anterior = 'Elige qué sembraste.';
    repintar('#errNombre', errores.nombre ? html`<span class="error-txt">${errores.nombre}</span>` : '');
    pantalla.querySelector('#nombre').setAttribute('aria-invalid', errores.nombre ? 'true' : 'false');
    repintar('#bloqueSuperficie', bloqueSuperficie());
    repintar('#errUbicacion', errores.ubicacion ? html`<span class="error-txt" role="alert">${errores.ubicacion}</span>` : '');
    if (errores.anterior) repintar('#bloqueUso', bloqueUso());
    const primero = Object.keys(errores)[0];
    if (primero) {
      const destino = { nombre: '#nombre', superficie: '#bloqueSuperficie', ubicacion: '#mapaPick', anterior: '#bloqueUso' }[primero];
      pantalla.querySelector(destino)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      avisar('Falta un dato. Revisa lo que está en rojo.');
      return;
    }
    const datos = {
      nombre: f.nombre.trim(),
      superficieM2: Math.round(m2 * 100) / 100,
      unidadCaptura: f.conDimensiones ? (m2 >= 10000 ? 'ha' : 'mecate') : f.unidad,
      dimensiones: f.conDimensiones ? { largoM: Number(f.largo), anchoM: Number(f.ancho) } : null,
      sueloTexto: f.sueloTexto.trim() || null,
      usadaAntes: f.usadaAntes,
      aniosSeguidos: f.usadaAntes ? f.aniosSeguidos : null,
      usoPrevio: f.usadaAntes === false ? f.usoPrevio : null,
      plan: f.usadaAntes === false && f.plan.cultivos.length ? f.plan : null,
      prioridad: f.prioridad,
      ubicacion: f.ubicacion,
      foto: f.foto,
    };
    let p;
    if (editando) {
      p = parcelasMod.actualizar(editando.id, datos);
      avisar('Cambios guardados');
      ir(`#/parcelas/${p.id}`);
    } else {
      const a = f.anterior;
      p = parcelasMod.crear(datos, {
        anterior: f.usadaAntes && a.cultivos.length && a.resultado ? {
          cultivos: a.cultivos, anio: a.anio, mes: a.mes, resultado: a.resultado, causa: a.causa,
          cantidad: a.cantidad && Number(String(a.cantidad).replace(',', '.')) > 0 ? { valor: Number(String(a.cantidad).replace(',', '.')), unidad: a.unidadCosecha, esEstimacion: a.esEstimacion } : null,
        } : null,
      });
      repos.kv.set('parcelaActivaId', p.id);
      ir(`#/parcelas/${p.id}?nueva=1`);
    }
  };
  form.addEventListener('input', onInput);
  form.addEventListener('change', onChange);
  form.addEventListener('click', onClick);
  form.addEventListener('submit', onSubmit);
  return () => { mapa?.destruir(); };
}

/** Reduce la foto a 640 px de ancho (JPEG) para guardarla en el teléfono. */
function reducirFoto(archivo) {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(archivo);
    img.onload = () => {
      const escala = Math.min(1, 640 / img.width);
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * escala);
      c.height = Math.round(img.height * escala);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL('image/jpeg', 0.78));
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}
