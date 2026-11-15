// Calendario de la milpa (Inicio). Cada color dice de dónde sale el dato:
//  temporada (guinda punteado): calendario agrícola + frecuencia histórica NASA del mes
//  clima (pitaya): rachas secas y calor que de verdad pasaron el año más reciente con datos
//  previsión (jade): fechas calculadas con tu siembra + etapas de reglas.json
//  siembra (dorado): lo que tú registraste y las ventanas de siembra del catálogo
import * as repos from '../storage/repos.js';
import * as catalogo from '../modules/crops/catalogo.js';
import * as climaMod from '../modules/climate/clima.js';
import * as reglasMod from '../modules/strategies/reglas.js';
import { sumarDias, MESES, fechaPrecisionADate } from '../shared/format.js';

export const TIPOS = {
  clima: { nombre: 'Clima', color: '#d81159', icono: 'lluvia', leyenda: 'Clima (dato NASA)' },
  prevision: { nombre: 'Previsión', color: '#218380', icono: 'grafica', leyenda: 'Previsión de tu siembra' },
  siembra: { nombre: 'Siembra y cosecha', color: '#e0a020', icono: 'brote', leyenda: 'Siembra y cosecha' },
  temporada: { nombre: 'Temporada', color: '#8f2d56', icono: 'calendario', leyenda: 'Temporada' },
};

// Fechas de cada opción (planes.json y plan «Nuevo enfoque»). anio: 0 = año del ciclo, 1 = el siguiente.
const FECHAS_PLAN = {
  'milpa-canavalia': [
    { fecha: '06-15', texto: 'Sembrar el maíz', detalle: 'Al entrar las lluvias, hasta el 15 de julio (INIFAP).' },
    { fecha: '07-15', texto: 'Sembrar la canavalia entre el maíz', detalle: 'Unos 30 días después del maíz para que no compita con él. El día exacto, por confirmar con tu técnico.' },
    { fecha: '11-05', texto: 'Cosecha estimada del maíz', detalle: 'La canavalia se queda tapando la tierra.' },
    { fecha: '03-31', anio: 1, texto: 'La canavalia deja de cubrir', detalle: 'Fecha de referencia para preparar la siguiente siembra.' },
  ],
  cobertura: [
    { fecha: '06-15', texto: 'Sembrar la canavalia (año de descanso)', detalle: 'Este año no hay maíz: la canavalia recarga la tierra. La semilla no se come.' },
    { fecha: '03-31', anio: 1, texto: 'La canavalia deja de cubrir', detalle: 'Fecha de referencia.' },
    { fecha: '06-15', anio: 1, texto: 'Volver a sembrar maíz', detalle: 'Segundo año de la opción.' },
  ],
  'otro-grano': [
    { fecha: '06-15', texto: 'Sembrar la soya', detalle: 'Ventana del INIFAP: 15 de junio a 15 de julio. Solo variedades convencionales.' },
    { fecha: '10-08', texto: 'Cosecha estimada de la soya', detalle: '115 días para Huasteca 300.' },
    { fecha: '06-15', anio: 1, texto: 'Volver a sembrar maíz', detalle: 'Segundo año de la opción.' },
  ],
};

const dia = (iso) => { const [a, m, d] = iso.split('-').map(Number); return new Date(a, m - 1, d); };

function agregar(mapa, d, evento) {
  const k = d.getDate();
  if (!mapa.has(k)) mapa.set(k, []);
  mapa.get(k).push(evento);
}

/**
 * @returns {{ eventos: Map<number, object[]>, temporada: object|null, zona: object, evidencia: string, fuentes: string[] }}
 */
