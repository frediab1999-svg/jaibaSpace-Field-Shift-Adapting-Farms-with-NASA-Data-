// De dónde saca la pantalla «Opciones para tu parcela» sus números.
//
// HOY: de la salida de ejemplo (opciones-ejemplo.js), con los números del Rol 3 para Umán.
// CUANDO EL MOTOR PASE SUS PRUEBAS: haz los dos cambios marcados con ← abajo
//   1) quita las // de la línea que importa motor/estrategias.js
//   2) cambia `compararEjemplo` por `compararEstrategias` en la línea de `comparar`
// y la pantalla queda conectada. Lo demás (sellos de «ejemplo», avisos de zona) se ajusta solo.
//
// Lo que la pantalla espera del motor: compararEstrategias(parcela, { prioridad }) devuelve
// (o promete) un arreglo de estrategias, primero las visibles en orden y al final las ocultas:
// {
//   id: 'actual' | 'milpa-canavalia' | 'cobertura' | 'otro-grano',
//   nombre, esActual: boolean,
//   visible: boolean, motivoOculto: string|null, avisoSuelo?: string|null,
//   criterios: {
//     agua:  { valor: 0.086, aniosAfectados: 14, deAnios: 28, etapa: 'floración y llenado del maíz' },
//     calor: { valor: 0.011 },
//     tierraCubierta: { meses: 17, de: 24, porMes: [24 booleanos, enero del año 1 a diciembre del año 2] },
//     nitrogeno: 'bajo'|'medio'|'alto', ingreso: 'bajo'|'medio'|'alto',
//   },
//   puntajes: { agua, suelo, nitrogeno, ingreso },
//   posicion: 1..n (null si está oculta), empateCon: [ids],
//   porQue, beneficios[], riesgos[], faltantes[], fuentes[], advertenciaIngreso,
// }
// Si el motor no trae porMes, la franja de 24 meses se dibuja solo con el total.
import { compararEjemplo, ZONA_DE_LOS_NUMEROS } from './opciones-ejemplo.js';
// import { compararEstrategias } from '../../motor/estrategias.js'; // ← 1) quita las //
const comparar = compararEjemplo; // ← 2) cambia por compararEstrategias

export const FUENTE = comparar === compararEjemplo ? 'ejemplo' : 'motor';

/** Estrategias ordenadas para la parcela y la prioridad pedida. */
export async function opcionesPara(parcela, prioridad) {
  const lista = await comparar(parcela, { prioridad });
  return Array.isArray(lista) ? lista : [];
}

/** Zona para la que valen los números de ejemplo (null cuando ya calcula el motor). */
export const zonaDeLosNumeros = () => (FUENTE === 'ejemplo' ? ZONA_DE_LOS_NUMEROS : null);
