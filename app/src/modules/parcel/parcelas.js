// Parcela: CRUD local, zona, suelo, siembras y motivos de eliminación.
// RNF-03: el servidor no expone parcelas individuales, así que la parcela completa
// (nombre, ubicación exacta, foto) se queda en el teléfono. Al servidor solo llega la
// zona dentro de la contribución seudónima.
import * as repos from '../../storage/repos.js';
import { uuid } from '../../shared/uuid.js';
import { zonaMasCercana, zonaPorId, distanciaKm } from '../climate/clima.js';
import * as catalogo from '../crops/catalogo.js';
import { temporadaEnCursoOCrear, registrarEvento, registrarTemporadaPasada } from '../harvests/temporadas.js';
import { superficie } from '../../shared/format.js';

const ahora = () => new Date().toISOString();

/** Municipio más cercano al punto (catálogo aproximado del prototipo). */
export function municipioCercano(punto) {
  if (!punto) return null;
  return catalogo.municipios()
    .map((m) => ({ m, km: distanciaKm(punto, m) }))
    .sort((a, b) => a.km - b.km)[0] || null;
}

/**
 * Completa los campos derivados: zona, distancia, municipio y suelo.
 * El punto de la parcela, el municipio y el punto de clima de la zona son tres datos distintos:
 *  - Con punto (mapa o GPS): la zona es la del punto de clima más cercano y se guarda la distancia.
 *  - Solo con municipio (elegido de la lista): la zona es la del catálogo municipal si existe
 *    (municipios.json, zonaId); si no, queda sin zona y la cobertura se muestra como pendiente.
 *  - El municipio declarado (origenMunicipio = 'declarado') no se recalcula con la cabecera más cercana.
 */
export function derivar(datos) {
  const out = { ...datos };
  const u = datos.ubicacion;
  const declarado = datos.origenMunicipio === 'declarado' && datos.municipioId
    ? catalogo.municipios().find((m) => m.id === datos.municipioId) : null;
  if (u && u.origen === 'municipio') {
    const m = catalogo.municipios().find((x) => x.id === u.municipioId) || municipioCercano(u)?.m || null;
    const zona = m?.zonaId ? zonaPorId(m.zonaId) : null;
    out.zonaId = zona?.id || null;
    out.zonaDistanciaKm = null;
    out.origenAsignacionZona = zona ? 'municipio' : null;
    out.municipioId = m?.id || null;
    out.municipioNombre = m?.name || null;
    out.estado = m?.estado || null;
    out.origenMunicipio = 'declarado';
  } else if (u) {
    const z = zonaMasCercana(u);
    out.zonaId = z?.zona.id || null;
    out.zonaDistanciaKm = z ? Math.round(z.km * 10) / 10 : null;
    out.origenAsignacionZona = z ? 'punto_mas_cercano' : null;
    const mun = declarado ? { m: declarado } : municipioCercano(u);
    out.municipioId = mun?.m.id || null;
    out.municipioNombre = mun?.m.name || null;
    out.estado = mun?.m.estado || null;
    out.origenMunicipio = declarado ? 'declarado' : 'cabecera_mas_cercana';
  }
  const s = catalogo.reconocerSuelo(datos.sueloTexto);
  out.tipoSueloId = s.suelo?.id || null;
  out.origenTipoSuelo = !datos.sueloTexto ? 'desconocido' : s.suelo ? 'texto_reconocido' : 'texto_productor';
  return out;
}

/**
 * Crea una parcela. extras.anterior (si "Sí, ya se usó"): { cultivos:[ids], anio, mes, resultado, causa, cantidad }
 * extras.plan (si "No, es nueva"): { cultivos:[ids], mes }
 */
export function crear(datos, extras = {}) {
  const p = repos.parcelas.guardar(derivar({
    id: uuid(),
    ...datos,
    esEjemplo: false,
    creadoEn: ahora(),
    actualizadoEn: ahora(),
    eliminadaEn: null,
    motivoEliminacion: null,
  }));
  registrarEvento(p, { tipo: 'parcela_creada', titulo: 'Registraste la parcela', detalle: `${superficie(p.superficieM2)}${p.municipioNombre ? `, cerca de ${p.municipioNombre}` : ''}.` });
  if (datos.usadaAntes && extras.anterior && extras.anterior.cultivos?.length && extras.anterior.anio) {
    registrarTemporadaPasada({
      parcela: p,
      anio: extras.anterior.anio,
      mesSiembra: extras.anterior.mes || null,
      cultivos: extras.anterior.cultivos.map((cultivoId) => ({ cultivoId })),
      resultado: extras.anterior.resultado || 'regular',
      causa: extras.anterior.causa || null,
      cantidad: extras.anterior.cantidad || null,
      origen: 'alta_parcela',
    });
  }
  return p;
}

export function actualizar(id, cambios) {
  const actual = repos.parcelas.porId(id);
  if (!actual) return null;
  const p = repos.parcelas.guardar(derivar({ ...actual, ...cambios, actualizadoEn: ahora() }));
  registrarEvento(p, { tipo: 'parcela_editada', titulo: 'Editaste los datos de la parcela', detalle: superficie(p.superficieM2) + '.' });
  return p;
}

