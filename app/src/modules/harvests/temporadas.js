// Temporadas agrícolas, siembras, cosechas y consentimiento (RF-07, RF-08, RF-09, RF-10).
// Entidades locales: TEMPORADA_AGRICOLA y SIEMBRA (modelo entidad-relación).
// Hacia el servidor solo viaja la contribución seudónima (ContributionCreate) y solo
// cuando hay consentimiento vigente para "collective_statistics".
import * as repos from '../../storage/repos.js';
import { uuid } from '../../shared/uuid.js';
import { encolar, procesar } from '../../services/sync/cola.js';
import * as catalogo from '../crops/catalogo.js';

export const AVISO_VERSION = '2026-11-prototipo';
const RESULTADO_API = { bueno: 'good', regular: 'regular', malo: 'poor' };

const ahora = () => new Date().toISOString();

// ---------------- Temporadas ----------------
export function temporadaEnCursoOCrear(parcela, anio = new Date().getFullYear()) {
  let t = repos.temporadaEnCurso(parcela.id);
  if (t) return t;
  t = {
    id: uuid(),
    parcelaId: parcela.id,
    anio,
    nombre: `Temporada ${anio}`,
    estado: 'en_curso',
    resultado: 'pendiente',
    causa: null,
    causaNota: null,
    fechaCosecha: null,
    cosechas: {},
    observaciones: null,
    prediccion: null,
    origen: 'en_app',
    envios: {},
    esEjemplo: !!parcela.esEjemplo,
    creadoEn: ahora(),
    actualizadoEn: ahora(),
  };
  return repos.temporadas.guardar(t);
}

/** Guarda la predicción vigente al iniciar la temporada (para comparar al cerrar). */
export function guardarPrediccion(temporadaId, resumen) {
  const t = repos.temporadas.porId(temporadaId);
  if (!t || t.prediccion) return;
  repos.temporadas.guardar({ ...t, prediccion: { ...resumen, fecha: ahora() } });
}

/**
 * Cierra la temporada con el cuestionario corto de cosecha (RF-07).
 * datos: { fechaCosecha:{anio,mes,dia,precision}, resultado:'bueno'|'regular'|'malo', causa, causaNota,
 *          cosechas: { [siembraId]: { valor, unidad, esEstimacion } }, observaciones }
 */
export function terminarTemporada(temporadaId, datos) {
  const t = repos.temporadas.porId(temporadaId);
  if (!t) return null;
  const p = repos.parcelas.porId(t.parcelaId);
  // Estrategia que se usó en esta temporada (la elegida en «Opciones para tu parcela» para
  // este año). Se queda SOLO en el teléfono: el servidor todavía no acepta strategy_id (P1)
  // y rechaza los campos que no conoce, así que contribucionesDe() no la envía.
  const elegida = p?.estrategiaElegida;
  const cerrada = repos.temporadas.guardar({
    ...t,
    ...datos,
    estrategiaId: elegida && elegida.anioCiclo === t.anio ? elegida.id : (t.estrategiaId ?? null),
    estado: 'finalizada',
    actualizadoEn: ahora(),
  });
  registrarEvento(p, {
    tipo: 'cosecha_registrada',
    titulo: `Cerraste la ${t.nombre.toLowerCase()}`,
    detalle: `Resultado: ${datos.resultado}${datos.causa ? `, causa: ${nombreCausa(datos.causa)}` : ''}.`,
  });
  encolarContribuciones(cerrada);
  return cerrada;
}

/**
 * Registra una temporada que ya pasó y no estaba en la app (primera vez usando el software).
 * cultivos: [{ cultivoId, semillaId? }]
 */
export function registrarTemporadaPasada({ parcela, anio, mesSiembra = null, mesCosecha = null, cultivos, resultado, causa = null, causaNota = null, cantidad = null, observaciones = null, origen = 'registro_pasado' }) {
  const t = repos.temporadas.guardar({
    id: uuid(),
    parcelaId: parcela.id,
    anio,
    nombre: `Temporada ${anio}`,
    estado: 'finalizada',
    resultado,
    causa,
    causaNota,
    fechaCosecha: mesCosecha ? { anio: mesCosecha < (mesSiembra || 6) ? anio + 1 : anio, mes: mesCosecha, dia: null, precision: 'mes' } : { anio, mes: null, dia: null, precision: 'anio' },
    cosechas: {},
    observaciones,
    prediccion: null,
    origen,
    envios: {},
    esEjemplo: !!parcela.esEjemplo,
    creadoEn: ahora(),
    actualizadoEn: ahora(),
  });
  const ids = cultivos.map((c) => repos.siembras.guardar({
    id: uuid(),
    temporadaId: t.id,
    parcelaId: parcela.id,
    cultivoId: c.cultivoId,
    semillaId: c.semillaId || null,
    variedadId: c.semillaId ? catalogo.semilla(c.semillaId)?.variedadId || null : null,
    superficieM2: null,
    fecha: { anio, mes: mesSiembra, dia: null, precision: mesSiembra ? 'mes' : 'anio' },
    observaciones: null,
    eliminadaEn: null,
    motivo: null,
    creadoEn: ahora(),
  }).id);
  if (cantidad && ids.length === 1) {
    repos.temporadas.guardar({ ...t, cosechas: { [ids[0]]: cantidad } });
  }
  registrarEvento(parcela, {
    tipo: 'temporada_pasada',
    titulo: `Agregaste la temporada ${anio}`,
    detalle: `${cultivos.map((c) => catalogo.cultivo(c.cultivoId).name).join(', ')}: ${resultado}.`,
  });
  encolarContribuciones(repos.temporadas.porId(t.id));
  return t;
}

