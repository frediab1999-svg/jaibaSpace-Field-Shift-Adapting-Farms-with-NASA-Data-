// Arma la comparación de «Opciones para tu parcela» con los datos de UNA parcela.
// Funciones puras (sin pantalla ni almacenamiento): la pantalla le pasa lo que el productor
// registró y los JSON publicados; aquí se decide qué planes se comparan, con qué fechas y
// qué se puede (y no se puede) estimar.
//
// Las tres opciones de la comparación:
//   a) La práctica actual del productor, si está registrada y hay reglas para evaluarla.
//      Si no, la plantilla «Maíz continuo de ejemplo» (plan `actual` de planes.json).
//   b) Maíz con canavalia intercalada en el mismo ciclo (plan `milpa-canavalia`).
//   c) Un ciclo de canavalia de cobertura y luego maíz (plan `cobertura`).
// Los demás planes de planes.json (la soya) se devuelven aparte, como material secundario.
import { compararEstrategias, diaNum, deDiaNum } from './estrategias.js';

export const IDS_PRINCIPALES = ['actual', 'milpa-canavalia', 'cobertura'];

const z2 = (n) => String(n).padStart(2, '0');
const aMmdd = (mes, dia) => `${z2(mes)}-${z2(dia)}`;
const partes = (mmdd) => mmdd.split('-').map(Number);
const REF = 2001; // año no bisiesto de referencia para sumar días a una fecha mes-día
const numRef = (mmdd) => { const [m, d] = partes(mmdd); return diaNum(REF, m, d); };
const sumarDias = (mmdd, dias) => { const f = deDiaNum(numRef(mmdd) + dias); return aMmdd(f.mes, f.dia); };
export const diferenciaDias = (desde, hasta) => numRef(hasta) - numRef(desde);

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
export const fechaTexto = (mmdd) => { const [m, d] = partes(mmdd); return `${d} de ${MESES[m - 1]}`; };

/** Cómo define planes.json a un cultivo (para heredar si su fin es cosecha o fin de cobertura). */
function definicionEnPlanes(planesDoc, cultivo) {
  for (const p of planesDoc.planes) {
    for (const ciclo of p.ciclos) {
      for (const c of ciclo.cultivos || [ciclo]) {
        if (c.cultivo === cultivo) {
          const proposito = c.proposito || 'grano';
          return { siembra: c.siembra, proposito, tipoFin: c.tipoFin || (proposito === 'cobertura' ? 'fin_cobertura' : 'cosecha') };
        }
      }
    }
  }
  return null;
}

/**
 * Plan de la práctica actual del productor.
 * @param {{
 *   declaradas: Array<{ nombre:string, reglasId:string|null, fecha?:{mes?:number, dia?:number, precision?:string} }>,
 *   temporadaAnio?: number|null, reglas: object, planesDoc: object
 * }} entrada  `declaradas` = lo que el productor registró en su temporada más reciente (o su plan).
 *
 * Se conserva TODO lo declarado (maíz, frijol, calabaza…) como descripción. El cálculo solo
 * cubre los cultivos que tienen etapas en reglas.json, y lo dice (`sinReglas`).
 * La fecha exacta del productor se respeta; si solo se conoce el mes se usa el día 15 y se
 * declara como supuesto; si no se conoce, se usa la del plan de ejemplo.
 */
