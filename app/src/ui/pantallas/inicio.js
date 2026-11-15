// INICIO: nombre del usuario, calendario de la milpa, micrófono y botón de Menú.
import { html, pintar, delegar, esc, presionado } from '../../shared/dom.js';
import { IMG } from '../../shared/assets.js';
import { icono, greca } from '../../shared/icons.js';
import { fondo, barraMenu, abrirHoja } from '../layout.js';
import * as repos from '../../storage/repos.js';
import { superficie, MESES, fechaCorta, diaSemana, hoy, mismaFecha, inicial } from '../../shared/format.js';
import * as cal from '../../motor/calendario.js';
import { NOMBRE_CORTO_ZONA } from '../../modules/climate/clima.js';
import { hayVoz, escuchar, interpretar, decir } from '../voz.js';
import { ir } from '../../app/router.js';
import { avisar } from '../../app/estado.js';
import { t } from '../../i18n/index.js';

export function montar(pantalla, params = {}) {
  const estado = { escuchando: false, parcial: '', calAbierto: false, mesVista: null, sel: hoy(), escribir: false };
  // #/inicio?cal=2027-06 abre el calendario en ese mes (lo usa «Quiero probar esta»)
  const calPedido = /^(\d{4})-(\d{2})$/.exec(params.query?.get('cal') || '');
  if (calPedido) {
    const [anio, mes] = [Number(calPedido[1]), Number(calPedido[2])];
    estado.calAbierto = true; estado.mesVista = { anio, mes }; estado.sel = new Date(anio, mes - 1, 15);
  }
  let detener = null;

  const usuario = () => repos.kv.get('usuario', null);
  const parcelaActiva = () => {
    const lista = repos.parcelasActivas();
    return lista.find((p) => p.id === repos.kv.get('parcelaActivaId')) || lista[0] || null;
  };

  function tarjetaParcela() {
    const p = parcelaActiva();
    if (!p) {
      return html`<a class="vidrio-parcela" href="#/parcelas/nueva" style="text-decoration:none">
        <span class="vidrio-parcela__ico">${icono('mas', { color: '#f3ead6', tam: 24 })}</span>
        <span class="vidrio-parcela__txt"><small>Todavía no hay parcelas</small><strong>Agrega tu primera parcela</strong><span>Con eso afinamos el calendario y las predicciones</span></span>
        ${icono('der', { color: '#f2cf7a' })}
      </a>`;
    }
    const lugar = [p.municipioNombre, p.estado].filter(Boolean).join(', ');
    const coords = p.ubicacion ? `${Math.abs(p.ubicacion.lat).toFixed(2)}° N, ${Math.abs(p.ubicacion.lon).toFixed(2)}° O` : 'sin ubicación';
    return html`<button class="vidrio-parcela" data-act="elegirParcela" aria-label="Cambiar de parcela. Ahora: ${p.nombre}">
      <span class="vidrio-parcela__ico">${icono('pin', { color: '#f3ead6', tam: 26, grosor: 1.9 })}</span>
      <span class="vidrio-parcela__txt">
        <small><span class="punto-vivo"></span>${p.esEjemplo ? 'Parcela de ejemplo' : 'Tu parcela'}${p.zonaId ? `, zona ${NOMBRE_CORTO_ZONA[p.zonaId] || ''}` : ''}</small>
        <strong>${p.nombre}, ${superficie(p.superficieM2, p.unidadCaptura)}</strong>
        <span>${lugar ? `${lugar} (${coords})` : coords}</span>
      </span>
      ${icono('abajo', { color: '#f2cf7a' })}
    </button>`;
  }

  function formTexto() {
    return html`<form class="voz-texto"><label class="sr" for="comandoTxt">Escribe a dónde quieres ir</label>
      <input id="comandoTxt" class="campo" placeholder="Escribe, por ejemplo: mis parcelas" autocomplete="off">
      <button class="btn btn--dorado btn--chico" type="submit">Ir</button></form>`;
  }

  function vozEtiqueta() {
    const nombre = usuario()?.nombreVisible;
    if (estado.escuchando) {
      return html`<div class="voz-etiqueta__caja" data-escuchando="true" aria-live="polite">
        <span class="voz-etiqueta__ico" aria-hidden="true"><span class="onda"></span><span class="onda"></span><span class="onda"></span><span class="onda"></span></span>
        <span class="voz-etiqueta__txt"><strong style="color:#f2cf7a">${estado.parcial || `Te escucho${nombre ? `, ${nombre}` : ''}…`}</strong><span>${t('inicio.vozEscuchandoSub')}</span></span>
      </div>`;
    }
    return html`<div class="voz-etiqueta__caja" aria-live="polite">
      <span class="voz-etiqueta__ico" aria-hidden="true">${icono('ondas', { color: '#f2cf7a', tam: 18 })}</span>
      <span class="voz-etiqueta__txt"><strong>${t('inicio.vozReposo')}</strong><span>${hayVoz ? t('inicio.vozReposoSub') : 'Tu navegador no oye voz: toca y escríbelo.'}</span></span>
    </div>`;
  }

  function pintarTodo() {
    const u = usuario();
    const f = hoy();
    pintar(pantalla, html`
      ${fondo('fondo--inicio')}
      <div class="inicio__saludo entra d1">
        <button class="avatar" data-act="cambiarNombre" aria-label="Cambiar tu nombre">${inicial(u?.nombreVisible)}</button>
        <div class="inicio__nombre"><em>${t('app.saludo')}</em><strong>${u?.nombreVisible || 'productor'}</strong></div>
        <button class="chip-fecha" data-act="toggleCal" aria-expanded="${estado.calAbierto ? 'true' : 'false'}" aria-label="Abrir calendario de la milpa">
          ${icono('calendario', { color: '#7a2840', tam: 16, grosor: 2 })}<span>${fechaCorta(f)}</span>
          <span class="chip-fecha__flecha">${icono('abajo', { color: '#f3ead6', tam: 12, grosor: 3 })}</span>
        </button>
      </div>
      <div class="inicio__greca entra d2">${greca({ id: 'grecaInicio', opacidad: 0.7 })}</div>
      <h1 class="inicio__titulo entra d3">¿Qué quieres<br>hacer hoy?</h1>
      <div class="inicio__parcela entra d4" id="tarjetaParcela">${tarjetaParcela()}</div>
      <div class="mic-zona" data-escuchando="${estado.escuchando ? 'true' : 'false'}" id="micZona">
        <div class="mic-zona__punteado"></div><div class="mic-zona__dorado"></div>
        <div class="mic-zona__tela"><img src="${IMG.bordado}" alt=""></div>
        <button class="mic" data-act="mic" aria-pressed="${presionado(estado.escuchando)}" aria-label="${estado.escuchando ? 'Dejar de escuchar' : 'Hablar con el asistente'}">${icono('mic', { tam: 32, grosor: 2 })}</button>
      </div>
      <div class="voz-etiqueta entra d6" id="vozEtiqueta">${estado.escribir ? formTexto() : vozEtiqueta()}</div>
      ${barraMenu()}
      <div id="capaCal"></div>
    `);
    if (estado.calAbierto) pintarCalendario();
    if (estado.escribir) setTimeout(() => pantalla.querySelector('#comandoTxt')?.focus(), 30);
  }

  // ---------------- Calendario ----------------
  async function pintarCalendario() {
    const capa = pantalla.querySelector('#capaCal');
    if (!capa) return;
    const vista = estado.mesVista || { anio: hoy().getFullYear(), mes: hoy().getMonth() + 1 };
    estado.mesVista = vista;
    const p = parcelaActiva();
    const datos = await cal.mes(vista.anio, vista.mes, { parcelaId: p?.id });
    if (!estado.calAbierto) return;
    const primerDia = new Date(vista.anio, vista.mes - 1, 1).getDay();
    const diasMes = new Date(vista.anio, vista.mes, 0).getDate();
    const f = hoy();
    const celdas = [];
    for (let i = 0; i < primerDia; i++) celdas.push(html`<span aria-hidden="true"></span>`);
    for (let n = 1; n <= diasMes; n++) {
      const d = new Date(vista.anio, vista.mes - 1, n);
      const evs = datos.eventos.get(n) || [];
      const tipos = [...new Set(evs.map((e) => e.tipo))];
      celdas.push(html`<button class="cal__dia" data-act="dia" data-n="${n}" data-hoy="${mismaFecha(d, f) ? 'true' : 'false'}" data-temporada="${datos.temporada ? 'true' : 'false'}" aria-pressed="${mismaFecha(d, estado.sel) ? 'true' : 'false'}" aria-label="${n} de ${MESES[vista.mes - 1]}${evs.length ? `: ${evs.map((e) => e.texto).join('; ')}` : ''}">
        <span>${n}</span><span class="cal__marcas">${tipos.map((tp) => html`<span style="background:${cal.TIPOS[tp].color}"></span>`)}</span>
      </button>`);
    }
    const sel = estado.sel.getMonth() + 1 === vista.mes && estado.sel.getFullYear() === vista.anio ? estado.sel : null;
    const evSel = sel ? (datos.eventos.get(sel.getDate()) || []) : [];
    const tituloSel = sel ? (mismaFecha(sel, f) ? `Hoy, ${diaSemana(sel).toLowerCase()} ${sel.getDate()} de ${MESES[sel.getMonth()]}` : `${diaSemana(sel)} ${sel.getDate()} de ${MESES[sel.getMonth()]}`) : 'Toca un día para ver qué pasa';
    // Agrupa eventos de clima repetidos en el día (una sola línea)
    const listaSel = [];
    const vistos = new Set();
    evSel.forEach((e) => { const k = e.tipo + e.texto; if (!vistos.has(k)) { vistos.add(k); listaSel.push(e); } });
    if (sel && datos.temporada) listaSel.push({ tipo: 'temporada', texto: `${datos.temporada.name} (${datos.temporada.rango})`, detalle: datos.temporada.evidencia, dato: 'historico' });

    pintar(capa, html`
      <button class="velo" data-act="cerrarCal" aria-label="Cerrar calendario" tabindex="-1"></button>
      <div class="calendario" role="dialog" aria-modal="true" aria-label="Calendario de la milpa">
        <div class="fila fila--entre">
          <div class="columna" style="gap:0"><span style="font-size:12px;font-weight:700;color:#6b5d4a">Calendario de la milpa, zona ${NOMBRE_CORTO_ZONA[datos.zona.id] || datos.zona.nombre}${datos.zonaAsumida ? ' (de referencia)' : ''}</span>
          <span class="cal__mes">${MESES[vista.mes - 1]} ${vista.anio}</span></div>
          <button class="cal__nav" data-act="cerrarCal" aria-label="Cerrar calendario">${icono('cerrar', { tam: 18, grosor: 2.4 })}</button>
        </div>
        <div class="fila" style="gap:8px">
          <button class="cal__nav" data-act="mesAnt" aria-label="Mes anterior">${icono('izq', { tam: 18 })}</button>
          <div class="crece">${greca({ color: '#b8572a', opacidad: 0.55, id: 'grecaCal', clase: 'greca' })}</div>
          <button class="cal__nav" data-act="mesSig" aria-label="Mes siguiente">${icono('der', { tam: 18 })}</button>
        </div>
        ${datos.temporada ? html`<div class="cal__temporada">${icono('nube', { color: '#8f2d56', tam: 16 })}${datos.temporada.name}, ${datos.temporada.rango}</div>` : ''}
        <div class="cal__semana" aria-hidden="true"><span>D</span><span>L</span><span>M</span><span>M</span><span>J</span><span>V</span><span>S</span></div>
        <div class="cal__dias">${celdas}</div>
        <div class="cal__detalle" aria-live="polite">
          <span style="font-size:13px;font-weight:700;color:#6b5d4a">${tituloSel}</span>
          ${listaSel.length ? listaSel.map((e) => html`<div class="cal__evento">
            <span class="cal__evento-ico" style="background:${cal.TIPOS[e.tipo].color}${e.tipo === 'temporada' ? '33' : ''}">${icono(cal.TIPOS[e.tipo].icono, { color: e.tipo === 'temporada' ? '#8f2d56' : '#ffffff', tam: 16 })}</span>
            <span class="cal__evento-txt"><small>${cal.TIPOS[e.tipo].nombre}${e.dato === 'historico' ? ', dato histórico' : e.dato === 'actual' ? ', tu siembra' : e.dato === 'catalogo' ? ', catálogo de semillas' : e.dato === 'plan' ? ', opción que elegiste' : ''}</small><span>${e.texto}</span>${e.detalle ? html`<em>${e.detalle}</em>` : ''}</span>
          </div>`) : html`<span style="font-size:15px;color:#4d4234">Sin pendientes en la milpa.</span>`}
        </div>
        <div class="cal__leyenda">
          ${Object.entries(cal.TIPOS).map(([k, v]) => html`<span><i style="background:${k === 'temporada' ? 'rgba(143,45,86,.16)' : v.color};${k === 'temporada' ? 'border:1.5px dashed rgba(143,45,86,.5);height:12px' : ''}"></i>${v.leyenda}</span>`)}
        </div>
        <span style="font-size:11.5px;color:#6b5d4a;line-height:1.4">Clima: NASA POWER hasta ${datos.ultimoAnio}, no es pronóstico. Previsión: tus fechas de siembra y las etapas del cultivo (reglas.json). Siembra: lo que registraste y el catálogo de semillas.</span>
      </div>`);
  }

  // ---------------- Voz ----------------
  function alternarMic() {
    if (!hayVoz) { estado.escribir = !estado.escribir; pintarTodo(); return; }
    if (estado.escuchando) { detener?.(); return; }
    estado.escuchando = true; estado.parcial = '';
    actualizarVoz();
    detener = escuchar({
      alParcial: (txt) => { estado.parcial = txt; actualizarVoz(); },
      alTexto: (txt) => irPorTexto(txt),
      alError: (err) => { if (err !== 'no-speech' && err !== 'aborted') estado.escribir = true; },
      alFin: () => { estado.escuchando = false; actualizarVoz(); if (estado.escribir) pintarTodo(); },
    });
  }
  function actualizarVoz() {
    const z = pantalla.querySelector('#micZona');
    if (z) {
      z.dataset.escuchando = estado.escuchando ? 'true' : 'false';
      const b = z.querySelector('.mic');
      b.setAttribute('aria-pressed', presionado(estado.escuchando));
      b.setAttribute('aria-label', estado.escuchando ? 'Dejar de escuchar' : 'Hablar con el asistente');
    }
    if (!estado.escribir) pintar(pantalla.querySelector('#vozEtiqueta'), vozEtiqueta());
  }
  function irPorTexto(texto) {
    const destino = interpretar(texto);
    if (destino) { decir('Va, te llevo.'); ir(destino); }
    else {
      decir('No te entendí. Intenta con parcelas, semillas, predicción, información o qué siembro.');
      estado.parcial = `No entendí “${texto}”. Prueba con “parcelas”.`;
      avisar(`No entendí “${texto}”. Prueba con parcelas, semillas, predicción o información.`);
    }
  }

  // ---------------- Hojas ----------------
  function hojaNombre(primeraVez = false) {
    const actual = usuario()?.nombreVisible || '';
    abrirHoja(pantalla, {
      titulo: primeraVez ? 'Ma\'alob k\'iin. ¿Cómo te llamamos?' : 'Tu nombre',
      cuerpo: html`<form class="columna" style="gap:12px" id="formNombre">
        <p class="texto-intro">Solo se guarda en este teléfono. No hace falta crear cuenta.</p>
        <label class="etiqueta" for="nombreUsuario">Nombre</label>
        <input id="nombreUsuario" class="campo" maxlength="40" value="${esc(actual)}" placeholder="Ej. don Celestino" autocomplete="name">
        <button class="btn btn--primario btn--bloque" type="submit">${primeraVez ? 'Empezar' : 'Guardar'}</button>
      </form>`,
      alMontar: (nodo, hoja) => {
        nodo.querySelector('#formNombre').addEventListener('submit', (e) => {
          e.preventDefault();
          const v = nodo.querySelector('#nombreUsuario').value.trim();
          repos.kv.set('usuario', { nombreVisible: v || 'productor' });
          hoja.cerrar();
          pintarTodo();
        });
      },
    });
  }

  function hojaParcelas() {
    const lista = repos.parcelasActivas();
    const activa = parcelaActiva();
    abrirHoja(pantalla, {
      titulo: 'Elige tu parcela',
      cuerpo: html`<div class="columna" style="gap:10px">
        ${lista.map((p) => html`<button class="tarjeta tarjeta--boton fila" data-act="usarParcela" data-id="${p.id}" aria-pressed="${presionado(p.id === activa?.id)}" style="${p.id === activa?.id ? 'border-color:#f2cf7a' : ''}">
          <span class="crece columna" style="gap:2px"><strong>${p.nombre}</strong><span class="tarjeta__sub">${superficie(p.superficieM2, p.unidadCaptura)}${p.municipioNombre ? `, ${p.municipioNombre}` : ''}</span></span>
          ${p.id === activa?.id ? icono('check', { color: '#f2cf7a' }) : ''}
        </button>`)}
        <a class="btn btn--vidrio btn--bloque" href="#/parcelas/nueva">${icono('mas')}Agregar otra parcela</a>
      </div>`,
      alMontar: (nodo, hoja) => {
        nodo.addEventListener('click', (e) => {
          const b = e.target.closest('[data-act="usarParcela"]');
          if (!b) return;
          repos.kv.set('parcelaActivaId', b.dataset.id);
          hoja.cerrar();
          pintarTodo();
        });
      },
    });
  }

  const quitar = delegar(pantalla, 'click', {
    toggleCal: () => { estado.calAbierto = !estado.calAbierto; estado.mesVista = null; pintarTodo(); },
    cerrarCal: () => { estado.calAbierto = false; pintarTodo(); },
    mesAnt: () => { const v = estado.mesVista; estado.mesVista = v.mes === 1 ? { anio: v.anio - 1, mes: 12 } : { anio: v.anio, mes: v.mes - 1 }; pintarCalendario(); },
    mesSig: () => { const v = estado.mesVista; estado.mesVista = v.mes === 12 ? { anio: v.anio + 1, mes: 1 } : { anio: v.anio, mes: v.mes + 1 }; pintarCalendario(); },
    dia: (el) => { estado.sel = new Date(estado.mesVista.anio, estado.mesVista.mes - 1, Number(el.dataset.n)); pintarCalendario(); },
    mic: alternarMic,
    cambiarNombre: () => hojaNombre(false),
    elegirParcela: hojaParcelas,
  });
  const alEnviar = (e) => {
    if (e.target.id === 'comandoTxt' || e.target.closest('.voz-texto')) {
      e.preventDefault();
      const v = pantalla.querySelector('#comandoTxt')?.value || '';
      if (v.trim()) irPorTexto(v);
    }
  };
  pantalla.addEventListener('submit', alEnviar);
  const tecla = (e) => { if (e.key === 'Escape' && estado.calAbierto) { estado.calAbierto = false; pintarTodo(); } };
  document.addEventListener('keydown', tecla);

  pintarTodo();
  if (!usuario()) setTimeout(() => hojaNombre(true), 450);

  return () => { quitar(); detener?.(); pantalla.removeEventListener('submit', alEnviar); document.removeEventListener('keydown', tecla); };
}
