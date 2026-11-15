// Contrato con el backend existente en develop. Cada función corresponde a una ruta real
// de server/app/api/v1/router.py. Las rutas PROPUESTAS están documentadas en
// docs/contrato-frontend-backend.md y no se llaman desde aquí.
import { pedir } from './client.js';

/** GET /api/v1/health → {status:"ok"} */
export const salud = () => pedir('/health', { limiteMs: 2500 });

/** GET /api/v1/ready → {status:"ready"} (503 si no hay base de datos) */
export const lista = () => pedir('/ready', { limiteMs: 2500 });

/**
 * POST /api/v1/consent  (ConsentGrant, extra="forbid")
 * { consent_id: uuid, purpose: "collective_statistics", granted: bool, notice_version: str(1..40), decided_at: datetime }
 * → 201 {consent_id, granted} | 409 consent_id_already_exists
 */
export const registrarConsentimiento = (grant) => pedir('/consent', { metodo: 'POST', cuerpo: grant });

/**
 * POST /api/v1/contributions  (ContributionCreate, extra="forbid")
 * { submission_id, consent_id, zone_id, crop_id, variety_id?, season_year, sowing_date?, harvest_date?,
 *   outcome?: "good"|"regular"|"poor", perceived_cause?: str(≤120), quantity?: decimal≥0,
 *   quantity_unit?: str(≤40), quantity_is_estimate: bool }
 * → {submission_id, status: "accepted"|"already_received"} | 403 consent_required
 * Idempotente por submission_id; se manda también como Idempotency-Key (permitido en CORS).
 */
export const enviarContribucion = (c) =>
  pedir('/contributions', { metodo: 'POST', cuerpo: c, cabeceras: { 'Idempotency-Key': c.submission_id } });

/**
 * GET /api/v1/catalogs/{crops|varieties|stages|seeds} → {catalog, items, count}
 * Hoy el repositorio devuelve [] (TODO en server); la PWA usa fixtures marcados como ejemplo.
 */
export const catalogo = (nombre) => pedir(`/catalogs/${encodeURIComponent(nombre)}`);

/**
 * GET /api/v1/climate/datasets?zone_id=&kind=historical|projection → {zone_id, kind, items, count}
 * items: ClimateDatasetInfo {dataset_id, zone_id, kind, source, scenario, period_start, period_end, resolution, version, updated_at}
 */
export const conjuntosClimaticos = (zoneId, kind) => pedir('/climate/datasets', { params: { zone_id: zoneId, kind } });

/**
 * GET /api/v1/statistics?zone_id=&crop_id=&season_year= → StatisticsResponse
 * {status: "available"|"insufficient_sample", zone_id, crop_id, season_year, record_count, items[]}
 * items: AggregateStatistic {metric: "outcome_good_count"…, value, method, record_count, period, updated_at}
 */
export const estadisticas = ({ zoneId, cropId, seasonYear }) =>
  pedir('/statistics', { params: { zone_id: zoneId, crop_id: cropId, season_year: seasonYear } });