/** Eliminación suave: se conserva en el historial con su motivo. */
export function eliminar(id, { motivoId, motivoTexto, nota }) {
  const p = repos.parcelas.porId(id);
  if (!p) return;
  repos.parcelas.guardar({ ...p, eliminadaEn: ahora(), motivoEliminacion: { motivoId, motivoTexto, nota } });
  registrarEvento(p, { tipo: 'parcela_eliminada', titulo: 'Quitaste la parcela', detalle: motivoTexto, motivoId, motivoTexto, nota });
  const t = repos.temporadaEnCurso(id);
  if (t) repos.temporadas.guardar({ ...t, estado: 'finalizada', resultado: t.resultado === 'pendiente' ? 'pendiente' : t.resultado, observaciones: `Parcela quitada: ${motivoTexto}` });
}

export function restaurar(id) {
  const p = repos.parcelas.porId(id);
  if (!p) return;
  repos.parcelas.guardar({ ...p, eliminadaEn: null });
  registrarEvento(p, { tipo: 'parcela_restaurada', titulo: 'Volviste a activar la parcela' });
}

// ---------------- Siembras de la temporada en curso ----------------
export function siembrasActuales(parcelaId) {
  const t = repos.temporadaEnCurso(parcelaId);
  return t ? repos.siembrasDe(t.id) : [];
}

export function superficieOcupada(parcelaId, excepto = null) {
  return siembrasActuales(parcelaId).filter((s) => s.id !== excepto).reduce((suma, s) => suma + (s.superficieM2 || 0), 0);
}

/** Agrega una semilla (SIEMBRA) a la temporada en curso. */
export function agregarSiembra(parcela, { semillaId, superficieM2, fecha }) {
  const sem = catalogo.semilla(semillaId);
  const t = temporadaEnCursoOCrear(parcela, fecha?.anio || new Date().getFullYear());
  const s = repos.siembras.guardar({
    id: uuid(),
    temporadaId: t.id,
    parcelaId: parcela.id,
    cultivoId: sem.cultivoId,
    semillaId,
    variedadId: sem.variedadId || null,
    superficieM2: superficieM2 || null,
    fecha,
    observaciones: null,
    eliminadaEn: null,
    motivo: null,
    creadoEn: ahora(),
  });
  registrarEvento(parcela, { tipo: 'semilla_agregada', titulo: `Sembraste ${sem.name}`, detalle: superficieM2 ? `${superficie(superficieM2)}.` : '' });
  return { siembra: s, temporada: t };
}

export function editarSiembra(id, cambios) {
  const s = repos.siembras.porId(id);
  if (!s) return null;
  return repos.siembras.guardar({ ...s, ...cambios });
}

/** Quita una semilla y guarda la causa para el historial y la retroalimentación. */
export function eliminarSiembra(id, { motivoId, motivoTexto, nota }) {
  const s = repos.siembras.porId(id);
  if (!s) return;
  repos.siembras.guardar({ ...s, eliminadaEn: ahora(), motivo: { motivoId, motivoTexto, nota } });
  const p = repos.parcelas.porId(s.parcelaId);
  const sem = catalogo.semilla(s.semillaId);
  registrarEvento(p, { tipo: 'semilla_eliminada', titulo: `Quitaste ${sem?.name || catalogo.cultivo(s.cultivoId).name}`, detalle: motivoTexto, motivoId, motivoTexto, nota });
}

// ---------------- Esquema del terreno ----------------
const ESCALAS = [
  { m2: 400, txt: '1 mecate (20 × 20 m)' },
  { m2: 2500, txt: '¼ de hectárea (50 × 50 m)' },
  { m2: 10000, txt: '1 hectárea (100 × 100 m)' },
  { m2: 50000, txt: '5 hectáreas' },
  { m2: 100000, txt: '10 hectáreas' },
];

/**
 * Calcula la cuadrícula del terreno: cada cuadro es una unidad (mecate, ¼ ha, ha…)
 * elegida para que haya entre 1 y 48 cuadros. Si se dieron largo y ancho, respeta la forma.
 */
export function esquema(parcela, siembras = []) {
  const total = parcela.superficieM2 || 0;
  if (!total) return null;
  const escala = ESCALAS.find((e) => total / e.m2 <= 48) || ESCALAS[ESCALAS.length - 1];
  const unidades = total / escala.m2;
  const n = Math.max(1, Math.ceil(unidades - 1e-9));
  let cols;
  if (parcela.dimensiones?.largoM && parcela.dimensiones?.anchoM) {
    const razon = parcela.dimensiones.largoM / parcela.dimensiones.anchoM;
    cols = Math.max(1, Math.min(n, Math.round(Math.sqrt(n * razon))));
  } else {
    cols = Math.max(1, Math.ceil(Math.sqrt(n)));
  }
  // Reparte las siembras en orden sobre los cuadros (proporcional a su superficie)
  const segmentos = [];
  let restante = siembras.map((s) => ({ color: catalogo.cultivo(s.cultivoId).color, u: (s.superficieM2 || 0) / escala.m2 })).filter((x) => x.u > 0);
  const cuadros = [];
  for (let i = 0; i < n; i++) {
    const capacidad = i === n - 1 ? unidades - (n - 1) : 1;
    let libre = capacidad;
    const segs = [];
    while (libre > 1e-6 && restante.length) {
      const toma = Math.min(libre, restante[0].u);
      segs.push({ color: restante[0].color, frac: toma });
      restante[0].u -= toma;
      libre -= toma;
      if (restante[0].u <= 1e-6) restante.shift();
    }
    cuadros.push({ capacidad, segs });
  }
  segmentos.push(...cuadros);
  return { escala, cols, cuadros: segmentos, unidades };
}
