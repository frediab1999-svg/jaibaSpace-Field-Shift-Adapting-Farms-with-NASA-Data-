// DIAGNÓSTICO DE TU TIERRA (#/diagnostico/:id). Se abre al terminar el cuestionario.
// Dice en una pantalla corta:
//   1. cómo está la tierra (nueva, en buen estado, se está cansando o cansada) y por qué;
//   2. cuánto tiempo queda descubierta hoy (el eje del MVP: el tiempo y la conservación);
//   3. cómo es el clima de la temporada en su punto (NASA POWER), en palabras;
//   4. la referencia oficial del municipio, si existe (no es un pronóstico);
// y lleva al plan de 2 años y a la mejor fecha de siembra.
import { html, pintar, delegar } from '../../shared/dom.js';
import { letrero } from '../../shared/assets.js';
import { icono, subrayado } from '../../shared/icons.js';
import { fondo, cabeza } from '../layout.js';
import * as repos from '../../storage/repos.js';
import * as climaMod from '../../modules/climate/clima.js';
import * as climaPunto from '../../modules/climate/climaPunto.js';
import * as reglasMod from '../../modules/strategies/reglas.js';
import { diagnosticoDe, referenciaMunicipal } from '../../modules/parcel/tierra.js';
import { climaDeTemporada, enPalabras, fraseRazones, CORTES } from '../../motor/diagnostico.js';
import { opcionesPara } from './opciones-datos.js';
import { franja24 } from '../componentes/franja24.js';
import { textos } from './opciones.js';
import { superficie, numero } from '../../shared/format.js';
import { ir } from '../../app/router.js';

