// PREDICCIÓN A FUTURO: por parcela, señales (clima, sequía, calor, plagas, suelo, tus
// otras milpas, tu zona) con su evidencia. La justificación solo se abre al tocar.
import { html, pintar, delegar } from '../../shared/dom.js';
import { IMG, letrero } from '../../shared/assets.js';
import { icono, subrayado } from '../../shared/icons.js';
import { fondo, cabeza, avisoOjo } from '../layout.js';
import * as repos from '../../storage/repos.js';
import * as climaMod from '../../modules/climate/clima.js';
import * as parcelasMod from '../../modules/parcel/parcelas.js';
import { analizar, TIPO_TXT, FRASE_NIVEL } from '../../motor/prediccion.js';
import { terreno } from '../componentes/terreno.js';
import { superficie, numero, fuenteLegible } from '../../shared/format.js';
import { t } from '../../i18n/index.js';

const NIVEL_TXT = { bien: 'Bien', atencion: 'Atención', riesgo: 'Riesgo', sin_dato: 'Sin dato' };
const NIVEL_SELLO = { bien: 'si', atencion: 'esp', riesgo: 'no', sin_dato: 'sin' };
const ICONO_IMG = { sol: 'sol', nube: 'nube', plaga: 'plaga', semilla: 'semilla', cosecha: 'cosecha' };

