// Motor de "Predicción a futuro".
// IMPORTANTE (contexto-general-proyecto.md): la herramienta no promete rendimientos ni
// garantiza cosechas. Este motor no calcula probabilidad de éxito: junta señales con su
// evidencia (histórica, actual o ambas), su fuente y lo que falta confirmar.
import * as repos from '../storage/repos.js';
import * as catalogo from '../modules/crops/catalogo.js';
import * as climaMod from '../modules/climate/clima.js';
import * as reglasMod from '../modules/strategies/reglas.js';
import * as api from '../services/api/endpoints.js';
import { siembrasActuales } from '../modules/parcel/parcelas.js';
import { MESES, numero, sumarDias, fechaCorta } from '../shared/format.js';

export const UMBRALES = { atencion: 1 / 3, riesgo: 2 / 3 }; // umbral del prototipo, por confirmar con Rol 3
const nivelPorProporcion = (p) => (p >= UMBRALES.riesgo ? 'riesgo' : p >= UMBRALES.atencion ? 'atencion' : 'bien');
// Sin etapas documentadas la ventana es aproximada: no se marca más allá de "atención"
const tope = (n) => (n === 'riesgo' ? 'atencion' : n);

export const TIPO_TXT = {
  historico: 'Dato histórico',
  actual: 'Dato actual',
  ambos: 'Histórico y actual',
  sin: 'Sin dato todavía',
};

/** Cultivos a analizar: los sembrados ahora; si no hay, los de la última temporada; si no, maíz de referencia. */
function cultivosParaAnalizar(parcela) {
  const actuales = siembrasActuales(parcela.id);
  if (actuales.length) return { origen: 'lo que tienes sembrado ahora', lista: actuales.map((s) => ({ cultivoId: s.cultivoId, semillaId: s.semillaId, fecha: s.fecha })) };
  if (parcela.plan?.cultivos?.length) return { origen: 'lo que piensas sembrar', lista: parcela.plan.cultivos.map((c) => ({ cultivoId: c, semillaId: null, fecha: parcela.plan.mes ? { mes: parcela.plan.mes, dia: 15 } : null })) };
  const pasadas = repos.temporadasDe(parcela.id).filter((t) => t.estado === 'finalizada').sort((a, b) => b.anio - a.anio);
  if (pasadas.length) {
    const s = repos.siembrasDe(pasadas[0].id);
    if (s.length) return { origen: `lo que sembraste en ${pasadas[0].anio}`, lista: s.map((x) => ({ cultivoId: x.cultivoId, semillaId: x.semillaId, fecha: x.fecha?.mes ? x.fecha : null })) };
  }
  return { origen: 'referencia: maíz de temporal', lista: [{ cultivoId: 'maiz', semillaId: 'maiz-criollo', fecha: null }] };
}

function fechaSiembraDe(item) {
  if (item.fecha?.mes) return { mes: item.fecha.mes, dia: item.fecha.dia || 15, supuesta: !item.fecha.dia };
  const sem = item.semillaId ? catalogo.semilla(item.semillaId) : catalogo.semillas().find((s) => s.cultivoId === item.cultivoId);
  // planes.json usa el 15 de junio como fecha de siembra del productor de ejemplo
  return { mes: 6, dia: 15, supuesta: true, nota: sem ? 'fecha supuesta: 15 de junio, la de los planes de ejemplo' : null };
}

/** Ventana sensible del cultivo (o la ventana de resumen jun–ago si el cultivo no tiene reglas). */
function ventanaSensible(item, clima) {
  const c = catalogo.cultivo(item.cultivoId);
  const f = fechaSiembraDe(item);
  const etapa = c.reglasId ? reglasMod.etapaSensible(c.reglasId) : null;
  if (etapa) {
    const base = new Date(2026, f.mes - 1, f.dia);
    return {
      cultivo: c, fecha: f, etapa, generica: false,
      mesSiembra: f.mes, diaSiembra: f.dia, desdeDia: etapa.desdeDia, hastaDia: etapa.hastaDia,
      texto: `${etapa.nombre.toLowerCase()} (del ${fechaCorta(sumarDias(base, etapa.desdeDia))} al ${fechaCorta(sumarDias(base, etapa.hastaDia))})`,
    };
  }
  const v = clima.definiciones.ventanaResumen; // 06-01 a 08-31
  return {
    cultivo: c, fecha: f, etapa: null, generica: true,
    mesSiembra: Number(v.inicio.slice(0, 2)), diaSiembra: Number(v.inicio.slice(3)), desdeDia: 0, hastaDia: 91,
    texto: 'junio a agosto (las etapas de este cultivo están por confirmar)',
  };
}

