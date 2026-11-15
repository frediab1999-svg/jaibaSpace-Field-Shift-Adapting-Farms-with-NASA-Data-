// MOTOR DE COMPARACIÓN DE ESTRATEGIAS («Opciones para tu parcela»).
//
// Funciones puras: reciben los JSON publicados (planes, reglas, clima de la zona) y devuelven
// los indicadores. No leen IndexedDB ni tocan la pantalla, así que corren igual en el
// teléfono (sin conexión) y en las pruebas (app/tests/estrategias.test.js).
//
// Qué calcula y qué NO:
//  - Meses estimados con cultivo en pie: por calendario, sobre una ventana de 24 meses.
//  - Exposición histórica: cuántos años una racha seca (o un episodio de calor) coincidió con
//    la etapa sensible de un cultivo, y qué proporción de los días de esa etapa quedó dentro.
//  - No calcula rendimiento, probabilidad de sobrevivir, fertilidad ni pronóstico.
//
// Definiciones (todas vienen de los datos; aquí no hay constantes agrícolas):
//  - Día seco: lluvia < definiciones.umbralDiaSecoMm del archivo de clima (1 mm).
//  - Racha relevante: racha seca de reglas.rachaRelevanteDias días o más (5).
//  - Episodio de calor relevante: reglas.episodioCalorRelevanteDias días o más (3) con
//    temperatura máxima ≥ definiciones.umbralCalorC (35 °C).
//  - Etapa sensible: las etapas con sensibilidad «alta» en reglas.cultivos[cultivo].etapas.
//  - Año evaluable: todos los años calendario que toca la etapa están completos en el archivo
//    (diasConDato = diasEsperados). Si falta un día no sabemos dónde cayó, así que ese año
//    no se evalúa: no se cuenta como año sin racha.

const DIA_MS = 86400000;

/** Número de día (entero) de una fecha, sin horas ni zonas horarias. */
export const diaNum = (anio, mes, dia) => Math.round(Date.UTC(anio, mes - 1, dia) / DIA_MS);
export function deDiaNum(n) {
  const d = new Date(n * DIA_MS);
  return { anio: d.getUTCFullYear(), mes: d.getUTCMonth() + 1, dia: d.getUTCDate() };
}
const z2 = (n) => String(n).padStart(2, '0');
export function isoDeDiaNum(n) {
  const f = deDiaNum(n);
  return `${f.anio}-${z2(f.mes)}-${z2(f.dia)}`;
}
const numDeIso = (iso) => { const [a, m, d] = iso.split('-').map(Number); return diaNum(a, m, d); };
const mmdd = (txt) => { const [m, d] = txt.split('-').map(Number); return { mes: m, dia: d }; };
const diasDelMes = (anio, mes) => new Date(Date.UTC(anio, mes, 0)).getUTCDate();

// =====================================================================
// 1. Planes: una estrategia son ciclos; cada ciclo tiene uno o varios cultivos
// =====================================================================

/**
 * Lleva un plan de planes.json a una sola forma. Acepta las dos que existen:
 *  - ciclo con un cultivo (formato 0.3): { numero, cultivo, siembra, cosecha, proposito }
 *  - ciclo con varios (formato 0.4):     { numero, cultivos: [{ cultivo, siembra, fin, tipoFin, proposito }] }
 * `tipoFin` separa la cosecha de grano del fin de una cobertura: el corte de la canavalia
 * no es una cosecha.
 */
export function normalizarPlan(plan) {
  return {
    ...plan,
    ciclos: plan.ciclos.map((c) => ({
      numero: c.numero,
      cultivos: (c.cultivos || [c]).map((x) => {
        const proposito = x.proposito || 'grano';
        return {
          cultivo: x.cultivo,
          siembra: x.siembra,
          fin: x.fin || x.cosecha,
          tipoFin: x.tipoFin || (proposito === 'cobertura' ? 'fin_cobertura' : 'cosecha'),
          proposito,
          supuesto: x.supuesto || null,
        };
      }),
    })),
  };
}

