// INFORMACIÓN: historial de éxito y fracaso de cada temporada frente a lo que decía la
// predicción, registro de siembras pasadas, consentimiento y estado de los envíos.
import { html, pintar, delegar, esc, presionado } from '../../shared/dom.js';
import { IMG, letrero } from '../../shared/assets.js';
import { icono, subrayado } from '../../shared/icons.js';
import { fondo, cabeza, abrirHoja, confirmar } from '../layout.js';
import * as repos from '../../storage/repos.js';
import * as catalogo from '../../modules/crops/catalogo.js';
import * as climaMod from '../../modules/climate/clima.js';
import { climaDeParcela } from '../../modules/climate/climaPunto.js';
import * as reglasMod from '../../modules/strategies/reglas.js';
import * as temporadas from '../../modules/harvests/temporadas.js';
import * as cola from '../../services/sync/cola.js';
import * as api from '../../services/api/endpoints.js';
import { leer as leerEstado, avisar } from '../../app/estado.js';
import { analizar, instantanea } from '../../motor/prediccion.js';
import { MESES, fechaConPrecision, fechaPrecisionADate, numero, hoy, isoFecha, sumarDias, fechaCorta } from '../../shared/format.js';
import { hayVoz, escuchar, marcarEscucha } from '../voz.js';
import { borrarTodo } from '../../storage/repos.js';
import { ir } from '../../app/router.js';

const RES = { bueno: { txt: 'Bien', img: 'bien', color: '#5d9e4b', fondo: 'rgba(93,158,75,.22)' }, regular: { txt: 'Regular', img: 'atencion', color: '#efc24d', fondo: 'rgba(239,194,77,.2)' }, malo: { txt: 'Mal', img: 'riesgo', color: '#ff8f7a', fondo: 'rgba(168,57,42,.25)' } };
const NIVEL_TXT = { bien: 'Bien', atencion: 'Atención', riesgo: 'Riesgo' };
const ENVIO_TXT = { pendiente: 'Envío pendiente', enviada: 'Compartida con tu zona', error: 'No se pudo enviar', sin_consentimiento: 'Solo en tu teléfono', ejemplo: 'Ejemplo: no se envía', sin_zona: 'Sin zona: no se puede compartir' };

