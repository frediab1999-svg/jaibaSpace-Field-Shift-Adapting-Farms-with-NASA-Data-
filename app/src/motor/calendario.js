// Calendario de la milpa (Inicio). Cada color dice de dónde sale el dato:
//  temporada (guinda punteado): calendario agrícola + frecuencia histórica NASA del mes
//  clima (pitaya): solo en el detalle del día, resumido de NASA POWER (motor/climaDia.js)
//  previsión (jade): fechas calculadas con tu siembra + etapas de reglas.json
//  siembra (dorado): lo que tú registraste y las ventanas de siembra del catálogo
import * as repos from '../storage/repos.js';
import * as catalogo from '../modules/crops/catalogo.js';
import * as climaMod from '../modules/climate/clima.js';
import { climaDeParcela } from '../modules/climate/climaPunto.js';
import * as reglasMod from '../modules/strategies/reglas.js';
import { sumarDias, MESES, fechaPrecisionADate, fuenteLegible } from '../shared/format.js';

export const TIPOS = {
  clima: { nombre: 'Clima', color: '#d81159', icono: 'lluvia', leyenda: null }, // solo en el detalle del día
  prevision: { nombre: 'Previsión', color: '#218380', icono: 'grafica', leyenda: 'Previsión de tu siembra' },
  siembra: { nombre: 'Siembra y cosecha', color: '#e0a020', icono: 'brote', leyenda: 'Siembra y cosecha' },
  temporada: { nombre: 'Temporada', color: '#8f2d56', icono: 'calendario', leyenda: 'Temporada' },
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
  // Sin parcela con zona no se asume ninguna: no hay clima que mostrar todavía.
  const { clima, zona, origen: origenClima } = activa ? await climaDeParcela(activa) : { clima: null, zona: null, origen: null };
  const eventos = new Map();
  const ini = new Date(anio, mesN - 1, 1);
  const fin = new Date(anio, mesN, 0);
  const dentro = (d) => d >= ini && d <= fin;
  const fuentes = new Set();

  // --- Temporada del año ---
  const t = (catalogo.listas().temporadasDelAnio || []).find((x) => x.meses.includes(mesN)) || null;
  const frec = clima ? climaMod.frecuenciaMensual(clima, mesN, { umbralRacha: reglas.rachaRelevanteDias, minCalor: reglas.episodioCalorRelevanteDias }) : null;
  const evidencia = frec ? `En ${MESES[mesN - 1]}, ${frec.rachas} de ${frec.total} años tuvieron al menos ${reglas.rachaRelevanteDias} días seguidos sin lluvia${frec.calor ? ` y ${frec.calor} tuvieron calor de ${reglas.umbralCalorC} °C o más varios días` : ''}.` : null;

  // El clima ya no se pinta como eventos del año pasado sobre las fechas de este año (confundía):
  // la pantalla lo resume por día con motor/climaDia.js, solo cuando la parcela tiene zona.
  const ultimo = clima ? climaMod.ultimoAnioCompleto(clima) : null;

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

  // --- Plan elegido en «Opciones para tu parcela» ---
  // Las fechas las calculó el motor (motor/estrategias.js) con planes.json y se guardaron con la
  // elección. Son estimaciones del plan: no son un registro de que ya se sembró.
  for (const p of parcelas) {
    const el = p.estrategiaElegida;
    for (const m of el?.marcas || []) {
      const d = dia(m.fecha);
      if (!dentro(d)) continue;
      const tipoTxt = m.tipo === 'fin_cobertura' ? 'Fin estimado de la cobertura: no es una cosecha.' : m.tipo === 'cosecha' ? 'Cosecha estimada con los días de ciclo de las reglas.' : 'Fecha de siembra del escenario.';
      agregar(eventos, d, { tipo: 'siembra', texto: `${m.texto} (${p.nombre})`, detalle: `${tipoTxt} ${m.supuesto ? `${m.supuesto} ` : ''}Viene del plan que guardaste: ${el.nombre}. Todavía no es una siembra registrada.`, dato: 'plan' });
    }
  }

  // --- Ventanas de siembra del catálogo para lo que siembras ---
  const interes = new Set(repos.siembras.todos().filter((s) => !s.eliminadaEn).map((s) => s.semillaId).filter(Boolean));
  const vistos = new Set();
  catalogo.semillas().filter((s) => interes.has(s.id) && s.ventanaSiembra).forEach((s) => {
    const clave = `${s.cultivoId}-${s.ventanaSiembra.desde}`;
    if (vistos.has(clave)) return;
    vistos.add(clave);
    const [m, d] = s.ventanaSiembra.desde.split('-').map(Number);
    if (m === mesN) agregar(eventos, new Date(anio, m - 1, d), { tipo: 'siembra', texto: `Abre la siembra de ${catalogo.cultivo(s.cultivoId).name.toLowerCase()}`, detalle: `Ventana de temporal ${catalogo.rangoVentana(s)}. ${s.source ? `Fuente: ${fuenteLegible(s.source)}.` : 'Fecha por confirmar: aún sin fuente.'}`, dato: 'catalogo' });
    const [m2, d2] = s.ventanaSiembra.hasta.split('-').map(Number);
    if (m2 === mesN) agregar(eventos, new Date(anio, m2 - 1, d2), { tipo: 'siembra', texto: `Último día recomendado para sembrar ${catalogo.cultivo(s.cultivoId).name.toLowerCase()}`, detalle: `Ventana de temporal ${catalogo.rangoVentana(s)}.`, dato: 'catalogo' });
  });

  return {
    eventos,
    temporada: t ? { ...t, evidencia } : null,
    zona,
    clima,
    origenClima,
    reglas,
    parcela: activa,
    frecuencia: frec,
    ultimoAnio: ultimo,
    fuentes: [...fuentes],
  };
}
