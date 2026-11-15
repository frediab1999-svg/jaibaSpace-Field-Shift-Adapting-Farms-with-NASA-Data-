// Diagnóstico de la tierra de UNA parcela: junta lo que respondió el productor en el cuestionario
// con lo que ha registrado después (temporadas terminadas) y se lo pasa a motor/diagnostico.js.
import * as repos from '../../storage/repos.js';
import * as catalogo from '../crops/catalogo.js';
import { estadoTierra, sugerir, prioridadDeObjetivo } from '../../motor/diagnostico.js';

const AÑOS = { 1: 1, '2-3': 2, '4+': 4 };
const deAnios = (n) => (n >= 4 ? '4+' : n >= 2 ? '2-3' : '1');

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
 * Respuestas que usa el diagnóstico. Lo registrado en la app actualiza el cuestionario:
 *  - cada temporada terminada en la app suma un año seguido (y una tierra nueva deja de serlo);
 *  - el resultado de la última temporada terminada reemplaza al que se dijo en el cuestionario.
 */
export function respuestas(parcela) {
  const terminadas = repos.temporadasDe(parcela.id)
    .filter((t) => t.estado === 'finalizada' && ['bueno', 'regular', 'malo'].includes(t.resultado))
    .sort((a, b) => b.anio - a.anio);
  const enApp = terminadas.filter((t) => t.origen === 'en_app' && (!parcela.creadoEn || t.creadoEn >= parcela.creadoEn));
  let usadaAntes = parcela.usadaAntes ?? null;
  let aniosSeguidos = parcela.aniosSeguidos || null;
  if (enApp.length) {
    if (usadaAntes === false) { usadaAntes = true; aniosSeguidos = deAnios(enApp.length); } else if (AÑOS[aniosSeguidos]) aniosSeguidos = deAnios(AÑOS[aniosSeguidos] + enApp.length);
  }
  return {
    usadaAntes,
    aniosSeguidos,
    descanso: parcela.descanso || null,
    quema: parcela.quema || null,
    senales: parcela.senales || [],
    resultado: terminadas[0]?.resultado || parcela.resultadoReciente || null,
    usoPrevio: parcela.usoPrevio || null,
    desmonte: parcela.desmonte || null,
    actualizadoConTemporadas: enApp.length,
  };
}

/** Prioridad del productor: la del objetivo del cuestionario o la que ya tenía guardada. */
export const prioridadDe = (parcela) => prioridadDeObjetivo(parcela?.objetivo) || parcela?.prioridad || null;

/** Diagnóstico completo de la parcela: estado de la tierra y estrategia sugerida. */
export function diagnosticoDe(parcela) {
  const r = respuestas(parcela);
  const estado = estadoTierra(r);
  const suelo = sueloDeParcela(parcela);
  const prioridad = prioridadDe(parcela);
  const sugerencia = sugerir({ estado, prioridad, sueloReglasId: suelo.reglasId, desmonte: r.desmonte, usoPrevio: r.usoPrevio });
  return { estado, sugerencia, respuestas: r, prioridad, suelo };
}

/** Referencia oficial de rendimiento del municipio (no es un pronóstico de la parcela). */
export function referenciaMunicipal(parcela) {
  const m = catalogo.municipios().find((x) => x.id === parcela?.municipioId);
  return m?.referenciaRendimiento ? { municipio: m.name, ...m.referenciaRendimiento } : null;
}