/**
 * Solo los cultivos con etapas documentadas (reglas.json) se usan para medir exposición.
 * Si ninguno las tiene, se usa la ventana de resumen junio–agosto y se dice que es aproximada.
 */
function conEtapas(ventanas) {
  const con = ventanas.filter((v) => !v.generica);
  return con.length ? con : ventanas;
}
const sinEtapas = (ventanas) => [...new Set(ventanas.filter((v) => v.generica).map((v) => v.cultivo.name.toLowerCase()))];

function variableSequia(ventanas, clima, parcela, reglas) {
  const sueloCat = parcela.tipoSueloId ? catalogo.suelos().find((s) => s.id === parcela.tipoSueloId) : null;
  const ajuste = sueloCat?.reglasId ? reglas.suelos[sueloCat.reglasId]?.ajusteRachaDias || 0 : 0;
  const umbral = reglas.rachaRelevanteDias + ajuste;
  const resultados = conEtapas(ventanas).map((v) => ({ v, e: climaMod.exposicion(clima, { ...v, umbralRacha: umbral, minCalor: reglas.episodioCalorRelevanteDias }) }));
  const peor = resultados.sort((a, b) => b.e.conRacha - a.e.conRacha)[0];
  const { e, v } = peor;
  const prop = e.conRacha / e.total;
  const peores = e.detalle.filter((d) => d.racha).sort((a, b) => b.racha.dias - a.racha.dias).slice(0, 3);
  return {
    id: 'sequia',
    nombre: 'Rachas secas',
    icono: 'sol',
    nivel: v.generica ? tope(nivelPorProporcion(prop)) : nivelPorProporcion(prop),
    tipo: 'historico',
    frase: `En ${e.conRacha} de ${e.total} años hubo ${umbral} días o más sin lluvia mientras ${v.cultivo.name.toLowerCase()} estaba en ${v.etapa ? 'su etapa más delicada' : 'temporada'}.`,
    justificacion: {
      parrafos: [
        `Miramos ${v.texto}${v.fecha.supuesta ? ', con fecha de siembra supuesta del 15 de junio' : ''}.`,
        `Contamos un día seco cuando llovió menos de ${reglas.umbralDiaSecoMm} mm. Una racha cuenta si dura ${umbral} días o más${ajuste ? ` (tu suelo suma ${ajuste})` : ''}.`,
      ],
      lista: peores.map((d) => `${d.anio}: ${d.racha.dias} días seguidos sin lluvia (del ${fechaCorta(new Date(d.racha.inicio + 'T00:00'))} al ${fechaCorta(new Date(d.racha.fin + 'T00:00'))}).`),
      tituloLista: 'Los años más secos en esa etapa',
      barras: e.detalle.map((d) => ({ anio: d.anio, valor: d.racha ? d.racha.dias : 0, marca: !!d.racha })),
      barrasTitulo: 'Racha más larga en esa etapa, por año (días)',
      fuente: `${climaMod.fuenteTexto(clima)}. Etapas del cultivo: ${v.etapa ? 'FAO-56, FAO TM3, INIFAP' : 'resumen de junio a agosto'}.`,
      periodo: `${e.desde}–${e.hasta}`,
      n: `${e.total} temporadas completas`,
      porConfirmar: [`Umbral del prototipo: atención desde 1 de cada 3 años, riesgo desde 2 de cada 3 (Rol 3).`, ...(sinEtapas(ventanas).length ? [`Etapas de ${sinEtapas(ventanas).join(', ')}: aún no se miden aparte (Rol 3).`] : [])],
    },
  };
}

