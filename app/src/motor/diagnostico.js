// DIAGNÓSTICO DE LA TIERRA y orden de las estrategias.
//
// Funciones puras (sin pantalla ni almacenamiento), probadas en tests/diagnostico.test.js.
// Aquí se conecta el cuestionario con lo que la app sugiere: el mismo motor de comparación
// (estrategias.js) calcula los números, y este módulo decide CUÁL se sugiere y POR QUÉ.
//
// Dos perfiles de la historia del MVP:
//  - Pablo: tierra que se ha sembrado muchas veces seguidas. Se puntúa el desgaste.
//  - Juan: tierra que nunca se ha sembrado (monte, acahual, potrero). No se puntúa: es «nueva».
//
// Los puntos y los cortes son una REGLA DEL MODELO (decisión 0004), no una medición del suelo:
// se muestran como tal y quedan por validar con el Rol 3 y con técnicos de la zona.
import { eventosRelevantes, exposicionEtapa } from './estrategias.js';

export const ESTADOS = {
  nueva: { id: 'nueva', nombre: 'Tierra nueva', corto: 'Nueva', color: '#218380', letrero: 'bien' },
  buena: { id: 'buena', nombre: 'Tierra en buen estado', corto: 'En buen estado', color: '#218380', letrero: 'bien' },
  cansandose: { id: 'cansandose', nombre: 'Tu tierra se está cansando', corto: 'Se está cansando', color: '#d9902a', letrero: 'atencion' },
  cansada: { id: 'cansada', nombre: 'Tu tierra está cansada', corto: 'Cansada', color: '#d81159', letrero: 'riesgo' },
  sin_dato: { id: 'sin_dato', nombre: 'Falta saber cómo está tu tierra', corto: 'Sin diagnóstico', color: '#9a8f7c', letrero: 'atencion' },
};

/** Opciones de las preguntas nuevas del cuestionario (las demás están en catalogos/listas.json). */
export const PREGUNTAS = {
  descanso: [
    { id: 'nunca', name: 'Nunca la dejo descansar' },
    { id: 'a_veces', name: 'A veces, un año' },
    { id: 'seguido', name: 'Sí, seguido' },
  ],
  quema: [
    { id: 'si', name: 'Sí, quemo' },
    { id: 'a_veces', name: 'A veces' },
    { id: 'no', name: 'No quemo' },
  ],
  senales: [
    { id: 'rinde_menos', name: 'Cada año cosecho menos' },
    { id: 'mas_maleza', name: 'Sale más maleza' },
    { id: 'suelo_duro', name: 'El suelo está más duro' },
    { id: 'se_lava', name: 'La lluvia se lleva la tierra' },
  ],
  desmonte: [
    { id: 'todo', name: 'Pienso tumbar todo' },
    { id: 'parte', name: 'Solo una parte' },
    { id: 'no_se', name: 'Todavía no sé' },
  ],
  objetivo: [
    { id: 'comer', name: 'Comer de mi milpa', prioridad: 'agua' },
    { id: 'vender', name: 'Vender mi cosecha', prioridad: 'ingreso' },
    { id: 'cuidar', name: 'Cuidar mi tierra', prioridad: 'suelo' },
  ],
};

export const prioridadDeObjetivo = (objetivo) => PREGUNTAS.objetivo.find((o) => o.id === objetivo)?.prioridad || null;

// Regla de puntos (decisión 0004). Cada factor dice cuánto suma y con qué palabras se explica.
const PUNTOS = {
  aniosSeguidos: { '2-3': [1, 'lleva dos o tres años seguidos sembrada'], '4+': [2, 'lleva cuatro o más años seguidos sembrada'] },
  descanso: { nunca: [1, 'no descansa entre siembras'] },
  quema: { si: [1, 'se quema antes de sembrar'], a_veces: [1, 'a veces se quema'] },
  resultado: { regular: [1, 'la última cosecha fue regular'], malo: [2, 'la última cosecha fue mala'] },
};
const TEXTO_SENAL = { rinde_menos: 'cada año rinde menos', mas_maleza: 'sale más maleza', suelo_duro: 'el suelo está más duro', se_lava: 'la lluvia se lleva la tierra' };
export const CORTES = { cansandose: 3, cansada: 5 };

