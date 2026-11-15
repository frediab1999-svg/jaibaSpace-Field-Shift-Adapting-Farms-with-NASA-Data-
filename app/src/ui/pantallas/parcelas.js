// TUS PARCELAS: lista, detalle con esquema del terreno, semillas (CRUD) e historial con motivos.
import { html, pintar, delegar, presionado } from '../../shared/dom.js';
import { IMG, letrero } from '../../shared/assets.js';
import { diagnosticoDe } from '../../modules/parcel/tierra.js';
import { PREGUNTAS } from '../../motor/diagnostico.js';
import { textoOrigen, guardado as climaGuardado } from '../../modules/climate/climaPunto.js';
import { icono, subrayado } from '../../shared/icons.js';
import { fondo, cabeza, confirmar } from '../layout.js';
import * as repos from '../../storage/repos.js';
import * as catalogo from '../../modules/crops/catalogo.js';
import * as climaMod from '../../modules/climate/clima.js';
import * as reglasMod from '../../modules/strategies/reglas.js';
import * as parcelasMod from '../../modules/parcel/parcelas.js';
import { cargarEjemplo, quitarEjemplo, hayEjemplo } from '../../modules/parcel/ejemplo.js';
import { guardarPrediccion } from '../../modules/harvests/temporadas.js';
import { analizar, instantanea } from '../../motor/prediccion.js';
import { terreno } from '../componentes/terreno.js';
import { preguntarMotivo } from '../captura/motivo.js';
import { hojaSiembra } from '../captura/siembra.js';
import { superficie, fechaConPrecision, numero, MESES, normalizar } from '../../shared/format.js';
import { ir, refrescar } from '../../app/router.js';
import { avisar } from '../../app/estado.js';

export async function montar(pantalla, params) {
  await Promise.all([climaMod.zonas(), reglasMod.reglas()]);
  if (params.id) return detalle(pantalla, params);
  return lista(pantalla, params);
}

const zonaChip = (p) => (p.zonaId ? html`<span class="zona-chip"><i style="background:${climaMod.COLOR_ZONA[p.zonaId]}"></i>${climaMod.NOMBRE_CORTO_ZONA[p.zonaId]}</span>` : html`<span class="zona-chip">Sin zona</span>`);
const chipsSiembras = (siembras) => html`<div class="semillas-chips">${siembras.map((s) => html`<span class="semilla-chip"><i style="background:${catalogo.cultivo(s.cultivoId).color}"></i>${catalogo.semilla(s.semillaId)?.name.split(' (')[0] || catalogo.cultivo(s.cultivoId).name}</span>`)}</div>`;