function variableCalor(ventanas, clima, reglas) {
  const resultados = conEtapas(ventanas).map((v) => ({ v, e: climaMod.exposicion(clima, { ...v, umbralRacha: reglas.rachaRelevanteDias, minCalor: reglas.episodioCalorRelevanteDias }) }));
  const peor = resultados.sort((a, b) => b.e.conCalor - a.e.conCalor)[0];
  const { e, v } = peor;
  const prop = e.conCalor / e.total;
  const anios = e.detalle.filter((d) => d.calor).map((d) => d.anio);
  return {
    id: 'calor',
    nombre: 'Calor fuerte',
    icono: 'sol',
    nivel: v.generica ? tope(nivelPorProporcion(prop)) : nivelPorProporcion(prop),
    tipo: 'historico',
    frase: `En ${e.conCalor} de ${e.total} años hubo ${reglas.episodioCalorRelevanteDias} días seguidos de ${reglas.umbralCalorC} °C o más en esa misma etapa.`,
    justificacion: {
      parrafos: [
        `Revisamos ${v.texto}.`,
        anios.length ? `Pasó en ${anios.join(', ')}.` : 'No pasó en ninguno de los años con datos.',
      ],
      lista: [],
      fuente: `${climaMod.fuenteTexto(clima)}. Temperatura máxima a 2 m (T2M_MAX), resolución aproximada de 50 km.`,
      periodo: `${e.desde}–${e.hasta}`,
      n: `${e.total} temporadas completas`,
      porConfirmar: ['La temperatura es regional (MERRA-2, ~50 km): no es una medición en tu parcela.'],
    },
  };
}

function variableLluvia(clima) {
  const l = climaMod.lluviaTemporada(clima);
  if (!l.ultimo || !l.mediana) return null;
  const rel = l.ultimo.mm / l.mediana;
  const nivel = rel >= 0.9 ? 'bien' : rel >= 0.7 ? 'atencion' : 'riesgo';
  const dif = Math.round(Math.abs(1 - rel) * 100);
  const comp = rel >= 1 ? `${dif} % más` : `${dif} % menos`;
  return {
    id: 'lluvia',
    nombre: 'Lluvia de temporada',
    icono: 'nube',
    nivel,
    tipo: 'ambos',
    frase: `En ${l.ultimo.anio} llovió ${comp} de lo normal entre junio y agosto (${numero(l.ultimo.mm, 0)} contra ${numero(l.mediana, 0)} mm).`,
    justificacion: {
      parrafos: [
        `Lo normal (la mediana de ${l.serie.length} años) es ${numero(l.mediana, 0)} mm de junio a agosto. El dato más reciente que publica el pipeline es ${l.ultimo.anio}.`,
        `Es una señal reciente, no un pronóstico: un año seco no hace que el siguiente también lo sea.`,
      ],
      lista: [],
      barras: l.serie.map((s, i) => ({ anio: s.anio, valor: s.mm, ultimo: i === l.serie.length - 1 })),
      barrasTitulo: 'Lluvia de junio a agosto por año (mm)',
      fuente: `${climaMod.fuenteTexto(clima)}. Parámetro IMERG_PRECTOT.`,
      periodo: `${l.serie[0].anio}–${l.ultimo.anio}`,
      n: `${l.serie.length} temporadas`,
      porConfirmar: ['Datos de la temporada actual: el corte del pipeline es el 31 de diciembre de 2025.'],
    },
  };
}