// ---------------- Historial de parcela (propuesto) ----------------
export function registrarEvento(parcela, { tipo, titulo, detalle = '', motivoId = null, motivoTexto = null, nota = null, fecha = null }) {
  if (!parcela) return null;
  return repos.historial.guardar({
    id: uuid(),
    parcelaId: parcela.id,
    parcelaNombre: parcela.nombre,
    tipo,
    titulo,
    detalle,
    motivoId,
    motivoTexto,
    nota,
    fecha: fecha || ahora(),
    esEjemplo: !!parcela.esEjemplo,
  });
}

export function nombreCausa(id) {
  return catalogo.listas().causasPercibidas?.find((c) => c.id === id)?.name || id;
}

// ---------------- Consentimiento (RF-10) ----------------
export const consentimiento = () => repos.kv.get('consentimiento', null);

export function decidirConsentimiento(otorgado) {
  const registro = {
    consent_id: uuid(),
    purpose: 'collective_statistics',
    granted: !!otorgado,
    notice_version: AVISO_VERSION,
    decided_at: ahora(),
  };
  repos.kv.set('consentimiento', registro);
  encolar({ tipoEntidad: 'consent', entidadId: registro.consent_id, payload: registro });
  if (otorgado) repos.temporadas.donde((t) => t.estado === 'finalizada').forEach(encolarContribuciones);
  procesar();
  return registro;
}

// ---------------- Contribuciones (POST /api/v1/contributions) ----------------
const isoSiDia = (f) => {
  if (!f || f.precision !== 'dia' || !f.anio || !f.mes || !f.dia) return null; // el contrato no tiene precisión de fecha
  const z = (n) => String(n).padStart(2, '0');
  return `${f.anio}-${z(f.mes)}-${z(f.dia)}`;
};

export function contribucionesDe(temporada) {
  const c = consentimiento();
  const p = repos.parcelas.porId(temporada.parcelaId);
  if (!c || !c.granted || !p || !p.zonaId || temporada.estado !== 'finalizada') return [];
  return repos.siembrasDe(temporada.id).map((s) => {
    const cantidad = temporada.cosechas?.[s.id] || null;
    const submissionId = temporada.envios?.[s.id] || uuid();
    return {
      siembraId: s.id,
      payload: {
        submission_id: submissionId,
        consent_id: c.consent_id,
        zone_id: p.zonaId,
        crop_id: s.cultivoId,
        variety_id: s.variedadId || null,
        season_year: temporada.anio,
        sowing_date: isoSiDia(s.fecha),
        harvest_date: isoSiDia(temporada.fechaCosecha),
        outcome: RESULTADO_API[temporada.resultado] || null,
        perceived_cause: temporada.causa ? (temporada.causa === 'otra' && temporada.causaNota ? `otra: ${temporada.causaNota}`.slice(0, 120) : temporada.causa) : null,
        quantity: cantidad && cantidad.valor != null ? Number(cantidad.valor) : null,
        quantity_unit: cantidad && cantidad.valor != null ? cantidad.unidad : null,
        quantity_is_estimate: !!(cantidad && cantidad.esEstimacion),
      },
    };
  });
}

export function encolarContribuciones(temporada) {
  if (!temporada || temporada.esEjemplo) return; // los datos de ejemplo nunca se envían
  const lista = contribucionesDe(temporada);
  if (!lista.length) return;
  const envios = { ...(temporada.envios || {}) };
  lista.forEach(({ siembraId, payload }) => {
    envios[siembraId] = payload.submission_id;
    encolar({ tipoEntidad: 'contribution', entidadId: payload.submission_id, payload, referencia: { temporadaId: temporada.id, siembraId } });
  });
  repos.temporadas.guardar({ ...temporada, envios });
  procesar();
}

/** Estado de envío agregado de una temporada: 'sin_consentimiento' | 'pendiente' | 'enviada' | 'error' | 'ejemplo' | 'sin_zona'. */
export function estadoEnvio(temporada) {
  if (temporada.esEjemplo) return 'ejemplo';
  const c = consentimiento();
  if (!c || !c.granted) return 'sin_consentimiento';
  const p = repos.parcelas.porId(temporada.parcelaId);
  if (!p?.zonaId) return 'sin_zona';
  const ids = Object.values(temporada.envios || {});
  if (!ids.length) return temporada.estado === 'finalizada' ? 'pendiente' : null;
  const estados = ids.map((id) => repos.cola.donde((x) => x.entidadId === id)[0]?.estado || 'pendiente');
  if (estados.includes('error')) return 'error';
  if (estados.every((e) => e === 'enviada')) return 'enviada';
  return 'pendiente';
}