// =====================================================================
// LISTA + HISTORIAL
// =====================================================================
function lista(pantalla, params) {
  const estado = { tab: params.query.get('tab') === 'historial' ? 'historial' : 'parcelas', filtro: params.query.get('p') || 'todas', cargando: false };

  function vistaParcelas() {
    const ps = repos.parcelasActivas();
    if (!ps.length) {
      return html`<div class="tarjeta vacio entra d3">
        <img src="${IMG.nodos.parcelas}" alt="" style="width:120px;height:120px;object-fit:contain">
        <h2 style="font-size:21px">Aún no tienes parcelas</h2>
        <p>Agrega tu primera parcela: con su tamaño, su suelo y dónde está, te decimos qué conviene y cómo pinta la temporada.</p>
        <a class="btn btn--primario btn--bloque boton-mas" href="#/parcelas/nueva" style="min-height:60px;font-size:18px">${icono('mas', { tam: 24, grosor: 2.6 })}Agregar parcela</a>
        <button class="btn btn--texto" data-act="ejemplo" ${estado.cargando ? 'disabled' : ''}>${estado.cargando ? 'Cargando…' : 'Ver con parcelas de ejemplo'}</button>
      </div>`;
    }
    return html`
      ${ps.map((p, i) => {
        const siembras = parcelasMod.siembrasActuales(p.id);
        return html`<a class="tarjeta tarjeta--boton parcela-card entra d${Math.min(i + 3, 7)}" href="#/parcelas/${p.id}" style="text-decoration:none">
          <div class="parcela-card__mini">${terreno(p, siembras, { ancho: 200, mini: true, leyenda: false })}</div>
          <div class="fila fila--entre" style="align-items:flex-start">
            <div class="columna" style="gap:2px"><strong class="tarjeta__titulo">${p.nombre}</strong><span class="tarjeta__sub">${superficie(p.superficieM2, p.unidadCaptura)}${p.municipioNombre ? `, cerca de ${p.municipioNombre}` : ''}</span></div>
            <div class="columna" style="gap:6px;align-items:flex-end">${zonaChip(p)}${p.esEjemplo ? html`<span class="sello sello--ejemplo">Ejemplo</span>` : ''}</div>
          </div>
          ${siembras.length ? chipsSiembras(siembras) : html`<span class="tarjeta__sub">Sin semillas esta temporada</span>`}
        </a>`;
      })}
      <a class="btn btn--primario btn--bloque boton-mas" href="#/parcelas/nueva">${icono('mas', { tam: 22, grosor: 2.6 })}Agregar parcela</a>
      ${hayEjemplo() ? html`<button class="btn btn--texto" data-act="quitarEjemplo">Quitar las parcelas de ejemplo</button>` : html`<button class="btn btn--texto" data-act="ejemplo">Agregar parcelas de ejemplo</button>`}`;
  }

  function vistaHistorial() {
    const todas = repos.parcelas.todos().sort((a, b) => a.creadoEn.localeCompare(b.creadoEn));
    const eventos = repos.historialDe(estado.filtro === 'todas' ? null : estado.filtro);
    const conMotivo = eventos.filter((e) => e.motivoId);
    const cuenta = {};
    conMotivo.forEach((e) => { cuenta[e.motivoTexto] = (cuenta[e.motivoTexto] || 0) + 1; });
    const orden = Object.entries(cuenta).sort((a, b) => b[1] - a[1]);
    const max = orden[0]?.[1] || 1;
    const top = conMotivo.find((e) => e.motivoTexto === orden[0]?.[0]);
    const consejo = top && { plaga: 'Revisa la señal de plagas en Predicción a futuro.', sequia: 'Revisa la señal de rachas secas en Predicción a futuro.', no_nacio: 'Puede ser falta de humedad al sembrar: revisa las rachas secas de junio.', exceso_lluvia: 'Revisa la lluvia de temporada en Predicción a futuro.' }[top.motivoId];
    const borradas = todas.filter((p) => p.eliminadaEn && (estado.filtro === 'todas' || estado.filtro === p.id));
    return html`
      <div class="chips-parcelas" role="group" aria-label="Filtrar por parcela">
        <button class="chip" data-act="filtro" data-id="todas" aria-pressed="${presionado(estado.filtro === 'todas')}">Todas</button>
        ${todas.map((p) => html`<button class="chip" data-act="filtro" data-id="${p.id}" aria-pressed="${presionado(estado.filtro === p.id)}">${p.nombre}${p.eliminadaEn ? ' (quitada)' : ''}</button>`)}
      </div>
      ${orden.length ? html`<section class="tarjeta columna entra d2" style="gap:12px">
        <div class="fila"><img class="parche" src="${IMG.iconos.plaga}" alt=""><div class="columna" style="gap:2px"><strong class="tarjeta__titulo">Por qué se han quitado</strong><span class="tarjeta__sub">${conMotivo.length} ${conMotivo.length === 1 ? 'motivo guardado' : 'motivos guardados'}</span></div></div>
        <div class="motivos-resumen">${orden.map(([m, n]) => html`<div class="barra-motivo"><span style="width:44%">${m}</span><span class="barra-motivo__barra"><i style="width:${(n / max) * 100}%"></i></span><strong>${n}</strong></div>`)}</div>
        ${consejo ? html`<p class="nota-info">${icono('info', { color: '#f2cf7a', tam: 18 })}<span>Lo que más se repite: <strong style="color:#fff">${orden[0][0].toLowerCase()}</strong>. ${consejo}</span></p>` : ''}
      </section>` : ''}
      ${borradas.map((p) => html`<div class="tarjeta fila entra d3" style="gap:12px">
        <div class="columna crece" style="gap:2px"><strong>${p.nombre} está quitada</strong><span class="tarjeta__sub">${p.motivoEliminacion?.motivoTexto || ''}${p.motivoEliminacion?.nota ? `: ${p.motivoEliminacion.nota}` : ''}</span></div>
        <button class="btn btn--chico btn--vidrio" data-act="restaurar" data-id="${p.id}">Activar</button>
      </div>`)}
      ${eventos.length ? html`<div class="linea-tiempo">
        ${eventos.map((e, i) => html`<div class="evento entra d${Math.min(i + 3, 7)}">
          <span class="evento__punto" style="border-color:${e.motivoId ? '#d81159' : e.tipo === 'cosecha_registrada' ? '#5d9e4b' : '#f2cf7a'}"></span>
          <div class="tarjeta columna" style="gap:4px">
            <span style="font-size:12.5px;font-weight:700;color:#f2cf7a">${new Date(e.fecha).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}, ${e.parcelaNombre}</span>
            <strong style="font-size:15.5px">${e.titulo}</strong>
            ${e.motivoId ? html`<span style="font-size:14px"><span class="sello sello--crema" style="margin-right:6px">Motivo</span>${e.motivoTexto}</span>` : e.detalle ? html`<span class="tarjeta__sub">${e.detalle}</span>` : ''}
            ${e.nota ? html`<span class="mano" style="font-size:21px;color:#f3ead6">“${e.nota}”</span>` : ''}
          </div>
        </div>`)}
      </div>` : html`<div class="tarjeta vacio"><p>Todavía no hay movimientos. Aquí verás lo que agregas, cambias y quitas, con sus motivos.</p></div>`}`;
  }

  function pintarTodo() {
    const nHist = repos.historial.todos().filter((h) => h.motivoId).length;
    pintar(pantalla, html`
      ${fondo()}
      <div class="scroll" id="scrollParcelas">
        <div class="hero entra d1">
          <span class="hero__aro" aria-hidden="true"><span class="hero__circulo"><img src="${IMG.nodos.parcelas}" alt=""></span></span>
          <div class="columna" style="gap:4px"><span class="hero__etiqueta">Lu'um</span><span class="mano" style="font-size:25px">La tierra milpera</span></div>
        </div>
        <div class="entra d2" style="padding:0 4px"><h1 class="titulo-grande">Tus parcelas</h1>${subrayado(150)}</div>
        <div class="pestanas" role="tablist" aria-label="Secciones de parcelas">
          <button role="tab" data-act="tab" data-id="parcelas" aria-selected="${estado.tab === 'parcelas' ? 'true' : 'false'}">${icono('pin', { tam: 18 })}Mis parcelas</button>
          <button role="tab" data-act="tab" data-id="historial" aria-selected="${estado.tab === 'historial' ? 'true' : 'false'}">${icono('historial', { tam: 18 })}Historial${nHist ? html`<span class="contador">${nHist}</span>` : ''}</button>
        </div>
        <div class="columna" style="gap:14px" role="tabpanel">${estado.tab === 'parcelas' ? vistaParcelas() : vistaHistorial()}</div>
      </div>
      ${cabeza({ titulo: 'Tus parcelas', sub: `${repos.parcelasActivas().length} registradas en este teléfono` })}
    `);
  }

  const quitar = delegar(pantalla, 'click', {
    tab: (el) => { estado.tab = el.dataset.id; pintarTodo(); },
    filtro: (el) => { estado.filtro = el.dataset.id; pintarTodo(); },
    ejemplo: async () => { estado.cargando = true; pintarTodo(); await cargarEjemplo(); estado.cargando = false; avisar('Listo: parcelas de demostración'); pintarTodo(); },
    quitarEjemplo: async () => {
      if (await confirmar(pantalla, { titulo: '¿Quitar el ejemplo?', texto: 'Se borran las parcelas, temporadas e historial de ejemplo. Lo tuyo no se toca.', si: 'Quitar', peligro: true })) { quitarEjemplo(); pintarTodo(); }
    },
    restaurar: (el) => { parcelasMod.restaurar(el.dataset.id); avisar('Parcela activa de nuevo'); pintarTodo(); },
  });
  pintarTodo();
  return quitar;
}

