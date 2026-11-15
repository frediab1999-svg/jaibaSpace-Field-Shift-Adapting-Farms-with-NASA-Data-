// Esquema del terreno: tablero inclinado de cuadros (cada cuadro = una unidad de superficie)
// con las semillas pintadas como surcos de su color.
import { html } from '../../shared/dom.js';
import { esquema } from '../../modules/parcel/parcelas.js';
import * as catalogo from '../../modules/crops/catalogo.js';

const SUELO = {
  tsekel: { cara: '#8f7c5c', lado: '#5f523c' },
  kankab: { cara: '#a5452b', lado: '#74301d' },
  yaaxhom: { cara: '#9a5a33', lado: '#6b3c20' },
  akalche: { cara: '#6a5844', lado: '#46392b' },
  boxluum: { cara: '#4a3d2e', lado: '#2f261c' },
};
const SUELO_DEF = { cara: '#8a6a3e', lado: '#6b4a2a' };

export function terreno(parcela, siembras, { ancho = 300, mini = false, leyenda = true } = {}) {
  const e = esquema(parcela, siembras);
  if (!e) return html`<p class="ayuda">Falta la superficie para dibujar el terreno.</p>`;
  const suelo = SUELO[parcela.tipoSueloId] || SUELO_DEF;
  const gap = mini ? 3 : 5;
  const lado = Math.max(mini ? 10 : 16, Math.min(mini ? 30 : 56, Math.floor((ancho - gap * (e.cols - 1)) / e.cols)));
  const cultivosEnTerreno = [...new Set(siembras.filter((s) => s.superficieM2).map((s) => s.cultivoId))];
  return html`<div class="terreno">
    <div class="tablero ${mini ? 'tablero--mini' : ''}" style="grid-template-columns:repeat(${e.cols}, ${lado}px)" role="img" aria-label="Esquema del terreno: ${Math.ceil(e.unidades)} cuadros de ${e.escala.txt}">
      ${e.cuadros.map((c, i) => html`<div class="cuadro ${c.capacidad < 0.999 ? 'cuadro--parcial' : ''}" style="--suelo:${suelo.cara};--lado:${suelo.lado};width:${Math.max(4, Math.round(lado * c.capacidad))}px;height:${lado}px;animation-delay:${Math.min(i * 0.03, 0.8)}s">
        ${c.segs.map((s) => html`<span class="cuadro__seg" style="width:${(s.frac / c.capacidad) * 100}%;background-color:${s.color}"></span>`)}
      </div>`)}
    </div>
    ${leyenda ? html`<div class="terreno__escala"><i style="background:${suelo.cara};box-shadow:0 3px 0 ${suelo.lado}"></i>Cada cuadro es ${e.escala.txt}</div>
    ${cultivosEnTerreno.length ? html`<div class="semillas-chips" style="justify-content:center">${cultivosEnTerreno.map((id) => html`<span class="semilla-chip"><i style="background:${catalogo.cultivo(id).color}"></i>${catalogo.cultivo(id).name}</span>`)}</div>` : ''}` : ''}
  </div>`;
}
