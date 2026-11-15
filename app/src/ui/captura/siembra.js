// Hoja para agregar o editar una semilla (SIEMBRA) en la parcela.
import { html, esc, presionado } from '../../shared/dom.js';
import { abrirHoja } from '../layout.js';
import { icono } from '../../shared/icons.js';
import { imagenCultivo, letrero } from '../../shared/assets.js';
import * as catalogo from '../../modules/crops/catalogo.js';
import * as climaMod from '../../modules/climate/clima.js';
import * as reglasMod from '../../modules/strategies/reglas.js';
import * as parcelasMod from '../../modules/parcel/parcelas.js';
import { aM2, deM2, superficie, isoFecha, hoy, MESES } from '../../shared/format.js';

/**
 * @param {HTMLElement} pantalla
 * Al agregar se pueden elegir VARIAS semillas: se guarda una siembra por semilla, cada una con
 * su superficie (opcional) y la misma fecha. Al editar se trabaja con una sola.
 * @param {{parcela:object, siembra?:object, semillaId?:string, semillaIds?:string[]}} op
 * @returns {Promise<object|object[]|null>} la siembra editada, o la lista de siembras agregadas
 */
export function hojaSiembra(pantalla, { parcela, siembra = null, semillaId = null, semillaIds = null }) {
  return new Promise((resolve) => {
    const reglas = reglasMod.reglasSync();
    const zona = climaMod.zonaPorId(parcela.zonaId);
    const ocupada = parcelasMod.superficieOcupada(parcela.id, siembra?.id);
    const libre = Math.max(0, (parcela.superficieM2 || 0) - ocupada);
    const unidadInicial = (siembra?.superficieM2 || libre) >= 10000 ? 'ha' : 'mecate';
    const f0 = siembra?.fecha || { anio: hoy().getFullYear(), mes: hoy().getMonth() + 1, dia: hoy().getDate(), precision: 'dia' };
    const estado = {
      ids: siembra ? [siembra.semillaId] : (semillaIds?.length ? [...new Set(semillaIds)] : semillaId ? [semillaId] : []),
      valores: {}, // superficie por semilla cuando se eligen varias
      unidad: unidadInicial,
      valor: siembra?.superficieM2 ? String(Math.round(deM2(siembra.superficieM2, unidadInicial) * 100) / 100) : libre ? String(Math.round(deM2(libre, unidadInicial) * 100) / 100) : '',
      soloMes: f0.precision !== 'dia',
      fecha: f0.precision === 'dia' ? isoFecha(new Date(f0.anio, f0.mes - 1, f0.dia)) : isoFecha(hoy()),
      mes: f0.mes || hoy().getMonth() + 1,
      anio: f0.anio,
      error: '',
    };
    const mesActual = () => (estado.soloMes ? estado.mes : Number(estado.fecha.slice(5, 7)));
    const ordenadas = catalogo.semillas().slice().sort((a, b) => ({ si: 0, esp: 1, no: 2 }[catalogo.viabilidad(a, { mes: mesActual(), zona, reglas }).estado] - { si: 0, esp: 1, no: 2 }[catalogo.viabilidad(b, { mes: mesActual(), zona, reglas }).estado]));
    let resuelto = false;
    const fin = (v) => { if (!resuelto) { resuelto = true; resolve(v); } };

    const multiple = () => !siembra && estado.ids.length > 1;
    const sumaVarias = () => estado.ids.reduce((t, id) => t + (aM2(estado.valores[id], estado.unidad) || 0), 0);
    const cuerpo = () => {
      const elegidas = estado.ids.map((id) => catalogo.semilla(id)).filter(Boolean);
      const s = elegidas[0] || null;
      const v = s ? catalogo.viabilidad(s, { mes: mesActual(), zona, reglas }) : null;
      const m2 = aM2(estado.valor, estado.unidad);
      const total = sumaVarias();
      return html`
        <div class="campo-grupo">
          <span class="etiqueta" id="lblSemilla">¿Qué vas a sembrar?${siembra ? '' : html` <small>(puedes elegir varias)</small>`}</span>
          <div class="tiras" role="${siembra ? 'radiogroup' : 'group'}" aria-labelledby="lblSemilla" style="margin:0 -18px;padding:4px 18px 8px">
            ${ordenadas.map((x) => {
              const vv = catalogo.viabilidad(x, { mes: mesActual(), zona, reglas });
              const on = estado.ids.includes(x.id);
              return html`<button class="semilla-tile" style="width:104px;min-height:138px" role="${siembra ? 'radio' : 'checkbox'}" aria-checked="${presionado(on)}" data-sem="${x.id}">
                ${!siembra && on ? html`<span class="semilla-tile__check" aria-hidden="true">${icono('check', { tam: 14, grosor: 3 })}</span>` : ''}
                <span class="semilla-tile__estado" style="background:${catalogo.ESTADO_COLOR[vv.estado]}" aria-hidden="true"></span>
                <span class="semilla-tile__foto" style="width:60px;height:60px"><img src="${imagenCultivo(catalogo.cultivo(x.cultivoId).imagen)}" alt="" style="width:60px;height:60px"></span>
                <strong style="font-size:14px">${x.name.split(' (')[0]}</strong>
                <em>${catalogo.ESTADO_TXT[vv.estado]}</em>
              </button>`;
            })}
          </div>
        </div>
        ${!multiple() && s && v ? html`<div class="fila" style="gap:10px;padding:10px 12px;border-radius:16px;background:rgba(255,255,255,.08)">
          <img class="letrero letrero--chico" src="${letrero(catalogo.ESTADO_LETRERO[v.estado])}" alt="">
          <span style="font-size:14px;color:var(--txt-2)">${v.razones[0]}${v.estado === 'no' ? ' Si tienes riego o es de traspatio, igual puedes registrarla.' : ''}${v.fechaSinFuente ? ' Fecha por confirmar.' : ''}</span>
        </div>` : ''}
        ${multiple() ? html`<div class="campo-grupo">
          <span class="etiqueta">¿Cuánto terreno le toca a cada una? <small>(te quedan ${superficie(libre)} libres)</small></span>
          <div class="segmento crece" role="group" aria-label="Unidad">
            ${['m2', 'mecate', 'ha'].map((u) => html`<button data-uni="${u}" aria-pressed="${presionado(estado.unidad === u)}">${{ m2: 'm²', mecate: 'mecates', ha: 'hectáreas' }[u]}</button>`)}
          </div>
          ${elegidas.map((x) => {
            const vv = catalogo.viabilidad(x, { mes: mesActual(), zona, reglas });
            return html`<div class="fila siembra-varias">
              <img src="${imagenCultivo(catalogo.cultivo(x.cultivoId).imagen)}" alt="" class="siembra-varias__foto">
              <label class="crece columna" style="gap:0" for="sup-${x.id}"><strong>${x.name.split(' (')[0]}</strong><small style="color:${catalogo.ESTADO_COLOR[vv.estado]}">${catalogo.ESTADO_TXT[vv.estado]}${vv.fechaSinFuente ? ' (fecha por confirmar)' : ''}</small></label>
              <input id="sup-${x.id}" class="campo" data-sup="${x.id}" inputmode="decimal" placeholder="—" value="${esc(estado.valores[x.id] || '')}" style="max-width:96px">
            </div>`;
          })}
          <span class="ayuda" id="eqSiembra">${total ? (total > libre + 1 ? html`<span class="error-txt">Entre todas suman ${superficie(total)}: es más de lo que queda libre.</span>` : `Entre todas: ${superficie(total)}.`) : 'Si no sabes cuánto, déjalo vacío.'}</span>
        </div>` : html`<div class="campo-grupo">
          <label class="etiqueta" for="supSiembra">¿Cuánto terreno le toca? <small>(te quedan ${superficie(libre)} libres)</small></label>
          <div class="columna" style="gap:8px">
            <input id="supSiembra" class="campo" inputmode="decimal" value="${esc(estado.valor)}" aria-describedby="eqSiembra">
            <div class="segmento crece" role="group" aria-label="Unidad">
              ${['m2', 'mecate', 'ha'].map((u) => html`<button data-uni="${u}" aria-pressed="${presionado(estado.unidad === u)}">${{ m2: 'm²', mecate: 'mecates', ha: 'hectáreas' }[u]}</button>`)}
            </div>
          </div>
          <span class="ayuda" id="eqSiembra">${m2 ? (m2 > libre + 1 ? html`<span class="error-txt">Es más de lo que queda libre en la parcela.</span>` : `Son ${superficie(m2)}.`) : 'Si no sabes, déjalo vacío.'}</span>
        </div>`}
        <div class="campo-grupo">
          <span class="etiqueta">¿Cuándo sembraste o vas a sembrar?</span>
          <div class="segmento" role="group" aria-label="Precisión de la fecha">
            <button data-prec="dia" aria-pressed="${presionado(!estado.soloMes)}">Sé el día</button>
            <button data-prec="mes" aria-pressed="${presionado(estado.soloMes)}">Solo sé el mes</button>
          </div>
          ${estado.soloMes
            ? html`<div class="fila"><label class="sr" for="mesSiembra">Mes</label><select id="mesSiembra" class="campo">${MESES.map((m, i) => html`<option value="${i + 1}" ${estado.mes === i + 1 ? 'selected' : ''}>${m}</option>`)}</select>
                <label class="sr" for="anioSiembra">Año</label><input id="anioSiembra" class="campo" inputmode="numeric" value="${estado.anio}" style="max-width:110px"></div>`
            : html`<label class="sr" for="fechaSiembra">Fecha de siembra</label><input id="fechaSiembra" type="date" class="campo" value="${estado.fecha}">`}
        </div>
        ${estado.error ? html`<p class="error-txt" role="alert">${estado.error}</p>` : ''}
        <button class="btn btn--primario btn--bloque" data-r="guardar">${icono('brote', { tam: 20 })}${siembra ? 'Guardar cambios' : estado.ids.length > 1 ? `Sembrar las ${estado.ids.length} en la parcela` : 'Sembrar en la parcela'}</button>`;
    };

    const leerCampos = (nodo) => {
      const sup = nodo.querySelector('#supSiembra');
      if (sup) estado.valor = sup.value;
      const fe = nodo.querySelector('#fechaSiembra');
      if (fe) estado.fecha = fe.value;
      const me = nodo.querySelector('#mesSiembra');
      if (me) estado.mes = Number(me.value);
      const an = nodo.querySelector('#anioSiembra');
      if (an) estado.anio = Number(an.value);
      nodo.querySelectorAll('[data-sup]').forEach((i) => { estado.valores[i.dataset.sup] = i.value; });
    };

    abrirHoja(pantalla, {
      titulo: siembra ? 'Editar semilla' : `Sembrar en ${parcela.nombre}${parcela.esEjemplo ? ' (ejemplo)' : ''}`,
      cuerpo,
      alMontar: (nodo, h) => {
        nodo.addEventListener('input', (e) => {
          if (e.target.dataset.sup) {
            estado.valores[e.target.dataset.sup] = e.target.value;
            const total = sumaVarias();
            const eq = nodo.querySelector('#eqSiembra');
            if (eq) eq.innerHTML = total ? (total > libre + 1 ? `<span class="error-txt">Entre todas suman ${superficie(total)}: es más de lo que queda libre.</span>` : `Entre todas: ${superficie(total)}.`) : 'Si no sabes cuánto, déjalo vacío.';
          }
          if (e.target.id === 'supSiembra') {
            estado.valor = e.target.value;
            const m2 = aM2(estado.valor, estado.unidad);
            const eq = nodo.querySelector('#eqSiembra');
            if (eq) eq.innerHTML = m2 ? (m2 > libre + 1 ? '<span class="error-txt">Es más de lo que queda libre en la parcela.</span>' : `Son ${superficie(m2)}.`) : 'Si no sabes, déjalo vacío.';
          }
        });
        nodo.addEventListener('change', (e) => {
          if (['fechaSiembra', 'mesSiembra'].includes(e.target.id)) { leerCampos(nodo); h.repintar(); }
        });
        nodo.addEventListener('click', (e) => {
          const sem = e.target.closest('[data-sem]');
          const uni = e.target.closest('[data-uni]');
          const prec = e.target.closest('[data-prec]');
          const r = e.target.closest('[data-r]');
          if (sem || uni || prec) {
            leerCampos(nodo);
            if (sem) {
              const id = sem.dataset.sem;
              if (siembra) estado.ids = [id];
              else estado.ids = estado.ids.includes(id) ? estado.ids.filter((x) => x !== id) : [...estado.ids, id];
              estado.error = '';
            }
            if (uni) {
              const anterior = estado.unidad;
              const m2 = aM2(estado.valor, anterior);
              estado.unidad = uni.dataset.uni;
              if (m2) estado.valor = String(Math.round(deM2(m2, estado.unidad) * 100) / 100);
              for (const k of Object.keys(estado.valores)) {
                const v2 = aM2(estado.valores[k], anterior);
                if (v2) estado.valores[k] = String(Math.round(deM2(v2, estado.unidad) * 100) / 100);
              }
            }
            if (prec) estado.soloMes = prec.dataset.prec === 'mes';
            const x = nodo.querySelector('.tiras')?.scrollLeft;
            h.repintar();
            const t = nodo.querySelector('.tiras'); if (t && x) t.scrollLeft = x;
            return;
          }
          if (r?.dataset.r === 'guardar') {
            leerCampos(nodo);
            if (!estado.ids.length) { estado.error = 'Elige al menos una semilla.'; h.repintar(); return; }
            const m2 = !multiple() && estado.valor ? aM2(estado.valor, estado.unidad) : null;
            if (!multiple() && estado.valor && !m2) { estado.error = 'Escribe la superficie con números.'; h.repintar(); return; }
            if (multiple() && estado.ids.some((id) => estado.valores[id] && !aM2(estado.valores[id], estado.unidad))) { estado.error = 'Escribe cada superficie con números o déjala vacía.'; h.repintar(); return; }
            let fecha;
            if (estado.soloMes) fecha = { anio: estado.anio, mes: estado.mes, dia: null, precision: 'mes' };
            else {
              if (!estado.fecha) { estado.error = 'Elige la fecha.'; h.repintar(); return; }
              const [a, m, d] = estado.fecha.split('-').map(Number);
              fecha = { anio: a, mes: m, dia: d, precision: 'dia' };
            }
            let guardada;
            if (siembra) {
              const sem = catalogo.semilla(estado.ids[0]);
              guardada = parcelasMod.editarSiembra(siembra.id, { semillaId: sem.id, cultivoId: sem.cultivoId, variedadId: sem.variedadId || null, superficieM2: m2, fecha });
            } else if (multiple()) {
              guardada = estado.ids.map((id) => parcelasMod.agregarSiembra(parcela, { semillaId: id, superficieM2: aM2(estado.valores[id], estado.unidad) || null, fecha }).siembra);
            } else {
              guardada = [parcelasMod.agregarSiembra(parcela, { semillaId: estado.ids[0], superficieM2: m2, fecha }).siembra];
            }
            fin(guardada);
            h.cerrar();
          }
        });
      },
      alCerrar: () => fin(null),
    });
  });
}