async function variableEscenario(zonaId) {
  const r = await climaMod.escenarios(zonaId);
  if (r.items.length) {
    const it = r.items[0];
    return {
      id: 'escenario', nombre: 'Clima que viene', icono: 'nube', nivel: 'sin_dato', tipo: 'actual',
      frase: `Hay un escenario publicado (${it.scenario || it.source}, ${it.period_start}–${it.period_end}). El motor aún no lo interpreta.`,
      justificacion: { parrafos: ['El servidor ya publica el conjunto, pero falta acordar cómo mostrarlo.'], lista: r.items.map((x) => `${x.source} ${x.scenario || ''} ${x.period_start}–${x.period_end}, versión ${x.version}`), fuente: 'GET /api/v1/climate/datasets?kind=projection', periodo: '', n: '', porConfirmar: ['Regla para traducir escenarios a señales (pendiente de aprobación).'] },
    };
  }
  return {
    id: 'escenario', nombre: 'Clima que viene', icono: 'nube', nivel: 'sin_dato', tipo: 'sin',
    frase: r.conexion ? 'El servidor todavía no publica escenarios climáticos para tu zona.' : 'Sin conexión: no pudimos preguntar al servidor por escenarios.',
    justificacion: {
      parrafos: ['Los escenarios de clima futuro están aprobados para el producto, pero su fuente y periodo aún no se definen. Cuando existan, aparecerán aquí como escenario, nunca como pronóstico de cosecha.'],
      lista: [], fuente: 'GET /api/v1/climate/datasets?zone_id=…&kind=projection', periodo: '', n: '', porConfirmar: ['Fuente, escenarios y periodos de proyección (Rol 2).'],
    },
  };
}

function variableSuelo(parcela, ventanas, reglas) {
  const s = parcela.tipoSueloId ? catalogo.suelos().find((x) => x.id === parcela.tipoSueloId) : null;
  if (!s || !s.reglasId) {
    return {
      id: 'suelo', nombre: 'Tu suelo', icono: 'semilla', nivel: 'sin_dato', tipo: parcela.sueloTexto ? 'actual' : 'sin',
      frase: parcela.sueloTexto ? `Escribiste “${parcela.sueloTexto}”. Aún no sabemos cómo se porta ese suelo con tus cultivos.` : 'No sabemos qué suelo tiene tu parcela. Puedes escribirlo al editarla.',
      justificacion: { parrafos: ['Si el suelo no se reconoce, se deja como dato faltante. No lo inventamos.'], lista: [], fuente: 'Catálogo de suelos propuesto (INEGI/INIFAP)', periodo: '', n: '', porConfirmar: s?.porConfirmar || ['Aptitud de más suelos locales (Rol 3).'] },
    };
  }
  const aptos = ventanas.map((v) => ({ c: v.cultivo, apt: v.cultivo.reglasId ? reglas.suelos[s.reglasId]?.aptitud?.[v.cultivo.reglasId] : null })).filter((x) => x.apt);
  if (!aptos.length) {
    return {
      id: 'suelo', nombre: 'Tu suelo', icono: 'semilla', nivel: 'sin_dato', tipo: 'actual',
      frase: `Tu suelo es ${s.name} (${s.descripcion.toLowerCase()}), pero no hay aptitud documentada para estos cultivos.`,
      justificacion: { parrafos: [reglas.suelos[s.reglasId]?.nota || ''], lista: [], fuente: s.source, periodo: '', n: '', porConfirmar: ['Aptitud de frijol, calabaza y chile por suelo (Rol 3).'] },
    };
  }
  const peor = aptos.sort((a, b) => ({ alta: 3, media: 2, baja: 1 }[a.apt] - { alta: 3, media: 2, baja: 1 }[b.apt]))[0];
  const nivel = { alta: 'bien', media: 'atencion', baja: 'riesgo' }[peor.apt];
  return {
    id: 'suelo', nombre: 'Tu suelo', icono: 'semilla', nivel, tipo: 'actual',
    frase: `${s.name}: aptitud ${peor.apt} para ${peor.c.name.toLowerCase()}.`,
    justificacion: {
      parrafos: [`Escribiste “${parcela.sueloTexto}” y lo reconocimos como ${s.name} (${reglas.suelos[s.reglasId].nombre}).`, reglas.suelos[s.reglasId].nota || ''],
      lista: aptos.map((a) => `${a.c.name}: aptitud ${a.apt}`),
      fuente: s.source, periodo: '', n: '', porConfirmar: reglas.suelos.porConfirmar || [],
    },
  };
}