/** Clasifica el plan por lo que hace, no por su etiqueta. */
export function tipoDePlan(planNorm) {
  if (planNorm.ciclos.some((c) => c.cultivos.length > 1)) return 'asociacion';
  const cultivos = new Set(planNorm.ciclos.map((c) => c.cultivos[0]?.cultivo));
  return cultivos.size > 1 ? 'rotacion' : 'continuo';
}

/**
 * Intervalos con fecha de cada cultivo. El ciclo n se ubica en anioBase + n − 1.
 * Si el fin es anterior a la siembra en el calendario, el cultivo termina el año siguiente.
 * @returns {Array<{ciclo, cultivo, proposito, tipoFin, ini, fin, supuesto}>} ini y fin en número de día
 */
export function intervalosDelPlan(planNorm, { anioBase, desplazamientoDias = 0 }) {
  const out = [];
  for (const ciclo of planNorm.ciclos) {
    const anio = anioBase + ciclo.numero - 1;
    for (const c of ciclo.cultivos) {
      const s = mmdd(c.siembra);
      const f = mmdd(c.fin);
      let ini = diaNum(anio, s.mes, s.dia);
      let fin = diaNum(anio, f.mes, f.dia);
      if (fin < ini) fin = diaNum(anio + 1, f.mes, f.dia);
      ini += desplazamientoDias;
      fin += desplazamientoDias;
      out.push({ ciclo: ciclo.numero, cultivo: c.cultivo, proposito: c.proposito, tipoFin: c.tipoFin, ini, fin, supuesto: c.supuesto });
    }
  }
  return out;
}

// =====================================================================
// 2. Meses estimados con cultivo en pie
// =====================================================================

/**
 * Para cada mes de la ventana cuenta los días en que hay al menos un cultivo en pie (unión:
 * dos cultivos asociados el mismo día cuentan una vez). El mes cuenta si llega a diasMinimos.
 * @param {Array<{ini:number, fin:number}>} intervalos
 * @param {{ inicio:{anio:number, mes:number}, meses?:number, diasMinimos?:number }} op
 */
export function coberturaMensual(intervalos, { inicio, meses = 24, diasMinimos = 15 }) {
  const diasPorMes = [];
  const etiquetas = [];
  let anio = inicio.anio;
  let mes = inicio.mes;
  for (let i = 0; i < meses; i++) {
    const n = diasDelMes(anio, mes);
    const primero = diaNum(anio, mes, 1);
    let dias = 0;
    for (let d = 0; d < n; d++) {
      const hoy = primero + d;
      if (intervalos.some((x) => hoy >= x.ini && hoy <= x.fin)) dias++;
    }
    diasPorMes.push(dias);
    etiquetas.push({ anio, mes });
    mes++;
    if (mes > 12) { mes = 1; anio++; }
  }
  const porMes = diasPorMes.map((d) => d >= diasMinimos);
  const fin = etiquetas[etiquetas.length - 1];
  return {
    meses: porMes.filter(Boolean).length,
    de: meses,
    porMes,
    diasPorMes,
    diasMinimos,
    inicio,
    ventana: { desde: `${inicio.anio}-${z2(inicio.mes)}`, hasta: `${fin.anio}-${z2(fin.mes)}` },
  };
}

// =====================================================================
// 3. Eventos del archivo de clima
// =====================================================================

/**
 * Rachas secas o episodios de calor de minDias o más, como intervalos en número de día.
 * El pipeline exporta los eventos año por año: una racha que cruza el 31 de diciembre viene
 * en dos pedazos. Aquí se vuelven a unir antes de filtrar por duración.
 * Límite conocido: un pedazo más corto que el mínimo exportado (3 días de racha) no viene
 * en el archivo, así que una racha de, por ejemplo, 2 + 4 días alrededor del año nuevo se
 * ve como una de 4. Solo afecta a etapas que tocan el cambio de año.
 */