export function planDePractica({ declaradas = [], temporadaAnio = null, reglas, planesDoc }) {
  const plantilla = planesDoc.planes.find((p) => p.id === 'actual');
  const nombres = [...new Set(declaradas.map((d) => d.nombre))];
  const evaluables = [];
  const sinReglas = [];
  const supuestos = [];
  const vistos = new Set();
  for (const d of declaradas) {
    const etapas = d.reglasId ? reglas.cultivos?.[d.reglasId]?.etapas : null;
    if (!etapas?.length) { if (!sinReglas.includes(d.nombre)) sinReglas.push(d.nombre); continue; }
    if (vistos.has(d.reglasId)) continue;
    vistos.add(d.reglasId);
    const ref = definicionEnPlanes(planesDoc, d.reglasId);
    let siembra;
    let precision;
    if (d.fecha?.precision === 'dia' && d.fecha.mes && d.fecha.dia) {
      siembra = aMmdd(d.fecha.mes, d.fecha.dia);
      precision = 'dia';
    } else if (d.fecha?.mes) {
      siembra = aMmdd(d.fecha.mes, 15);
      precision = 'mes';
      supuestos.push(`De ${d.nombre.toLowerCase()} solo se conoce el mes de siembra: el cálculo usa el día 15.`);
    } else if (ref) {
      siembra = ref.siembra;
      precision = 'plantilla';
      supuestos.push(`No se conoce la fecha de siembra de ${d.nombre.toLowerCase()}: el cálculo usa la del plan de ejemplo (${fechaTexto(ref.siembra)}).`);
    } else {
      if (!sinReglas.includes(d.nombre)) sinReglas.push(d.nombre);
      continue;
    }
    const cicloDias = Math.max(...etapas.map((e) => e.hastaDia));
    evaluables.push({
      cultivo: d.reglasId,
      siembra,
      fin: sumarDias(siembra, cicloDias),
      tipoFin: ref?.tipoFin || 'cosecha',
      proposito: ref?.proposito || 'grano',
      precisionSiembra: precision,
    });
  }
  if (!evaluables.length) {
    return {
      ...plantilla,
      nombre: 'Maíz continuo de ejemplo',
      esPlantilla: true,
      origen: 'plantilla',
      motivoPlantilla: nombres.length ? 'sin_reglas' : 'sin_registro',
      declarados: nombres,
      sinReglas,
      supuestosPractica: [],
    };
  }
  const soloMaiz = evaluables.every((e) => e.cultivo === 'maiz');
  return {
    id: 'actual',
    nombre: 'Tu práctica registrada',
    esPlantilla: false,
    origen: 'registrada',
    temporadaAnio,
    declarados: nombres,
    sinReglas,
    supuestosPractica: supuestos,
    siembraRegistrada: evaluables.find((e) => e.cultivo === 'maiz')?.siembra || evaluables[0].siembra,
    ciclos: [1, 2].map((numero) => ({ numero, cultivos: evaluables.map((e) => ({ ...e })) })),
    // Los textos del plan de ejemplo hablan del maíz de milpa: solo se heredan si eso es lo que se evalúa
    beneficios: soloMaiz ? plantilla.beneficios : [],
    riesgos: soloMaiz ? plantilla.riesgos : [],
    fuentes: soloMaiz ? plantilla.fuentes : [],
    porConfirmar: soloMaiz ? plantilla.porConfirmar : [],
    trazabilidad: [{ campo: 'ciclos', estado: 'registrado_productor', nota: `Cultivos y fechas de siembra que registraste${temporadaAnio ? ` en ${temporadaAnio}` : ''}. Se supone que repites lo mismo en los dos ciclos. El fin de cada cultivo se estima con los días de ciclo documentados para ese cultivo.` }],
  };
}

/** Fechas de siembra que se pueden probar: el 1 y el 15 de cada mes dentro de la ventana oficial. */
export function opcionesDeSiembra({ ventana, base, registrada }) {
  const lista = new Set();
  if (ventana?.desde && ventana?.hasta) {
    const fin = numRef(ventana.hasta);
    for (let n = numRef(ventana.desde); n <= fin; n++) {
      const f = deDiaNum(n);
      if (f.dia === 1 || f.dia === 15) lista.add(aMmdd(f.mes, f.dia));
    }
  }
  lista.add(base);
  if (registrada) lista.add(registrada);
  return [...lista].sort().map((valor) => ({ valor, etiqueta: fechaTexto(valor), esRegistrada: valor === registrada, esDelPlan: valor === base }));
}

/** Aptitud del suelo de la parcela para los cultivos de un plan (solo con equivalencia verificada). */
function sueloParaPlan(plan, reglas, sueloReglasId) {
  const cultivos = [...new Set(plan.ciclos.flatMap((c) => (c.cultivos || [c]).map((x) => x.cultivo)))];
  const sensibles = cultivos.filter((c) => Object.values(reglas.suelos || {}).some((s) => s?.aptitud?.[c] === 'baja'));
  if (!sensibles.length) return { estado: 'no_aplica', cultivos: [] };
  if (!sueloReglasId || !reglas.suelos?.[sueloReglasId]?.aptitud) return { estado: 'sin_dato', cultivos: sensibles };
  const bajos = sensibles.filter((c) => reglas.suelos[sueloReglasId].aptitud[c] === 'baja');
  return bajos.length ? { estado: 'no_recomendable', cultivos: bajos } : { estado: 'apta', cultivos: sensibles };
}

/**
 * @param {{
 *   declaradas: object[], temporadaAnio?: number|null,
 *   planesDoc: object, reglas: object,
 *   clima: object|null, zona: {id:string, nombre:string}|null,
 *   sueloReglasId?: string|null,          clave WRB de reglas.json, solo si la equivalencia está verificada
 *   ventanaSiembra?: {desde:string, hasta:string}|null,
 *   hoy: {anio:number, mes:number},
 *   siembraEscenario?: string|null        'MM-DD' elegido en pantalla (null = la registrada o la del plan)
 * }} entrada
 */
