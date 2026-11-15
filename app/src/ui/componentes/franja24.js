// Franja de 24 meses: cada celda es un mes de la ventana que compara el motor, empezando en
// el mes de la primera siembra del escenario (por ejemplo, junio). Dorado = algún cultivo en
// pie 15 días o más ese mes; rayado = sin cultivo en pie. No depende solo del color: los
// meses sin cultivo van rayados y la franja trae texto alternativo.
import { html } from '../../shared/dom.js';
import { MESES, MESES_CORTOS } from '../../shared/format.js';

const INICIALES = ['E', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];

/** Mes y año del lugar i de la ventana. */
function mesDe(inicio, i) {
  const k = (inicio.mes - 1) + i;
  return { mes: (k % 12) + 1, anio: inicio.anio + Math.floor(k / 12) };
}

/** Describe los tramos sin cultivo en palabras: «diciembre de 2027 a mayo de 2028, …». */
function tramosSinCultivo(porMes, inicio) {
  const tramos = [];
  let ini = null;
  const a = (i) => { const m = mesDe(inicio, i); return `${MESES[m.mes - 1]} de ${m.anio}`; };
  porMes.forEach((cubierto, i) => {
    if (!cubierto && ini === null) ini = i;
    if ((cubierto || i === porMes.length - 1) && ini !== null) {
      const fin = cubierto ? i - 1 : i;
      tramos.push(ini === fin ? a(ini) : `${a(ini)} a ${a(fin)}`);
      ini = null;
    }
  });
  return tramos;
}

/**
 * @param {{ meses:number, de:number, porMes?:boolean[], inicio?:{anio:number, mes:number} }} tc cobertura del motor
 * @param {{ chica?: boolean }} op
 */
export function franja24(tc, { chica = false } = {}) {
  const de = tc?.de || 24;
  const meses = tc?.meses ?? 0;
  const inicio = tc?.inicio || { anio: new Date().getFullYear(), mes: 1 };
  const porMes = Array.isArray(tc?.porMes) && tc.porMes.length === de ? tc.porMes : null;
  const tramos = porMes ? tramosSinCultivo(porMes, inicio) : [];
  const alt = `Cultivo en pie ${meses} de ${de} meses; sin cultivo ${de - meses}.${tramos.length ? ` Sin cultivo: ${tramos.join('; ')}.` : ''}`;
  if (!porMes) {
    return html`<div class="franja24 ${chica ? 'franja24--chica' : ''}" role="img" aria-label="${alt}">
      <div class="franja24__fila">${Array.from({ length: de }, (_, i) => html`<i data-cubierto="${i < meses ? 'true' : 'false'}"></i>`)}</div>
    </div>`;
  }
  const fila = (n) => {
    const a = mesDe(inicio, n * 12);
    const b = mesDe(inicio, n * 12 + 11);
    return html`<div class="franja24__anio">
      <div class="franja24__fila">${porMes.slice(n * 12, n * 12 + 12).map((c) => html`<i data-cubierto="${c ? 'true' : 'false'}"></i>`)}</div>
      ${chica ? '' : html`<div class="franja24__meses" aria-hidden="true">${Array.from({ length: 12 }, (_, i) => html`<span>${INICIALES[mesDe(inicio, n * 12 + i).mes - 1]}</span>`)}</div>`}
      ${chica ? '' : html`<span class="franja24__etiqueta" aria-hidden="true">${MESES_CORTOS[a.mes - 1]} ${a.anio} a ${MESES_CORTOS[b.mes - 1]} ${b.anio}</span>`}
    </div>`;
  };
  return html`<div class="franja24 ${chica ? 'franja24--chica' : ''}" role="img" aria-label="${alt}">${fila(0)}${fila(1)}</div>`;
}