export function eventosRelevantes(clima, tipo, minDias) {
  const campo = tipo === 'calor' ? 'episodiosCalor' : 'rachas';
  const piezas = clima.temporadas
    .flatMap((t) => t[campo])
    .map((e) => ({ ini: numDeIso(e.inicio), fin: numDeIso(e.fin) }))
    .sort((a, b) => a.ini - b.ini);
  const unidas = [];
  for (const p of piezas) {
    const ultima = unidas[unidas.length - 1];
    if (ultima && p.ini === ultima.fin + 1) ultima.fin = p.fin; // pedazos contiguos (cambio de año)
    else unidas.push({ ...p });
  }
  return unidas.filter((e) => e.fin - e.ini + 1 >= minDias);
}

const aniosCompletos = (clima) => new Set(clima.temporadas.filter((t) => t.completa && t.diasConDato === t.diasEsperados).map((t) => t.anio));

/**
 * Cruza UN tipo de evento con UNA etapa de un cultivo sembrado el mismo día de cada año histórico.
 * @returns {{
 *   aniosEvaluados:number, aniosConCoincidencia:number, proporcionDias:number|null,
 *   diasEtapa:number, desde:number|null, hasta:number|null, noEvaluados:number[],
 *   detalle:Array<{anio, coincide, diasExpuestos, diasEtapa, eventoMasLargoDias}>
 * }}
 *  - aniosConCoincidencia: años evaluables en que al menos un evento relevante tocó la etapa.
 *  - proporcionDias: promedio, entre los años evaluables, de (días de la etapa dentro de
 *    eventos relevantes) / (días de la etapa). null si no hay años evaluables.
 */
export function exposicionEtapa(clima, { mesSiembra, diaSiembra, desdeDia, hastaDia, eventos }) {
  const completos = aniosCompletos(clima);
  const detalle = [];
  const noEvaluados = [];
  for (const t of clima.temporadas) {
    const siembra = diaNum(t.anio, mesSiembra, diaSiembra);
    const ini = siembra + desdeDia;
    const fin = siembra + hastaDia;
    let evaluable = true;
    for (let a = deDiaNum(ini).anio; a <= deDiaNum(fin).anio; a++) if (!completos.has(a)) evaluable = false;
    if (!evaluable) { noEvaluados.push(t.anio); continue; }
    let diasExpuestos = 0;
    let masLargo = 0;
    let coincide = false;
    for (const e of eventos) {
      if (e.fin < ini) continue;
      if (e.ini > fin) break;
      coincide = true;
      diasExpuestos += Math.min(e.fin, fin) - Math.max(e.ini, ini) + 1;
      masLargo = Math.max(masLargo, e.fin - e.ini + 1);
    }
    detalle.push({ anio: t.anio, coincide, diasExpuestos, diasEtapa: fin - ini + 1, eventoMasLargoDias: masLargo });
  }
  const n = detalle.length;
  return {
    aniosEvaluados: n,
    aniosConCoincidencia: detalle.filter((d) => d.coincide).length,
    proporcionDias: n ? detalle.reduce((s, d) => s + d.diasExpuestos / d.diasEtapa, 0) / n : null,
    diasEtapa: hastaDia - desdeDia + 1,
    desde: n ? detalle[0].anio : null,
    hasta: n ? detalle[n - 1].anio : null,
    noEvaluados,
    detalle,
  };
}

// =====================================================================
// 4. Exposición de un plan completo
// =====================================================================

const etapasSensibles = (reglas, cultivo) => (reglas.cultivos?.[cultivo]?.etapas || []).filter((e) => e.sensibilidad === 'alta');

/**
 * Exposición histórica del plan para un tipo de evento ('agua' = rachas secas, 'calor').
 * Cada cultivo de cada ciclo se siembra en su fecha del plan en cada año histórico («misma
 * temporada histórica para todos los ciclos»), porque el archivo mide lo que pasó cada año,
 * no una secuencia de dos años concretos.
 *
 * Devuelve por cultivo y un resumen del plan. Cuando un cultivo no tiene etapa sensible
 * documentada o no hay años evaluables, ese cultivo queda `sinEstimacion` con su motivo:
 * nunca se convierte en «riesgo cero».
 */
