// SEMILLAS DE TEMPORADA: qué conviene sembrar en el mes elegido, en la zona de TU parcela.
// Sin una parcela con zona no se dice si conviene o no: solo la época de siembra del catálogo,
// y se pide la ubicación. Arriba se ve el terreno de la parcela (o la península por zonas).
// Se pueden elegir varias semillas para sembrarlas juntas en la parcela.
import { html, pintar, delegar, esc, presionado } from '../../shared/dom.js';
import { IMG, imagenCultivo, letrero } from '../../shared/assets.js';
import { icono, greca } from '../../shared/icons.js';
import { barraMenu } from '../layout.js';
import * as repos from '../../storage/repos.js';
import * as catalogo from '../../modules/crops/catalogo.js';
import * as climaMod from '../../modules/climate/clima.js';
import * as reglasMod from '../../modules/strategies/reglas.js';
import { hoy, MESES, MESES_CORTOS, inicial, fuenteLegible } from '../../shared/format.js';
import { terreno } from '../componentes/terreno.js';
import * as parcelasMod from '../../modules/parcel/parcelas.js';
import { avisar } from '../../app/estado.js';
import { hayVoz, escuchar, marcarEscucha } from '../voz.js';

// Posición de cada zona sobre la maqueta (porcentaje del ancho y alto de la imagen)
const POS = { 'yuc-sur': { x: 50, y: 58 }, 'camp-chenes': { x: 36, y: 68 }, 'qroo-centro': { x: 79, y: 40 } };

