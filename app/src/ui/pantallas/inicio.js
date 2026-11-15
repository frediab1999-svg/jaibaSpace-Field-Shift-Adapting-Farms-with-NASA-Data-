// INICIO: nombre del usuario, calendario de la milpa, micrófono y botón de Menú.
import { html, pintar, delegar, esc, presionado } from '../../shared/dom.js';
import { IMG } from '../../shared/assets.js';
import { icono, greca } from '../../shared/icons.js';
import { fondo, barraMenu, abrirHoja } from '../layout.js';
import * as repos from '../../storage/repos.js';
import { superficie, MESES, fechaCorta, diaSemana, hoy, mismaFecha, inicial } from '../../shared/format.js';
import * as cal from '../../motor/calendario.js';
import { NOMBRE_CORTO_ZONA } from '../../modules/climate/clima.js';
import { historiaDia, diaMedido, fraseProporcion } from '../../motor/climaDia.js';
import { origenDatos } from '../../shared/datos.js';
import { estadoContenido, buscarActualizacion } from '../../services/contenido.js';
import { hayVoz, escuchar, interpretar, decir, marcarEscucha } from '../voz.js';
import { ir } from '../../app/router.js';
import { avisar } from '../../app/estado.js';
import { t } from '../../i18n/index.js';
import { cargarEjemplo } from '../../modules/parcel/ejemplo.js';

const deIsoCorta = (iso) => { const [, m, d] = iso.split('-').map(Number); return `${d} de ${MESES[m - 1]}`; };