export function exposicionPlan(planNorm, clima, reglas, tipo, { desplazamientoDias = 0 } = {}) {
  const minDias = tipo === 'calor' ? reglas.episodioCalorRelevanteDias : reglas.rachaRelevanteDias;
  const eventos = eventosRelevantes(clima, tipo === 'calor' ? 'calor' : 'rachas', minDias);
  const porCultivo = [];
  for (const ciclo of planNorm.ciclos) {
    for (const c of ciclo.cultivos) {
      const base = { ciclo: ciclo.numero, cultivo: c.cultivo, nombreCultivo: reglas.cultivos?.[c.cultivo]?.nombre || c.cultivo };
      if (!reglas.cultivos?.[c.cultivo]) {
        porCultivo.push({ ...base, sinEstimacion: true, motivo: 'sin_reglas' });
        continue;
      }
      const etapas = etapasSensibles(reglas, c.cultivo);
      if (!etapas.length) {
        porCultivo.push({ ...base, sinEstimacion: true, motivo: 'sin_etapa_sensible' });
        continue;
      }
      // Fecha de siembra del plan (con el desplazamiento del escenario) en un año cualquiera
      const s = mmdd(c.siembra);
      const ref = deDiaNum(diaNum(2001, s.mes, s.dia) + desplazamientoDias); // 2001: año no bisiesto de referencia
      const desdeDia = Math.min(...etapas.map((e) => e.desdeDia));
      const hastaDia = Math.max(...etapas.map((e) => e.hastaDia));
      const r = exposicionEtapa(clima, { mesSiembra: ref.mes, diaSiembra: ref.dia, desdeDia, hastaDia, eventos });
      if (!r.aniosEvaluados) {
        porCultivo.push({ ...base, sinEstimacion: true, motivo: 'sin_anios_evaluables' });
        continue;
      }
      porCultivo.push({
        ...base,
        sinEstimacion: false,
        etapa: { nombre: etapas.map((e) => e.nombre).join(' y '), desdeDia, hastaDia, siembra: { mes: ref.mes, dia: ref.dia } },
        aniosConCoincidencia: r.aniosConCoincidencia,
        aniosEvaluados: r.aniosEvaluados,
        proporcionDias: r.proporcionDias,
        diasEtapa: r.diasEtapa,
        periodo: { desde: r.desde, hasta: r.hasta },
        noEvaluados: r.noEvaluados,
        detalle: r.detalle,
      });
    }
  }
  const con = porCultivo.filter((x) => !x.sinEstimacion);
  if (!con.length) {
    return { tipo, minDias, sinEstimacion: true, motivo: porCultivo[0]?.motivo || 'sin_reglas', porCultivo };
  }
  // Resumen del plan: años en que al menos un cultivo tuvo coincidencia (solo los años que
  // todos los cultivos evaluados comparten) y días expuestos sobre días sensibles del plan.
  const aniosComunes = con.map((x) => new Set(x.detalle.map((d) => d.anio))).reduce((a, b) => new Set([...a].filter((y) => b.has(y))));
  let afectados = 0;
  let sumaProp = 0;
  for (const anio of aniosComunes) {
    const filas = con.map((x) => x.detalle.find((d) => d.anio === anio));
    if (filas.some((f) => f.coincide)) afectados++;
    sumaProp += filas.reduce((s, f) => s + f.diasExpuestos, 0) / filas.reduce((s, f) => s + f.diasEtapa, 0);
  }
  const lista = [...aniosComunes].sort((a, b) => a - b);
  return {
    tipo,
    minDias,
    sinEstimacion: !lista.length,
    motivo: lista.length ? null : 'sin_anios_evaluables',
    aniosConCoincidencia: afectados,
    aniosEvaluados: lista.length,
    proporcionDias: lista.length ? sumaProp / lista.length : null,
    periodo: { desde: lista[0] ?? null, hasta: lista[lista.length - 1] ?? null },
    porCultivo,
  };
}

// =====================================================================
// 5. Comparación
// =====================================================================

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const fechaTxt = (n) => { const f = deDiaNum(n); return `${f.dia} de ${MESES[f.mes - 1]}`; };