/**
 * @param {{ usadaAntes?: boolean|null, aniosSeguidos?: string, descanso?: string, quema?: string,
 *           resultado?: string|null, senales?: string[], usoPrevio?: string, desmonte?: string }} r
 * @returns {{ id, nombre, corto, color, letrero, puntos:number|null, razones:string[], detalle:Array<{factor, puntos, texto}>, faltan:string[] }}
 */
export function estadoTierra(r = {}) {
  if (r.usadaAntes === false) {
    const razones = [];
    const uso = { monte: 'hoy es monte', acahual: 'hoy es acahual', potrero: 'hoy es potrero', solar: 'hoy es solar o huerto' }[r.usoPrevio];
    razones.push(uso ? `Nunca se ha sembrado: ${uso}` : 'Nunca se ha sembrado');
    return { ...ESTADOS.nueva, puntos: null, razones, detalle: [], faltan: [] };
  }
  if (r.usadaAntes !== true) return { ...ESTADOS.sin_dato, puntos: null, razones: [], detalle: [], faltan: ['usadaAntes'] };

  const detalle = [];
  const faltan = [];
  for (const factor of ['aniosSeguidos', 'descanso', 'quema', 'resultado']) {
    const v = r[factor];
    if (!v || v === 'no_se') { faltan.push(factor); continue; }
    const p = PUNTOS[factor][v];
    if (p) detalle.push({ factor, puntos: p[0], texto: p[1] });
  }
  const senales = (r.senales || []).filter((s) => TEXTO_SENAL[s]);
  senales.forEach((s, i) => detalle.push({ factor: 'senal', puntos: i < 2 ? 1 : 0, texto: TEXTO_SENAL[s] }));
  const puntos = detalle.reduce((s, d) => s + d.puntos, 0);
  const id = puntos >= CORTES.cansada ? 'cansada' : puntos >= CORTES.cansandose ? 'cansandose' : 'buena';
  const razones = detalle.filter((d) => d.puntos > 0).sort((a, b) => b.puntos - a.puntos).map((d) => d.texto);
  return { ...ESTADOS[id], puntos, razones, detalle, faltan };
}

/** Una frase con las razones: «lleva cuatro o más años seguidos sembrada, no descansa y se quema». */
export function fraseRazones(razones, max = 3) {
  const r = razones.slice(0, max);
  if (!r.length) return '';
  const t = r.length === 1 ? r[0] : `${r.slice(0, -1).join(', ')} y ${r[r.length - 1]}`;
  return t.charAt(0).toUpperCase() + t.slice(1);
}

// =====================================================================
// Qué estrategia se sugiere
// =====================================================================

export const IDS = ['actual', 'milpa-canavalia', 'cobertura'];

/**
 * Orden y estrategia sugerida según el estado de la tierra, la prioridad y el suelo.
 * Las tres estrategias principales SIEMPRE se muestran (el reto pide comparar al menos tres,
 * incluida la actual): aquí solo se decide el orden y cuál lleva el sello «Sugerida».
 * @param {{ estado: object, prioridad?: string|null, sueloReglasId?: string|null, desmonte?: string|null, usoPrevio?: string|null }} e
 */