export async function montar(pantalla) {
  await Promise.all([climaMod.zonas(), reglasMod.reglas()]);
  const reglas = reglasMod.reglasSync();
  const zonas = await climaMod.zonas();
  const f = hoy();
  const parcelas = repos.parcelasActivas();
  const activa = parcelas.find((p) => p.id === repos.kv.get('parcelaActivaId')) || parcelas[0] || null;
  // Solo hay recomendación con una zona real (la de la parcela). No se asume ninguna.
  const zonaUsuario = climaMod.zonaPorId(activa?.zonaId) || null;
  const conZona = !!zonaUsuario;
  const siembrasActivas = activa ? parcelasMod.siembrasActuales(activa.id) : [];
  const estado = { mes: f.getMonth() + 1, dia: f.getDate(), sel: null, q: '', vista: activa?.superficieM2 ? 'terreno' : 'zonas', varias: false, elegidas: [] };
  const nombreActiva = activa ? `${activa.nombre}${activa.esEjemplo ? ' (ejemplo)' : ''}` : '';

  const via = (s, zona = zonaUsuario, mes = estado.mes) => catalogo.viabilidad(s, { mes, dia: mes === f.getMonth() + 1 ? estado.dia : 15, zona, reglas });
  const temporada = () => (catalogo.listas().temporadasDelAnio || []).find((x) => x.meses.includes(estado.mes));
  const ordenadas = () => (conZona
    ? catalogo.semillas().slice().sort((a, b) => ({ si: 0, esp: 1, no: 2 }[via(a).estado] - { si: 0, esp: 1, no: 2 }[via(b).estado]))
    : catalogo.semillas().slice());
  if (!estado.sel) estado.sel = ordenadas()[0]?.id;

  function mapa() {
    const s = catalogo.semilla(estado.sel);
    return html`<div class="mapa-semaforo" role="img" aria-label="${conZona ? `Mapa de la península con el semáforo de ${esc(s?.name || '')} por zona` : 'Mapa de las zonas de la península'}">
      <img src="${IMG.mapa}" alt="">
      ${zonas.map((z) => {
        const p = POS[z.id];
        const tuyo = activa?.zonaId === z.id;
        if (!conZona) return ''; // sin zona no se pinta semáforo ni se sugiere ninguna
        const v = via(s, z);
        return html`<span class="halo-zona" style="left:${p.x}%;top:${p.y}%;background:${catalogo.ESTADO_COLOR[v.estado]};box-shadow:0 0 14px 4px ${catalogo.ESTADO_COLOR[v.estado]}"></span>
        <button class="globo ${tuyo ? 'globo--tuyo' : ''}" data-act="zona" data-id="${z.id}" style="left:${p.x}%;top:${p.y}%" aria-label="${climaMod.NOMBRE_CORTO_ZONA[z.id]}: ${catalogo.ESTADO_TXT[v.estado]}">
          <span class="globo__caja"><span class="globo__punto" style="background:${catalogo.ESTADO_COLOR[v.estado]}"></span>
            <span><small>${tuyo ? `${activa.esEjemplo ? 'Ejemplo' : 'Tu parcela'}, ${climaMod.NOMBRE_CORTO_ZONA[z.id]}` : climaMod.NOMBRE_CORTO_ZONA[z.id]}</small><b>${catalogo.ESTADO_TXT[v.estado]}</b></span></span>
          <span class="globo__palo"></span>
        </button>`;
      })}
    </div>`;
  }

  /** Terreno de la parcela con lo que tiene sembrado (mismo esquema que en Tus parcelas). */
  function vistaTerreno() {
    const elegidas = estado.varias ? estado.elegidas : [];
    const nombres = elegidas.map((id) => catalogo.semilla(id)?.name.split(' (')[0]).filter(Boolean);
    return html`<div class="semillas-terreno">
      ${terreno(activa, siembrasActivas, { ancho: 280 })}
      <p class="nota-info" style="margin:0">${icono('info', { color: '#9fd6db', tam: 18 })}<span>${siembrasActivas.length
        ? `Así está ${nombreActiva} hoy.`
        : `${nombreActiva} todavía no tiene semillas en esta temporada.`}${nombres.length ? ` Elegidas para sembrar: ${nombres.join(', ')}.` : ''}</span></p>
    </div>`;
  }

  function cabeceraVisual() {
    if (!activa?.superficieM2) return mapa();
    return html`<div class="segmento segmento--oscuro" role="tablist" aria-label="Qué ver">
        <button role="tab" data-act="vista" data-v="terreno" aria-selected="${estado.vista === 'terreno'}" aria-pressed="${presionado(estado.vista === 'terreno')}">Tu terreno</button>
        <button role="tab" data-act="vista" data-v="zonas" aria-selected="${estado.vista === 'zonas'}" aria-pressed="${presionado(estado.vista === 'zonas')}">Por zona</button>
      </div>
      ${estado.vista === 'terreno' ? vistaTerreno() : mapa()}`;
  }

  /** Aviso cuando no se puede recomendar: dice qué falta y cómo darlo. */
  function faltaZona() {
    return html`<div class="tarjeta falta-dato">
      <strong>${activa ? `${nombreActiva} todavía no tiene zona` : '¿Dónde está tu milpa?'}</strong>
      <p>${activa ? 'Marca su ubicación o su municipio para saber si conviene sembrar cada semilla en tu zona.' : 'Sin tu ubicación no podemos decirte si conviene sembrar. Por ahora te mostramos solo la época de siembra de cada semilla.'}</p>
      <div class="fila" style="flex-wrap:wrap;gap:8px">
        <a class="btn btn--chico btn--primario" href="${activa ? `#/parcelas/${activa.id}/editar` : '#/parcelas/nueva'}">${icono(activa ? 'pin' : 'mas', { tam: 18 })}${activa ? 'Completar ubicación' : 'Agregar mi parcela'}</a>
        ${activa ? '' : html`<a class="btn btn--chico btn--vidrio" href="#/parcelas">Ver un ejemplo</a>`}
      </div>
    </div>`;
  }

  function tiras() {
    return ordenadas().map((s) => {
      const c = catalogo.cultivo(s.cultivoId);
      const v = conZona ? via(s) : null;
      const marcada = estado.varias ? estado.elegidas.includes(s.id) : estado.sel === s.id;
      const lectura = v ? `${catalogo.ESTADO_TXT[v.estado]} en tu zona` : `se siembra ${catalogo.epocaCorta(s)}`;
      return html`<button class="semilla-tile" data-act="sel" data-id="${s.id}" ${estado.varias ? html`role="checkbox" aria-checked="${presionado(marcada)}"` : html`aria-pressed="${presionado(marcada)}"`} aria-label="${s.name}: ${lectura}">
        ${v ? html`<span class="semilla-tile__estado" style="background:${catalogo.ESTADO_COLOR[v.estado]}" aria-hidden="true"></span>` : ''}
        ${estado.varias && marcada ? html`<span class="semilla-tile__check" aria-hidden="true">${icono('check', { tam: 14, grosor: 3 })}</span>` : ''}
        <span class="semilla-tile__foto"><img src="${imagenCultivo(c.imagen)}" alt="" loading="lazy"></span>
        <span class="columna" style="gap:0;align-items:center"><strong>${s.name.split(' (')[0]}</strong><em>${v ? (c.nombreMaya || c.name) : `Época: ${catalogo.epocaCorta(s)}`}</em></span>
      </button>`;
    });
  }

  function ficha(s, { completa = true } = {}) {
    const c = catalogo.cultivo(s.cultivoId);
    const v = conZona ? via(s) : null;
    return html`<div class="tarjeta columna" style="gap:12px">
      <div class="resultado-semilla">
        <img class="foto" src="${imagenCultivo(c.imagen)}" alt="">
        <div class="crece columna" style="gap:4px">
          <strong class="tarjeta__titulo">${s.name}</strong>
          <span class="tarjeta__sub">${c.nombreMaya ? html`<em>${c.nombreMaya}</em>, ` : ''}${s.disponibilidad}</span>
          ${v ? html`<span class="sello sello--${v.estado}" style="align-self:flex-start">${catalogo.ESTADO_TXT[v.estado]} en ${climaMod.NOMBRE_CORTO_ZONA[zonaUsuario.id]}${v.fechaSinFuente ? ' (por confirmar)' : ''}</span>`
            : html`<span class="sello sello--sin" style="align-self:flex-start">Época de siembra: ${catalogo.epocaCorta(s)}</span>`}
        </div>
        ${v ? html`<img class="letrero" src="${letrero(catalogo.ESTADO_LETRERO[v.estado])}" alt="${catalogo.ESTADO_TXT[v.estado]}" style="flex-shrink:0">` : ''}
      </div>
      ${completa ? html`
        <p style="font-size:15px;color:var(--txt-2)">${s.descripcion}</p>
        ${v ? html`<ul style="margin:0;padding-left:18px;font-size:14.5px;display:flex;flex-direction:column;gap:4px">${v.razones.map((r) => html`<li>${r}</li>`)}</ul>`
          : html`<p style="font-size:14.5px;margin:0">Se siembra de temporal ${catalogo.rangoVentana(s)}${s.source ? '' : ' (fecha aún sin fuente revisada)'}. Para saber si te conviene en tu zona, agrega tu parcela.</p>`}
        ${s.cicloDias ? html`<span class="fuente"><strong>Ciclo:</strong> unos ${s.cicloDias} días de siembra a cosecha.</span>` : ''}
        <span class="fuente"><strong>Fuente:</strong> ${s.source ? fuenteLegible(s.source) : 'sin fuente todavía'}${catalogo.origen('seeds') === 'ejemplo' ? '. Catálogo de ejemplo del prototipo.' : '.'}</span>
        ${(s.porConfirmar || []).map((p) => html`<span class="porconfirmar">Por confirmar: ${p}</span>`)}` : ''}
      <div class="fila" style="flex-wrap:wrap;gap:8px">
        ${activa ? html`<a class="btn btn--chico btn--primario" href="#/parcelas/${activa.id}?sembrar=${s.id}">${icono('brote', { tam: 18 })}Sembrar en ${nombreActiva}</a>` : ''}
        ${!completa ? html`<button class="btn btn--texto" data-act="sel" data-id="${s.id}">Ver ficha</button>` : ''}
      </div>
    </div>`;
  }

  /** Acciones para las semillas elegidas a la vez. */
  function barraVarias() {
    const n = estado.elegidas.length;
    const ids = estado.elegidas.join(',');
    return html`<div class="tarjeta barra-varias" aria-live="polite">
      <strong>${n ? `${n} ${n === 1 ? 'semilla elegida' : 'semillas elegidas'}` : 'Toca las semillas que quieras juntar'}</strong>
      <div class="fila" style="flex-wrap:wrap;gap:8px">
        ${activa ? html`<a class="btn btn--chico btn--primario" ${n ? html`href="#/parcelas/${activa.id}?sembrar=${ids}"` : html`aria-disabled="true"`}>${icono('brote', { tam: 18 })}Sembrar en ${nombreActiva}</a>` : html`<a class="btn btn--chico btn--primario" href="#/parcelas/nueva">${icono('mas', { tam: 18 })}Primero agrega tu parcela</a>`}
      </div>
    </div>`;
  }

  function resultados() {
    if (!estado.q.trim()) return '';
    const r = catalogo.buscar(estado.q);
    if (!r.length) return html`<div class="tarjeta"><p>No encontramos “${estado.q}”. Prueba con maíz, frijol, ib, calabaza o chile.</p></div>`;
    return r.map((s) => ficha(s, { completa: false }));
  }

  function pintarTodo() {
    const u = repos.kv.get('usuario');
    const t = temporada();
    const s = catalogo.semilla(estado.sel);
    pintar(pantalla, html`
      <div class="fondo" aria-hidden="true"><img class="fondo__foto" src="${IMG.fondo}" alt=""><div class="fondo__velo" style="background:rgba(18,20,14,.28)"></div><div class="fondo__arriba" style="height:300px"></div><div class="fondo__abajo"></div></div>
      <div class="scroll scroll--con-menu" style="padding-top:52px" id="scrollSemillas">
        <div class="fila entra d1">
          <a class="btn-oscuro" href="#/menu" aria-label="Volver al menú">${icono('atras')}</a>
          <div class="columna crece" style="gap:0"><span style="font-size:11.5px;font-weight:700;color:rgba(255,255,255,.82)">${activa ? (activa.esEjemplo ? 'Parcela de ejemplo' : 'Tu parcela') : 'Sin parcela todavía'}</span><span style="font-size:15px;font-weight:700">${activa ? `${activa.nombre}${conZona ? `, ${climaMod.NOMBRE_CORTO_ZONA[zonaUsuario.id]}` : ', sin zona'}` : 'Agrega tu parcela para ver tu zona'}</span></div>
          <a class="avatar" href="#/inicio" aria-label="Ir al inicio" style="width:44px;height:44px;font-size:18px;text-decoration:none">${inicial(u?.nombreVisible)}</a>
        </div>
        ${greca({ id: 'grecaSem', opacidad: 0.7 })}
        <div class="semillas__arriba entra d2">
          <h1 style="font-size:29px;font-weight:700;line-height:1.05;letter-spacing:-.025em">Semillas de temporada</h1>
          ${t ? html`<span class="semillas__temporada">${icono('nube', { color: '#9fd6db', tam: 15, grosor: 2 })}${t.name}, ${t.rango}</span>` : ''}
        </div>
        <div class="meses" role="group" aria-label="Ver otro mes">
          ${MESES_CORTOS.map((m, i) => html`<button data-act="mes" data-m="${i + 1}" aria-pressed="${presionado(estado.mes === i + 1)}" data-hoy="${i === f.getMonth() ? 'true' : 'false'}" aria-label="${MESES[i]}${i === f.getMonth() ? ', mes actual' : ''}">${m}</button>`)}
        </div>
        ${cabeceraVisual()}
        ${conZona ? (estado.vista === 'zonas' || !activa?.superficieM2 ? html`<p class="nota-info" style="margin-top:-6px">${icono('info', { color: '#9fd6db', tam: 18 })}<span>Semáforo de <strong style="color:#fff">${s?.name || ''}</strong> en ${MESES[estado.mes - 1]}: época de siembra de temporal y suelo que predomina en cada zona.</span></p>` : '') : faltaZona()}
        <div class="fila fila--entre">
          <span class="seccion__titulo" style="font-size:16px">Semillas</span>
          <div class="fila" style="gap:8px">
            <button class="btn-pastilla" data-act="varias" aria-pressed="${presionado(estado.varias)}">${icono(estado.varias ? 'cerrar' : 'check', { color: '#f2cf7a', tam: 18, grosor: 2 })}${estado.varias ? 'Listo' : 'Elegir varias'}</button>
          </div>
        </div>
        <div class="tiras" id="tiras">${tiras()}</div>
        ${estado.varias ? barraVarias() : html`<div id="ficha">${s ? ficha(s) : ''}</div>`}
        <div class="columna" style="gap:10px">
          <label for="buscarSemilla" class="sr">Buscar una semilla</label>
          <div class="buscador">
            ${icono('buscar', { color: '#6b5d4a' })}
            <input id="buscarSemilla" type="search" placeholder="Busca otra semilla…" value="${esc(estado.q)}" autocomplete="off">
            <button class="buscador__mic" data-act="vozBuscar" aria-label="Buscar hablando">${icono('mic', { tam: 20 })}</button>
          </div>
          <div id="resultados" class="columna" style="gap:10px" aria-live="polite">${resultados()}</div>
        </div>
      </div>
      ${barraMenu()}
    `);
  }

  function centrarMes() {
    const m = pantalla.querySelector('.meses button[aria-pressed="true"]');
    const cont = pantalla.querySelector('.meses');
    if (m && cont) cont.scrollLeft = m.offsetLeft - cont.clientWidth / 2 + m.clientWidth / 2;
  }

  function repintarParcial() {
    const scroll = pantalla.querySelector('#scrollSemillas');
    const y = scroll?.scrollTop || 0;
    const tirasX = pantalla.querySelector('#tiras')?.scrollLeft || 0;
    pintarTodo();
    const s2 = pantalla.querySelector('#scrollSemillas');
    if (s2) s2.scrollTop = y;
    const t2 = pantalla.querySelector('#tiras');
    if (t2) t2.scrollLeft = tirasX;
    centrarMes();
  }

  const quitar = delegar(pantalla, 'click', {
    sel: (el) => {
      const id = el.dataset.id;
      if (estado.varias) { estado.elegidas = estado.elegidas.includes(id) ? estado.elegidas.filter((x) => x !== id) : [...estado.elegidas, id]; repintarParcial(); return; }
      estado.sel = id; repintarParcial(); pantalla.querySelector('#ficha')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    },
    varias: () => { estado.varias = !estado.varias; estado.elegidas = estado.varias && estado.sel ? [estado.sel] : []; repintarParcial(); },
    vista: (el) => { estado.vista = el.dataset.v; repintarParcial(); },
    mes: (el) => { estado.mes = Number(el.dataset.m); repintarParcial(); },
    zona: (el) => { if (!conZona) return; const z = climaMod.zonaPorId(el.dataset.id); const s = catalogo.semilla(estado.sel); const v = via(s, z); avisar(`${climaMod.NOMBRE_CORTO_ZONA[z.id]}: ${v.razones[v.razones.length - 1]}`); },
    vozBuscar: () => {
      if (!hayVoz) { pantalla.querySelector('#buscarSemilla')?.focus(); return; }
      const b = pantalla.querySelector('[data-act="vozBuscar"]');
      marcarEscucha(b, true);
      escuchar({
        alTexto: (txt) => { estado.q = txt; repintarParcial(); pantalla.querySelector('#resultados')?.scrollIntoView({ behavior: 'smooth' }); },
        alFin: () => marcarEscucha(pantalla.querySelector('[data-act="vozBuscar"]'), false),
      });
    },
  });
  const alEscribir = (e) => {
    if (e.target.id !== 'buscarSemilla') return;
    estado.q = e.target.value;
    pintar(pantalla.querySelector('#resultados'), html`${resultados()}`);
  };
  pantalla.addEventListener('input', alEscribir);
  pintarTodo();
  centrarMes();
  return () => { quitar(); pantalla.removeEventListener('input', alEscribir); };
}