export async function montar(pantalla, params) {
  await Promise.all([climaMod.zonas(), reglasMod.reglas()]);
  const estado = { filtro: 'todas', abiertas: new Set(), stats: null, nasa: new Map(), recien: null };
  const unidades = () => catalogo.listas().unidadesCosecha;

  const parcelasConHistoria = () => repos.parcelas.todos().filter((p) => !p.eliminadaEn || repos.temporadasDe(p.id).length);
  const filtrar = (lista) => (estado.filtro === 'todas' ? lista : lista.filter((t) => t.parcelaId === estado.filtro));

  // ---------- Bloques ----------
  function enCurso() {
    const lista = filtrar(repos.temporadas.todos().filter((t) => t.estado !== 'finalizada'))
      .filter((t) => { const p = repos.parcelas.porId(t.parcelaId); return p && !p.eliminadaEn && repos.siembrasDe(t.id).length; });
    if (!lista.length) return '';
    return lista.map((t) => {
      const p = repos.parcelas.porId(t.parcelaId);
      const ss = repos.siembrasDe(t.id);
      const primera = ss.map((s) => fechaPrecisionADate(s.fecha)).filter(Boolean).sort((a, b) => a - b)[0];
      // ¿Ya pasó la cosecha estimada? (etapas de reglas.json)
      const vencidas = ss.map((s) => {
        const c = catalogo.cultivo(s.cultivoId);
        const ciclo = c.reglasId ? reglasMod.cicloDias(c.reglasId) : null;
        const f = s.fecha?.precision === 'dia' ? fechaPrecisionADate(s.fecha) : null;
        return ciclo && f ? { c, fin: sumarDias(f, ciclo) } : null;
      }).filter((x) => x && x.fin <= hoy());
      return html`<section class="tarjeta columna entra d3" style="gap:12px">
        <div class="fila fila--entre"><span class="en-curso">En curso</span>${p.esEjemplo ? html`<span class="sello sello--ejemplo">Ejemplo</span>` : ''}</div>
        <div class="columna" style="gap:2px"><strong class="tarjeta__titulo">${t.nombre} en ${p.nombre}</strong><span class="tarjeta__sub">${primera ? `Desde el ${primera.getDate()} de ${MESES[primera.getMonth()]}` : 'Fecha por registrar'}</span></div>
        <div class="semillas-chips">${ss.map((s) => html`<span class="semilla-chip"><i style="background:${catalogo.cultivo(s.cultivoId).color}"></i>${catalogo.semilla(s.semillaId)?.name.split(' (')[0] || catalogo.cultivo(s.cultivoId).name}</span>`)}</div>
        ${t.prediccion ? html`<div class="registro-grid"><span><small>Predicción al iniciar</small><strong>${NIVEL_TXT[t.prediccion.nivel]}: ${t.prediccion.aFavor} de ${t.prediccion.total} a favor</strong></span><span><small>Resultado real</small><strong>Por saber</strong></span></div>` : ''}
        ${vencidas.length ? html`<p class="nota-info" style="color:#ffe3a3">${icono('reloj', { color: '#f2cf7a', tam: 18 })}<span>Ya pasó la cosecha estimada de ${vencidas.map((v) => `${v.c.name.toLowerCase()} (${fechaCorta(v.fin)})`).join(' y ')}. ¿Ya cosechaste?</span></p>` : ''}
        <button class="btn btn--primario btn--bloque" data-act="terminar" data-id="${t.id}">${icono('check')}Terminar siembra</button>
      </section>`;
    });
  }

  function resumen(fin) {
    const c = { bueno: 0, regular: 0, malo: 0 };
    fin.forEach((t) => { if (c[t.resultado] !== undefined) c[t.resultado]++; });
    return html`<div class="resumen-3 entra d2">
      <div><b style="color:#9fd97a">${c.bueno}</b><span>salieron bien</span></div>
      <div><b style="color:#efc24d">${c.regular}</b><span>regulares</span></div>
      <div><b style="color:#ff8f7a">${c.malo}</b><span>salieron mal</span></div>
    </div>`;
  }

  function registro(t) {
    const p = repos.parcelas.porId(t.parcelaId);
    const ss = repos.siembrasDe(t.id);
    const r = RES[t.resultado];
    const abierta = estado.abiertas.has(t.id);
    const env = temporadas.estadoEnvio(t);
    const desde = ss.map((s) => s.fecha).filter((f) => f?.mes)[0];
    const rango = `${desde ? `${MESES[desde.mes - 1]} ${desde.anio}` : t.anio}${t.fechaCosecha?.mes ? ` a ${fechaConPrecision(t.fechaCosecha)}` : ''}`;
    const nasa = estado.nasa.get(t.id);
    const cos = Object.entries(t.cosechas || {}).map(([sid, q]) => {
      const s = repos.siembras.porId(sid);
      const u = unidades().find((x) => x.id === q.unidad);
      return `${numero(q.valor, 2)} ${u?.name || q.unidad} de ${(catalogo.semilla(s?.semillaId)?.name || catalogo.cultivo(s?.cultivoId).name || '').toLowerCase()}${q.esEstimacion ? ' (aprox.)' : ''}`;
    });
    return html`<div class="evento entra d5">
      <span class="evento__punto" style="border-color:${r?.color || '#f2cf7a'}"></span>
      <div class="tarjeta acordeon" data-abierto="${abierta ? 'true' : 'false'}" style="border-radius:22px">
        <button class="acordeon__boton" style="flex-direction:column;align-items:stretch;gap:8px" data-act="abrir" data-id="${t.id}" aria-expanded="${abierta ? 'true' : 'false'}">
          <div class="fila" style="align-items:flex-start;gap:8px">
            <span class="columna crece" style="gap:2px"><span style="font-size:13px;font-weight:700;color:#f2cf7a">${t.nombre}, ${p?.nombre || 'parcela'}${p?.esEjemplo ? ' (ejemplo)' : ''}</span>
            <span style="font-size:15px;font-weight:700">${rango}</span>
            <span style="font-size:12.5px;color:var(--txt-3)">${t.origen === 'en_app' ? 'Registrada en la app' : 'La agregaste después'}</span></span>
            ${icono('abajo', { clase: 'acordeon__flecha', tam: 20 })}
          </div>
          <div class="semillas-chips">${ss.map((s) => html`<span class="semilla-chip"><i style="background:${catalogo.cultivo(s.cultivoId).color}"></i>${catalogo.semilla(s.semillaId)?.name.split(' (')[0] || catalogo.cultivo(s.cultivoId).name}</span>`)}</div>
          <div class="registro-grid">
            <span><small>Predicción</small><strong>${t.prediccion ? `${NIVEL_TXT[t.prediccion.nivel]}, ${t.prediccion.aFavor}/${t.prediccion.total}` : 'No había'}</strong></span>
            <span class="con-letrero" style="background:${r?.fondo || 'rgba(255,255,255,.1)'}"><span class="columna" style="gap:0"><small>Resultado real</small><strong style="color:${r?.color || '#fff'}">${r?.txt || 'Pendiente'}</strong></span>${r ? html`<img class="letrero" src="${letrero(r.img)}" alt="">` : ''}</span>
          </div>
        </button>
        ${abierta ? html`<div class="acordeon__cuerpo">
          <hr class="linea-sep">
          ${t.causa ? html`<span style="font-size:14.5px"><strong>Qué pasó:</strong> ${temporadas.nombreCausa(t.causa)}${t.causaNota ? `, ${t.causaNota}` : ''}</span>` : ''}
          ${cos.length ? html`<span class="fila" style="gap:10px;font-size:14.5px"><img class="parche parche--chico" src="${IMG.iconos.cosecha}" alt=""><span><strong>Cosecha:</strong> ${cos.join('; ')}</span></span>` : ''}
          ${t.observaciones ? html`<span class="mano" style="font-size:21px;color:#f3ead6">“${t.observaciones}”</span>` : ''}
          ${t.prediccion ? html`<span class="fuente"><strong>La predicción de ese momento decía:</strong></span>
            ${t.prediccion.variables.filter((v) => v.nivel !== 'sin_dato').map((v) => html`<span class="fila" style="gap:8px;font-size:14px"><span style="width:8px;height:8px;border-radius:50%;flex-shrink:0;background:${{ bien: '#9fd97a', atencion: '#efc24d', riesgo: '#ff8f7a' }[v.nivel]}"></span>${v.nombre}: ${NIVEL_TXT[v.nivel].toLowerCase()}</span>`)}` : ''}
          ${nasa ? html`<div class="anio-nasa"><b>Lo que midió NASA en ${t.anio} (zona ${climaMod.NOMBRE_CORTO_ZONA[p?.zonaId] || ''})</b>
            <span>Lluvia de junio a agosto: ${numero(nasa.lluviaMm, 0)} mm (lo normal son ${numero(nasa.mediana, 0)} mm).</span>
            ${nasa.rachaMasLarga ? html`<span>Racha seca más larga: ${nasa.rachaMasLarga.dias} días, del ${fechaCorta(new Date(nasa.rachaMasLarga.inicio + 'T00:00'))} al ${fechaCorta(new Date(nasa.rachaMasLarga.fin + 'T00:00'))}.</span>` : ''}
          </div>` : t.anio > 2025 ? html`<span class="fuente">NASA todavía no publica datos de ${t.anio} en el pipeline (corte 2025-12-31).</span>` : ''}
          <div class="fila fila--entre" style="flex-wrap:wrap;gap:8px">
            <span class="cola-estado cola-estado--${env === 'enviada' ? 'enviada' : env === 'error' ? 'error' : 'pendiente'}">${ENVIO_TXT[env] || ''}</span>
            ${env === 'error' ? html`<button class="btn btn--chico btn--vidrio" data-act="reintentar" data-id="${t.id}">Reintentar</button>` : ''}
          </div>
        </div>` : ''}
      </div>
    </div>`;
  }

  // Justo después de cerrar una temporada: el momento natural de decidir el próximo ciclo.
  function proximoCiclo() {
    const p = estado.recien ? repos.parcelas.porId(estado.recien) : null;
    if (!p || p.eliminadaEn) return '';
    return html`<a class="tarjeta tarjeta--boton fila entra d2 tarjeta--opciones" href="#/opciones/${p.id}" style="text-decoration:none;gap:12px">
      <img class="parche" src="${IMG.nodos.semillas}" alt="">
      <div class="columna crece" style="gap:2px"><strong class="tarjeta__titulo">¿Qué siembras el próximo ciclo?</strong><span class="tarjeta__sub">Ya cerraste ${p.nombre}. Mira qué sembrar para que su tierra no se siga gastando.</span></div>
      ${icono('der', { color: '#f2cf7a' })}
    </a>`;
  }

  function bloqueConsentimiento() {
    const c = temporadas.consentimiento();
    const res = cola.resumen();
    const con = leerEstado().conexion;
    return html`<section class="tarjeta columna entra d6" style="gap:12px" id="consentimiento">
      <div class="fila"><img class="parche" src="${IMG.fotos.manos}" alt=""><div class="columna" style="gap:2px"><strong class="tarjeta__titulo">Comparte con tu zona</strong><span class="tarjeta__sub">Para que otros productores sepan cómo les fue</span></div></div>
      <p style="font-size:14.5px;color:var(--txt-2)">Si aceptas, enviamos sin tu nombre: <strong style="color:#fff">zona, cultivo, año, resultado, causa y cantidad</strong>. Nunca tu nombre, tu ubicación exacta ni tus fotos. Los resultados de la zona solo se publican cuando hay al menos 10 registros.</p>
      ${c ? html`<span class="sello ${c.granted ? 'sello--si' : 'sello--sin'}" style="align-self:flex-start">${c.granted ? 'Aceptaste compartir' : 'Decidiste no compartir'}</span>` : ''}
      <div class="fila" style="gap:8px">
        <button class="btn crece ${c?.granted ? 'btn--vidrio' : 'btn--jade'}" data-act="consentir" data-v="si" aria-pressed="${presionado(c?.granted === true)}">${c?.granted ? 'Compartiendo' : 'Sí, compartir'}</button>
        <button class="btn crece btn--vidrio" data-act="consentir" data-v="no" aria-pressed="${presionado(c && !c.granted)}">${c && !c.granted ? 'No compartir' : c?.granted ? 'Dejar de compartir' : 'No, gracias'}</button>
      </div>
      <div class="fila fila--entre" style="flex-wrap:wrap;gap:8px">
        <span class="conexion ${con === 'ok' ? 'conexion--ok' : 'conexion--local'}">${con === 'ok' ? 'Conectado al servidor' : 'Sin conexión: se guarda en tu teléfono'}</span>
        ${res.total ? html`<span class="tarjeta__sub" style="font-size:13px">${res.enviada} enviadas, ${res.pendiente} pendientes${res.error ? `, ${res.error} con error` : ''}</span>` : ''}
      </div>
      ${res.pendiente ? html`<button class="btn btn--chico btn--vidrio" data-act="enviar">${icono('nube_subir', { tam: 18 })}Enviar ahora</button>` : ''}
      <span class="fuente">Aviso de privacidad versión ${temporadas.AVISO_VERSION}. Finalidad: estadísticas colectivas (POST /api/v1/consent).</span>
    </section>`;
  }

  function bloqueZona() {
    const s = estado.stats;
    if (!s) return '';
    return html`<section class="tarjeta columna entra d6" style="gap:8px">
      <strong class="tarjeta__titulo">Lo que reportan en ${climaMod.NOMBRE_CORTO_ZONA[s.zona] || 'tu zona'}</strong>
      <span class="tarjeta__sub">${catalogo.cultivo(s.cultivo).name}, temporada ${s.anio}</span>
      ${s.error ? html`<p style="color:var(--txt-2)">Sin conexión con el servidor. Cuando haya señal, aquí verás cuántos productores de tu zona dijeron que les fue bien, regular o mal.</p>`
        : s.r.status === 'insufficient_sample' ? html`<p style="color:var(--txt-2)">Todavía hay muy pocos registros para mostrarlos sin exponer a nadie (se necesitan al menos 10).</p>`
        : html`<div class="resumen-3">${['good', 'regular', 'poor'].map((m, i) => html`<div><b style="color:${['#9fd97a', '#efc24d', '#ff8f7a'][i]}">${s.r.items.find((x) => x.metric === `outcome_${m}_count`)?.value || 0}</b><span>${['bien', 'regular', 'mal'][i]}</span></div>`)}</div>
          <span class="fuente">${s.r.record_count} registros. ${s.r.items[0]?.method || ''}</span>`}
      <span class="fuente">GET /api/v1/statistics</span>
    </section>`;
  }

  function pintarTodo() {
    const fin = filtrar(repos.temporadas.todos().filter((t) => t.estado === 'finalizada' && t.resultado !== 'pendiente')).sort((a, b) => b.anio - a.anio || b.creadoEn.localeCompare(a.creadoEn));
    const ps = parcelasConHistoria();
    const sc = pantalla.querySelector('#scrollInfo');
    const y = sc?.scrollTop || 0;
    pintar(pantalla, html`
      ${fondo()}
      <div class="scroll" id="scrollInfo">
        <div class="hero entra d1">
          <span class="hero__aro" aria-hidden="true"><span class="hero__circulo"><img src="${IMG.nodos.informacion}" alt=""></span></span>
          <div class="columna" style="gap:4px"><span class="hero__etiqueta">Na'at</span><span class="mano" style="font-size:25px">Lo que hemos vivido</span></div>
        </div>
        <div class="entra d2" style="padding:0 4px"><h1 class="titulo-grande">Tu historial de cosechas</h1>${subrayado(200)}
          <p class="texto-intro" style="margin-top:6px">Cómo te ha ido en cada temporada y qué decían los datos. Con esto las predicciones se vuelven más tuyas.</p></div>
        ${ps.length ? html`<div class="chips-parcelas" role="group" aria-label="Filtrar por parcela">
          <button class="chip" data-act="filtro" data-id="todas" aria-pressed="${presionado(estado.filtro === 'todas')}">Todas</button>
          ${ps.map((p) => html`<button class="chip" data-act="filtro" data-id="${p.id}" aria-pressed="${presionado(estado.filtro === p.id)}">${p.nombre}</button>`)}
        </div>` : ''}
        ${proximoCiclo()}
        ${resumen(fin)}
        ${enCurso()}
        <button class="btn btn--vidrio btn--bloque entra d4" data-act="pasada" ${ps.length ? '' : 'disabled'}>${icono('mas')}Agregar siembra pasada</button>
        ${!ps.length ? html`<p class="nota-info">${icono('info', { color: '#9fd6db', tam: 18 })}<span>Primero <a href="#/parcelas/nueva">agrega una parcela</a> para guardar sus temporadas.</span></p>` : ''}
        <div class="seccion"><span class="seccion__titulo">Siembras anteriores</span><span class="seccion__nota">${fin.length} ${fin.length === 1 ? 'temporada' : 'temporadas'}</span></div>
        ${fin.length ? html`<div class="linea-tiempo">${fin.map(registro)}</div>` : html`<div class="tarjeta vacio"><p>Aún no hay cosechas guardadas. La primera que termines o agregues aparecerá aquí.</p></div>`}
        ${bloqueConsentimiento()}
        ${bloqueZona()}
        <figure class="polaroid polaroid--izq" style="width:230px;align-self:center;margin-top:6px"><img src="${IMG.fotos.manos}" alt="Manos con semillas de maíz"><figcaption>La semilla se cuida entre todos</figcaption></figure>
        <button class="btn btn--texto" data-act="borrarTodo" style="align-self:center;color:#ffb3a6">Borrar todo lo guardado en este teléfono</button>
      </div>
      ${cabeza({ titulo: 'Información', sub: 'Historial de éxito y fracaso' })}
    `);
    const sc2 = pantalla.querySelector('#scrollInfo');
    if (sc2) sc2.scrollTop = y;
  }

  // ---------- Hojas de captura ----------
  function opcionesResultado(sel) {
    return html`<div class="opciones-letrero" role="radiogroup" aria-label="¿Cómo te fue?">
      ${Object.entries(RES).map(([id, r]) => html`<button type="button" class="opcion-letrero" role="radio" data-res="${id}" aria-pressed="${presionado(sel === id)}" aria-checked="${presionado(sel === id)}"><img src="${letrero(r.img)}" alt="">${r.txt}</button>`)}
    </div>`;
  }
  const chipsCausa = (sel) => html`<div class="chips">${catalogo.listas().causasPercibidas.map((c) => html`<button type="button" class="chip" data-causa="${c.id}" aria-pressed="${presionado(sel === c.id)}">${c.name}</button>`)}</div>`;
  const selectUnidad = (id, sel) => html`<select id="${id}" class="campo" style="max-width:150px">${unidades().map((u) => html`<option value="${u.id}" ${sel === u.id ? 'selected' : ''}>${u.name}</option>`)}</select>`;

  function hojaTerminar(temporadaId) {
    const t = repos.temporadas.porId(temporadaId);
    const p = repos.parcelas.porId(t.parcelaId);
    const ss = repos.siembrasDe(t.id);
    const f = { soloMes: false, fecha: isoFecha(hoy()), mes: hoy().getMonth() + 1, anio: hoy().getFullYear(), resultado: null, causa: null, nota: '', cosechas: Object.fromEntries(ss.map((s) => [s.id, { valor: '', unidad: s.cultivoId === 'maiz' ? 'costal' : 'kg', esEstimacion: true }])), observaciones: '', error: '' };
    const leer = (nodo) => {
      const q = (s) => nodo.querySelector(s);
      if (q('#fechaCos')) f.fecha = q('#fechaCos').value;
      if (q('#mesCos')) f.mes = Number(q('#mesCos').value);
      if (q('#notaCausa')) f.nota = q('#notaCausa').value;
      if (q('#obs')) f.observaciones = q('#obs').value;
      ss.forEach((s) => {
        if (q(`#cant-${s.id}`)) f.cosechas[s.id].valor = q(`#cant-${s.id}`).value;
        if (q(`#uni-${s.id}`)) f.cosechas[s.id].unidad = q(`#uni-${s.id}`).value;
        if (q(`#est-${s.id}`)) f.cosechas[s.id].esEstimacion = q(`#est-${s.id}`).checked;
      });
    };
    abrirHoja(pantalla, {
      titulo: `Terminar la ${t.nombre.toLowerCase()}`,
      cuerpo: () => html`
        <p class="texto-intro">${p.nombre}. Cuéntanos cómo te fue: con esto la próxima predicción será más tuya.</p>
        <div class="campo-grupo"><span class="etiqueta">¿Cuándo cosechaste?</span>
          <div class="segmento" role="group" aria-label="Precisión"><button type="button" data-prec="dia" aria-pressed="${presionado(!f.soloMes)}">Sé el día</button><button type="button" data-prec="mes" aria-pressed="${presionado(f.soloMes)}">Solo sé el mes</button></div>
          ${f.soloMes ? html`<label class="sr" for="mesCos">Mes</label><select id="mesCos" class="campo">${MESES.map((m, i) => html`<option value="${i + 1}" ${f.mes === i + 1 ? 'selected' : ''}>${m}</option>`)}</select>`
            : html`<label class="sr" for="fechaCos">Fecha</label><input id="fechaCos" type="date" class="campo" value="${f.fecha}" max="${isoFecha(hoy())}">`}
        </div>
        <div class="campo-grupo"><span class="etiqueta">¿Cómo te fue?</span>${opcionesResultado(f.resultado)}</div>
        ${f.resultado && f.resultado !== 'bueno' ? html`<div class="campo-grupo desplegable"><span class="etiqueta">¿Qué crees que pasó?</span>${chipsCausa(f.causa)}
          ${f.causa === 'otra' ? html`<input id="notaCausa" class="campo" maxlength="100" placeholder="Cuéntanos qué pasó" value="${esc(f.nota)}">` : ''}</div>` : ''}
        ${ss.map((s) => html`<div class="campo-grupo"><label class="etiqueta" for="cant-${s.id}">¿Cuánto cosechaste de ${(catalogo.semilla(s.semillaId)?.name || catalogo.cultivo(s.cultivoId).name).toLowerCase()}? <small>(opcional)</small></label>
          <div class="campo-unidad"><input id="cant-${s.id}" class="campo" inputmode="decimal" value="${esc(f.cosechas[s.id].valor)}" placeholder="Ej. 20">${selectUnidad(`uni-${s.id}`, f.cosechas[s.id].unidad)}</div>
          <label class="fila" style="gap:8px;font-size:14px;min-height:40px"><input type="checkbox" id="est-${s.id}" ${f.cosechas[s.id].esEstimacion ? 'checked' : ''} style="width:20px;height:20px;accent-color:#d81159">Es un cálculo aproximado</label></div>`)}
        <div class="campo-grupo"><label class="etiqueta" for="obs">¿Algo más? <small>(opcional)</small></label>
          <div class="campo-unidad"><textarea id="obs" class="campo" maxlength="300" placeholder="Ej. la mazorca salió chica">${esc(f.observaciones)}</textarea>
          ${hayVoz ? html`<button type="button" class="buscador__mic" data-dictar="obs" aria-label="Dictar">${icono('mic', { tam: 20 })}</button>` : ''}</div></div>
        ${f.error ? html`<p class="error-txt" role="alert">${f.error}</p>` : ''}
        <button class="btn btn--primario btn--bloque" data-r="guardar">${icono('check')}Guardar cosecha</button>`,
      alMontar: (nodo, h) => {
        nodo.addEventListener('click', (e) => {
          const prec = e.target.closest('[data-prec]');
          const res = e.target.closest('[data-res]');
          const cau = e.target.closest('[data-causa]');
          const dic = e.target.closest('[data-dictar]');
          const g = e.target.closest('[data-r="guardar"]');
          if (prec || res || cau) {
            leer(nodo);
            if (prec) f.soloMes = prec.dataset.prec === 'mes';
            if (res) { f.resultado = res.dataset.res; if (f.resultado === 'bueno') f.causa = null; }
            if (cau) f.causa = cau.dataset.causa;
            h.repintar();
          } else if (dic) {
            dic.style.background = '#d81159';
            marcarEscucha(dic, true);
            escuchar({ alTexto: (txt) => { const ta = nodo.querySelector('#obs'); ta.value = `${ta.value} ${txt}`.trim(); }, alFin: () => { dic.style.background = ''; marcarEscucha(dic, false); } });
          } else if (g) {
            leer(nodo);
            if (!f.resultado) { f.error = 'Elige cómo te fue.'; h.repintar(); return; }
            const fecha = f.soloMes ? { anio: f.mes > hoy().getMonth() + 1 ? f.anio - 1 : f.anio, mes: f.mes, dia: null, precision: 'mes' } : (() => { const [a, m, d] = f.fecha.split('-').map(Number); return { anio: a, mes: m, dia: d, precision: 'dia' }; })();
            const cosechas = {};
            Object.entries(f.cosechas).forEach(([sid, q]) => { const v = Number(String(q.valor).replace(',', '.')); if (v > 0) cosechas[sid] = { valor: v, unidad: q.unidad, esEstimacion: q.esEstimacion }; });
            temporadas.terminarTemporada(t.id, { fechaCosecha: fecha, resultado: f.resultado, causa: f.causa, causaNota: f.causa === 'otra' ? f.nota || null : null, cosechas, observaciones: f.observaciones.trim() || null });
            h.cerrar();
            avisar('Guardado. ¡Gracias por contarnos!');
            estado.recien = p.eliminadaEn ? null : p.id;
            pintarTodo();
            if (!temporadas.consentimiento() && !p.esEjemplo) setTimeout(() => pantalla.querySelector('#consentimiento')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 400);
          }
        });
      },
    });
  }

  function hojaPasada() {
    const ps = repos.parcelasActivas();
    const f = { parcelaId: estado.filtro !== 'todas' ? estado.filtro : ps[0]?.id, anio: hoy().getFullYear() - 1, mesSiembra: 6, mesCosecha: 11, cultivos: [], resultado: null, causa: null, cantidad: '', unidad: 'kg', esEstimacion: true, error: '' };
    const leer = (nodo) => {
      const q = (s) => nodo.querySelector(s);
      f.parcelaId = q('#pParcela').value; f.anio = Number(q('#pAnio').value);
      f.mesSiembra = q('#pMesS').value ? Number(q('#pMesS').value) : null;
      f.mesCosecha = q('#pMesC').value ? Number(q('#pMesC').value) : null;
      f.cantidad = q('#pCant').value; f.unidad = q('#pUni').value; f.esEstimacion = q('#pEst').checked;
    };
    abrirHoja(pantalla, {
      titulo: 'Una siembra de años pasados',
      cuerpo: () => html`
        <p class="texto-intro">¿Sembraste antes de usar la app? Cuéntanos y lo sumamos a tu historial.</p>
        <div class="campo-grupo"><label class="etiqueta" for="pParcela">¿En qué parcela?</label><select id="pParcela" class="campo">${ps.map((p) => html`<option value="${p.id}" ${f.parcelaId === p.id ? 'selected' : ''}>${p.nombre}</option>`)}</select></div>
        <div class="campo-grupo"><label class="etiqueta" for="pAnio">¿En qué año?</label><select id="pAnio" class="campo">${Array.from({ length: 15 }, (_, i) => hoy().getFullYear() - i).map((y) => html`<option value="${y}" ${f.anio === y ? 'selected' : ''}>${y}</option>`)}</select></div>
        <div class="campo-grupo"><span class="etiqueta">¿Qué sembraste?</span><div class="chips">${catalogo.cultivos().map((c) => html`<button type="button" class="chip" data-cul="${c.id}" aria-pressed="${presionado(f.cultivos.includes(c.id))}"><span class="chip__punto" style="background:${c.color}"></span>${c.name}</button>`)}</div></div>
        <div class="fila" style="gap:8px">
          <div class="campo-grupo crece"><label class="etiqueta" for="pMesS">Sembraste en</label><select id="pMesS" class="campo"><option value="">No sé</option>${MESES.map((m, i) => html`<option value="${i + 1}" ${f.mesSiembra === i + 1 ? 'selected' : ''}>${m}</option>`)}</select></div>
          <div class="campo-grupo crece"><label class="etiqueta" for="pMesC">Cosechaste en</label><select id="pMesC" class="campo"><option value="">No sé</option>${MESES.map((m, i) => html`<option value="${i + 1}" ${f.mesCosecha === i + 1 ? 'selected' : ''}>${m}</option>`)}</select></div>
        </div>
        <div class="campo-grupo"><span class="etiqueta">¿Cómo te fue?</span>${opcionesResultado(f.resultado)}</div>
        ${f.resultado && f.resultado !== 'bueno' ? html`<div class="campo-grupo desplegable"><span class="etiqueta">¿Qué crees que pasó?</span>${chipsCausa(f.causa)}</div>` : ''}
        <div class="campo-grupo"><label class="etiqueta" for="pCant">¿Cuánto cosechaste? <small>(opcional${f.cultivos.length > 1 ? ', del cultivo principal' : ''})</small></label>
          <div class="campo-unidad"><input id="pCant" class="campo" inputmode="decimal" value="${esc(f.cantidad)}" placeholder="Ej. 18">${selectUnidad('pUni', f.unidad)}</div>
          <label class="fila" style="gap:8px;font-size:14px;min-height:40px"><input type="checkbox" id="pEst" ${f.esEstimacion ? 'checked' : ''} style="width:20px;height:20px;accent-color:#d81159">Es un cálculo aproximado</label></div>
        ${f.error ? html`<p class="error-txt" role="alert">${f.error}</p>` : ''}
        <button class="btn btn--primario btn--bloque" data-r="guardar">${icono('check')}Agregar al historial</button>`,
      alMontar: (nodo, h) => {
        nodo.addEventListener('click', (e) => {
          const cul = e.target.closest('[data-cul]');
          const res = e.target.closest('[data-res]');
          const cau = e.target.closest('[data-causa]');
          if (cul || res || cau) {
            leer(nodo);
            if (cul) { const i = f.cultivos.indexOf(cul.dataset.cul); if (i >= 0) f.cultivos.splice(i, 1); else f.cultivos.push(cul.dataset.cul); }
            if (res) { f.resultado = res.dataset.res; if (f.resultado === 'bueno') f.causa = null; }
            if (cau) f.causa = cau.dataset.causa;
            h.repintar();
          } else if (e.target.closest('[data-r="guardar"]')) {
            leer(nodo);
            if (!f.cultivos.length) { f.error = 'Elige al menos un cultivo.'; h.repintar(); return; }
            if (!f.resultado) { f.error = 'Elige cómo te fue.'; h.repintar(); return; }
            const v = Number(String(f.cantidad).replace(',', '.'));
            const parcela = repos.parcelas.porId(f.parcelaId);
            const anterior = repos.temporadasDe(parcela.id).find((x) => x.anio === f.anio && x.estado === 'finalizada');
            temporadas.registrarTemporadaPasada({
              parcela, anio: f.anio, mesSiembra: f.mesSiembra, mesCosecha: f.mesCosecha,
              cultivos: f.cultivos.map((c) => ({ cultivoId: c })), resultado: f.resultado, causa: f.causa,
              cantidad: v > 0 ? { valor: v, unidad: f.unidad, esEstimacion: f.esEstimacion } : null,
            });
            h.cerrar();
            avisar(anterior ? `Agregada otra siembra de ${f.anio}` : `Temporada ${f.anio} agregada`);
            pintarTodo();
          }
        });
      },
    });
  }

  async function cargarDatosNasa() {
    const fin = repos.temporadas.todos().filter((t) => t.estado === 'finalizada');
    for (const t of fin) {
      const p = repos.parcelas.porId(t.parcelaId);
      if (!p) continue;
      const { clima: c } = await climaDeParcela(p);
      if (!c) continue;
      const o = climaMod.anioObservado(c, t.anio);
      if (o && o.completa) estado.nasa.set(t.id, { ...o, mediana: c.resumen.medianaLluviaVentanaMm });
    }
  }

  async function cargarEstadisticas() {
    const p = repos.parcelasActivas().find((x) => x.zonaId) || null;
    if (!p) return;
    const ss = repos.siembras.todos().filter((s) => s.parcelaId === p.id);
    const cultivo = ss[0]?.cultivoId || 'maiz';
    const anio = hoy().getFullYear() - 1;
    try {
      const r = await api.estadisticas({ zoneId: p.zonaId, cropId: cultivo, seasonYear: anio });
      estado.stats = { zona: p.zonaId, cultivo, anio, r };
    } catch (e) {
      estado.stats = { zona: p.zonaId, cultivo, anio, error: true };
    }
  }

  const quitar = delegar(pantalla, 'click', {
    filtro: (el) => { estado.filtro = el.dataset.id; pintarTodo(); },
    abrir: (el) => { const id = el.dataset.id; if (estado.abiertas.has(id)) estado.abiertas.delete(id); else estado.abiertas.add(id); pintarTodo(); },
    terminar: (el) => hojaTerminar(el.dataset.id),
    pasada: hojaPasada,
    consentir: async (el) => {
      const si = el.dataset.v === 'si';
      const c = temporadas.consentimiento();
      if (c && c.granted === si) return;
      temporadas.decidirConsentimiento(si);
      avisar(si ? 'Gracias. Tus cosechas ayudarán a tu zona.' : 'Listo. Todo se queda en tu teléfono.');
      pintarTodo();
      setTimeout(pintarTodo, 1500);
    },
    enviar: async () => { await cola.procesar(); pintarTodo(); avisar(leerEstado().conexion === 'ok' ? 'Envío terminado' : 'Sin conexión: lo intentamos después'); },
    reintentar: async (el) => {
      const t = repos.temporadas.porId(el.dataset.id);
      await Promise.all(Object.values(t.envios || {}).map((sid) => { const it = repos.cola.donde((x) => x.entidadId === sid)[0]; return it ? cola.reintentar(it.id) : null; }));
      pintarTodo();
    },
    borrarTodo: async () => {
      if (await confirmar(pantalla, { titulo: '¿Borrar todo?', texto: 'Se borran tus parcelas, temporadas, historial y ajustes de este teléfono. Lo que ya se compartió con tu zona no se puede borrar desde aquí.', si: 'Borrar todo', peligro: true })) {
        await borrarTodo();
        avisar('Listo, empezamos de cero.');
        ir('#/inicio');
      }
    },
  });

  let vivo = true;
  pintarTodo();
  if (params.query.get('registrar') === '1') {
    const t = repos.temporadas.todos().find((x) => x.estado !== 'finalizada' && repos.siembrasDe(x.id).length);
    if (t) hojaTerminar(t.id); else if (repos.parcelasActivas().length) hojaPasada();
  }
  (async () => {
    await Promise.all([cargarDatosNasa(), cargarEstadisticas()]);
    if (vivo && !pantalla.querySelector('.hoja')) pintarTodo();
    // Instantánea de predicción para temporadas en curso que no la tengan
    for (const t of repos.temporadas.todos().filter((x) => x.estado === 'en_curso' && !x.prediccion)) {
      const p = repos.parcelas.porId(t.parcelaId);
      if (!p) continue;
      try { const a = await analizar(p); temporadas.guardarPrediccion(t.id, instantanea(a)); } catch { /* sin datos */ }
    }
    if (vivo && !pantalla.querySelector('.hoja')) pintarTodo();
  })();
  return () => { vivo = false; quitar(); };
}