function variablePlagas(parcela) {
  const temporadas = repos.temporadas.todos().filter((t) => t.estado === 'finalizada' && t.causa === 'plaga');
  const enEsta = temporadas.filter((t) => t.parcelaId === parcela.id);
  const eliminadas = repos.siembras.todos().filter((s) => s.eliminadaEn && s.motivo?.motivoId === 'plaga');
  const actuales = eliminadas.filter((s) => s.parcelaId === parcela.id && repos.temporadaEnCurso(parcela.id)?.id === s.temporadaId);
  const tipo = actuales.length && temporadas.length ? 'ambos' : actuales.length ? 'actual' : temporadas.length || eliminadas.length ? 'historico' : 'sin';
  const total = temporadas.length + eliminadas.length;
  const nivel = actuales.length || enEsta.length >= 2 ? 'riesgo' : total ? 'atencion' : 'sin_dato';
  const lista = [
    ...temporadas.map((t) => `${t.anio}, ${repos.parcelas.porId(t.parcelaId)?.nombre || 'otra parcela'}: la cosecha se afectó por plaga${t.causaNota ? ` (${t.causaNota})` : ''}.`),
    ...eliminadas.map((s) => `${catalogo.semilla(s.semillaId)?.name || catalogo.cultivo(s.cultivoId).name} en ${repos.parcelas.porId(s.parcelaId)?.nombre || 'otra parcela'}: la quitaste por plaga${s.motivo?.nota ? ` (${s.motivo.nota})` : ''}.`),
  ];
  return {
    id: 'plagas', nombre: 'Plagas y enfermedades', icono: 'plaga', nivel, tipo,
    frase: total ? `Has reportado plagas ${total === 1 ? 'una vez' : `${total} veces`} en tus milpas${actuales.length ? ', una de ellas esta temporada' : ''}.` : 'No has reportado plagas. Si aparece alguna, anótala al quitar una semilla o al cerrar la temporada.',
    justificacion: {
      parrafos: ['Esta señal sale de lo que tú registras: cosechas afectadas por plaga y semillas que quitaste por plaga, en esta y en tus otras parcelas.'],
      lista, tituloLista: lista.length ? 'Lo que has reportado' : '',
      fuente: 'Tu historial en este teléfono (temporadas y motivos de eliminación).', periodo: '', n: `${total} reportes`,
      porConfirmar: ['El servidor aún no agrega plagas por zona (perceived_cause no se resume en /statistics).'],
    },
  };
}

