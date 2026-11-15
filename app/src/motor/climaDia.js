// Lectura del clima histórico (NASA POWER) para UN día del calendario y para la temporada del año.
// Funciones puras: reciben el archivo de clima de la zona (app/data/clima/*.json) y devuelven
// resúmenes ya procesados para la pantalla. No se muestran series crudas.
//
// Qué trae el archivo y qué se puede afirmar con él:
//  - rachas: periodos de 3 días o más con menos de 1 mm al día (definiciones.rachaMinimaReportadaDias).
//    Un día fuera de una racha NO significa que llovió: pudo ser un día seco suelto.
//  - episodiosCalor: días con máxima de 35 °C o más, desde 1 día (definiciones.calorMinimoReportadoDias).
//    Con eso sí se sabe, día por día, si hizo ese calor.

const pad = (n) => String(n).padStart(2, '0');
const iso = (a, m, d) => `${a}-${pad(m)}-${pad(d)}`;
const esFechaValida = (a, m, d) => { const f = new Date(a, m - 1, d); return f.getMonth() === m - 1 && f.getDate() === d; };
const cubre = (ev, f) => ev.inicio <= f && f <= ev.fin;

/**
 * ¿Cómo suele estar este día del año en la zona?
 * @returns {{ total:number, aniosRacha:number, aniosCalor:number, desde:number|null, hasta:number|null, umbralRacha:number, umbralCalorC:number }}
 *   total: años completos que tienen ese día (el 29 de febrero solo cuenta en bisiestos).
 */
export function historiaDia(clima, mes, dia, { umbralRacha = 5 } = {}) {
  const completas = (clima?.temporadas || []).filter((t) => t.completa);
  // Las rachas que cruzan de un año al otro pueden venir en cualquiera de los dos: se juntan todas.
  const rachas = completas.flatMap((t) => t.rachas).filter((r) => r.dias >= umbralRacha);
  const calor = completas.flatMap((t) => t.episodiosCalor);
  let total = 0; let aniosRacha = 0; let aniosCalor = 0; let desde = null; let hasta = null;
  for (const t of completas) {
    if (!esFechaValida(t.anio, mes, dia)) continue;
    const f = iso(t.anio, mes, dia);
    total++;
    desde = desde == null ? t.anio : Math.min(desde, t.anio);
    hasta = hasta == null ? t.anio : Math.max(hasta, t.anio);
    if (rachas.some((r) => cubre(r, f))) aniosRacha++;
    if (calor.some((e) => cubre(e, f))) aniosCalor++;
  }
  return { total, aniosRacha, aniosCalor, desde, hasta, umbralRacha, umbralCalorC: clima?.definiciones?.umbralCalorC ?? 35 };
}

/**
 * Lo que midió NASA en una fecha concreta, si ese año está completo en el archivo.
 * @returns {null | { fecha:string, racha:{inicio:string, fin:string, dias:number}|null, calor:boolean, rachaMinima:number }}
 */
export function diaMedido(clima, anio, mes, dia) {
  const completas = (clima?.temporadas || []).filter((t) => t.completa);
  if (!completas.some((t) => t.anio === anio) || !esFechaValida(anio, mes, dia)) return null;
  const f = iso(anio, mes, dia);
  const racha = completas.flatMap((t) => t.rachas).filter((r) => cubre(r, f)).sort((a, b) => b.dias - a.dias)[0] || null;
  const calor = completas.flatMap((t) => t.episodiosCalor).some((e) => cubre(e, f));
  return { fecha: f, racha, calor, rachaMinima: clima.definiciones?.rachaMinimaReportadaDias ?? 3 };
}

/** Frase corta para una proporción de años ("casi todos", "la mitad"…), para no obligar a leer fracciones. */
export function fraseProporcion(n, total) {
  if (!total) return 'sin datos';
  const p = n / total;
  if (n === 0) return 'ningún año';
  if (n === total) return 'todos los años';
  if (p >= 0.8) return 'casi todos los años';
  if (p >= 0.6) return 'la mayoría de los años';
  if (p >= 0.4) return 'cerca de la mitad de los años';
  if (p >= 0.2) return 'algunos años';
  return 'pocos años';
}

/**
 * Dónde estamos en el ciclo de temporadas del año (catálogo listas.temporadasDelAnio).
 * @returns {null | { actual:object, siguiente:object|null, posicion:number, duracion:number, mesesRestantes:number }}
 *   posicion: 1 = primer mes de la temporada. mesesRestantes: meses que faltan después del actual.
 */
export function estacionDelAnio(temporadas, mes) {
  const actual = (temporadas || []).find((t) => t.meses.includes(mes));
  if (!actual) return null;
  const posicion = actual.meses.indexOf(mes) + 1;
  const duracion = actual.meses.length;
  const ultimo = actual.meses[duracion - 1];
  const mesSig = (ultimo % 12) + 1;
  const siguiente = temporadas.find((t) => t.meses.includes(mesSig)) || null;
  return { actual, siguiente, posicion, duracion, mesesRestantes: duracion - posicion };
}
