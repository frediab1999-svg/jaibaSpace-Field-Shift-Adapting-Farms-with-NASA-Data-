// SALIDA DE EJEMPLO del motor de comparación de estrategias.
//
// Sirve para que la pantalla «Opciones para tu parcela» funcione mientras el Rol 4 termina
// app/src/motor/estrategias.js. Tiene LA MISMA FORMA que debe devolver el motor (ver
// opciones-datos.js). Cuando el motor pase sus pruebas, este archivo deja de usarse.
//
// De dónde salen los números (no son inventados, pero tampoco los calcula la app):
//  - actual, cobertura y otro-grano: docs/rol-3-fuentes-y-rotaciones.md, secciones 7.1 a 7.3
//    (Umán, NASA GPM IMERG y MERRA-2, 1998–2025, opción A, cobertura sobre 24 meses).
//  - milpa-canavalia: plan «Nuevo enfoque», sección «Plan de cambios 1». Los 17 meses y los
//    puntajes se calcularon a mano con la fórmula del contrato (pesosPorPrioridad de
//    reglas.json). Falta que el motor los confirme.
//  - Textos de beneficios, riesgos, fuentes y por confirmar: app/data/planes.json, excepto
//    los de milpa-canavalia, que todavía no está en planes.json.
import * as reglasMod from '../../modules/strategies/reglas.js';
import * as catalogo from '../../modules/crops/catalogo.js';

const ZONA_EJEMPLO = 'yuc-noroeste';
const FUENTE_CLIMA = 'NASA GPM IMERG (lluvia) y MERRA-2 (calor) vía NASA POWER, 1998–2025, Noroeste de Yucatán (Umán)';

// Meses de los dos ciclos (enero del año 1 a diciembre del año 2): 1 = algún cultivo en pie 15 días o más.
const mesesDe = (cadena) => [...cadena].map((c) => c === '1');

const BASE = [
  {
    id: 'actual',
    esActual: true,
    criterios: {
      agua: { valor: 0.086, aniosAfectados: 14, deAnios: 28, etapa: 'floración y llenado del maíz' },
      calor: { valor: 0.011 },
      tierraCubierta: { meses: 10, de: 24, porMes: mesesDe('000001111100000001111100') },
      nitrogeno: 'bajo',
      ingreso: 'medio',
    },
    puntajes: { agua: 0.722, suelo: 0.474, nitrogeno: 0.369, ingreso: 0.528 },
    validado: true,
  },
  {
    id: 'milpa-canavalia',
    esActual: false,
    criterios: {
      agua: { valor: 0.086, aniosAfectados: 14, deAnios: 28, etapa: 'floración y llenado del maíz' },
      calor: { valor: 0.011 },
      tierraCubierta: { meses: 17, de: 24, porMes: mesesDe('000001111111111001111111') },
      nitrogeno: 'medio',
      ingreso: 'medio',
    },
    puntajes: { agua: 0.815, suelo: 0.705, nitrogeno: 0.653, ingreso: 0.632 },
    validado: false,
    textos: {
      nombre: 'Milpa con canavalia intercalada',
      beneficios: [
        'Cosechas tu maíz los dos años',
        'La canavalia cubre el suelo de julio a marzo, también en secas',
        'La canavalia fija nitrógeno, resiste la sequía y crece en suelos pobres y secos',
      ],
      riesgos: [
        'Si la canavalia se siembra el mismo día que el maíz, compite con él: en un estudio en Yucatán una leguminosa sembrada junto con el maíz le bajó 59 % la cosecha',
        'La semilla de canavalia es tóxica: no se come ni se da a los animales sin tratarla',
        'De abril a mediados de junio el suelo queda sin cultivo',
        'El modelo mide solo el maíz: el frijol y la calabaza de la milpa no entran en el cálculo',
      ],
      faltantes: [
        'El día exacto para sembrar la canavalia (30 días después del maíz) no tiene fuente oficial en Yucatán: confírmalo con tu técnico',
        'Que la canavalia siga en pie hasta marzo en suelo pedregoso',
      ],
      fuentes: [
        'Terra Latinoamericana: leguminosas de cobertera (canavalia y mucuna asociadas al maíz o como descanso corto) en el sur de Yucatán',
        'PCCMCA: canavalia sembrada a los 30 días sin efecto en el rendimiento del maíz',
        'Tropical and Subtropical Agroecosystems (2011): la siembra simultánea con el maíz bajó su rendimiento 59 %',
        'F09 USDA-NRCS Plant Guide Canavalia ensiformis',
      ],
    },
  },
  {
    id: 'cobertura',
    esActual: false,
    criterios: {
      agua: { valor: 0.086, aniosAfectados: 14, deAnios: 28, etapa: 'floración y llenado del maíz (segundo año)' },
      calor: { valor: 0.011 },
      tierraCubierta: { meses: 15, de: 24, porMes: mesesDe('000001111111111001111100') },
      nitrogeno: 'alto',
      ingreso: 'bajo',
    },
    puntajes: { agua: 0.803, suelo: 0.717, nitrogeno: 0.811, ingreso: 0.449 },
    validado: true,
  },
  {
    id: 'otro-grano',
    esActual: false,
    criterios: {
      agua: { valor: 0.087, aniosAfectados: 18, deAnios: 28, etapa: 'floración y formación del grano de la soya' },
      calor: { valor: 0.011 },
      tierraCubierta: { meses: 9, de: 24, porMes: mesesDe('000001111000000001111100') },
      nitrogeno: 'medio',
      ingreso: 'alto',
    },
    puntajes: { agua: 0.815, suelo: 0.605, nitrogeno: 0.636, ingreso: 0.848 },
    validado: true,
    riesgosExtra: [
      'Nunca desmontes monte para sembrarla: en la región la soya está ligada a la pérdida de selva',
      'En 2026 a la soya de Los Chenes le fue mal (Por Esto, 2026)',
    ],
    ocultarSiAptitud: 'baja',
  },
];

