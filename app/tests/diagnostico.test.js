// Pruebas del diagnóstico de la tierra, de la estrategia sugerida y del clima por punto.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { estadoTierra, sugerir, porQueEstrategia, climaDeTemporada, exposicionPorFecha, fraseRazones, enPalabras, prioridadDeObjetivo } from '../src/motor/diagnostico.js';
import { procesarPower, esValido, claveDe } from '../src/modules/climate/climaPunto.js';

const leer = (ruta) => JSON.parse(readFileSync(new URL(`../${ruta}`, import.meta.url), 'utf8'));
const reglas = leer('data/reglas.json');
const tekax = leer('data/clima/yuc-sur.json');

// ---------------- Estado de la tierra ----------------
test('Pablo: 4+ años, sin descanso, con quema y mala cosecha → tierra cansada', () => {
  const e = estadoTierra({ usadaAntes: true, aniosSeguidos: '4+', descanso: 'nunca', quema: 'si', resultado: 'malo', senales: ['rinde_menos'] });
  assert.equal(e.id, 'cansada');
  assert.equal(e.puntos, 2 + 1 + 1 + 2 + 1);
  assert.equal(e.razones[0], 'lleva cuatro o más años seguidos sembrada');
});

test('Juan: tierra que nunca se ha sembrado → tierra nueva, sin puntos', () => {
  const e = estadoTierra({ usadaAntes: false, usoPrevio: 'monte' });
  assert.equal(e.id, 'nueva');
  assert.equal(e.puntos, null);
  assert.match(e.razones[0], /monte/);
});

test('cortes: 0–2 buen estado, 3–4 se está cansando, 5+ cansada', () => {
  assert.equal(estadoTierra({ usadaAntes: true, aniosSeguidos: '2-3', descanso: 'seguido', quema: 'no', resultado: 'bueno' }).id, 'buena');
  assert.equal(estadoTierra({ usadaAntes: true, aniosSeguidos: '2-3', descanso: 'nunca', quema: 'si' }).id, 'cansandose');
  assert.equal(estadoTierra({ usadaAntes: true, aniosSeguidos: '4+', resultado: 'regular', senales: ['mas_maleza', 'suelo_duro'] }).id, 'cansada');
});

test('las señales de cansancio suman como máximo 2 puntos', () => {
  const e = estadoTierra({ usadaAntes: true, senales: ['rinde_menos', 'mas_maleza', 'suelo_duro', 'se_lava'] });
  assert.equal(e.puntos, 2);
  assert.equal(e.id, 'buena');
});

test('sin responder si ya se sembró no hay diagnóstico', () => {
  assert.equal(estadoTierra({}).id, 'sin_dato');
  assert.equal(sugerir({ estado: estadoTierra({}) }).sugerida, null);
});

test('«No sé» no suma ni resta: queda como dato faltante', () => {
  const e = estadoTierra({ usadaAntes: true, aniosSeguidos: 'no_se' });
  assert.deepEqual(e.faltan.includes('aniosSeguidos'), true);
  assert.equal(e.puntos, 0);
});

// ---------------- Estrategia sugerida ----------------
test('siempre se muestran las tres estrategias principales, incluida la actual', () => {
  for (const id of ['nueva', 'buena', 'cansandose', 'cansada', 'sin_dato']) {
    for (const prioridad of [null, 'agua', 'ingreso', 'suelo']) {
      const s = sugerir({ estado: { id }, prioridad });
      assert.deepEqual([...s.orden].sort(), ['actual', 'cobertura', 'milpa-canavalia']);
    }
  }
});

test('tierra cansada: se sugiere el ciclo de cobertura; si necesita cosechar, la intercalada', () => {
  assert.equal(sugerir({ estado: { id: 'cansada' }, prioridad: 'suelo' }).sugerida, 'cobertura');
  const s = sugerir({ estado: { id: 'cansada' }, prioridad: 'agua' });
  assert.equal(s.sugerida, 'milpa-canavalia');
  assert.equal(s.notas.length, 1);
});

test('tierra nueva: intercalada, sin quema y con franjas de monte si se abre monte', () => {
  const s = sugerir({ estado: { id: 'nueva' }, usoPrevio: 'monte', desmonte: 'todo' });
  assert.equal(s.sugerida, 'milpa-canavalia');
  assert.equal(s.notas.length, 2);
  assert.equal(s.mostrarSoya, false);
  assert.match(porQueEstrategia('actual', { estado: { id: 'nueva' }, sugerencia: s }), /normalmente/);
});

