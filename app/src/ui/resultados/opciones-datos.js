// De dónde saca la pantalla «Opciones para tu parcela» sus números: del motor, en el teléfono.
//
// Junta lo que el productor registró (IndexedDB) con los datos publicados (paquete del
// servidor o respaldo local; ver shared/datos.js) y se lo pasa a motor/comparacion.js, que
// no conoce la pantalla ni el almacenamiento. Aquí no hay ningún número fijo.
import * as repos from '../../storage/repos.js';
import * as catalogo from '../../modules/crops/catalogo.js';
import * as climaMod from '../../modules/climate/clima.js';
import * as reglasMod from '../../modules/strategies/reglas.js';
import { armarComparacion } from '../../motor/comparacion.js';
import { origenDatos } from '../../shared/datos.js';
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

/** Suelo de la parcela: lo que escribió, el nombre local reconocido y la clase WRB si está verificada. */
export function sueloDeParcela(parcela) {
  const s = catalogo.suelos().find((x) => x.id === parcela?.tipoSueloId) || null;
  const verificado = !!s && s.estadoEquivalencia === 'verificado_fuente' && !!s.reglasId;
  return {
    texto: parcela?.sueloTexto || '',
    local: s ? { id: s.id, nombre: s.name, descripcion: s.descripcion } : null,
    wrb: verificado ? s.equivalenteWRB : null,
    wrbPropuesta: s && !verificado ? s.equivalenteWRB || null : null,
    reglasId: verificado ? s.reglasId : null,
  };
}

/**
 * Comparación completa para la parcela.
 * @param {object} parcela
 * @param {{ siembra?: string|null }} op  'MM-DD' si la persona eligió otra fecha de siembra para el escenario
 */
export async function opcionesPara(parcela, { siembra = null } = {}) {
  const [planesDoc, reglas] = await Promise.all([reglasMod.planes(), reglasMod.reglas()]);
  await climaMod.zonas();
  const zona = climaMod.zonaPorId(parcela.zonaId);
  const clima = zona ? await climaMod.clima(zona.id) : null;
  const practica = practicaDeclarada(parcela);
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
  return { ...r, practica, suelo, datos: origenDatos(), advertenciaIngreso: planesDoc.advertenciaIngreso };
}