export async function montar(pantalla, params) {
  await Promise.all([climaMod.zonas(), reglasMod.reglas(), reglasMod.planes()]);
  const id = params.id;
  const nueva = params.query.get('nueva') === '1';
  if (!repos.parcelas.porId(id)) { ir('#/parcelas'); return null; }
  repos.kv.set('parcelaActivaId', id);
  const estado = { r: null, clima: null, origenClima: null, cargando: true, trayendoClima: false };
  let vivo = true;

  const parcela = () => repos.parcelas.porId(id);

  async function cargar() {
    const p = parcela();
    const [{ clima, origen, zona }, r] = await Promise.all([climaPunto.climaDeParcela(p), opcionesPara(p).catch(() => null)]);
    estado.clima = clima ? climaDeTemporada(clima, reglasMod.reglasSync()) : null;
    estado.origenClima = origen;
    estado.zona = zona;
    estado.r = r;
    estado.cargando = false;
    if (vivo) pintarTodo();
  }

  function tarjetaEstado(d) {
    const e = d.estado;
    if (e.id === 'sin_dato') {
      return html`<section class="tarjeta diag entra d2" style="--c:${e.color}">
        <img class="diag__letrero" src="${letrero('atencion')}" alt="">
        <div class="columna" style="gap:6px"><small class="diag__etq">Tu tierra</small><h2 class="diag__titulo">${e.nombre}</h2>
        <p>Contesta si ya se ha sembrado y cómo le ha ido para decirte qué le conviene.</p>
        <a class="btn btn--primario btn--chico" href="#/parcelas/${id}/editar">${icono('lapiz', { tam: 18 })}Contestar</a></div>
      </section>`;
    }
    const razones = fraseRazones(e.razones, 4);
    return html`<section class="tarjeta diag entra d2" style="--c:${e.color}">
      <img class="diag__letrero" src="${letrero(e.letrero)}" alt="">
      <div class="columna" style="gap:6px">
        <small class="diag__etq">Tu tierra</small>
        <h2 class="diag__titulo">${e.nombre}</h2>
        ${razones ? html`<p class="diag__razones">${razones}.</p>` : html`<p class="diag__razones">No nos dijiste nada que la canse.</p>`}
        ${e.id === 'nueva' ? html`<p class="diag__nota">Es el mejor momento para cuidarla: lo que hagas los primeros años decide cuánto te dura.</p>` : ''}
        ${e.puntos != null ? html`<details class="diag__regla"><summary>¿Cómo lo calculamos?</summary>
          <p>Sumamos puntos por lo que nos contaste: años seguidos, si descansa, si se quema, cómo te fue y lo que has notado. De ${CORTES.cansandose} a ${CORTES.cansada - 1} puntos: se está cansando; ${CORTES.cansada} o más: cansada. Tu tierra suma ${e.puntos}.</p>
          <p>Es una regla de la app para ordenar las opciones, no un análisis de suelo. Falta validarla con técnicos de la zona.</p>
        </details>` : ''}
      </div>
    </section>`;
  }

  /** El tiempo: cuántos meses queda descubierta con la práctica actual (o la normal, en tierra nueva). */
  function tarjetaTiempo(d) {
    const act = estado.r?.principales.find((e) => e.esActual);
    if (!act) return '';
    const tc = act.cobertura;
    const sin = tc.de - tc.meses;
    const sug = estado.r.principales.find((e) => e.sugerida);
    const nuevaT = d.estado.id === 'nueva';
    return html`<section class="tarjeta columna entra d3" style="gap:10px">
      <span class="etiqueta-seccion">${icono('reloj', { tam: 18, color: '#f2cf7a' })}El tiempo de tu tierra</span>
      <p class="dato-grande"><b>${sin}</b><span>de ${tc.de} meses ${nuevaT ? 'quedaría' : 'queda'} sin cultivo ${nuevaT ? 'si la siembras como se hace normalmente' : 'con lo que haces hoy'}</span></p>
      ${franja24(tc)}
      ${sug && !sug.esActual ? html`<p class="diag__mejora">${icono('brote', { tam: 18, color: '#9fd97a' })}<span>${sug.cobertura.meses > tc.meses
        ? html`Con <strong>${textos(sug, nuevaT).titulo.toLowerCase()}</strong> tendría cultivo ${sug.cobertura.meses} de ${sug.cobertura.de} meses: <strong>${sug.cobertura.meses - tc.meses} más cubierta</strong>.`
        : html`Con <strong>${textos(sug, nuevaT).titulo.toLowerCase()}</strong> los meses con cultivo casi no cambian, pero la tierra recibe una leguminosa que la cubre y le aporta nitrógeno.`}</span></p>` : ''}
      <span class="fuente">Rayado = meses sin nada sembrado, cuando el sol y la lluvia pegan directo en el suelo.</span>
    </section>`;
  }

  function tarjetaClima() {
    const c = estado.clima;
    const p = parcela();
    const trayendo = !c || (estado.origenClima === 'zona' && p.climaPunto?.estado !== 'listo' && navigator.onLine !== false);
    if (!c) {
      return html`<section class="tarjeta columna entra d4" style="gap:8px">
        <span class="etiqueta-seccion">${icono('nube', { tam: 18, color: '#9fd6db' })}El clima de tu parcela</span>
        <p>${p.ubicacion ? 'Estamos trayendo el clima de tu punto desde la NASA…' : 'Marca dónde está tu parcela para ver su clima.'}</p>
      </section>`;
    }
    return html`<section class="tarjeta columna entra d4" style="gap:10px">
      <span class="etiqueta-seccion">${icono('nube', { tam: 18, color: '#9fd6db' })}Cómo suele ser la temporada ${estado.origenClima === 'punto' ? 'en tu parcela' : 'en tu zona'}</span>
      <ul class="clima-lista">
        <li><strong>${c.aniosRacha} de ${c.total} años</strong> hubo ${c.rachaDias} días o más sin lluvia entre junio y octubre: ${enPalabras(c.aniosRacha, c.total)}.</li>
        ${c.medianaLluviaMm ? html`<li>En un año normal llueven unos <strong>${numero(c.medianaLluviaMm, 0)} mm</strong> de junio a agosto.</li>` : ''}
        <li><strong>${c.aniosCalor} de ${c.total} años</strong> hubo ${c.calorDias} días seguidos de ${c.umbralCalorC} °C o más en esos meses.</li>
      </ul>
      <span class="fuente">NASA POWER (lluvia GPM IMERG, temperatura MERRA-2), ${c.desde} a ${c.hasta}. Es lo que pasó, no un pronóstico.${trayendo ? ` ${p.climaPunto?.estado === 'pendiente' ? climaPunto.textoOrigen('zona', estado.zona) : 'Estamos trayendo el clima de tu punto exacto.'}` : ''}</span>
    </section>`;
  }

  function tarjetaReferencia() {
    const ref = referenciaMunicipal(parcela());
    if (!ref) return '';
    return html`<section class="nota-papel entra d5">
      <span class="mano">Referencia del municipio</span>
      <p style="margin-top:6px;font-size:15px;line-height:1.5">En ${ref.municipio}, el ${ref.cultivo} de ${ref.modalidad} obtuvo un rendimiento de ${ref.valores.map((v) => `${numero(v.tHa, 2)} t/ha en ${v.anio}`).join(' y de ')}.</p>
      <p style="margin-top:6px;font-size:14px;color:#4d4234">${ref.nota}</p>
      <p style="margin-top:6px;font-size:12.5px;color:#6b5d4a">Fuente: ${ref.fuente}</p>
    </section>`;
  }

  function pintarTodo() {
    const p = parcela();
    if (!p) return;
    const d = diagnosticoDe(p);
    const sug = estado.r?.principales.find((e) => e.sugerida);
    pintar(pantalla, html`
      ${fondo()}
      <div class="scroll" style="padding-bottom:120px">
        <div class="entra d1" style="padding:0 4px">
          ${nueva ? html`<span class="mano" style="font-size:28px">¡Listo! Ya conocemos ${p.nombre}</span>` : html`<span class="hero__etiqueta">Diagnóstico · ${p.nombre}</span>`}
          <h1 class="titulo-grande" data-enfoque>Así está tu tierra</h1>${subrayado(190)}
        </div>
        ${tarjetaEstado(d)}
        ${estado.cargando ? html`<div class="tarjeta vacio"><p>Calculando con el clima de la NASA…</p></div>` : html`${tarjetaTiempo(d)}${tarjetaClima()}`}
        ${tarjetaReferencia()}
        <div class="columna entra d5" style="gap:10px">
          ${d.estado.id !== 'sin_dato' ? html`<a class="btn btn--primario btn--bloque btn--grande" href="#/opciones/${id}">${icono('brote')}<span class="columna" style="gap:0;align-items:flex-start"><span>Ver tu plan de 2 años</span>${sug ? html`<small>Te sugerimos: ${textos(sug, d.estado.id === 'nueva').titulo.toLowerCase()}</small>` : ''}</span></a>` : ''}
          <a class="btn btn--vidrio btn--bloque" href="#/prediccion/${id}">${icono('calendario')}¿Cuándo me conviene sembrar?</a>
          <a class="btn btn--texto" href="#/parcelas/${id}/editar" style="align-self:center">Cambiar mis respuestas</a>
        </div>
        <span class="fuente" style="padding:0 4px">${superficie(p.superficieM2, p.unidadCaptura)}${p.municipioNombre ? `, cerca de ${p.municipioNombre}` : ''}. La app sugiere; la decisión es tuya y de tu técnico.</span>
      </div>
      ${cabeza({ titulo: 'Tu tierra', sub: p.nombre, atras: `#/parcelas/${id}`, etiquetaAtras: 'Ver la parcela' })}
    `);
  }

  const quitar = delegar(pantalla, 'click', {});
  // Cuando llega el clima del punto, se vuelve a calcular
  const dejarDeOir = repos.alCambiar((que) => {
    if (que === 'parcelas' && vivo && parcela()?.climaPunto?.estado === 'listo' && estado.origenClima !== 'punto') cargar();
  });
  pintarTodo();
  cargar();
  if (parcela().ubicacion && parcela().climaPunto?.estado !== 'listo') climaPunto.asegurar(parcela());
  return () => { vivo = false; quitar(); dejarDeOir(); };
}