/** Aptitud del suelo de la parcela para un cultivo según reglas.json (o null si no sabemos el suelo). */
function aptitud(parcela, cultivoReglas) {
  const suelo = catalogo.suelos().find((s) => s.id === parcela?.tipoSueloId);
  const clave = suelo?.reglasId;
  const r = reglasMod.reglasSync();
  if (!clave || !r?.suelos?.[clave]) return { valor: null, suelo };
  return { valor: r.suelos[clave].aptitud?.[cultivoReglas] || null, suelo };
}

function textoPorQue(e) {
  const a = e.criterios.agua;
  const t = e.criterios.tierraCubierta;
  return `En ${a.aniosAfectados} de los últimos ${a.deAnios} años (1998–2025) hubo 5 días o más sin lluvia durante la ${a.etapa}. `
    + `Con esta opción la tierra queda cubierta ${t.meses} de ${t.de} meses y desnuda ${t.de - t.meses}.`;
}

/**
 * Misma firma que el motor: (parcela, { prioridad }) → estrategias ordenadas.
 * @returns {Promise<object[]>}
 */
export async function compararEjemplo(parcela, { prioridad = 'agua' } = {}) {
  const [planes, reglas] = await Promise.all([reglasMod.planes(), reglasMod.reglas()]);
  const tolerancia = reglas.toleranciaEmpate?.total ?? 0.02;
  const lista = BASE.map((b) => {
    const plan = planes.planes.find((p) => p.id === b.id);
    const t = b.textos || {};
    let visible = true;
    let motivoOculto = null;
    let avisoSuelo = null;
    if (b.ocultarSiAptitud) {
      const ap = aptitud(parcela, 'soya');
      if (ap.valor === b.ocultarSiAptitud) {
        visible = false;
        motivoOculto = `El INIFAP la ubica en suelos rojos y profundos (k'ankab y yaax-hom). Tu parcela es ${ap.suelo ? `${ap.suelo.name}, ${ap.suelo.descripcion.toLowerCase()}` : 'de otro suelo'}.`;
      } else if (ap.valor === null) {
        avisoSuelo = 'No sabemos el suelo de tu parcela: la soya solo conviene en tierra roja y profunda.';
      }
    }
    const e = {
      id: b.id,
      nombre: t.nombre || plan?.nombre || b.id,
      esActual: b.esActual,
      visible,
      motivoOculto,
      avisoSuelo,
      criterios: b.criterios,
      puntajes: b.puntajes,
      beneficios: t.beneficios || plan?.beneficios || [],
      riesgos: [...(t.riesgos || plan?.riesgos || []), ...(b.riesgosExtra || [])],
      faltantes: [...(t.faltantes || plan?.porConfirmar || []), ...(b.validado ? [] : ['Los meses cubiertos y el puntaje de esta opción se calcularon a mano; falta que los confirme el motor de la app'])],
      fuentes: [FUENTE_CLIMA, ...(t.fuentes || plan?.fuentes || [])],
      advertenciaIngreso: planes.advertenciaIngreso,
    };
    e.porQue = textoPorQue(e);
    return e;
  });

  // Orden según la prioridad (las ocultas no compiten) y empates dentro de la tolerancia
  const visibles = lista.filter((e) => e.visible).sort((a, b) => b.puntajes[prioridad] - a.puntajes[prioridad]);
  visibles.forEach((e, i) => {
    e.posicion = i + 1;
    e.empateCon = visibles.filter((o) => o !== e && Math.abs(o.puntajes[prioridad] - e.puntajes[prioridad]) <= tolerancia).map((o) => o.id);
  });
  const ocultas = lista.filter((e) => !e.visible).map((e) => ({ ...e, posicion: null, empateCon: [] }));
  return [...visibles, ...ocultas];
}

export const ZONA_DE_LOS_NUMEROS = ZONA_EJEMPLO;
