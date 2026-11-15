// Formatos en español de México y conversiones de superficie.

export const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
export const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
export const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

const nf = (max) => new Intl.NumberFormat('es-MX', { maximumFractionDigits: max });

export function numero(n, decimales = 2) {
  if (n === null || n === undefined || Number.isNaN(n)) return 'sin dato';
  return nf(decimales).format(n);
}

export const M2_POR = { m2: 1, mecate: 400, ha: 10000 };

export function aM2(valor, unidad) {
  const v = Number(String(valor ?? '').trim().replace(',', '.'));
  if (!Number.isFinite(v) || v <= 0) return null;
  return v * (M2_POR[unidad] || 1);
}
export function deM2(m2, unidad) {
  return m2 / (M2_POR[unidad] || 1);
}

/** "2.37 hectáreas", "15 mecates", "850 m²" según el tamaño. */
export function superficie(m2, unidad) {
  if (m2 === null || m2 === undefined || Number.isNaN(m2)) return 'sin dato';
  if (m2 <= 0) return '0 m²';
  const u = unidad || (m2 >= 10000 ? 'ha' : m2 >= 400 ? 'mecate' : 'm2');
  const v = deM2(m2, u);
  if (u === 'ha') return `${numero(v, 2)} ${v === 1 ? 'hectárea' : 'hectáreas'}`;
  if (u === 'mecate') return `${numero(v, 1)} ${v === 1 ? 'mecate' : 'mecates'}`;
  return `${numero(v, 0)} m²`;
}

/** Texto de equivalencias para mostrar mientras se escribe. */
export function equivalencias(m2, unidadCaptura) {
  if (!m2) return '';
  const partes = [];
  if (unidadCaptura !== 'ha') partes.push(`${numero(m2 / 10000, 2)} hectáreas`);
  if (unidadCaptura !== 'mecate') partes.push(`${numero(m2 / 400, 1)} mecates`);
  if (unidadCaptura !== 'm2') partes.push(`${numero(m2, 0)} m²`);
  return `Son ${partes.join(' o ')}.`;
}

export function hoy() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
export function isoFecha(d) {
  const z = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
}
export function deIso(s) {
  if (!s) return null;
  const [a, m, d] = s.split('-').map(Number);
  return new Date(a, (m || 1) - 1, d || 1);
}
export function fechaLarga(d) {
  return `${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`;
}
export function fechaCorta(d) {
  return `${d.getDate()} ${MESES_CORTOS[d.getMonth()]}`;
}
export function diaSemana(d) {
  const t = DIAS[d.getDay()];
  return t.charAt(0).toUpperCase() + t.slice(1);
}
export function sumarDias(d, n) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}
export function mismaFecha(a, b) {
  return a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** Fecha con precisión variable (año, mes o día), como pide SIEMBRA.precision_fecha. */
export function fechaConPrecision(f) {
  if (!f || !f.anio) return 'sin fecha';
  if (f.precision === 'dia' && f.mes && f.dia) return `${f.dia} de ${MESES[f.mes - 1]} de ${f.anio}`;
  if ((f.precision === 'mes' || f.precision === 'dia') && f.mes) return `${MESES[f.mes - 1]} de ${f.anio}`;
  return `${f.anio}`;
}
export function fechaPrecisionADate(f) {
  if (!f || !f.anio) return null;
  return new Date(f.anio, (f.mes || 1) - 1, f.dia || 1);
}

export function plural(n, uno, varios) {
  return `${numero(n, 0)} ${n === 1 ? uno : varios}`;
}

/** Normaliza texto para comparar: minúsculas, sin acentos ni apóstrofos. */
export function normalizar(t) {
  return String(t || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/['’´`]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function inicial(nombre) {
  const limpio = String(nombre || '').replace(/^(don|doña|dona)\s+/i, '').trim();
  return (limpio.charAt(0) || 'M').toUpperCase();
}