function variableOtrasMilpas(parcela, ventanas) {
  const ids = new Set(ventanas.map((v) => v.cultivo.id));
  const fin = repos.temporadas.todos().filter((t) => t.estado === 'finalizada' && t.resultado && t.resultado !== 'pendiente');
  const conCultivo = fin.filter((t) => repos.siembrasDe(t.id).some((s) => ids.has(s.cultivoId)));
  if (!conCultivo.length) {
    return {
      id: 'milpas', nombre: 'Tus otras milpas', icono: 'cosecha', nivel: 'sin_dato', tipo: 'sin',
      frase: 'Todavía no hay cosechas guardadas con estos cultivos. Cuando cierres una, contará aquí.',
      justificacion: { parrafos: ['Registra temporadas pasadas en Información para que esta señal tenga con qué compararse.'], lista: [], fuente: 'Tu historial en este teléfono.', periodo: '', n: '0 temporadas', porConfirmar: [] },
    };
  }
  const cuenta = { bueno: 0, regular: 0, malo: 0 };
  conCultivo.forEach((t) => { cuenta[t.resultado] = (cuenta[t.resultado] || 0) + 1; });
  const n = conCultivo.length;
  const nivel = cuenta.malo / n >= 0.5 ? 'riesgo' : cuenta.malo + cuenta.regular > 0 ? 'atencion' : 'bien';
  const causas = {};
  conCultivo.filter((t) => t.causa).forEach((t) => { causas[t.causa] = (causas[t.causa] || 0) + 1; });
  const causaTop = Object.entries(causas).sort((a, b) => b[1] - a[1])[0];
  const otras = new Set(conCultivo.filter((t) => t.parcelaId !== parcela.id).map((t) => t.parcelaId)).size;
  const anioActual = new Date().getFullYear();
  return {
    id: 'milpas', nombre: 'Tus otras milpas', icono: 'cosecha', nivel,
    tipo: conCultivo.some((t) => t.anio >= anioActual) ? 'ambos' : 'historico',
    frase: `De ${n} ${n === 1 ? 'temporada' : 'temporadas'} con estos cultivos: ${cuenta.bueno} buena${cuenta.bueno === 1 ? '' : 's'}, ${cuenta.regular} regular${cuenta.regular === 1 ? '' : 'es'} y ${cuenta.malo} mala${cuenta.malo === 1 ? '' : 's'}.`,
    justificacion: {
      parrafos: [
        `Juntamos esta parcela y ${otras ? `${otras} ${otras === 1 ? 'parcela más' : 'parcelas más'}` : 'ninguna otra'} donde sembraste lo mismo.`,
        causaTop ? `Lo que más te ha afectado: ${catalogo.listas().causasPercibidas.find((c) => c.id === causaTop[0])?.name.toLowerCase() || causaTop[0]} (${causaTop[1]} ${causaTop[1] === 1 ? 'vez' : 'veces'}).` : '',
      ].filter(Boolean),
      lista: conCultivo.sort((a, b) => b.anio - a.anio).slice(0, 5).map((t) => `${t.anio}, ${repos.parcelas.porId(t.parcelaId)?.nombre || 'parcela'}: ${t.resultado}${t.causa ? `, ${catalogo.listas().causasPercibidas.find((c) => c.id === t.causa)?.name.toLowerCase() || t.causa}` : ''}.`),
      tituloLista: 'Tus temporadas',
      fuente: 'Tu historial en este teléfono (RF-08).', periodo: `${Math.min(...conCultivo.map((t) => t.anio))}–${Math.max(...conCultivo.map((t) => t.anio))}`, n: `${n} temporadas`, porConfirmar: [],
    },
  };
}

async function variableZona(zona, ventanas) {
  const anio = new Date().getFullYear() - 1;
  const crop = ventanas[0].cultivo.id;
  let r = null;
  let error = null;
  try { r = await api.estadisticas({ zoneId: zona.id, cropId: crop, seasonYear: anio }); } catch (e) { error = e; }
  const base = { id: 'zona', nombre: 'Productores de tu zona', icono: 'cosecha' };
  if (error || !r) {
    return { ...base, nivel: 'sin_dato', tipo: 'sin', frase: 'Sin conexión con el servidor: no pudimos traer lo que reportan en tu zona.', justificacion: { parrafos: ['Las estadísticas colectivas solo existen en el servidor y se calculan con contribuciones anónimas consentidas.'], lista: [], fuente: `GET /api/v1/statistics?zone_id=${zona.id}&crop_id=${crop}&season_year=${anio}`, periodo: String(anio), n: '', porConfirmar: [] } };
  }
  if (r.status === 'insufficient_sample') {
    return { ...base, nivel: 'sin_dato', tipo: 'actual', frase: `Aún no hay suficientes registros de ${ventanas[0].cultivo.name.toLowerCase()} en ${climaMod.NOMBRE_CORTO_ZONA[zona.id] || zona.nombre} para ${anio}.`, justificacion: { parrafos: ['Para proteger a cada productor, el servidor solo publica resultados cuando hay un mínimo de registros (MIN_STATS_SAMPLE_SIZE, 10 por defecto).'], lista: [], fuente: 'GET /api/v1/statistics', periodo: String(anio), n: 'menos del mínimo', porConfirmar: [] } };
  }
  const val = (m) => r.items.find((i) => i.metric === `outcome_${m}_count`)?.value || 0;
  const n = r.record_count || 0;
  const malos = val('poor') / (n || 1);
  return {
    ...base,
    nivel: malos >= 0.5 ? 'riesgo' : malos >= 0.25 ? 'atencion' : 'bien',
    tipo: 'actual',
    frase: `En ${anio}, ${n} productores reportaron: ${val('good')} bien, ${val('regular')} regular y ${val('poor')} mal.`,
    justificacion: { parrafos: [r.items[0]?.method || ''], lista: [], fuente: 'GET /api/v1/statistics (contribuciones consentidas)', periodo: String(anio), n: `${n} registros`, porConfirmar: [] },
  };
}

