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
 * @param {{parcela:object, siembra?:object, semillaId?:string}} op
 * @returns {Promise<object|null>} la siembra guardada
 */
export function hojaSiembra(pantalla, { parcela, siembra = null, semillaId = null }) {
  return new Promise((resolve) => {
    const reglas = reglasMod.reglasSync();
    const zona = climaMod.zonaPorId(parcela.zonaId);
    const ocupada = parcelasMod.superficieOcupada(parcela.id, siembra?.id);
    const libre = Math.max(0, (parcela.superficieM2 || 0) - ocupada);
    const unidadInicial = (siembra?.superficieM2 || libre) >= 10000 ? 'ha' : 'mecate';
    const f0 = siembra?.fecha || { anio: hoy().getFullYear(), mes: hoy().getMonth() + 1, dia: hoy().getDate(), precision: 'dia' };
    const estado = {
      semillaId: siembra?.semillaId || semillaId || null,
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

    const cuerpo = () => {
      const s = catalogo.semilla(estado.semillaId);
      const v = s ? catalogo.viabilidad(s, { mes: mesActual(), zona, reglas }) : null;
      const m2 = aM2(estado.valor, estado.unidad);
      return html`
        <div class="campo-grupo">
          <span class="etiqueta" id="lblSemilla">¿Qué vas a sembrar?</span>
          <div class="tiras" role="radiogroup" aria-labelledby="lblSemilla" style="margin:0 -18px;padding:4px 18px 8px">
            ${ordenadas.map((x) => {
              const vv = catalogo.viabilidad(x, { mes: mesActual(), zona, reglas });
              return html`<button class="semilla-tile" style="width:104px;min-height:138px" role="radio" aria-checked="${presionado(estado.semillaId === x.id)}" aria-pressed="${presionado(estado.semillaId === x.id)}" data-sem="${x.id}">
                <span class="semilla-tile__estado" style="background:${catalogo.ESTADO_COLOR[vv.estado]}" aria-hidden="true"></span>
                <span class="semilla-tile__foto" style="width:60px;height:60px"><img src="${imagenCultivo(catalogo.cultivo(x.cultivoId).imagen)}" alt="" style="width:60px;height:60px"></span>
                <strong style="font-size:14px">${x.name.split(' (')[0]}</strong>
                <em>${catalogo.ESTADO_TXT[vv.estado]}</em>
              </button>`;
            })}
          </div>
        </div>
        ${s && v ? html`<div class="fila" style="gap:10px;padding:10px 12px;border-radius:16px;background:rgba(255,255,255,.08)">
          <img class="letrero letrero--chico" src="${letrero(catalogo.ESTADO_LETRERO[v.estado])}" alt="">
          <span style="font-size:14px;color:var(--txt-2)">${v.razones[0]}${v.estado === 'no' ? ' Si tienes riego o es de traspatio, igual puedes registrarla.' : ''}</span>
        </div>` : ''}
        <div class="campo-grupo">
          <label class="etiqueta" for="supSiembra">¿Cuánto terreno le toca? <small>(te quedan ${superficie(libre)} libres)</small></label>
          <div class="columna" style="gap:8px">
            <input id="supSiembra" class="campo" inputmode="decimal" value="${esc(estado.valor)}" aria-describedby="eqSiembra">
            <div class="segmento crece" role="group" aria-label="Unidad">
              ${['m2', 'mecate', 'ha'].map((u) => html`<button data-uni="${u}" aria-pressed="${presionado(estado.unidad === u)}">${{ m2: 'm²', mecate: 'mecates', ha: 'hectáreas' }[u]}</button>`)}
            </div>
          </div>
          <span class="ayuda" id="eqSiembra">${m2 ? (m2 > libre + 1 ? html`<span class="error-txt">Es más de lo que queda libre en la parcela.</span>` : `Son ${superficie(m2)}.`) : 'Si no sabes, déjalo vacío.'}</span>
        </div>
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
        <button class="btn btn--primario btn--bloque" data-r="guardar">${icono('brote', { tam: 20 })}${siembra ? 'Guardar cambios' : 'Sembrar en la parcela'}</button>`;
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
    };

    abrirHoja(pantalla, {
      titulo: siembra ? 'Editar semilla' : `Sembrar en ${parcela.nombre}`,
      cuerpo,
      alMontar: (nodo, h) => {
        nodo.addEventListener('input', (e) => {
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
            if (sem) estado.semillaId = sem.dataset.sem;
            if (uni) {
              const m2 = aM2(estado.valor, estado.unidad);
              estado.unidad = uni.dataset.uni;
              if (m2) estado.valor = String(Math.round(deM2(m2, estado.unidad) * 100) / 100);
            }
            if (prec) estado.soloMes = prec.dataset.prec === 'mes';
            const x = nodo.querySelector('.tiras')?.scrollLeft;
            h.repintar();
            const t = nodo.querySelector('.tiras'); if (t && x) t.scrollLeft = x;
            return;
          }
          if (r?.dataset.r === 'guardar') {
            leerCampos(nodo);
            if (!estado.semillaId) { estado.error = 'Elige una semilla.'; h.repintar(); return; }
            const m2 = estado.valor ? aM2(estado.valor, estado.unidad) : null;
            if (estado.valor && !m2) { estado.error = 'Escribe la superficie con números.'; h.repintar(); return; }
            let fecha;
            if (estado.soloMes) fecha = { anio: estado.anio, mes: estado.mes, dia: null, precision: 'mes' };
            else {
              if (!estado.fecha) { estado.error = 'Elige la fecha.'; h.repintar(); return; }
              const [a, m, d] = estado.fecha.split('-').map(Number);
              fecha = { anio: a, mes: m, dia: d, precision: 'dia' };
            }
            let guardada;
            if (siembra) {
              const sem = catalogo.semilla(estado.semillaId);
              guardada = parcelasMod.editarSiembra(siembra.id, { semillaId: sem.id, cultivoId: sem.cultivoId, variedadId: sem.variedadId || null, superficieM2: m2, fecha });
            } else {
              guardada = parcelasMod.agregarSiembra(parcela, { semillaId: estado.semillaId, superficieM2: m2, fecha }).siembra;
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
