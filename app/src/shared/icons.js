// Íconos de trazo (24×24) usados en toda la app. Un solo estilo: trazo redondeado.
import { crudo } from './dom.js';

const P = {
  atras: 'M19 12H5M11 6l-6 6 6 6',
  cerrar: 'M6 6l12 12M18 6 6 18',
  abajo: 'm6 9 6 6 6-6',
  arriba: 'm18 15-6-6-6 6',
  izq: 'm15 18-6-6 6-6',
  der: 'm9 18 6-6-6-6',
  flecha: 'M5 12h14M13 6l6 6-6 6',
  menu: 'M4 7h16M4 12h16M4 17h16',
  mas: 'M12 5v14M5 12h14',
  calendario: 'M3 6.5h18v14H3zM3 10.5h18M8 3v4M16 3v4',
  mic: 'M9 5.5a3 3 0 0 1 6 0v6a3 3 0 0 1-6 0zM5 11a7 7 0 0 0 14 0M12 18v3.5',
  pin: 'M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0ZM12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  nube: 'M17.5 17H8a5 5 0 1 1 1.3-9.8A6 6 0 0 1 20.5 11a3 3 0 0 1-3 6Z',
  lluvia: 'M17.5 15H8a5 5 0 1 1 1.3-9.8A6 6 0 0 1 20.5 9a3 3 0 0 1-3 6ZM9 18l-1 3M13 18l-1 3M17 18l-1 3',
  sol: 'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  brote: 'M12 21V9M12 9c0-3 1.5-5 4-6 .5 3-1 5.5-4 6ZM12 13c-3 0-5-1.5-6-4 3-.5 5.5 1 6 4Z',
  grafica: 'M3 20h18M6 16l4-5 3 3 5-7',
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 8v.01M12 11v5',
  alerta: 'M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0ZM12 9v4M12 17h.01',
  lapiz: 'M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4ZM13.5 6.5l4 4',
  basura: 'M4 7h16M10 11v6M14 11v6M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-12M9 7V4h6v3',
  buscar: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14ZM20 20l-3.5-3.5',
  bolsa: 'M8 8V6a4 4 0 0 1 8 0v2M4.5 8h15l-1.3 11.2a2 2 0 0 1-2 1.8H7.8a2 2 0 0 1-2-1.8Z',
  check: 'm5 12.5 4.5 4.5L19 7.5',
  gps: 'M12 19a7 7 0 1 0 0-14 7 7 0 0 0 0 14ZM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM12 2v3M12 19v3M2 12h3M19 12h3',
  historial: 'M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5M12 7v5l3 2',
  capas: 'm12 3 9 5-9 5-9-5 9-5ZM3 13l9 5 9-5',
  nube_subir: 'M7 18a5 5 0 0 1-.9-9.9A6 6 0 0 1 17.6 9 4 4 0 0 1 17 18M12 12v8M9 15l3-3 3 3',
  viento: 'M3 8h11a3 3 0 1 0-3-3M3 12h16a3 3 0 1 1-3 3M3 16h8',
  plaga: 'M12 20a5 5 0 0 0 5-5v-3a5 5 0 0 0-10 0v3a5 5 0 0 0 5 5ZM12 7V4M8 5 6 3M16 5l2-2M7 12H3M21 12h-4M7 16l-3 2M17 16l3 2',
  otra: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM8 12h.01M12 12h.01M16 12h.01',
  usuario: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 21a8 8 0 0 1 16 0',
  reloj: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 7v5l3 2',
  ondas: 'M12 9v6M8 7v10M16 7v10M4 11v2M20 11v2',
  bocina: 'M11 5 6 9H3v6h3l5 4V5ZM15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13',
  alto: 'M7 7h10v10H7z',
  hoja: 'M5 19c0-8 5-13 14-14 0 9-5 14-13 14ZM5 19l7-7',
  estrella: 'm12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9L12 3.5Z',
  libro: 'M4 5.5C4 4.7 4.7 4 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5v-13ZM20 5.5c0-.8-.7-1.5-1.5-1.5H13v16h5.5c.8 0 1.5-.7 1.5-1.5v-13Z',
};

export function icono(nombre, { tam = 20, grosor = 2.2, color = 'currentColor', clase = '' } = {}) {
  const d = P[nombre] || P.info;
  return crudo(`<svg class="${clase}" aria-hidden="true" width="${tam}" height="${tam}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="${grosor}" stroke-linecap="round" stroke-linejoin="round"><path d="${d}"></path></svg>`);
}
export const RUTA_ICONO = P;

/** Greca maya en crema (separador característico). */
export function greca({ color = '#f3ead6', opacidad = 0.72, clase = 'greca', id = 'g' + Math.random().toString(36).slice(2, 7) } = {}) {
  return crudo(`<svg class="${clase}" aria-hidden="true" viewBox="0 0 350 12" preserveAspectRatio="none"><defs><pattern id="${id}" width="28" height="12" patternUnits="userSpaceOnUse"><path d="M0 10.5h6V3.5h10v4.5h-5" fill="none" stroke="${color}" stroke-width="1.6"/><path d="M16 10.5h12" fill="none" stroke="${color}" stroke-width="1.6"/></pattern></defs><rect width="350" height="12" fill="url(#${id})" opacity="${opacidad}"/></svg>`);
}

/** Subrayado dorado hecho a mano debajo de títulos. */
export function subrayado(ancho = 190) {
  return crudo(`<svg class="subrayado" aria-hidden="true" width="${ancho}" height="12" viewBox="0 0 190 12"><path d="M3 7 C 38 2, 80 11, 118 6 S 171 3, 187 7" fill="none" stroke="#f2cf7a" stroke-width="3" stroke-linecap="round"/></svg>`);
}

/** Pin del mapa (guinda con centro crema). */
export function pinMapa() {
  return crudo(`<svg class="mapa-pick__pin" viewBox="0 0 44 56" aria-hidden="true"><path d="M22 2C11 2 3 10.3 3 20.6 3 34 22 54 22 54s19-20 19-33.4C41 10.3 33 2 22 2Z" fill="#7a2840" stroke="#fffaf0" stroke-width="3"/><circle cx="22" cy="20.5" r="7" fill="#f2cf7a"/></svg>`);
}