export async function mes(anio, mesN, { parcelaId = null } = {}) {
  await Promise.all([climaMod.zonas(), reglasMod.reglas()]);
  const reglas = reglasMod.reglasSync();
  const parcelas = repos.parcelasActivas();
  const activa = parcelas.find((p) => p.id === parcelaId) || parcelas[0] || null;
  const zona = climaMod.zonaPorId(activa?.zonaId) || climaMod.zonaPorId('yuc-noroeste');
  const clima = await climaMod.clima(zona.id);
  const eventos = new Map();
  const ini = new Date(anio, mesN - 1, 1);
  const fin = new Date(anio, mesN, 0);
  const dentro = (d) => d >= ini && d <= fin;
  const fuentes = new Set();

  // --- Temporada del año ---
  const t = (catalogo.listas().temporadasDelAnio || []).find((x) => x.meses.includes(mesN)) || null;
  const frec = climaMod.frecuenciaMensual(clima, mesN, { umbralRacha: reglas.rachaRelevanteDias, minCalor: reglas.episodioCalorRelevanteDias });
  const evidencia = `En ${MESES[mesN - 1]}, ${frec.rachas} de ${frec.total} años tuvieron al menos ${reglas.rachaRelevanteDias} días seguidos sin lluvia${frec.calor ? ` y ${frec.calor} tuvieron calor de ${reglas.umbralCalorC} °C o más varios días` : ''}.`;

  // --- Clima: lo que pasó el año más reciente con datos ---
  const ultimo = climaMod.ultimoAnioCompleto(clima);
  const ev = climaMod.eventosDelMes(clima, ultimo, mesN, { umbralRacha: reglas.rachaRelevanteDias, minCalor: reglas.episodioCalorRelevanteDias });
  ev.rachas.forEach((r) => {
    for (let d = dia(r.inicio); d <= dia(r.fin); d = sumarDias(d, 1)) {
      if (d.getMonth() + 1 !== mesN) continue;
      agregar(eventos, new Date(anio, mesN - 1, d.getDate()), {
        tipo: 'clima',
        texto: `Sin lluvia en ${ultimo}: racha de ${r.dias} días`,
        detalle: `Del ${dia(r.inicio).getDate()} de ${MESES[dia(r.inicio).getMonth()]} al ${dia(r.fin).getDate()} de ${MESES[dia(r.fin).getMonth()]} de ${ultimo} llovió menos de 1 mm al día.`,
        dato: 'historico',
      });
    }
  });
  ev.calor.forEach((e) => {
    for (let d = dia(e.inicio); d <= dia(e.fin); d = sumarDias(d, 1)) {
      if (d.getMonth() + 1 !== mesN) continue;
      agregar(eventos, new Date(anio, mesN - 1, d.getDate()), {
        tipo: 'clima',
        texto: `Calor en ${ultimo}: ${e.dias} días de ${reglas.umbralCalorC} °C o más`,
        detalle: `Del ${dia(e.inicio).getDate()} de ${MESES[dia(e.inicio).getMonth()]} al ${dia(e.fin).getDate()} de ${MESES[dia(e.fin).getMonth()]} de ${ultimo}.`,
        dato: 'historico',
      });
    }
  });
  if (ev.rachas.length || ev.calor.length) fuentes.add(climaMod.fuenteTexto(clima));

  // --- Siembras registradas, cosechas y previsiones por etapa ---
  for (const p of parcelas) {
    const temporadas = repos.temporadasDe(p.id);
    for (const temp of temporadas) {
      const siembras = repos.siembrasDe(temp.id);
      for (const s of siembras) {
        const c = catalogo.cultivo(s.cultivoId);
        const sem = catalogo.semilla(s.semillaId);
        const nombre = (sem?.name || c.name).toLowerCase();
        const fs = s.fecha?.precision === 'dia' ? fechaPrecisionADate(s.fecha) : null;
        if (fs && dentro(fs)) {
          agregar(eventos, fs, { tipo: 'siembra', texto: `Sembraste ${nombre} en ${p.nombre}`, detalle: 'Lo registraste en Tus parcelas.', dato: 'actual' });
        }
        if (fs && temp.estado !== 'finalizada' && c.reglasId) {
          const etapa = reglasMod.etapaSensible(c.reglasId);
          const ciclo = reglasMod.cicloDias(c.reglasId);
          if (etapa) {
            const a = sumarDias(fs, etapa.desdeDia);
            const b = sumarDias(fs, etapa.hastaDia);
            if (dentro(a)) agregar(eventos, a, { tipo: 'prevision', texto: `Empieza ${etapa.nombre.toLowerCase()} de ${nombre} (${p.nombre})`, detalle: `Día ${etapa.desdeDia} desde la siembra. Es la etapa que más sufre si falta agua.`, dato: 'actual' });
            if (dentro(b)) agregar(eventos, b, { tipo: 'prevision', texto: `Termina la etapa delicada de ${nombre}`, detalle: `Día ${etapa.hastaDia} desde la siembra.`, dato: 'actual' });
            fuentes.add(`Etapas: reglas.json v${reglas.version}`);
          }
          if (ciclo) {
            const fc = sumarDias(fs, ciclo);
            if (dentro(fc)) agregar(eventos, fc, { tipo: 'prevision', texto: `Cosecha estimada de ${nombre} en ${p.nombre}`, detalle: `${ciclo} días desde la siembra, según las etapas del cultivo. Puede variar con tu variedad.`, dato: 'actual' });
          }
        }
      }
      const fcos = temp.fechaCosecha?.precision === 'dia' ? fechaPrecisionADate(temp.fechaCosecha) : null;
      if (fcos && dentro(fcos)) agregar(eventos, fcos, { tipo: 'siembra', texto: `Cosechaste en ${p.nombre}`, detalle: `Resultado: ${temp.resultado}.`, dato: 'actual' });
    }
  }

  // --- Opción elegida en «Opciones para tu parcela» (fechas del plan, por confirmar) ---
  for (const p of parcelas) {
    const el = p.estrategiaElegida;
    const marcas = el ? (FECHAS_PLAN[el.id] || []) : [];
    for (const m of marcas) {
      const [mm, dd] = m.fecha.split('-').map(Number);
      const d = new Date(el.anioCiclo + (m.anio || 0), mm - 1, dd);
      if (dentro(d)) agregar(eventos, d, { tipo: 'siembra', texto: `${m.texto} (${p.nombre})`, detalle: `${m.detalle} Es la opción que elegiste: ${el.nombre}.`, dato: 'plan' });
    }
  }

  // --- Ventanas de siembra del catálogo para lo que siembras o tienes en el sabucán ---
  const interes = new Set([
    ...repos.siembras.todos().filter((s) => !s.eliminadaEn).map((s) => s.semillaId).filter(Boolean),
    ...(repos.kv.get('sabucan', []) || []),
  ]);
  const vistos = new Set();
  catalogo.semillas().filter((s) => interes.has(s.id) && s.ventanaSiembra).forEach((s) => {
    const clave = `${s.cultivoId}-${s.ventanaSiembra.desde}`;
    if (vistos.has(clave)) return;
    vistos.add(clave);
    const [m, d] = s.ventanaSiembra.desde.split('-').map(Number);
    if (m === mesN) agregar(eventos, new Date(anio, m - 1, d), { tipo: 'siembra', texto: `Abre la siembra de ${catalogo.cultivo(s.cultivoId).name.toLowerCase()}`, detalle: `Ventana de temporal ${catalogo.rangoVentana(s)}. ${s.source ? `Fuente: ${s.source}.` : 'Por confirmar.'}`, dato: 'catalogo' });
    const [m2, d2] = s.ventanaSiembra.hasta.split('-').map(Number);
    if (m2 === mesN) agregar(eventos, new Date(anio, m2 - 1, d2), { tipo: 'siembra', texto: `Último día recomendado para sembrar ${catalogo.cultivo(s.cultivoId).name.toLowerCase()}`, detalle: `Ventana de temporal ${catalogo.rangoVentana(s)}.`, dato: 'catalogo' });
  });

  return {
    eventos,
    temporada: t ? { ...t, evidencia } : null,
    zona,
    zonaAsumida: !activa?.zonaId,
    ultimoAnio: ultimo,
    fuentes: [...fuentes],
  };
}