export function montar(pantalla, params = {}) {
  const estado = { escuchando: false, parcial: '', calAbierto: false, mesVista: null, sel: hoy(), escribir: false, datosCal: null, buscando: false };
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
  // Arriba: los días con lo TUYO (siembras, previsiones, plan y ventanas de lo que te interesa).
  // Abajo: el detalle del día elegido, ya procesado: lo que registraste y, si la parcela tiene
  // zona, cómo suele estar ese día según NASA POWER (o lo que se midió, si ese año ya tiene datos).
  async function pintarCalendario() {
    const capa = pantalla.querySelector('#capaCal');
    if (!capa) return;
    const vista = estado.mesVista || { anio: hoy().getFullYear(), mes: hoy().getMonth() + 1 };
    estado.mesVista = vista;
    const p = parcelaActiva();
    const datos = await cal.mes(vista.anio, vista.mes, { parcelaId: p?.id });
    if (!estado.calAbierto) return;
    estado.datosCal = datos;
    const primerDia = new Date(vista.anio, vista.mes - 1, 1).getDay();
    const diasMes = new Date(vista.anio, vista.mes, 0).getDate();
    const f = hoy();
    const celdas = [];
    for (let i = 0; i < primerDia; i++) celdas.push(html`<span aria-hidden="true"></span>`);
    const tiposMes = new Set();
    for (let n = 1; n <= diasMes; n++) {
      const d = new Date(vista.anio, vista.mes - 1, n);
      const evs = datos.eventos.get(n) || [];
      const tipos = [...new Set(evs.map((e) => e.tipo))];
      tipos.forEach((tp) => tiposMes.add(tp));
      celdas.push(html`<button class="cal__dia" data-act="dia" data-n="${n}" data-hoy="${mismaFecha(d, f) ? 'true' : 'false'}" aria-pressed="${mismaFecha(d, estado.sel) ? 'true' : 'false'}" aria-label="${n} de ${MESES[vista.mes - 1]}${evs.length ? `: ${evs.map((e) => e.texto).join('; ')}` : ''}">
        <span>${n}</span><span class="cal__marcas">${tipos.map((tp) => html`<span style="background:${cal.TIPOS[tp].color}"></span>`)}</span>
      </button>`);
    }
    const zonaTxt = datos.origenClima === 'punto' ? 'tu parcela' : datos.zona ? (NOMBRE_CORTO_ZONA[datos.zona.id] || datos.zona.nombre) : null;
    const frec = datos.frecuencia;
    const leyenda = [...tiposMes].filter((k) => cal.TIPOS[k]?.leyenda);

    pintar(capa, html`
      <button class="velo" data-act="cerrarCal" aria-label="Cerrar calendario" tabindex="-1"></button>
      <div class="calendario" role="dialog" aria-modal="true" aria-label="Calendario de la milpa">
        <div class="fila fila--entre">
          <div class="columna" style="gap:0"><span style="font-size:12px;font-weight:700;color:#6b5d4a">${zonaTxt ? `Calendario de la milpa, ${zonaTxt}` : 'Calendario de la milpa'}</span>
          <span class="cal__mes">${MESES[vista.mes - 1]} ${vista.anio}</span></div>
          <button class="cal__nav" data-act="cerrarCal" aria-label="Cerrar calendario">${icono('cerrar', { tam: 18, grosor: 2.4 })}</button>
        </div>
        <div class="fila" style="gap:8px">
          <button class="cal__nav" data-act="mesAnt" aria-label="Mes anterior">${icono('izq', { tam: 18 })}</button>
          <div class="crece">${greca({ color: '#b8572a', opacidad: 0.55, id: 'grecaCal', clase: 'greca' })}</div>
          <button class="cal__nav" data-act="mesSig" aria-label="Mes siguiente">${icono('der', { tam: 18 })}</button>
        </div>
        ${datos.temporada ? html`<div class="cal__temporada">${icono('nube', { color: '#8f2d56', tam: 16 })}<span>${datos.temporada.name}, ${datos.temporada.rango}${frec ? html`<small>En ${zonaTxt}, ${frec.rachas} de ${frec.total} años tuvieron en ${MESES[vista.mes - 1]} al menos ${datos.reglas.rachaRelevanteDias} días seguidos sin lluvia.</small>` : ''}</span></div>` : ''}
        <div class="cal__semana" aria-hidden="true"><span>D</span><span>L</span><span>M</span><span>M</span><span>J</span><span>V</span><span>S</span></div>
        <div class="cal__dias">${celdas}</div>
        <div class="cal__detalle" id="calDetalle" aria-live="polite" aria-busy="false">${detalleDia(datos)}</div>
        ${leyenda.length ? html`<div class="cal__leyenda">${leyenda.map((k) => html`<span><i style="background:${cal.TIPOS[k].color}"></i>${cal.TIPOS[k].leyenda}</span>`)}</div>` : ''}
        ${pieDatos(datos)}
      </div>`);
  }

  /** Detalle del día elegido: lo registrado y el clima ya resumido. */
  function detalleDia(datos) {
    const vista = estado.mesVista;
    const f = hoy();
    const sel = estado.sel.getMonth() + 1 === vista.mes && estado.sel.getFullYear() === vista.anio ? estado.sel : null;
    if (!sel) return html`<span class="cal__titulo-dia">Toca un día para ver qué pasa</span>`;
    const titulo = mismaFecha(sel, f) ? `Hoy, ${diaSemana(sel).toLowerCase()} ${sel.getDate()} de ${MESES[sel.getMonth()]}` : `${diaSemana(sel)} ${sel.getDate()} de ${MESES[sel.getMonth()]} de ${sel.getFullYear()}`;
    const vistos = new Set();
    const propios = (datos.eventos.get(sel.getDate()) || []).filter((e) => { const k = e.tipo + e.texto; if (vistos.has(k)) return false; vistos.add(k); return true; });
    const origenTxt = { actual: 'tu siembra', catalogo: 'época de siembra', plan: 'plan que elegiste' };
    return html`
      <span class="cal__titulo-dia">${titulo}</span>
      ${propios.length ? propios.map((e) => html`<div class="cal__evento">
        <span class="cal__evento-ico" style="background:${cal.TIPOS[e.tipo].color}">${icono(cal.TIPOS[e.tipo].icono, { color: '#ffffff', tam: 16 })}</span>
        <span class="cal__evento-txt"><small>${cal.TIPOS[e.tipo].nombre}${origenTxt[e.dato] ? `, ${origenTxt[e.dato]}` : ''}</small><span>${e.texto}</span>${e.detalle ? html`<em>${e.detalle}</em>` : ''}</span>
      </div>`) : html`<span class="cal__vacio">Nada registrado en tu milpa para este día.</span>`}
      ${climaDelDia(datos, sel)}`;
  }

  function climaDelDia(datos, sel) {
    if (!datos.clima) {
      const p = datos.parcela;
      return html`<div class="cal__clima cal__clima--falta">
        ${icono('pin', { color: '#7a2840', tam: 18 })}
        <span><strong>${p ? `${p.nombre} todavía no tiene zona` : 'Sin parcela no hay clima que mostrarte'}</strong>
        <em>${p ? 'Marca la ubicación o el municipio de la parcela para ver el clima histórico de su zona.' : 'Registra dónde está tu milpa y aquí verás cómo suele estar cada día en tu zona, con datos de la NASA.'}</em>
        <a class="btn btn--chico btn--primario" href="${p ? `#/parcelas/${p.id}/editar` : '#/parcelas/nueva'}">${p ? 'Completar ubicación' : 'Agregar mi parcela'}</a></span>
      </div>`;
    }
    const zonaTxt = datos.origenClima === 'punto' ? 'tu parcela' : (NOMBRE_CORTO_ZONA[datos.zona.id] || datos.zona.nombre);
    const umbral = datos.reglas.rachaRelevanteDias;
    const medido = sel.getFullYear() <= (datos.ultimoAnio || 0) ? diaMedido(datos.clima, sel.getFullYear(), sel.getMonth() + 1, sel.getDate()) : null;
    if (medido) {
      const r = medido.racha;
      const rango = r ? `del ${deIsoCorta(r.inicio)} al ${deIsoCorta(r.fin)}` : '';
      return html`<div class="cal__clima">
        <span class="cal__clima-cabeza">${icono('lluvia', { color: '#d81159', tam: 16 })}Lo que midió la NASA ese día en ${zonaTxt}</span>
        <ul class="cal__clima-lista">
          <li data-tono="${r ? (r.dias >= umbral ? 'alerta' : 'medio') : 'bien'}">${r ? `Sin lluvia: era parte de una racha de ${r.dias} días seguidos (${rango}).` : `No estaba dentro de una racha de ${medido.rachaMinima} días o más sin lluvia.`}</li>
          <li data-tono="${medido.calor ? 'alerta' : 'bien'}">${medido.calor ? `Calor fuerte: llegó a ${datos.clima.definiciones?.umbralCalorC ?? 35} °C o más.` : `No llegó a ${datos.clima.definiciones?.umbralCalorC ?? 35} °C.`}</li>
        </ul>
      </div>`;
    }
    const h = historiaDia(datos.clima, sel.getMonth() + 1, sel.getDate(), { umbralRacha: umbral });
    if (!h.total) return '';
    const barra = (n) => html`<span class="cal__barra" aria-hidden="true"><i style="width:${Math.round((n / h.total) * 100)}%"></i></span>`;
    return html`<div class="cal__clima">
      <span class="cal__clima-cabeza">${icono('grafica', { color: '#d81159', tam: 16 })}Cómo suele estar este día en ${zonaTxt}</span>
      <div class="cal__dato">
        <span><strong>${h.aniosRacha} de ${h.total} años</strong> cayó en una racha seca de ${umbral} días o más</span>${barra(h.aniosRacha)}
        <em>${fraseProporcion(h.aniosRacha, h.total)}</em>
      </div>
      <div class="cal__dato">
        <span><strong>${h.aniosCalor} de ${h.total} años</strong> hizo ${h.umbralCalorC} °C o más</span>${barra(h.aniosCalor)}
        <em>${fraseProporcion(h.aniosCalor, h.total)}</em>
      </div>
      <span class="cal__nota">Es lo que pasó de ${h.desde} a ${h.hasta}, no un pronóstico.</span>
    </div>`;
  }

  /** Qué datos se usan y si hay nuevos; sin nombres de archivos. */
  function pieDatos(datos) {
    const o = origenDatos();
    const c = estadoContenido();
    const fecha = o.descargadoEn ? fechaCorta(new Date(o.descargadoEn)) : null;
    const quien = o.origen === 'servidor' ? `actualizados el ${fecha}` : 'copia incluida en la app';
    const enLinea = navigator.onLine !== false;
    return html`<div class="cal__pie">
      <span>${datos.ultimoAnio ? `Clima: NASA POWER, 1998 a ${datos.ultimoAnio} (${quien}).` : `Datos: ${quien}.`}</span>
      ${c.pendienteAlReabrir ? html`<button class="btn btn--chico btn--dorado" data-act="usarNuevos">${icono('check', { tam: 16 })}Usar datos nuevos</button>`
        : enLinea ? html`<button class="btn btn--texto btn--chico" data-act="buscarNuevos" ${estado.buscando ? html`disabled aria-busy="true"` : ''}>${estado.buscando ? 'Buscando…' : 'Buscar datos nuevos'}</button>`
          : html`<em>Sin internet: usamos lo guardado en el teléfono.</em>`}
    </div>`;
  }

  /** Cambia el día elegido sin redibujar todo el calendario y con una animación corta de refresco. */
  let tRefresco = null;
  function refrescarDetalle() {
    const caja = pantalla.querySelector('#calDetalle');
    if (!caja || !estado.datosCal) { pintarCalendario(); return; }
    pantalla.querySelectorAll('.cal__dia').forEach((b) => {
      const d = new Date(estado.mesVista.anio, estado.mesVista.mes - 1, Number(b.dataset.n));
      b.setAttribute('aria-pressed', mismaFecha(d, estado.sel) ? 'true' : 'false');
    });
    clearTimeout(tRefresco);
    caja.classList.remove('cal__detalle--entra');
    caja.classList.add('cal__detalle--cargando');
    caja.setAttribute('aria-busy', 'true');
    const reducido = matchMedia('(prefers-reduced-motion: reduce)').matches;
    tRefresco = setTimeout(() => {
      pintar(caja, detalleDia(estado.datosCal));
      caja.classList.remove('cal__detalle--cargando');
      void caja.offsetWidth; // reinicia la animación de entrada
      caja.classList.add('cal__detalle--entra');
      caja.setAttribute('aria-busy', 'false');
    }, reducido ? 0 : 260);
  }

  async function buscarNuevos() {
    estado.buscando = true; pintarCalendario();
    const r = await buscarActualizacion();
    estado.buscando = false;
    avisar(r.version ? 'Hay datos nuevos: toca «Usar datos nuevos».' : r.resultado === 'al_dia' ? 'Ya tienes los datos más recientes.' : 'No pudimos conectar con el servidor. Seguimos con lo guardado.');
    pintarCalendario();
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
      marcarEscucha(b, estado.escuchando);
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
          if (primeraVez && !repos.parcelasActivas().length) setTimeout(hojaBienvenida, 380);
        });
      },
    });
  }

  // Primera vez: una sola pantalla que lleva al cuestionario (o a uno de los dos casos de ejemplo).
  function hojaBienvenida() {
    abrirHoja(pantalla, {
      titulo: 'Cuidemos tu tierra',
      cuerpo: html`<div class="columna" style="gap:14px">
        <p class="texto-intro">Te hacemos <strong>4 preguntas</strong> sobre tu parcela y te decimos qué sembrar los próximos 2 años para que tu tierra no se canse, con 28 años de clima de la NASA.</p>
        <a class="btn btn--primario btn--bloque" href="#/parcelas/nueva" data-r="cerrar">${icono('brote')}Empezar</a>
        <span class="etiqueta" style="margin-top:4px">O mira un ejemplo</span>
        <div class="opciones-2">
          <button type="button" class="opcion" data-r="ejemplo" data-id="ej-pablo"><strong>Pablo</strong><span>Su tierra ya está cansada</span></button>
          <button type="button" class="opcion" data-r="ejemplo" data-id="ej-juan"><strong>Juan</strong><span>Empieza en tierra nueva</span></button>
        </div>
        <button class="btn btn--texto" data-r="cerrar">Ahora no</button>
      </div>`,
      alMontar: (nodo, hoja) => {
        nodo.addEventListener('click', async (e) => {
          const ej = e.target.closest('[data-r="ejemplo"]');
          if (ej) {
            ej.disabled = true;
            repos.kv.set('bienvenidaVista', true);
            await cargarEjemplo();
            hoja.cerrar();
            ir(`#/diagnostico/${ej.dataset.id}`);
            return;
          }
          if (e.target.closest('[data-r="cerrar"]')) { repos.kv.set('bienvenidaVista', true); hoja.cerrar(); }
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
    dia: (el) => { estado.sel = new Date(estado.mesVista.anio, estado.mesVista.mes - 1, Number(el.dataset.n)); refrescarDetalle(); },
    buscarNuevos,
    usarNuevos: () => location.reload(),
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
  else if (!repos.parcelasActivas().length && !repos.kv.get('bienvenidaVista')) setTimeout(hojaBienvenida, 450);

  return () => { quitar(); detener?.(); pantalla.removeEventListener('submit', alEnviar); document.removeEventListener('keydown', tecla); };
}
