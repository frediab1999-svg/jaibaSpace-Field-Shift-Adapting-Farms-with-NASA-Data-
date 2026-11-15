// Cuestionario corto al quitar una semilla o una parcela: ¿por qué?
// El motivo se guarda en el historial de la parcela (retroalimentación local).
import { html, esc, presionado } from '../../shared/dom.js';
import { abrirHoja } from '../layout.js';
import { icono } from '../../shared/icons.js';

export function preguntarMotivo(pantalla, { titulo, pregunta, opciones, aviso }) {
  return new Promise((resolve) => {
    const estado = { motivo: null, nota: '' };
    let resuelto = false;
    const fin = (v) => { if (!resuelto) { resuelto = true; resolve(v); } };
    const hoja = abrirHoja(pantalla, {
      titulo,
      cuerpo: () => html`
        <p class="texto-intro">${pregunta}</p>
        <div class="chips" role="radiogroup" aria-label="Motivo">
          ${opciones.map((o) => html`<button class="chip" role="radio" aria-checked="${presionado(estado.motivo === o.id)}" aria-pressed="${presionado(estado.motivo === o.id)}" data-motivo="${o.id}">${o.name}</button>`)}
        </div>
        <div class="campo-grupo">
          <label class="etiqueta" for="notaMotivo">¿Algo más que quieras contar? <small>(opcional)</small></label>
          <textarea id="notaMotivo" class="campo" maxlength="200" placeholder="Ej. le cayó mosca blanca a las hojas">${esc(estado.nota)}</textarea>
        </div>
        <p class="nota-info">${icono('historial', { color: '#9fd6db', tam: 18 })}<span>${aviso || 'Lo guardamos en el historial de la parcela para entender qué le pasa a tu milpa.'}</span></p>
        <div class="fila">
          <button class="btn btn--vidrio crece" data-r="no">Cancelar</button>
          <button class="btn btn--primario crece" data-r="si" ${estado.motivo ? '' : 'disabled'}>Quitar</button>
        </div>`,
      alMontar: (nodo, h) => {
        nodo.addEventListener('click', (e) => {
          const m = e.target.closest('[data-motivo]');
          if (m) { estado.nota = nodo.querySelector('#notaMotivo').value; estado.motivo = m.dataset.motivo; h.repintar(); nodo.querySelector(`[data-motivo="${m.dataset.motivo}"]`)?.focus(); return; }
          const r = e.target.closest('[data-r]');
          if (!r) return;
          if (r.dataset.r === 'si' && estado.motivo) {
            const o = opciones.find((x) => x.id === estado.motivo);
            fin({ motivoId: o.id, motivoTexto: o.name, nota: nodo.querySelector('#notaMotivo').value.trim() || null });
          } else fin(null);
          h.cerrar();
        });
      },
      alCerrar: () => fin(null),
    });
    return hoja;
  });
}