/** Referencia oficial (no pronóstico) cuando existe en planes.json. */
async function referenciaMunicipal(zona, ventanas) {
  if (!ventanas.some((v) => v.cultivo.id === 'maiz')) return null;
  const planes = await reglasMod.planes();
  const texto = planes.planes.flatMap((p) => p.riesgos).find((t) => /t\/ha/.test(t));
  const m = texto && texto.match(/En (\S+) el maíz de temporal rindió ([\d.]+) t\/ha en (\d{4}) y ([\d.]+) t\/ha en (\d{4})/);
  if (!m) return null;
  // La cifra es de un municipio: solo se muestra en la zona cuyo punto de clima está en ese municipio
  const municipio = catalogo.municipios().find((x) => x.zonaId === zona.id);
  if (!municipio || municipio.name !== m[1]) return null;
  return { lugar: m[1], a1: { t: Number(m[2]), anio: m[3] }, a2: { t: Number(m[4]), anio: m[5] }, fuente: 'F16 SADER/DGSIAP, Cierre de la Producción Agrícola 2024 y 2025 (maíz grano, temporal). Es el promedio del municipio, no de una parcela.' };
}

const ORDEN = { riesgo: 0, atencion: 1, bien: 2, sin_dato: 3 };

export async function analizar(parcela) {
  await Promise.all([climaMod.zonas(), reglasMod.reglas()]);
  const reglas = reglasMod.reglasSync();
  const zona = climaMod.zonaPorId(parcela.zonaId) || climaMod.zonaPorDefecto();
  const clima = await climaMod.clima(zona.id);
  const cultivos = cultivosParaAnalizar(parcela);
  const ventanas = cultivos.lista.map((c) => ventanaSensible(c, clima));

  const variables = [
    variableSequia(ventanas, clima, parcela, reglas),
    variableCalor(ventanas, clima, reglas),
    variableLluvia(clima),
    await variableEscenario(zona.id),
    variableSuelo(parcela, ventanas, reglas),
    variablePlagas(parcela),
    variableOtrasMilpas(parcela, ventanas),
    await variableZona(zona, ventanas),
  ].filter(Boolean);

  const conDato = variables.filter((v) => v.nivel !== 'sin_dato');
  const aFavor = conDato.filter((v) => v.nivel === 'bien').length;
  const riesgos = conDato.filter((v) => v.nivel === 'riesgo').length;
  const atenciones = conDato.filter((v) => v.nivel === 'atencion').length;
  const nivel = riesgos >= 2 ? 'riesgo' : riesgos || atenciones ? 'atencion' : 'bien';
  const peor = conDato.slice().sort((a, b) => ORDEN[a.nivel] - ORDEN[b.nivel])[0];

  return {
    parcela,
    zona,
    zonaAsignada: !!parcela.zonaId,
    cultivosOrigen: cultivos.origen,
    ventanas,
    variables,
    resumen: { aFavor, total: conDato.length, nivel, peor: peor ? { id: peor.id, nombre: peor.nombre, nivel: peor.nivel } : null },
    referencia: await referenciaMunicipal(zona, ventanas),
    fuenteClima: climaMod.fuenteTexto(clima),
    generadoEn: new Date().toISOString(),
  };
}

/** Resumen compacto para guardar como "lo que decía la predicción" en la temporada. */
export function instantanea(analisis) {
  return {
    nivel: analisis.resumen.nivel,
    aFavor: analisis.resumen.aFavor,
    total: analisis.resumen.total,
    variables: analisis.variables.map((v) => ({ id: v.id, nombre: v.nombre, nivel: v.nivel, frase: v.frase })),
  };
}

export const FRASE_NIVEL = {
  bien: 'Pinta bien. Los datos están de tu lado.',
  atencion: 'Hay señales que conviene cuidar.',
  riesgo: 'Ojo: varias señales están en contra.',
};

export { MESES };
