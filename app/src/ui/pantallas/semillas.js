// SEMILLAS DE TEMPORADA: qué conviene sembrar este mes en la península, por zona.
// Buscador abajo con la ficha de cada semilla. El sabucán es local (pendiente en backend).
import { html, pintar, delegar, esc, presionado } from '../../shared/dom.js';
import { IMG, imagenCultivo, letrero } from '../../shared/assets.js';
import { icono, greca } from '../../shared/icons.js';
import { barraMenu, abrirHoja } from '../layout.js';
import * as repos from '../../storage/repos.js';
import * as catalogo from '../../modules/crops/catalogo.js';
import * as climaMod from '../../modules/climate/clima.js';
import * as reglasMod from '../../modules/strategies/reglas.js';
import { hoy, MESES, MESES_CORTOS, inicial } from '../../shared/format.js';
import { avisar } from '../../app/estado.js';
import { hayVoz, escuchar } from '../voz.js';

// Posición de cada zona sobre la maqueta (porcentaje del ancho y alto de la imagen)
const POS = { 'yuc-noroeste': { x: 27, y: 33 }, 'camp-chenes': { x: 40, y: 66 }, 'qroo-centro': { x: 79, y: 40 } };

export async function montar(pantalla) {
  await Promise.all([climaMod.zonas(), reglasMod.reglas()]);
  const reglas = reglasMod.reglasSync();
  const zonas = await climaMod.zonas();
  const f = hoy();
  const parcelas = repos.parcelasActivas();
  const activa = parcelas.find((p) => p.id === repos.kv.get('parcelaActivaId')) || parcelas[0] || null;
  const zonaUsuario = climaMod.zonaPorId(activa?.zonaId) || zonas[0];
  const estado = { mes: f.getMonth() + 1, dia: f.getDate(), sel: null, q: '' };

  const sabucan = () => repos.kv.get('sabucan', []) || [];
  const via = (s, zona = zonaUsuario, mes = estado.mes) => catalogo.viabilidad(s, { mes, dia: mes === f.getMonth() + 1 ? estado.dia : 15, zona, reglas });
  const temporada = () => (catalogo.listas().temporadasDelAnio || []).find((x) => x.meses.includes(estado.mes));
  const ordenadas = () => catalogo.semillas().slice().sort((a, b) => ({ si: 0, esp: 1, no: 2 }[via(a).estado] - { si: 0, esp: 1, no: 2 }[via(b).estado]));
  if (!estado.sel) estado.sel = ordenadas()[0]?.id;

  function mapa() {
    const s = catalogo.semilla(estado.sel);
    return html`<div class="mapa-semaforo" role="img" aria-label="Mapa de la península con el semáforo de ${esc(s?.name || '')} por zona">
      <img src="${IMG.mapa}" alt="">
      ${zonas.map((z) => {
        const v = via(s, z);
        const p = POS[z.id];
        const tuyo = parcelas.find((x) => x.zonaId === z.id);
        return html`<span class="halo-zona" style="left:${p.x}%;top:${p.y}%;background:${catalogo.ESTADO_COLOR[v.estado]};box-shadow:0 0 14px 4px ${catalogo.ESTADO_COLOR[v.estado]}"></span>
        <button class="globo ${tuyo ? 'globo--tuyo' : ''}" data-act="zona" data-id="${z.id}" style="left:${p.x}%;top:${p.y}%" aria-label="${climaMod.NOMBRE_CORTO_ZONA[z.id]}: ${catalogo.ESTADO_TXT[v.estado]}">
          <span class="globo__caja"><span class="globo__punto" style="background:${catalogo.ESTADO_COLOR[v.estado]}"></span>
            <span><small>${tuyo ? `Tu parcela, ${climaMod.NOMBRE_CORTO_ZONA[z.id]}` : climaMod.NOMBRE_CORTO_ZONA[z.id]}</small><b>${catalogo.ESTADO_TXT[v.estado]}</b></span></span>
          <span class="globo__palo"></span>
        </button>`;
      })}
    </div>`;
  }

  function tiras() {
    const bolsa = sabucan();
    return ordenadas().map((s) => {
      const c = catalogo.cultivo(s.cultivoId);
      const v = via(s);
      return html`<button class="semilla-tile" data-act="sel" data-id="${s.id}" aria-pressed="${presionado(estado.sel === s.id)}" aria-label="${s.name}: ${catalogo.ESTADO_TXT[v.estado]} en tu zona${bolsa.includes(s.id) ? ', en tu sabucán' : ''}">
        <span class="semilla-tile__estado" style="background:${catalogo.ESTADO_COLOR[v.estado]}" aria-hidden="true"></span>
        <span class="semilla-tile__foto"><img src="${imagenCultivo(c.imagen)}" alt="" loading="lazy"></span>
        <span class="columna" style="gap:0;align-items:center"><strong>${s.name.split(' (')[0]}</strong><em>${c.nombreMaya || c.name}</em></span>
      </button>`;
    });
  }

  function ficha(s, { completa = true } = {}) {
    const c = catalogo.cultivo(s.cultivoId);
    const v = via(s);
    const enBolsa = sabucan().includes(s.id);
    return html`<div class="tarjeta columna" style="gap:12px">
      <div class="resultado-semilla">
        <img class="foto" src="${imagenCultivo(c.imagen)}" alt="">
        <div class="crece columna" style="gap:4px">
          <strong class="tarjeta__titulo">${s.name}</strong>
          <span class="tarjeta__sub">${c.nombreMaya ? html`<em>${c.nombreMaya}</em>, ` : ''}${s.disponibilidad}</span>
          <span class="sello sello--${v.estado}" style="align-self:flex-start">${catalogo.ESTADO_TXT[v.estado]} en ${climaMod.NOMBRE_CORTO_ZONA[zonaUsuario.id]}</span>
        </div>
        <img class="letrero" src="${letrero(catalogo.ESTADO_LETRERO[v.estado])}" alt="${catalogo.ESTADO_TXT[v.estado]}" style="flex-shrink:0">
      </div>
      ${completa ? html`
        <p style="font-size:15px;color:var(--txt-2)">${s.descripcion}</p>
        <ul style="margin:0;padding-left:18px;font-size:14.5px;display:flex;flex-direction:column;gap:4px">${v.razones.map((r) => html`<li>${r}</li>`)}</ul>
        ${s.cicloDias ? html`<span class="fuente"><strong>Ciclo:</strong> unos ${s.cicloDias} días de siembra a cosecha.</span>` : ''}
        <span class="fuente"><strong>Fuente:</strong> ${s.source || 'sin fuente todavía'}${catalogo.origen('seeds') === 'ejemplo' ? '. Catálogo de ejemplo del prototipo.' : '.'}</span>
        ${(s.porConfirmar || []).map((p) => html`<span class="porconfirmar">Por confirmar: ${p}</span>`)}` : ''}
      <div class="fila" style="flex-wrap:wrap;gap:8px">
        <button class="btn btn--chico ${enBolsa ? 'btn--vidrio' : 'btn--dorado'}" data-act="bolsa" data-id="${s.id}" aria-pressed="${presionado(enBolsa)}">${icono(enBolsa ? 'check' : 'bolsa', { tam: 18 })}${enBolsa ? 'En tu sabucán' : 'Al sabucán'}</button>
        ${parcelas.length ? html`<a class="btn btn--chico btn--primario" href="#/parcelas/${activa.id}?sembrar=${s.id}">${icono('brote', { tam: 18 })}Sembrar en ${activa.nombre}</a>` : ''}
        ${!completa ? html`<button class="btn btn--texto" data-act="sel" data-id="${s.id}">Ver ficha</button>` : ''}
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
    const n = sabucan().length;
    pintar(pantalla, html`
      <div class="fondo" aria-hidden="true"><img class="fondo__foto" src="${IMG.fondo}" alt=""><div class="fondo__velo" style="background:rgba(18,20,14,.28)"></div><div class="fondo__arriba" style="height:300px"></div><div class="fondo__abajo"></div></div>
      <div class="scroll scroll--con-menu" style="padding-top:52px" id="scrollSemillas">
        <div class="fila entra d1">
          <a class="btn-oscuro" href="#/menu" aria-label="Volver al menú">${icono('atras')}</a>
          <div class="columna crece" style="gap:0"><span style="font-size:11.5px;font-weight:700;color:rgba(255,255,255,.82)">${activa ? 'Tu parcela' : 'Sin parcela todavía'}</span><span style="font-size:15px;font-weight:700">${activa ? `${activa.nombre}${activa.municipioNombre ? `, en ${activa.municipioNombre}` : ''}` : 'Usamos el Noroeste de referencia'}</span></div>
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
        ${mapa()}
        <p class="nota-info" style="margin-top:-6px">${icono('info', { color: '#9fd6db', tam: 18 })}<span>Semáforo de <strong style="color:#fff">${s?.name || ''}</strong> en ${MESES[estado.mes - 1]}: ventana de siembra de temporal y suelo que predomina en cada zona.</span></p>
        <div class="fila fila--entre">
          <span class="seccion__titulo" style="font-size:16px">Opciones de semillas</span>
          <button class="btn-sabucan" data-act="abrirBolsa" aria-label="Abrir mi sabucán, ${n} semillas">${icono('bolsa', { color: '#f2cf7a', tam: 22, grosor: 1.8 })}Mi sabucán<span class="contador">${n}</span></button>
        </div>
        <div class="tiras" id="tiras">${tiras()}</div>
        <div id="ficha">${s ? ficha(s) : ''}</div>
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

  function alternarBolsa(id) {
    const b = sabucan();
    const dentro = b.includes(id);
    repos.kv.set('sabucan', dentro ? b.filter((x) => x !== id) : [...b, id]);
    avisar(dentro ? 'La sacaste del sabucán' : 'Guardada en tu sabucán');
  }

  function hojaBolsa() {
    const hoja = abrirHoja(pantalla, {
      titulo: 'Mi sabucán',
      papel: true,
      cuerpo: () => {
        const lista = sabucan().map((id) => catalogo.semilla(id)).filter(Boolean);
        return html`
          <div class="fila" style="gap:12px;align-items:flex-start">
            <img src="${IMG.fotos.sabucan}" alt="Sabucán bordado" style="width:72px;height:80px;object-fit:cover;border-radius:10px;transform:rotate(-3deg);box-shadow:0 8px 16px -8px rgba(0,0,0,.5)">
            <p style="font-size:14.5px;color:#4d4234">Aparta aquí las semillas que piensas conseguir o sembrar. <span class="sello sello--pendiente" style="color:#7a2840;border-color:#7a2840;background:rgba(122,40,64,.08)">Pendiente en el servidor</span><br><span style="font-size:13px;color:#6b5d4a">Por ahora se guarda solo en este teléfono.</span></p>
          </div>
          ${lista.length ? lista.map((s) => html`<div class="fila" style="padding:10px 12px;border-radius:16px;background:#ece3cf">
            <img src="${imagenCultivo(catalogo.cultivo(s.cultivoId).imagen)}" alt="" style="width:44px;height:44px;border-radius:50%;object-fit:cover">
            <span class="crece columna" style="gap:0"><strong>${s.name}</strong><span style="font-size:13px;color:#6b5d4a">${catalogo.ESTADO_TXT[via(s).estado]} en ${MESES[estado.mes - 1]}</span></span>
            <button class="btn btn--chico" style="background:rgba(122,40,64,.1);color:#7a2840" data-act="quitarBolsa" data-id="${s.id}" aria-label="Quitar ${s.name} del sabucán">${icono('basura', { tam: 18 })}</button>
          </div>`) : html`<p style="text-align:center;color:#6b5d4a;padding:12px">Tu sabucán está vacío.</p>`}`;
      },
      alMontar: (nodo, h) => {
        nodo.addEventListener('click', (e) => {
          const b = e.target.closest('[data-act="quitarBolsa"]');
          if (!b) return;
          alternarBolsa(b.dataset.id);
          h.repintar();
        });
      },
      alCerrar: () => repintarParcial(),
    });
    return hoja;
  }

  const quitar = delegar(pantalla, 'click', {
    sel: (el) => { estado.sel = el.dataset.id; repintarParcial(); pantalla.querySelector('#ficha')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); },
    mes: (el) => { estado.mes = Number(el.dataset.m); repintarParcial(); },
    zona: (el) => { const z = climaMod.zonaPorId(el.dataset.id); const s = catalogo.semilla(estado.sel); const v = via(s, z); avisar(`${climaMod.NOMBRE_CORTO_ZONA[z.id]}: ${v.razones[v.razones.length - 1]}`); },
    bolsa: (el) => { alternarBolsa(el.dataset.id); repintarParcial(); },
    abrirBolsa: hojaBolsa,
    vozBuscar: () => {
      if (!hayVoz) { pantalla.querySelector('#buscarSemilla')?.focus(); return; }
      escuchar({ alTexto: (txt) => { estado.q = txt; repintarParcial(); pantalla.querySelector('#resultados')?.scrollIntoView({ behavior: 'smooth' }); } });
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