export function sugerir({ estado, prioridad = null, sueloReglasId = null, desmonte = null, usoPrevio = null }) {
  const necesitaCosecha = prioridad === 'agua' || prioridad === 'ingreso';
  let orden;
  let sugerida;
  let razon;
  const notas = [];
  switch (estado.id) {
    case 'cansada':
      if (necesitaCosecha) {
        sugerida = 'milpa-canavalia';
        orden = ['milpa-canavalia', 'cobertura', 'actual'];
        razon = 'Tu tierra pide descanso, pero necesitas cosechar: esta opción conserva tu maíz y cubre la tierra con canavalia.';
        notas.push('Si puedes dejar un ciclo sin maíz, el ciclo de canavalia recupera la tierra más rápido.');
      } else {
        sugerida = 'cobertura';
        orden = ['cobertura', 'milpa-canavalia', 'actual'];
        razon = 'Tu tierra está cansada: un ciclo de canavalia la cubre y le devuelve nitrógeno antes de volver al maíz.';
      }
      break;
    case 'cansandose':
      sugerida = 'milpa-canavalia';
      orden = ['milpa-canavalia', 'cobertura', 'actual'];
      razon = 'Tu tierra empieza a cansarse: esta opción la cubre más meses sin dejar de cosechar maíz.';
      break;
    case 'buena':
      sugerida = 'milpa-canavalia';
      orden = ['milpa-canavalia', 'actual', 'cobertura'];
      razon = 'Tu tierra está bien: esta opción la mantiene así sin dejar de cosechar maíz.';
      break;
    case 'nueva':
      sugerida = 'milpa-canavalia';
      orden = ['milpa-canavalia', 'cobertura', 'actual'];
      razon = 'Empiezas con tierra nueva: cubrirla desde el primer ciclo evita que se canse como pasa al sembrar maíz solo año tras año.';
      notas.push('No quemes al abrir el terreno: la ceniza se va con las primeras lluvias y la tierra queda descubierta.');
      if ((usoPrevio === 'monte' || usoPrevio === 'acahual') && desmonte !== 'parte') notas.push('Deja franjas de monte entre las partes que siembres: frenan el agua y el viento, y guardan la humedad.');
      break;
    default:
      sugerida = null;
      orden = ['actual', 'milpa-canavalia', 'cobertura'];
      razon = 'Cuéntanos cómo está tu tierra para sugerirte una opción.';
  }
  // La soya es material secundario: solo con suelo rojo y profundo verificado, prioridad de ingreso
  // y nunca en tierra nueva (el INIFAP la plantea mecanizada; abrir monte para sembrarla no se sugiere).
  const mostrarSoya = prioridad === 'ingreso' && sueloReglasId === 'luvisol' && (estado.id === 'buena' || estado.id === 'cansandose');
  return { sugerida, orden, razon, notas, mostrarSoya };
}

/** Una línea de «Por qué te la sugerimos» para cada estrategia, según el estado. */
export function porQueEstrategia(id, { estado, sugerencia, esPlantilla = false }) {
  if (id === sugerencia.sugerida) return sugerencia.razon;
  if (id === 'actual') {
    if (estado.id === 'nueva') return 'Es lo que se hace normalmente al abrir monte: sirve para comparar.';
    return esPlantilla ? 'No registraste lo que siembras: usamos maíz cada año para comparar.' : 'Es lo que haces hoy: sirve para comparar.';
  }
  if (id === 'milpa-canavalia') return 'Si no puedes dejar un ciclo sin maíz, esta conserva tu cosecha y cubre la tierra.';
  if (id === 'cobertura') return estado.id === 'nueva'
    ? 'Si quieres preparar la tierra antes de tu primera cosecha, un ciclo de canavalia la cubre y le da nitrógeno.'
    : 'Si tu tierra se sigue cansando, un ciclo de canavalia la recupera más rápido, aunque ese año no cosechas maíz.';
  if (id === 'otro-grano') return 'Buscas vender y tu suelo es rojo y profundo: la soya es otro grano con comprador.';
  return '';
}

// =====================================================================
// Clima de la temporada y mejor fecha de siembra (para el diagnóstico y la predicción)
// =====================================================================

const tocaRango = (ev, anio, desde, hasta) => ev.inicio <= `${anio}-${hasta}` && ev.fin >= `${anio}-${desde}`;