/** Fechas del plan para el calendario: siembra, cosecha y fin de cobertura por separado. */
export function marcasDelPlan(intervalos, nombreCultivo) {
  const marcas = [];
  for (const x of intervalos) {
    const nombre = nombreCultivo(x.cultivo);
    marcas.push({ fecha: isoDeDiaNum(x.ini), tipo: 'siembra', cultivo: x.cultivo, ciclo: x.ciclo, texto: `Sembrar ${nombre}`, supuesto: x.supuesto });
    marcas.push(x.tipoFin === 'fin_cobertura'
      ? { fecha: isoDeDiaNum(x.fin), tipo: 'fin_cobertura', cultivo: x.cultivo, ciclo: x.ciclo, texto: `Fin estimado de la cobertura de ${nombre}`, supuesto: x.supuesto }
      : { fecha: isoDeDiaNum(x.fin), tipo: 'cosecha', cultivo: x.cultivo, ciclo: x.ciclo, texto: `Cosecha estimada de ${nombre}`, supuesto: x.supuesto });
  }
  return marcas.sort((a, b) => a.fecha.localeCompare(b.fecha));
}

/**
 * Compara los planes con las mismas reglas, el mismo clima y la misma ventana.
 * @param {{
 *   planes: object[],            planes ya resueltos (los de planes.json o la práctica del productor)
 *   reglas: object, clima: object|null,
 *   anioBase: number,            año del primer ciclo
 *   desplazamientoDias?: number  mueve todas las fechas del escenario (0 = las del plan).
 *                                Un plan puede traer su propio `desplazamientoDias`, que tiene prioridad.
 * }} entrada
 */
export function compararEstrategias({ planes, reglas, clima, anioBase, desplazamientoDias = 0 }) {
  const normalizados = planes.map(normalizarPlan);
  const despDe = (p) => p.desplazamientoDias ?? desplazamientoDias;
  const conIntervalos = normalizados.map((p) => ({
    plan: p,
    intervalos: intervalosDelPlan(p, { anioBase, desplazamientoDias: despDe(p) }),
  }));
  // Misma ventana para todos: 24 meses desde el mes de la primera siembra del escenario
  const primera = Math.min(...conIntervalos.flatMap((x) => x.intervalos.map((i) => i.ini)));
  const f = deDiaNum(primera);
  const inicio = { anio: f.anio, mes: f.mes };
  const diasMinimos = reglas.cobertura?.diasMinimosPorMes ?? 15;
  const nombreCultivo = (id) => (reglas.cultivos?.[id]?.nombre || id).split(' (')[0].toLowerCase(); // «Canavalia (frijol de machete)…» → «canavalia»

  const estrategias = conIntervalos.map(({ plan, intervalos }) => {
    const desp = despDe(plan);
    return {
      id: plan.id,
      plan,
      tipo: tipoDePlan(plan),
      intervalos: intervalos.map((x) => ({ ...x, inicioIso: isoDeDiaNum(x.ini), finIso: isoDeDiaNum(x.fin), inicioTxt: fechaTxt(x.ini), finTxt: fechaTxt(x.fin) })),
      cobertura: coberturaMensual(intervalos, { inicio, meses: 24, diasMinimos }),
      agua: clima ? exposicionPlan(plan, clima, reglas, 'agua', { desplazamientoDias: desp }) : { tipo: 'agua', sinEstimacion: true, motivo: 'sin_clima', porCultivo: [] },
      calor: clima ? exposicionPlan(plan, clima, reglas, 'calor', { desplazamientoDias: desp }) : { tipo: 'calor', sinEstimacion: true, motivo: 'sin_clima', porCultivo: [] },
      marcas: marcasDelPlan(intervalos, nombreCultivo),
    };
  });
  const max = Math.max(...estrategias.map((e) => e.cobertura.meses));
  const conMax = estrategias.filter((e) => e.cobertura.meses === max);
  estrategias.forEach((e) => {
    e.masMeses = e.cobertura.meses === max && conMax.length < estrategias.length;
    e.empateMeses = e.masMeses && conMax.length > 1;
  });
  return {
    ventana: { ...estrategias[0].cobertura.ventana, inicio, meses: 24, diasMinimos },
    anioBase,
    desplazamientoDias,
    estrategias,
  };
}
