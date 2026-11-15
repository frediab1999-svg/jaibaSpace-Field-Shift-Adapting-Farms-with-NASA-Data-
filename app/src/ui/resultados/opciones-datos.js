// De dónde saca la pantalla «Opciones para tu parcela» sus números: del motor, en el teléfono.
//
// Junta lo que el productor registró (IndexedDB) con los datos publicados (paquete del
// servidor o respaldo local; ver shared/datos.js) y se lo pasa a motor/comparacion.js, que
// no conoce la pantalla ni el almacenamiento. Aquí no hay ningún número fijo.
import * as repos from '../../storage/repos.js';
import * as catalogo from '../../modules/crops/catalogo.js';
import * as climaMod from '../../modules/climate/clima.js';
import { climaDeParcela } from '../../modules/climate/climaPunto.js';
import * as reglasMod from '../../modules/strategies/reglas.js';
import { armarComparacion } from '../../motor/comparacion.js';
import { origenDatos } from '../../shared/datos.js';
import { sueloDeParcela, diagnosticoDe } from '../../modules/parcel/tierra.js';
import { porQueEstrategia } from '../../motor/diagnostico.js';
import { hoy } from '../../shared/format.js';

/**
 * Lo que el productor declaró para su parcela, de lo más reciente a lo más viejo:
 * la temporada en curso, la última temporada cerrada o, si la parcela es nueva, lo que piensa sembrar.
 */
export function practicaDeclarada(parcela) {
  const temporadas = repos.temporadasDe(parcela.id).slice().sort((a, b) => b.anio - a.anio);
  const enCurso = temporadas.find((t) => t.estado === 'en_curso' || t.estado === 'planeada');
  for (const t of [enCurso, ...temporadas.filter((x) => x !== enCurso)].filter(Boolean)) {
    const siembras = repos.siembrasDe(t.id);
    if (!siembras.length) continue;
    return {
      temporadaAnio: t.anio,
      origen: t.estado === 'finalizada' ? 'ultima_temporada' : 'temporada_en_curso',
      declaradas: siembras.map((s) => {
        const c = catalogo.cultivo(s.cultivoId);
        return { nombre: c.name, reglasId: c.reglasId || null, fecha: s.fecha || null };
      }),
    };
  }
  // Lo que dijo en el cuestionario que siembra hoy (si todavía no hay temporadas registradas)
  if (parcela.practica?.cultivos?.length) {
    return {
      temporadaAnio: null,
      origen: 'cuestionario',
      declaradas: parcela.practica.cultivos.map((id) => {
        const c = catalogo.cultivo(id);
        return { nombre: c.name, reglasId: c.reglasId || null, fecha: parcela.practica.mes ? { mes: parcela.practica.mes, dia: null, precision: 'mes' } : null };
      }),
    };
  }
  if (parcela.plan?.cultivos?.length) {
    return {
      temporadaAnio: null,
      origen: 'plan_de_la_parcela',
      declaradas: parcela.plan.cultivos.map((id) => {
        const c = catalogo.cultivo(id);
        return { nombre: c.name, reglasId: c.reglasId || null, fecha: parcela.plan.mes ? { mes: parcela.plan.mes, dia: null, precision: 'mes' } : null };
      }),
    };
  }
  return { temporadaAnio: null, origen: null, declaradas: [] };
}

export { sueloDeParcela };

/**
 * Comparación completa para la parcela.
 * @param {object} parcela
 * @param {{ siembra?: string|null }} op  'MM-DD' si la persona eligió otra fecha de siembra para el escenario
 */
export async function opcionesPara(parcela, { siembra = null } = {}) {
  const [planesDoc, reglas] = await Promise.all([reglasMod.planes(), reglasMod.reglas()]);
  await climaMod.zonas();
  const { clima, origen: origenClima, zona } = await climaDeParcela(parcela);
  const diagnostico = diagnosticoDe(parcela);
  // Tierra nueva (caso Juan): no hay una práctica propia todavía. La referencia es lo que se hace
  // normalmente al abrir monte: maíz cada año (plantilla «actual» de planes.json).
  const practica = diagnostico.estado.id === 'nueva' ? { temporadaAnio: null, origen: 'lo_normal', declaradas: [] } : practicaDeclarada(parcela);
  const suelo = sueloDeParcela(parcela);
  const maiz = catalogo.semillas().find((s) => s.cultivoId === 'maiz' && s.ventanaSiembra);
  const f = hoy();
  const r = armarComparacion({
    declaradas: practica.declaradas,
    temporadaAnio: practica.temporadaAnio,
    planesDoc,
    reglas,
    clima,
    zona,
    sueloReglasId: suelo.reglasId,
    ventanaSiembra: maiz?.ventanaSiembra || null,
    hoy: { anio: f.getFullYear(), mes: f.getMonth() + 1 },
    siembraEscenario: siembra,
  });
  // Orden y sello «Sugerida» según el diagnóstico. Las tres principales se muestran siempre.
  const { sugerencia, estado } = diagnostico;
  const conPorQue = (e) => ({ ...e, sugerida: e.id === sugerencia.sugerida, porQue: porQueEstrategia(e.id, { estado, sugerencia, esPlantilla: e.esPlantilla }) });
  const principales = sugerencia.orden.map((id) => r.principales.find((e) => e.id === id)).filter(Boolean).map(conPorQue);
  const secundarias = sugerencia.mostrarSoya ? r.secundarias.map(conPorQue) : [];
  return { ...r, principales, secundarias, diagnostico, practica, suelo, origenClima, datos: origenDatos(), advertenciaIngreso: planesDoc.advertenciaIngreso };
}
