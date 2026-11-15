// Pruebas de las funciones puras del motor y de formato.
// Ejecutar desde app/: npm test   (usa node:test, sin dependencias)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { aM2, deM2, superficie, normalizar } from '../src/shared/format.js';
import { exposicion, lluviaTemporada, frecuenciaMensual, distanciaKm } from '../src/modules/climate/clima.js';
import { enVentana, mesesParaVentana } from '../src/modules/crops/catalogo.js';

const leer = (ruta) => JSON.parse(readFileSync(new URL(`../data/${ruta}`, import.meta.url), 'utf8'));
const noroeste = leer('clima/yuc-noroeste.json');
const reglas = leer('reglas.json');

test('conversiones de superficie: m², mecates y hectáreas', () => {
  assert.equal(aM2('2.37', 'ha'), 23700);
  assert.equal(aM2('15', 'mecate'), 6000);
  assert.equal(aM2('2,5', 'ha'), 25000); // coma decimal
  assert.equal(aM2('', 'ha'), null);
  assert.equal(deM2(10000, 'mecate'), 25);
  assert.equal(superficie(0), '0 m²');
});

test('normalizar quita acentos y apóstrofos', () => {
  assert.equal(normalizar("Tsek'el"), 'tsek el');
  assert.equal(normalizar('K’ÁNKAB'), 'k ankab');
});

test('exposición del maíz sembrado el 15 de junio en el Noroeste (floración)', () => {
  const etapa = reglas.cultivos.maiz.etapas.find((e) => e.sensibilidad === 'alta');
  const e = exposicion(noroeste, { mesSiembra: 6, diaSiembra: 15, desdeDia: etapa.desdeDia, hastaDia: etapa.hastaDia, umbralRacha: 5, minCalor: 3 });
  assert.equal(e.total, 28);
  assert.equal(e.conRacha, 14);
  assert.equal(e.conCalor, 2);
});

test('exposición con ventana que cruza de año no se queda en cero', () => {
  const e = exposicion(noroeste, { mesSiembra: 11, diaSiembra: 14, desdeDia: 55, hastaDia: 94, umbralRacha: 5, minCalor: 3 });
  assert.equal(e.total, 27); // el último año no tiene el año siguiente completo
  assert.ok(e.conRacha >= 25, 'enero y febrero son secos casi todos los años');
});

test('lluvia de temporada usa la mediana del pipeline y el último año', () => {
  const l = lluviaTemporada(noroeste);
  assert.equal(l.mediana, 492.25);
  assert.equal(l.ultimo.anio, 2025);
  assert.equal(l.ultimo.mm, 438.14);
});

test('frecuencia mensual de rachas en noviembre', () => {
  const f = frecuenciaMensual(noroeste, 11);
  assert.equal(f.total, 28);
  assert.equal(f.rachas, 28);
});

test('ventana de siembra de temporal', () => {
  const maiz = { ventanaSiembra: { desde: '06-01', hasta: '07-15' } };
  assert.equal(enVentana(maiz, 6, 20), true);
  assert.equal(enVentana(maiz, 7, 20), false);
  assert.equal(enVentana(maiz, 11, 14), false);
  assert.equal(mesesParaVentana(maiz, 4), 2);
});

test('distancia Umán – Hopelchén aproximada', () => {
  const km = distanciaKm({ lat: 20.834, lon: -89.787 }, { lat: 19.75, lon: -89.84 });
  assert.ok(km > 115 && km < 125);
});