export async function montar(pantalla, params) {
  await climaMod.zonas();
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
      ${r ? html`<span class="tarjeta__sub" style="font-size:12.5px">${r.aFavor} de ${r.total} señales a favor</span>` : ''}
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
        <div class="entra d2" style="padding:0 4px"><h1 class="titulo-grande">¿Cómo le irá a tu milpa?</h1>${subrayado(190)}
          <p class="texto-intro" style="margin-top:6px">Toca una parcela y te cuento qué señales hay para esta temporada y de dónde salen.</p></div>
        ${parcelas.length ? html`
          <figure class="polaroid entra d2" style="width:300px;align-self:center"><img src="${IMG.fotos.campesino}" alt="Productor caminando a la milpa"><figcaption>Camino a la milpa, temprano</figcaption></figure>
          <div class="tarjetas-2">${parcelas.map(tarjeta)}</div>
          <div class="tarjeta nota-info entra d6">${icono('info', { color: '#9fd6db' })}<span>Juntamos el clima de los últimos 28 años (NASA), tu suelo, lo que has sembrado y lo que han vivido tus otras milpas. Cada señal dice si el dato es histórico, actual o ambos.</span></div>
          ${avisoOjo('Ojo: esto no es un pronóstico de cosecha', 'Son señales basadas en datos para ayudarte a decidir. No garantizan lo que vas a cosechar: la decisión sigue siendo tuya y de tu técnico.')}
        ` : vacio()}
      </div>
      ${cabeza({ titulo: t('menu.prediccion'), sub: `${parcelas.length} ${parcelas.length === 1 ? 'parcela' : 'parcelas'}` })}
    `);
  }
  pintarTodo();
  (async () => {
    for (const p of parcelas) {
      try { const a = await analizar(p); niveles.set(p.id, a.resumen); } catch (e) { console.warn(e); }
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

  const aro = (r) => {
    const R = 64; const C = 2 * Math.PI * R;
    const frac = r.total ? r.aFavor / r.total : 0;
    const color = { bien: '#9fd97a', atencion: '#efc24d', riesgo: '#ff8f7a' }[r.nivel];
    return html`<div class="aro-senales" role="img" aria-label="${r.aFavor} de ${r.total} señales a favor">
      <svg viewBox="0 0 150 150" width="150" height="150"><circle cx="75" cy="75" r="${R}" fill="none" stroke="rgba(255,255,255,.14)" stroke-width="12"/>
      <circle class="aro-senales__arco" cx="75" cy="75" r="${R}" fill="none" stroke="${color}" stroke-width="12" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - frac)}" style="--total:${C}"/></svg>
      <div class="aro-senales__centro"><b>${r.aFavor}<span style="font-size:20px;color:rgba(255,255,255,.6)">/${r.total}</span></b><span>señales a favor</span></div>
    </div>`;
  };

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
          <span class="variable__dato"><span class="dato dato--${v.tipo}">${TIPO_TXT[v.tipo]}</span></span>
        </span>
        ${v.nivel === 'sin_dato' ? html`<span class="sello sello--sin">Sin dato</span>` : html`<img class="letrero letrero--chico" src="${letrero(v.nivel)}" alt="${NIVEL_TXT[v.nivel]}">`}
        ${icono('abajo', { clase: 'acordeon__flecha', tam: 20 })}
      </button>
      ${abierta ? html`<div class="acordeon__cuerpo justificacion" id="var-${v.id}">
        <hr class="linea-sep">
        <p style="font-weight:700;font-size:15.5px">${v.frase}</p>
        ${j.parrafos.map((x) => html`<p style="color:var(--txt-2)">${x}</p>`)}
        ${j.lista?.length ? html`${j.tituloLista ? html`<span class="fuente"><strong>${j.tituloLista}</strong></span>` : ''}<ul>${j.lista.map((x) => html`<li>${x}</li>`)}</ul>` : ''}
        ${barras(j)}
        <span class="fuente"><strong>Fuente:</strong> ${fuenteLegible(j.fuente)}${j.periodo ? html`<br><strong>Periodo:</strong> ${j.periodo}` : ''}${j.n ? html`<br><strong>Con:</strong> ${j.n}` : ''}</span>
        ${(j.porConfirmar || []).map((x) => html`<span class="porconfirmar">Por confirmar: ${x}</span>`)}
      </div>` : ''}
    </div>`;
  };

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
        ${!a ? html`<div class="tarjeta vacio"><p>Revisando el clima de 28 años y tu historial…</p></div>` : html`
          <section class="tarjeta columna entra d2" style="gap:14px;align-items:center;text-align:center">
            <div class="fila" style="gap:8px;justify-content:center">${aro(a.resumen)}<img class="letrero letrero--grande" src="${letrero(a.resumen.nivel)}" alt="${NIVEL_TXT[a.resumen.nivel]}"></div>
            <p class="mano" style="font-size:27px;color:#f3ead6">${FRASE_NIVEL[a.resumen.nivel]}</p>
            <div class="columna" style="gap:6px;align-items:center">
              <span class="tarjeta__sub">Analizamos ${a.cultivosOrigen}:</span>
              <div class="cultivos-pred" style="justify-content:center">${[...new Map(a.ventanas.map((v) => [v.cultivo.id, v])).values()].map((v) => html`<span class="semilla-chip"><i style="background:${v.cultivo.color}"></i>${v.cultivo.name}</span>`)}</div>
            </div>
            ${!a.zonaAsignada ? html`<span class="porconfirmar">Tu parcela no tiene una zona de clima asignada: usamos ${a.zona.nombre.split(' (')[0]} como referencia.</span>` : ''}
            ${a.zonaAsignada && p.zonaDistanciaKm > 50 ? html`<span class="porconfirmar">El punto de clima más cercano está a ${numero(p.zonaDistanciaKm, 0)} km. Toma el clima como referencia regional.</span>` : ''}
          </section>
          <div class="seccion"><span class="seccion__titulo">Lo que puede pasar</span><span class="seccion__nota">Toca para ver por qué</span></div>
          <div class="columna" style="gap:10px">${a.variables.map(variable)}</div>
          <a class="tarjeta tarjeta--boton fila tarjeta--opciones" href="#/opciones/${p.id}" style="text-decoration:none;gap:12px">
            <img class="parche" src="${IMG.nodos.semillas}" alt="">
            <div class="columna crece" style="gap:2px"><strong class="tarjeta__titulo">Opciones para el próximo ciclo</strong><span class="tarjeta__sub">Qué sembrar para que la tierra de ${p.nombre} no se siga gastando</span></div>
            ${icono('der', { color: '#f2cf7a' })}
          </a>
          ${a.referencia ? html`<section class="tarjeta referencia">
            <span class="hero__etiqueta" style="letter-spacing:.12em">Referencia del municipio</span>
            <span>En ${a.referencia.lugar}, el maíz de temporal dio <b>${numero(a.referencia.a1.t, 2)} t/ha</b> en ${a.referencia.a1.anio} y <b>${numero(a.referencia.a2.t, 2)} t/ha</b> en ${a.referencia.a2.anio}.</span>
            <span class="tarjeta__sub">Es el promedio de todo el municipio, no un pronóstico de tu parcela.</span>
            <span class="fuente"><strong>Fuente:</strong> ${fuenteLegible(a.referencia.fuente)}</span>
          </section>` : ''}
          ${a.resumen.peor && a.resumen.peor.nivel !== 'bien' ? html`<div class="nota-papel">
            <span class="mano">Para platicar con tu técnico</span>
            <p style="margin-top:6px;font-size:15px;line-height:1.5">Lo que más pesa en ${p.nombre} es <strong>${a.resumen.peor.nombre.toLowerCase()}</strong>. Antes de decidir qué y cuándo sembrar, revisa esa señal con alguien de confianza.</p>
          </div>` : ''}
          ${avisoOjo('Ojo: esto es una predicción basada en datos', 'Juntamos lo que pasó en otros años y lo que tú has vivido. Los resultados pueden variar y no son exactos.')}
          <span class="fuente" style="padding:0 4px">Calculado el ${new Date(a.generadoEn).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}. Clima: ${a.fuenteClima}.</span>
        `}
      </div>
      ${cabeza({ titulo: p.nombre, sub: `${superficie(p.superficieM2, p.unidadCaptura)}${p.municipioNombre ? `, ${p.municipioNombre}` : ''}`, atras: '#/prediccion', etiquetaAtras: 'Volver a la lista de parcelas',
        extra: p.zonaId ? html`<span class="zona-chip" style="min-height:44px;padding:0 12px 0 8px;border:1px solid rgba(255,255,255,.7)"><i style="background:${climaMod.COLOR_ZONA[p.zonaId]};width:22px;height:22px"></i><span class="columna" style="gap:0;line-height:1.05"><span style="font-size:11.5px;color:var(--txt-3)">Zona</span>${climaMod.NOMBRE_CORTO_ZONA[p.zonaId]}</span></span>` : '' })}
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