// =====================================================================
// DETALLE
// =====================================================================
function detalle(pantalla, params) {
  const id = params.id;
  const esNueva = params.query.get('nueva') === '1';
  const sembrarId = params.query.get('sembrar');

  function pintarTodo() {
    const p = repos.parcelas.porId(id);
    if (!p || p.eliminadaEn) { ir('#/parcelas'); return; }
    const siembras = parcelasMod.siembrasActuales(p.id);
    const ocupada = parcelasMod.superficieOcupada(p.id);
    const libre = Math.max(0, p.superficieM2 - ocupada);
    const suelo = p.tipoSueloId ? catalogo.suelos().find((s) => s.id === p.tipoSueloId) : null;
    const zona = climaMod.zonaPorId(p.zonaId);
    const prioridad = reglasMod.prioridades().find((x) => x.id === p.prioridad);
    const diag = diagnosticoDe(p);
    const eventos = repos.historialDe(p.id).slice(0, 3);
    const t = repos.temporadaEnCurso(p.id);
    const dato = (etq, val) => html`<div class="fila fila--entre" style="align-items:flex-start;gap:16px;padding:8px 0;border-bottom:1px dashed rgba(255,255,255,.16)"><span class="tarjeta__sub" style="flex-shrink:0">${etq}</span><span style="text-align:right;font-weight:600;font-size:15px">${val}</span></div>`;

    pintar(pantalla, html`
      ${fondo()}
      <div class="scroll" id="scrollDetalle">
        ${esNueva ? html`<div class="entra d1" style="padding:0 4px"><span class="mano" style="font-size:30px">¡Quedó guardada!</span><p class="texto-intro">Así se ve tu terreno con las medidas que diste.</p></div>` : ''}
        <section class="tarjeta columna entra d2" style="gap:6px;padding-top:20px">
          <div class="fila fila--entre"><span class="tarjeta__titulo">Así se ve tu terreno</span>${p.esEjemplo ? html`<span class="sello sello--ejemplo">Ejemplo</span>` : ''}</div>
          ${terreno(p, siembras, { ancho: 290 })}
          <span class="tarjeta__sub" style="text-align:center">${ocupada ? (libre >= 1 ? `${superficie(ocupada)} sembradas, ${superficie(libre)} libres` : 'Toda la parcela está sembrada') : `${superficie(p.superficieM2, p.unidadCaptura)} sin sembrar todavía`}</span>
        </section>


        <a class="diag-chip entra d2" href="#/diagnostico/${p.id}" style="--c:${diag.estado.color}">
          <img src="${letrero(diag.estado.letrero)}" alt="">
          <span class="columna crece" style="gap:1px"><small>Tu tierra</small><strong>${diag.estado.corto}</strong><em>Ver el diagnóstico</em></span>
          ${icono('der', { color: '#f2cf7a', tam: 18 })}
        </a>

        <section class="columna entra d3" style="gap:10px">
          <div class="seccion"><span class="seccion__titulo">Semillas de esta temporada</span><span class="seccion__nota">${t ? t.nombre : 'Sin temporada abierta'}</span></div>
          ${siembras.length ? siembras.map((s) => {
            const sem = catalogo.semilla(s.semillaId);
            const c = catalogo.cultivo(s.cultivoId);
            return html`<div class="tarjeta fila" style="gap:12px;padding:12px 12px 12px 14px">
              <span style="width:14px;height:44px;border-radius:5px;flex-shrink:0;background:repeating-linear-gradient(180deg, rgba(255,255,255,.3) 0 2px, rgba(255,255,255,0) 2px 7px), ${c.color}"></span>
              <div class="columna crece" style="gap:2px"><strong>${sem?.name || c.name}</strong><span class="tarjeta__sub">${s.superficieM2 ? superficie(s.superficieM2) : 'sin superficie'}, ${fechaConPrecision(s.fecha)}</span></div>
              <button class="btn-oscuro" data-act="editarSiembra" data-id="${s.id}" aria-label="Editar ${sem?.name || c.name}">${icono('lapiz', { tam: 18 })}</button>
              <button class="btn-oscuro" data-act="quitarSiembra" data-id="${s.id}" aria-label="Quitar ${sem?.name || c.name}" style="color:#ffb3a6">${icono('basura', { tam: 18 })}</button>
            </div>`;
          }) : html`<div class="tarjeta columna" style="gap:8px">
            <p style="color:var(--txt-2)">Aún no hay semillas en esta parcela.</p>
            ${p.plan?.cultivos?.length ? html`<span class="tarjeta__sub">Dijiste que piensas sembrar ${p.plan.cultivos.map((c) => catalogo.cultivo(c).name.toLowerCase()).join(', ')} en ${MESES[(p.plan.mes || 6) - 1]}.</span>` : ''}
          </div>`}
          <button class="btn btn--dorado btn--bloque" data-act="agregarSiembra">${icono('brote')}Agregar semilla</button>
        </section>

        <section class="tarjeta columna entra d4" style="gap:2px">
          <div class="fila fila--entre" style="margin-bottom:4px"><span class="tarjeta__titulo">Datos de la parcela</span><a class="btn btn--chico btn--vidrio" href="#/parcelas/${p.id}/editar">${icono('lapiz', { tam: 18 })}Editar</a></div>
          ${dato('Superficie', `${superficie(p.superficieM2, 'ha')} (${numero(p.superficieM2 / 400, 1)} mecates)`)}
          ${p.dimensiones ? dato('Medidas', `${numero(p.dimensiones.largoM, 0)} × ${numero(p.dimensiones.anchoM, 0)} m`) : ''}
          ${dato('Suelo', suelo ? (normalizar(p.sueloTexto).includes(normalizar(suelo.name)) ? `${suelo.name}${suelo.equivalenteWRB ? ` (${suelo.equivalenteWRB})` : ''}, ${suelo.descripcion.toLowerCase()}` : `${p.sueloTexto} (${suelo.name}${suelo.equivalenteWRB ? `, ${suelo.equivalenteWRB}` : ''})`) : p.sueloTexto ? `${p.sueloTexto} (sin reconocer)` : 'No lo sabemos')}
          ${dato('Lugar', p.municipioNombre ? `${p.origenMunicipio === 'declarado' ? 'En' : 'Cerca de'} ${p.municipioNombre}, ${p.estado}` : 'Sin ubicación')}
          ${dato('Clima', climaGuardado(p.ubicacion) ? 'De tu punto (NASA POWER)' : zona ? `De referencia: ${climaMod.NOMBRE_CORTO_ZONA[zona.id]}` : 'Falta la ubicación')}
          ${dato('Ya se sembró antes', p.usadaAntes === true ? `Sí${p.aniosSeguidos ? `, ${catalogo.listas().aniosSeguidos.find((x) => x.id === p.aniosSeguidos)?.name.toLowerCase()}` : ''}` : p.usadaAntes === false ? `No, era ${catalogo.listas().usoPrevio.find((x) => x.id === p.usoPrevio)?.name.toLowerCase() || 'nueva'}` : 'Sin respuesta')}
          ${dato('Lo que buscas', PREGUNTAS.objetivo.find((o) => o.id === p.objetivo)?.name || prioridad?.name || 'Sin elegir')}
          <span class="fuente" style="margin-top:8px">${textoOrigen(climaGuardado(p.ubicacion) ? 'punto' : zona ? 'zona' : null, zona)}</span>
        </section>

        <a class="tarjeta tarjeta--boton fila entra d4" href="#/opciones/${p.id}" style="text-decoration:none;gap:12px">
          <img class="parche" src="${IMG.nodos.semillas}" alt="">
          <div class="columna crece" style="gap:2px"><strong class="tarjeta__titulo">Tu plan de 2 años</strong><span class="tarjeta__sub">${p.estrategiaElegida ? `Elegiste: ${p.estrategiaElegida.nombre}` : 'Para que tu tierra no se siga cansando'}</span></div>
          ${icono('der', { color: '#f2cf7a' })}
        </a>

        <a class="tarjeta tarjeta--boton fila entra d5" href="#/prediccion/${p.id}" style="text-decoration:none;gap:12px">
          <img class="parche" src="${IMG.iconos.nube}" alt="">
          <div class="columna crece" style="gap:2px"><strong class="tarjeta__titulo">¿Cuándo me conviene sembrar?</strong><span class="tarjeta__sub">La fecha que mejor aguantó la sequía en tu punto</span></div>
          ${icono('der', { color: '#f2cf7a' })}
        </a>

        <section class="columna entra d6" style="gap:10px">
          <div class="seccion"><span class="seccion__titulo">Historial de la parcela</span><a class="seccion__nota" href="#/parcelas?tab=historial&p=${p.id}">Ver todo</a></div>
          ${eventos.map((e) => html`<div class="tarjeta" style="padding:12px 14px;border-radius:20px">
            <span style="font-size:12.5px;font-weight:700;color:#f2cf7a">${new Date(e.fecha).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
            <p style="font-weight:700">${e.titulo}</p>${e.motivoTexto ? html`<p class="tarjeta__sub">Motivo: ${e.motivoTexto}${e.nota ? `. “${e.nota}”` : ''}</p>` : ''}
          </div>`)}
        </section>

        <button class="btn btn--peligro btn--bloque" data-act="eliminarParcela">${icono('basura')}Quitar esta parcela</button>
      </div>
      ${cabeza({ titulo: p.nombre, sub: `${superficie(p.superficieM2, p.unidadCaptura)}${p.municipioNombre ? `, ${p.municipioNombre}` : ''}`, atras: '#/parcelas', etiquetaAtras: 'Volver a tus parcelas', extra: zonaChip(p) })}
    `);
  }

  async function guardarInstantanea(temporadaId) {
    try {
      const p = repos.parcelas.porId(id);
      const a = await analizar(p);
      guardarPrediccion(temporadaId, instantanea(a));
    } catch (e) { console.warn(e); }
  }

  async function agregar(semillaIds = []) {
    const p = repos.parcelas.porId(id);
    const lista = await hojaSiembra(pantalla, { parcela: p, semillaIds });
    if (lista?.length) {
      avisar(lista.length === 1 ? `Sembraste ${catalogo.semilla(lista[0].semillaId)?.name || 'la semilla'}` : `Sembraste ${lista.length} semillas`);
      pintarTodo();
      guardarInstantanea(lista[0].temporadaId);
    }
  }

  const quitar = delegar(pantalla, 'click', {
    agregarSiembra: () => agregar(),
    editarSiembra: async (el) => {
      const p = repos.parcelas.porId(id);
      const s = await hojaSiembra(pantalla, { parcela: p, siembra: repos.siembras.porId(el.dataset.id) });
      if (s) { avisar('Cambios guardados'); pintarTodo(); }
    },
    quitarSiembra: async (el) => {
      const s = repos.siembras.porId(el.dataset.id);
      const nombre = catalogo.semilla(s.semillaId)?.name || catalogo.cultivo(s.cultivoId).name;
      const r = await preguntarMotivo(pantalla, {
        titulo: `Quitar ${nombre}`,
        pregunta: '¿Por qué la quitas? Escoge lo que más se parezca.',
        opciones: catalogo.listas().motivosEliminacionSemilla,
      });
      if (!r) return;
      parcelasMod.eliminarSiembra(s.id, r);
      avisar('Quitada. Guardamos el motivo en el historial.');
      pintarTodo();
    },
    eliminarParcela: async () => {
      const p = repos.parcelas.porId(id);
      const r = await preguntarMotivo(pantalla, {
        titulo: `Quitar ${p.nombre}`,
        pregunta: 'Antes de quitarla, cuéntanos por qué. Sus temporadas e historial se conservan.',
        opciones: catalogo.listas().motivosEliminacionParcela,
        aviso: 'La parcela pasa al historial. Puedes volver a activarla cuando quieras.',
      });
      if (!r) return;
      parcelasMod.eliminar(p.id, r);
      if (repos.kv.get('parcelaActivaId') === p.id) repos.kv.set('parcelaActivaId', repos.parcelasActivas()[0]?.id || null);
      avisar('Parcela quitada. Quedó en el historial.');
      ir('#/parcelas?tab=historial');
    },
  });

  pintarTodo();
  // ?sembrar=id o ?sembrar=id1,id2 (varias semillas a la vez, desde Semillas)
  const sembrarIds = (sembrarId || '').split(',').filter((x) => catalogo.semilla(x));
  if (sembrarIds.length) setTimeout(() => agregar(sembrarIds), 350);
  return () => { quitar(); };
}

export { refrescar };
