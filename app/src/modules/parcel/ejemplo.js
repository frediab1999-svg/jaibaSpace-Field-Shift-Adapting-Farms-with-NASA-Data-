// Carga y quita los datos de ejemplo (app/fixtures/ejemplo-milpa.json).
import * as repos from '../../storage/repos.js';
import * as catalogo from '../crops/catalogo.js';
import { derivar } from './parcelas.js';
import { analizar, instantanea } from '../../motor/prediccion.js';

const URL_EJEMPLO = new URL('../../../fixtures/ejemplo-milpa.json', import.meta.url).href;

export const hayEjemplo = () => repos.parcelas.todos().some((p) => p.esEjemplo);

export async function cargarEjemplo() {
  const datos = await (await fetch(URL_EJEMPLO)).json();
  const ahora = new Date().toISOString();
  for (const p of datos.parcelas) {
    repos.parcelas.guardar(derivar({ ...p, esEjemplo: true, actualizadoEn: p.creadoEn, eliminadaEn: null, motivoEliminacion: null }));
  }
  for (const t of datos.temporadas) {
    repos.temporadas.guardar({
      nombre: `Temporada ${t.anio}`, causa: null, causaNota: null, fechaCosecha: null, observaciones: null,
      prediccion: null, envios: {}, ...t, cosechas: datos.cosechas[t.id] || {}, esEjemplo: true, actualizadoEn: t.creadoEn,
    });
  }
  for (const s of datos.siembras) {
    const sem = catalogo.semilla(s.semillaId);
    repos.siembras.guardar({
      cultivoId: sem?.cultivoId, variedadId: sem?.variedadId || null, observaciones: null, eliminadaEn: null, motivo: null,
      ...s, creadoEn: ahora,
    });
  }
  for (const h of datos.historial) {
    const p = datos.parcelas.find((x) => x.id === h.parcelaId);
    repos.historial.guardar({ motivoId: null, motivoTexto: null, nota: null, ...h, parcelaNombre: p?.nombre || '', esEjemplo: true });
  }
  if (!repos.kv.get('usuario')) repos.kv.set('usuario', { nombreVisible: datos.usuario.nombreVisible });
  if (!repos.kv.get('parcelaActivaId')) repos.kv.set('parcelaActivaId', datos.parcelas[0].id);
  // "Lo que decía la predicción" al iniciar las temporadas en curso
  for (const t of repos.temporadas.donde((x) => x.esEjemplo && x.estado === 'en_curso')) {
    const p = repos.parcelas.porId(t.parcelaId);
    try {
      const a = await analizar(p);
      repos.temporadas.guardar({ ...repos.temporadas.porId(t.id), prediccion: { ...instantanea(a), fecha: t.creadoEn } });
    } catch (e) { console.warn('No se pudo calcular la predicción de ejemplo', e); }
  }
}

export function quitarEjemplo() {
  const ids = new Set(repos.parcelas.todos().filter((p) => p.esEjemplo).map((p) => p.id));
  repos.siembras.todos().filter((s) => ids.has(s.parcelaId)).forEach((s) => repos.siembras.borrar(s.id));
  repos.temporadas.todos().filter((t) => ids.has(t.parcelaId)).forEach((t) => repos.temporadas.borrar(t.id));
  repos.historial.todos().filter((h) => ids.has(h.parcelaId)).forEach((h) => repos.historial.borrar(h.id));
  ids.forEach((id) => repos.parcelas.borrar(id));
  const activa = repos.kv.get('parcelaActivaId');
  if (ids.has(activa)) repos.kv.set('parcelaActivaId', repos.parcelasActivas()[0]?.id || null);
}