/**
 * Dos o tres datos del clima de la temporada de lluvias, ya en palabras.
 * @returns {{ aniosRacha, aniosCalor, total, desde, hasta, medianaLluviaMm, rachaDias, calorDias, umbralCalorC } | null}
 */
export function climaDeTemporada(clima, reglas, { desde = '06-01', hasta = '10-31' } = {}) {
  if (!clima) return null;
  const completas = clima.temporadas.filter((t) => t.completa);
  if (!completas.length) return null;
  const rachaDias = reglas.rachaRelevanteDias;
  const calorDias = reglas.episodioCalorRelevanteDias;
  let aniosRacha = 0;
  let aniosCalor = 0;
  for (const t of completas) {
    if (t.rachas.some((r) => r.dias >= rachaDias && tocaRango(r, t.anio, desde, hasta))) aniosRacha++;
    if (t.episodiosCalor.some((e) => e.dias >= calorDias && tocaRango(e, t.anio, desde, hasta))) aniosCalor++;
  }
  return {
    aniosRacha, aniosCalor, total: completas.length,
    desde: completas[0].anio, hasta: completas[completas.length - 1].anio,
    medianaLluviaMm: clima.resumen?.medianaLluviaVentanaMm ?? null,
    rachaDias, calorDias, umbralCalorC: clima.definiciones?.umbralCalorC ?? 35,
  };
}

/** «la mayoría de los años», «casi la mitad»…: lo que significa una proporción, sin porcentajes. */
export function enPalabras(n, total) {
  if (!total) return '';
  const p = n / total;
  if (p === 0) return 'ningún año';
  if (p <= 0.15) return 'pocas veces';
  if (p <= 0.4) return 'algunos años';
  if (p <= 0.6) return 'casi la mitad de los años';
  if (p < 0.9) return 'la mayoría de los años';
  return 'casi todos los años';
}

/**
 * Cuántos años una racha seca tocó la etapa delicada del cultivo según la fecha de siembra.
 * Usa el mismo cálculo que la comparación (estrategias.js), así que los números coinciden.
 * @param {{ clima, reglas, fechas: string[], cultivo?: string }} e  fechas en 'MM-DD'
 * @returns {{ fechas: Array<{ valor, aniosConRacha, aniosEvaluados, proporcionDias }>, mejor: object|null, etapa: object|null }}
 */
export function exposicionPorFecha({ clima, reglas, fechas, cultivo = 'maiz' }) {
  const etapas = (reglas.cultivos?.[cultivo]?.etapas || []).filter((e) => e.sensibilidad === 'alta');
  if (!clima || !etapas.length) return { fechas: [], mejor: null, etapa: null };
  const desdeDia = Math.min(...etapas.map((e) => e.desdeDia));
  const hastaDia = Math.max(...etapas.map((e) => e.hastaDia));
  const eventos = eventosRelevantes(clima, 'rachas', reglas.rachaRelevanteDias);
  const lista = fechas.map((valor) => {
    const [mes, dia] = valor.split('-').map(Number);
    const r = exposicionEtapa(clima, { mesSiembra: mes, diaSiembra: dia, desdeDia, hastaDia, eventos });
    return { valor, aniosConRacha: r.aniosConCoincidencia, aniosEvaluados: r.aniosEvaluados, proporcionDias: r.proporcionDias };
  }).filter((f) => f.aniosEvaluados);
  // La mejor: menos años con racha; si empatan, menos días expuestos; si siguen empatadas, la más temprana
  const mejor = lista.slice().sort((a, b) => a.aniosConRacha - b.aniosConRacha || a.proporcionDias - b.proporcionDias || a.valor.localeCompare(b.valor))[0] || null;
  return { fechas: lista, mejor, etapa: { nombre: etapas.map((e) => e.nombre).join(' y '), desdeDia, hastaDia } };
}


