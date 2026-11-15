// Franja de 24 meses: cada celda es un mes de los dos ciclos (enero del año 1 a diciembre
// del año 2). Dorado = algún cultivo en pie 15 días o más ese mes; tierra rayada = desnuda.
// No depende solo del color: la tierra desnuda va rayada y la franja trae texto alternativo.
import { html } from '../../shared/dom.js';
import { MESES } from '../../shared/format.js';

const INICIALES = ['E', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];

/** Describe los tramos desnudos en palabras: «enero a mayo del año 1, …». */
function tramosDesnudos(porMes) {
  const tramos = [];
  let ini = null;
  porMes.forEach((cubierto, i) => {
    if (!cubierto && ini === null) ini = i;
    if ((cubierto || i === porMes.length - 1) && ini !== null) {
      const fin = cubierto ? i - 1 : i;
      const a = (k) => `${MESES[k % 12]} del año ${Math.floor(k / 12) + 1}`;
      tramos.push(ini === fin ? a(ini) : `${a(ini)} a ${a(fin)}`);
      ini = null;
    }
  });
  return tramos;
}

/**
 * @param {{ meses:number, de:number, porMes?:boolean[] }} tc criterio tierraCubierta del motor
 * @param {{ chica?: boolean }} op
 */
export function franja24(tc, { chica = false } = {}) {
  const de = tc?.de || 24;
  const meses = tc?.meses ?? 0;
  const porMes = Array.isArray(tc?.porMes) && tc.porMes.length === de ? tc.porMes : null;
  const desnudos = de - meses;
  const tramos = porMes ? tramosDesnudos(porMes) : [];
  const alt = `Tierra cubierta ${meses} de ${de} meses; desnuda ${desnudos}.${tramos.length ? ` Desnuda de ${tramos.join('; ')}.` : ''}`;
  if (!porMes) {
    return html`<div class="franja24 ${chica ? 'franja24--chica' : ''}" role="img" aria-label="${alt}">
      <div class="franja24__fila">${Array.from({ length: de }, (_, i) => html`<i data-cubierto="${i < meses ? 'true' : 'false'}"></i>`)}</div>
    </div>`;
  }
  const anio = (n) => html`<div class="franja24__anio">
    <div class="franja24__fila">${porMes.slice(n * 12, n * 12 + 12).map((c) => html`<i data-cubierto="${c ? 'true' : 'false'}"></i>`)}</div>
    ${chica ? '' : html`<div class="franja24__meses" aria-hidden="true">${INICIALES.map((x) => html`<span>${x}</span>`)}</div>`}
    ${chica ? '' : html`<span class="franja24__etiqueta" aria-hidden="true">Año ${n + 1}</span>`}
  </div>`;
  return html`<div class="franja24 ${chica ? 'franja24--chica' : ''}" role="img" aria-label="${alt}">${anio(0)}${anio(1)}</div>`;
}