export function armarComparacion({ declaradas = [], temporadaAnio = null, planesDoc, reglas, clima, zona, sueloReglasId = null, ventanaSiembra = null, hoy, siembraEscenario = null }) {
  const practica = planDePractica({ declaradas, temporadaAnio, reglas, planesDoc });
  const base = planesDoc.planes.find((p) => p.id === 'actual').ciclos[0].siembra; // siembra del maíz en los planes publicados
  const registrada = practica.origen === 'registrada' ? practica.siembraRegistrada : null;
  const siembra = siembraEscenario || registrada || base;
  const despPlanes = diferenciaDias(base, siembra);
  practica.desplazamientoDias = registrada ? diferenciaDias(registrada, siembra) : despPlanes;

  const otros = planesDoc.planes.filter((p) => p.id !== 'actual');
  const anioBase = hoy.mes >= 7 ? hoy.anio + 1 : hoy.anio; // el próximo ciclo de temporal
  const r = compararEstrategias({ planes: [practica, ...otros], reglas, clima, anioBase, desplazamientoDias: despPlanes });
  // «Más meses» se decide solo entre las tres opciones principales
  const principalesIds = new Set(IDS_PRINCIPALES);
  const max = Math.max(...r.estrategias.filter((e) => principalesIds.has(e.id)).map((e) => e.cobertura.meses));
  const nMax = r.estrategias.filter((e) => principalesIds.has(e.id) && e.cobertura.meses === max).length;
  const nPrincipales = r.estrategias.filter((e) => principalesIds.has(e.id)).length;

  const estrategias = r.estrategias.map((e) => {
    const p = e.plan;
    const principal = principalesIds.has(e.id);
    return {
      ...e,
      nombre: p.nombre,
      principal,
      esActual: e.id === 'actual',
      esPlantilla: !!p.esPlantilla,
      origen: p.origen || 'plan_publicado',
      motivoPlantilla: p.motivoPlantilla || null,
      declarados: p.declarados || [],
      sinReglas: p.sinReglas || [],
      escenarioIlustrativo: !!p.escenarioIlustrativo,
      masMeses: principal && e.cobertura.meses === max && nMax < nPrincipales,
      empateMeses: principal && e.cobertura.meses === max && nMax > 1 && nMax < nPrincipales,
      suelo: sueloParaPlan(p, reglas, sueloReglasId),
      beneficios: p.beneficios || [],
      riesgos: p.riesgos || [],
      faltantes: [...(p.supuestosPractica || []), ...(p.porConfirmar || [])],
      fuentes: p.fuentes || [],
      supuestos: p.trazabilidad || [],
    };
  });

  const ambito = planesDoc.ambito?.zonas || null;
  const completos = clima ? clima.temporadas.filter((t) => t.completa) : [];
  return {
    escenario: {
      siembra,
      siembraTexto: fechaTexto(siembra),
      base,
      registrada,
      origen: siembraEscenario && siembraEscenario !== (registrada || base) ? 'elegida' : registrada ? 'registrada' : 'plan',
      opciones: opcionesDeSiembra({ ventana: ventanaSiembra, base, registrada }),
      anioBase,
      desplazamientoDias: despPlanes,
    },
    ventana: r.ventana,
    zona: zona ? { id: zona.id, nombre: zona.nombre } : null,
    sinZona: !zona,
    fueraDeAmbito: !!(zona && ambito && !ambito.includes(zona.id)),
    notaAmbito: planesDoc.ambito?.nota || null,
    clima: clima ? {
      periodo: { desde: completos[0]?.anio ?? null, hasta: completos[completos.length - 1]?.anio ?? null },
      aniosCompletos: completos.length,
      aniosIncompletos: clima.temporadas.length - completos.length,
      formato: clima.version,
      corte: clima.fuentes.lluvia.fechaCorte,
      lluvia: `${clima.fuentes.lluvia.producto} (${clima.fuentes.lluvia.parametro}, ${clima.fuentes.lluvia.unidades}, ${clima.fuentes.lluvia.resolucionAprox})`,
      temperatura: `${clima.fuentes.temperatura.producto} (${clima.fuentes.temperatura.parametro}, ${clima.fuentes.temperatura.resolucionAprox})`,
      via: clima.fuentes.lluvia.nombre,
      punto: clima.ubicacion,
      umbralDiaSecoMm: clima.definiciones.umbralDiaSecoMm,
      umbralCalorC: clima.definiciones.umbralCalorC,
    } : null,
    reglas: { version: reglas.version, rachaRelevanteDias: reglas.rachaRelevanteDias, episodioCalorRelevanteDias: reglas.episodioCalorRelevanteDias, diasMinimosPorMes: r.ventana.diasMinimos },
    versiones: { planes: planesDoc.version, reglas: reglas.version, clima: clima?.version ?? null },
    principales: IDS_PRINCIPALES.map((id) => estrategias.find((e) => e.id === id)).filter(Boolean),
    secundarias: estrategias.filter((e) => !principalesIds.has(e.id)),
  };
}
