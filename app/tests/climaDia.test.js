// Pruebas de la lectura del clima por día (calendario) y de la temporada del año (menú).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { historiaDia, diaMedido, fraseProporcion, estacionDelAnio } from '../src/motor/climaDia.js';

const leer = (ruta) => JSON.parse(readFileSync(new URL(`../data/${ruta}`, import.meta.url), 'utf8'));
const sur = leer('clima/yuc-sur.json');
const temporadas = leer('catalogos/listas.json').temporadasDelAnio;

test('historia de un día: cuenta los 28 años completos y el 29 de febrero solo en bisiestos', () => {
  const h = historiaDia(sur, 11, 15);
  assert.equal(h.total, 28);
  assert.deepEqual([h.desde, h.hasta], [1998, 2025]);
  assert.ok(h.aniosRacha >= 0 && h.aniosRacha <= 28);
  assert.equal(historiaDia(sur, 2, 29).total, 7); // 2000, 2004, 2008, 2012, 2016, 2020, 2024
});

test('historia de un día: coincide con contar a mano las rachas de 5 días o más', () => {
  const f = (a) => `${a}-06-20`;
  const rachas = sur.temporadas.filter((t) => t.completa).flatMap((t) => t.rachas).filter((r) => r.dias >= 5);
  const esperado = sur.temporadas.filter((t) => t.completa && rachas.some((r) => r.inicio <= f(t.anio) && f(t.anio) <= r.fin)).length;
  assert.equal(historiaDia(sur, 6, 20, { umbralRacha: 5 }).aniosRacha, esperado);
});

test('día medido: solo con años completos en el archivo', () => {
  const d = diaMedido(sur, 2025, 11, 15);
  assert.equal(d.racha.dias, 16); // racha del 11 al 26 de noviembre de 2025
  assert.equal(diaMedido(sur, 2025, 2, 12).calor, true);
  assert.equal(diaMedido(sur, 2026, 11, 15), null); // todavía no hay datos de 2026
});

test('frases de proporción', () => {
  assert.equal(fraseProporcion(0, 28), 'ningún año');
  assert.equal(fraseProporcion(28, 28), 'todos los años');
  assert.equal(fraseProporcion(14, 28), 'cerca de la mitad de los años');
  assert.equal(fraseProporcion(1, 0), 'sin datos');
});

test('temporada del año: posición y la que sigue', () => {
  const nov = estacionDelAnio(temporadas, 11);
  assert.equal(nov.actual.id, 'nortes');
  assert.deepEqual([nov.posicion, nov.duracion, nov.mesesRestantes], [1, 4, 3]);
  assert.equal(nov.siguiente.id, 'secas');
  assert.equal(estacionDelAnio(temporadas, 10).siguiente.id, 'nortes');
});