test('la soya solo aparece con suelo rojo verificado, prioridad de ingreso y nunca en tierra nueva', () => {
  assert.equal(sugerir({ estado: { id: 'buena' }, prioridad: 'ingreso', sueloReglasId: 'luvisol' }).mostrarSoya, true);
  assert.equal(sugerir({ estado: { id: 'buena' }, prioridad: 'ingreso', sueloReglasId: 'leptosol' }).mostrarSoya, false);
  assert.equal(sugerir({ estado: { id: 'nueva' }, prioridad: 'ingreso', sueloReglasId: 'luvisol' }).mostrarSoya, false);
});

test('objetivo del productor → prioridad de reglas.json', () => {
  assert.equal(prioridadDeObjetivo('comer'), 'agua');
  assert.equal(prioridadDeObjetivo('vender'), 'ingreso');
  assert.equal(prioridadDeObjetivo('cuidar'), 'suelo');
  for (const p of ['agua', 'ingreso', 'suelo']) assert.ok(reglas.prioridades[p]);
});

test('frases sin tecnicismos', () => {
  assert.equal(fraseRazones(['a', 'b', 'c']), 'A, b y c');
  assert.equal(enPalabras(0, 28), 'ningún año');
  assert.equal(enPalabras(27, 28), 'casi todos los años');
});

// ---------------- Clima y fecha de siembra ----------------
test('clima de la temporada en Tekax: cuenta años, no días', () => {
  const c = climaDeTemporada(tekax, reglas);
  assert.equal(c.total, 28);
  assert.ok(c.aniosRacha > 0 && c.aniosRacha <= 28);
  assert.equal(c.desde, 1998);
});

test('la fecha de siembra cambia la exposición: el 15 de julio es la peor en Tekax', () => {
  const r = exposicionPorFecha({ clima: tekax, reglas, fechas: ['06-01', '06-15', '07-01', '07-15'] });
  assert.equal(r.fechas.length, 4);
  const jul15 = r.fechas.find((f) => f.valor === '07-15');
  assert.equal(jul15.aniosConRacha, 28); // README: con el 15 de julio, 28 de 28 años
  assert.notEqual(r.mejor.valor, '07-15');
  assert.ok(r.mejor.aniosConRacha <= Math.min(...r.fechas.map((f) => f.aniosConRacha)));
});

// ---------------- Clima del punto (NASA POWER) ----------------
function rawSintetico() {
  const lluvia = {};
  const tmax = {};
  for (const a of [2023, 2024]) {
    for (let d = new Date(Date.UTC(a, 0, 1)); d.getUTCFullYear() === a; d.setUTCDate(d.getUTCDate() + 1)) {
      const k = d.toISOString().slice(0, 10).replaceAll('-', '');
      const md = d.toISOString().slice(5, 10);
      lluvia[k] = md >= '06-10' && md <= '06-20' ? 0 : 5;
      tmax[k] = md >= '05-01' && md <= '05-04' ? 36 : 31;
    }
  }
  return { header: { fill_value: -999, api: { version: 'v-test' } }, geometry: { coordinates: [-89.5, 19.8, 90] }, parameters: {}, properties: { parameter: { IMERG_PRECTOT: lluvia, T2M_MAX: tmax } } };
}

test('el clima del punto se procesa igual que data-pipeline/clima.py', () => {
  const doc = procesarPower(rawSintetico(), 19.8, -89.5, '2026-11-15');
  assert.ok(esValido(doc));
  const t = doc.temporadas[0];
  assert.equal(t.completa, true);
  assert.deepEqual(t.rachas, [{ inicio: '2023-06-10', fin: '2023-06-20', dias: 11 }]);
  assert.deepEqual(t.episodiosCalor, [{ inicio: '2023-05-01', fin: '2023-05-04', dias: 4 }]);
  assert.equal(t.ventana.rachaMasLarga.dias, 11);
  assert.equal(doc.resumen.aniosCompletos, 2);
  assert.equal(doc.zona.id, 'punto');
});

test('un día sin dato corta la racha y deja el año incompleto', () => {
  const raw = rawSintetico();
  raw.properties.parameter.IMERG_PRECTOT['20230615'] = -999;
  const t = procesarPower(raw, 19.8, -89.5).temporadas[0];
  assert.equal(t.completa, false);
  assert.deepEqual(t.rachas.map((r) => r.dias), [5, 5]);
});

test('la clave del punto redondea a 2 decimales (~1 km)', () => {
  assert.equal(claveDe({ lat: 19.81234, lon: -89.47021 }), '19.81,-89.47');
  assert.equal(claveDe(null), null);
});
