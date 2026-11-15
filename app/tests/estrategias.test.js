// Pruebas del motor de comparación («Opciones para tu parcela») y de los datos publicados.
// Ejecutar desde app/: npm test   (node:test, sin dependencias)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  normalizarPlan, tipoDePlan, intervalosDelPlan, coberturaMensual, eventosRelevantes,
  exposicionEtapa, exposicionPlan, compararEstrategias, diaNum, isoDeDiaNum,
} from '../src/motor/estrategias.js';
import { armarComparacion, planDePractica, opcionesDeSiembra } from '../src/motor/comparacion.js';
import { validarPaquete, validarDocumento, REQUERIDOS } from '../src/services/contenido.js';

const leer = (ruta) => JSON.parse(readFileSync(new URL(`../${ruta}`, import.meta.url), 'utf8'));
const zonas = leer('data/zonas.json');
const planesDoc = leer('data/planes.json');
const reglas = leer('data/reglas.json');
const tekax = leer('data/clima/yuc-sur.json');
const uman = leer('tests/fixtures/clima-uman-control.json');
const plan = (id) => planesDoc.planes.find((p) => p.id === id);
const redondear = (x, d = 3) => Math.round(x * 10 ** d) / 10 ** d;

// ---------------------------------------------------------------------
// Datos publicados: coordenadas y correspondencia zona–dataset
// ---------------------------------------------------------------------
test('cada zona resuelve su archivo de clima, con el mismo id y el mismo punto que consulta a NASA', () => {
  assert.deepEqual(zonas.zonas.map((z) => z.id), ['yuc-sur', 'camp-chenes', 'qroo-centro']);
  const esperado = { 'yuc-sur': [19.8122, -89.4702], 'camp-chenes': [19.75, -89.84], 'qroo-centro': [19.58, -88.05] };
  for (const z of zonas.zonas) {
    const clima = leer(`data/${z.archivoClima}`);
    assert.equal(clima.zona.id, z.id);
    assert.deepEqual([z.punto.lat, z.punto.lon], esperado[z.id]);
    assert.deepEqual([clima.ubicacion.lat, clima.ubicacion.lon], esperado[z.id]);
    for (const fuente of Object.values(clima.fuentes)) {
      const q = new URL(fuente.url).searchParams;
      // En la URL de NASA cada número va con su nombre: latitude y longitude no se pueden invertir sin que esto falle
      assert.equal(Number(q.get('latitude')), z.punto.lat);
      assert.equal(Number(q.get('longitude')), z.punto.lon);
      assert.equal(q.get('time-standard'), 'UTC');
    }
    assert.equal(clima.fuentes.lluvia.parametro, 'IMERG_PRECTOT');
    assert.equal(clima.fuentes.temperatura.parametro, 'T2M_MAX');
    assert.equal(clima.temporadas.length, 28);
    assert.equal(new Set(clima.temporadas.map((t) => t.anio)).size, 28, 'sin años duplicados');
    assert.deepEqual([clima.temporadas[0].anio, clima.temporadas[27].anio], [1998, 2025]);
    assert.ok(clima.temporadas.every((t) => t.completa === (t.diasConDato === t.diasEsperados)));
  }
});

test('el punto de Umán del caso de control no es el de Muna ni el de la zona publicada', () => {
  assert.deepEqual([uman.ubicacion.lat, uman.ubicacion.lon], [20.834, -89.787]);
  assert.notDeepEqual([uman.ubicacion.lat, uman.ubicacion.lon], [20.49, -89.75]);
  assert.equal(zonas.zonas.some((z) => z.id === uman.zona.id), false, 'Umán ya no es una zona publicada: solo es un caso de control');
});

// ---------------------------------------------------------------------
// Casos reproducibles
// ---------------------------------------------------------------------
test('caso de control de Umán: 14 de 28 temporadas con racha de 5 días o más en la etapa sensible del maíz', () => {
  // Entradas originales (reglas.json del commit 039c237): maíz sembrado el 15 de junio,
  // etapa intermedia del día 55 al 94, racha relevante de 5 días, día seco < 1 mm (dataset).
  const eventos = eventosRelevantes(uman, 'rachas', 5);
  const r = exposicionEtapa(uman, { mesSiembra: 6, diaSiembra: 15, desdeDia: 55, hastaDia: 94, eventos });
  assert.equal(r.aniosEvaluados, 28);
  assert.equal(r.aniosConCoincidencia, 14);
  assert.equal(redondear(r.proporcionDias), 0.086);
  // Con las etapas actuales (Sac Beh, 80–129) el resultado cambia: no es el mismo caso
  const hoy = exposicionEtapa(uman, { mesSiembra: 6, diaSiembra: 15, desdeDia: 80, hastaDia: 129, eventos });
  assert.notEqual(hoy.aniosConCoincidencia, 14);
});

test('Tekax: el motor reproduce los resultados publicados por el Rol 3 (v7)', () => {
  const r = compararEstrategias({ planes: [plan('actual'), plan('cobertura'), plan('otro-grano')], reglas, clima: tekax, anioBase: 2027 });
  const [actual, cobertura, soya] = r.estrategias;
  assert.deepEqual([actual.cobertura.meses, cobertura.cobertura.meses, soya.cobertura.meses], [10, 10, 9]);
  assert.deepEqual([actual.agua.aniosConCoincidencia, actual.agua.aniosEvaluados], [25, 28]);
  assert.equal(redondear(actual.agua.proporcionDias), 0.211);
  assert.equal(redondear(cobertura.agua.proporcionDias), 0.211);
  assert.deepEqual([soya.agua.aniosConCoincidencia, redondear(soya.agua.proporcionDias)], [27, 0.157]);
  assert.deepEqual([redondear(actual.calor.proporcionDias), redondear(soya.calor.proporcionDias)], [0.006, 0.018]);
  assert.equal(r.ventana.desde, '2027-06');
  assert.equal(r.ventana.hasta, '2029-05');
});

// ---------------------------------------------------------------------
// Estrategias, ciclos y cultivos asociados
// ---------------------------------------------------------------------
test('una asociación son varios cultivos en un ciclo; una rotación cambia el cultivo entre ciclos', () => {
  assert.equal(tipoDePlan(normalizarPlan(plan('actual'))), 'continuo');
  assert.equal(tipoDePlan(normalizarPlan(plan('milpa-canavalia'))), 'asociacion');
  assert.equal(tipoDePlan(normalizarPlan(plan('cobertura'))), 'rotacion');
  const intercalada = normalizarPlan(plan('milpa-canavalia'));
  assert.deepEqual(intercalada.ciclos.map((c) => c.cultivos.map((x) => x.cultivo)), [['maiz', 'canavalia'], ['maiz', 'canavalia']]);
});

test('el fin de la canavalia es fin de cobertura, nunca cosecha', () => {
  for (const id of ['milpa-canavalia', 'cobertura']) {
    const cultivos = normalizarPlan(plan(id)).ciclos.flatMap((c) => c.cultivos);
    assert.ok(cultivos.filter((c) => c.cultivo === 'canavalia').every((c) => c.tipoFin === 'fin_cobertura'));
    assert.ok(cultivos.filter((c) => c.cultivo === 'maiz').every((c) => c.tipoFin === 'cosecha'));
  }
  const r = compararEstrategias({ planes: [plan('cobertura')], reglas, clima: tekax, anioBase: 2027 });
  const marcas = r.estrategias[0].marcas;
  assert.deepEqual(marcas.filter((m) => m.cultivo === 'canavalia').map((m) => m.tipo), ['siembra', 'fin_cobertura']);
  assert.equal(marcas.find((m) => m.tipo === 'fin_cobertura').fecha, '2027-10-30');
});

test('cultivos asociados: los días con dos cultivos en pie se cuentan una sola vez', () => {
  const intervalos = intervalosDelPlan(normalizarPlan(plan('milpa-canavalia')), { anioBase: 2027 });
  const c = coberturaMensual(intervalos, { inicio: { anio: 2027, mes: 6 }, meses: 24, diasMinimos: 15 });
  // junio: del 15 al 30 = 16 días; julio a octubre completos; noviembre: del 1 al 29 (fin de la canavalia)
  assert.deepEqual(c.diasPorMes.slice(0, 7), [16, 31, 31, 30, 31, 29, 0]);
  assert.ok(c.diasPorMes.every((d, i) => d <= [30, 31, 31, 30, 31, 30, 31, 31, 29, 31, 30, 31][i % 12]), 'ningún mes pasa de sus días');
  assert.equal(c.meses, 12);
});

test('tres opciones con la misma ventana de 24 meses: 10, 12 y 10 meses con las fechas publicadas', () => {
  const r = compararEstrategias({ planes: [plan('actual'), plan('milpa-canavalia'), plan('cobertura')], reglas, clima: tekax, anioBase: 2027 });
  assert.deepEqual(r.estrategias.map((e) => e.cobertura.meses), [10, 12, 10]);
  assert.ok(r.estrategias.every((e) => e.cobertura.ventana.desde === '2027-06' && e.cobertura.de === 24));
  assert.deepEqual(r.estrategias.map((e) => e.masMeses), [false, true, false]);
});

test('diferencia de método: el calendario ilustrativo anterior da 17 meses de enero a diciembre y 20 desde junio', () => {
  // Calendario anterior (ya retirado): maíz 15-jun a 5-nov y canavalia 15-jul a 31-mar del año siguiente
  const viejo = normalizarPlan({ id: 'x', ciclos: [1, 2].map((numero) => ({ numero, cultivos: [
    { cultivo: 'maiz', siembra: '06-15', fin: '11-05' },
    { cultivo: 'canavalia', siembra: '07-15', fin: '03-31', proposito: 'cobertura' },
  ] })) });
  const intervalos = intervalosDelPlan(viejo, { anioBase: 2027 });
  assert.equal(coberturaMensual(intervalos, { inicio: { anio: 2027, mes: 1 } }).meses, 17);
  assert.equal(coberturaMensual(intervalos, { inicio: { anio: 2027, mes: 6 } }).meses, 20);
});

test('un mes cuenta con 15 días de cultivo en pie y no con 14', () => {
  const de = (dia) => coberturaMensual([{ ini: diaNum(2027, 6, dia), fin: diaNum(2027, 6, 30) }], { inicio: { anio: 2027, mes: 6 }, meses: 1 });
  assert.deepEqual([de(16).diasPorMes[0], de(16).meses], [15, 1]);
  assert.deepEqual([de(17).diasPorMes[0], de(17).meses], [14, 0]);
});

// ---------------------------------------------------------------------
// Periodos que cruzan el año, años válidos e indicadores sin evidencia
// ---------------------------------------------------------------------
test('un cultivo que cruza el año termina el año siguiente y sus meses cuentan', () => {
  const p = normalizarPlan({ id: 'x', ciclos: [{ numero: 1, cultivo: 'maiz', siembra: '11-15', cosecha: '03-15' }] });
  const [i] = intervalosDelPlan(p, { anioBase: 2027 });
  assert.deepEqual([isoDeDiaNum(i.ini), isoDeDiaNum(i.fin)], ['2027-11-15', '2028-03-15']);
  const c = coberturaMensual([i], { inicio: { anio: 2027, mes: 11 }, meses: 6 });
  assert.deepEqual(c.porMes, [true, true, true, true, true, false]); // nov (16), dic, ene, feb, mar (15), abr
  assert.equal(c.diasPorMes[3], 29, 'febrero de 2028 es bisiesto');
});

test('una etapa que cruza el año necesita los dos años completos; el último no se evalúa', () => {
  const eventos = eventosRelevantes(tekax, 'rachas', 5);
  const r = exposicionEtapa(tekax, { mesSiembra: 11, diaSiembra: 14, desdeDia: 55, hastaDia: 94, eventos });
  assert.equal(r.aniosEvaluados, 27);
  assert.deepEqual(r.noEvaluados, [2025]);
  assert.ok(r.aniosConCoincidencia >= 25, 'enero y febrero son secos casi todos los años');
});

const climaSintetico = (temporadas) => ({ temporadas: temporadas.map((t) => ({ completa: true, diasConDato: 365, diasEsperados: 365, rachas: [], episodiosCalor: [], ...t })) });

test('una racha partida por el 31 de diciembre se vuelve a unir antes de medir su duración', () => {
  const clima = climaSintetico([
    { anio: 2001, rachas: [{ inicio: '2001-12-29', fin: '2001-12-31', dias: 3 }] },
    { anio: 2002, rachas: [{ inicio: '2002-01-01', fin: '2002-01-03', dias: 3 }, { inicio: '2002-03-01', fin: '2002-03-04', dias: 4 }] },
  ]);
  const eventos = eventosRelevantes(clima, 'rachas', 5);
  assert.equal(eventos.length, 1, 'dos pedazos de 3 días son una racha de 6; la de 4 días no cuenta');
  assert.equal(eventos[0].fin - eventos[0].ini + 1, 6);
});

test('un año con datos incompletos no se evalúa: no cuenta como año sin racha', () => {
  const rachas = (anio) => [{ inicio: `${anio}-07-01`, fin: `${anio}-07-10`, dias: 10 }];
  const completo = climaSintetico([{ anio: 2001, rachas: rachas(2001) }, { anio: 2002, rachas: rachas(2002) }, { anio: 2003, rachas: rachas(2003) }]);
  const conFaltante = climaSintetico([
    { anio: 2001, rachas: rachas(2001) },
    { anio: 2002, rachas: [], completa: false, diasConDato: 300 }, // faltan 65 días: no sabemos dónde
    { anio: 2003, rachas: rachas(2003) },
  ]);
  const medir = (clima) => exposicionEtapa(clima, { mesSiembra: 6, diaSiembra: 15, desdeDia: 10, hastaDia: 29, eventos: eventosRelevantes(clima, 'rachas', 5) });
  const a = medir(completo);
  const b = medir(conFaltante);
  assert.deepEqual([a.aniosConCoincidencia, a.aniosEvaluados], [3, 3]);
  assert.deepEqual([b.aniosConCoincidencia, b.aniosEvaluados, b.noEvaluados], [2, 2, [2002]]);
  assert.equal(b.proporcionDias, a.proporcionDias, 'el año sin datos no baja el promedio como si fuera un cero');
});

test('sin evidencia el indicador queda «sin estimación»: nunca riesgo cero', () => {
  const soloCanavalia = normalizarPlan({ id: 'x', ciclos: [{ numero: 1, cultivo: 'canavalia', siembra: '06-15', cosecha: '10-30', proposito: 'cobertura' }] });
  const a = exposicionPlan(soloCanavalia, tekax, reglas, 'agua');
  assert.deepEqual([a.sinEstimacion, a.motivo, a.proporcionDias], [true, 'sin_etapa_sensible', undefined]);
  const sinReglas = normalizarPlan({ id: 'x', ciclos: [{ numero: 1, cultivo: 'frijol', siembra: '06-15', cosecha: '09-15' }] });
  assert.equal(exposicionPlan(sinReglas, tekax, reglas, 'agua').motivo, 'sin_reglas');
  const sinAnios = climaSintetico([{ anio: 2001, completa: false, diasConDato: 0 }]);
  assert.equal(exposicionPlan(normalizarPlan(plan('actual')), sinAnios, reglas, 'agua').motivo, 'sin_anios_evaluables');
  const sinClima = compararEstrategias({ planes: [plan('actual')], reglas, clima: null, anioBase: 2027 }).estrategias[0];
  assert.deepEqual([sinClima.agua.sinEstimacion, sinClima.agua.motivo, sinClima.cobertura.meses], [true, 'sin_clima', 10]);
  // En el plan con canavalia y maíz, el resumen dice qué cultivo se evaluó y cuál no
  const cobertura = exposicionPlan(normalizarPlan(plan('cobertura')), tekax, reglas, 'agua');
  assert.deepEqual(cobertura.porCultivo.map((c) => [c.cultivo, c.sinEstimacion]), [['canavalia', true], ['maiz', false]]);
});

// ---------------------------------------------------------------------
// Comparación de una parcela: práctica registrada, plantilla y escenario
// ---------------------------------------------------------------------
const base = { planesDoc, reglas, clima: tekax, zona: zonas.zonas[0], hoy: { anio: 2026, mes: 11 }, ventanaSiembra: { desde: '06-01', hasta: '07-15' } };
const milpa = [
  { nombre: 'Maíz', reglasId: 'maiz', fecha: { anio: 2026, mes: 6, dia: 15, precision: 'dia' } },
  { nombre: 'Frijol', reglasId: null, fecha: { anio: 2026, mes: 6, dia: 20, precision: 'dia' } },
  { nombre: 'Calabaza', reglasId: null, fecha: { anio: 2026, mes: 6, dia: 20, precision: 'dia' } },
];

test('las tres opciones de la demo salen del motor y en orden: práctica, intercalada, ciclo de cobertura', () => {
  const r = armarComparacion({ ...base, declaradas: milpa, temporadaAnio: 2026 });
  assert.deepEqual(r.principales.map((e) => e.id), ['actual', 'milpa-canavalia', 'cobertura']);
  assert.deepEqual(r.secundarias.map((e) => e.id), ['otro-grano']);
  assert.deepEqual(r.principales.map((e) => e.cobertura.meses), [10, 12, 10]);
  assert.equal(r.escenario.anioBase, 2027);
  assert.equal(r.ventana.desde, '2027-06');
  assert.deepEqual([r.clima.periodo.desde, r.clima.periodo.hasta, r.clima.aniosCompletos], [1998, 2025, 28]);
});

test('práctica registrada: se conserva lo declarado y se dice qué cubre el cálculo', () => {
  const p = planDePractica({ declaradas: milpa, temporadaAnio: 2026, reglas, planesDoc });
  assert.equal(p.origen, 'registrada');
  assert.equal(p.esPlantilla, false);
  assert.deepEqual(p.declarados, ['Maíz', 'Frijol', 'Calabaza']);
  assert.deepEqual(p.sinReglas, ['Frijol', 'Calabaza']);
  assert.deepEqual(p.ciclos[0].cultivos.map((c) => [c.cultivo, c.siembra, c.fin, c.tipoFin]), [['maiz', '06-15', '11-12', 'cosecha']]);
});

test('si solo se conoce el mes de siembra se usa el día 15 y se declara como supuesto', () => {
  const p = planDePractica({ declaradas: [{ nombre: 'Maíz', reglasId: 'maiz', fecha: { anio: 2025, mes: 7, dia: null, precision: 'mes' } }], reglas, planesDoc });
  assert.equal(p.ciclos[0].cultivos[0].siembra, '07-15');
  assert.equal(p.ciclos[0].cultivos[0].precisionSiembra, 'mes');
  assert.match(p.supuestosPractica[0], /día 15/);
});

test('sin práctica registrada o sin reglas para evaluarla se usa «Maíz continuo de ejemplo» como plantilla', () => {
  const vacia = planDePractica({ declaradas: [], reglas, planesDoc });
  assert.deepEqual([vacia.nombre, vacia.esPlantilla, vacia.motivoPlantilla], ['Maíz continuo de ejemplo', true, 'sin_registro']);
  const chile = planDePractica({ declaradas: [{ nombre: 'Chile', reglasId: null, fecha: null }], reglas, planesDoc });
  assert.deepEqual([chile.esPlantilla, chile.motivoPlantilla, chile.declarados], [true, 'sin_reglas', ['Chile']]);
});

test('los resultados cambian cuando cambia una entrada: no son números fijos', () => {
  const junio = armarComparacion({ ...base, declaradas: [] });
  const julio = armarComparacion({ ...base, declaradas: [], siembraEscenario: '07-15' });
  const [a, b] = [junio.principales[0], julio.principales[0]];
  assert.equal(junio.escenario.siembra, '06-15');
  assert.equal(julio.escenario.desplazamientoDias, 30);
  assert.equal(a.intervalos[0].inicioIso, '2027-06-15');
  assert.equal(b.intervalos[0].inicioIso, '2027-07-15');
  assert.notEqual(a.agua.proporcionDias, b.agua.proporcionDias);
  assert.notDeepEqual(a.cobertura.diasPorMes, b.cobertura.diasPorMes);
  assert.equal(julio.ventana.desde, '2027-07', 'la ventana empieza en el mes de la primera siembra del escenario');
  // Otra zona, otros números: el clima sí entra al cálculo
  const chenes = armarComparacion({ ...base, declaradas: [], clima: leer('data/clima/camp-chenes.json'), zona: zonas.zonas[1] });
  assert.notEqual(chenes.principales[0].agua.proporcionDias, a.agua.proporcionDias);
  assert.equal(chenes.fueraDeAmbito, true, 'las reglas agrícolas se revisaron para Tekax');
  // Otra regla, otro resultado
  const estricta = armarComparacion({ ...base, declaradas: [], reglas: { ...reglas, rachaRelevanteDias: 10 } });
  assert.ok(estricta.principales[0].agua.aniosConCoincidencia < a.agua.aniosConCoincidencia);
});

test('la fecha registrada por el productor es el escenario por defecto y se puede probar otra', () => {
  const registrada = [{ nombre: 'Maíz', reglasId: 'maiz', fecha: { anio: 2026, mes: 6, dia: 28, precision: 'dia' } }];
  const r = armarComparacion({ ...base, declaradas: registrada });
  assert.deepEqual([r.escenario.siembra, r.escenario.origen, r.escenario.registrada], ['06-28', 'registrada', '06-28']);
  assert.equal(r.principales[0].intervalos[0].inicioIso, '2027-06-28');
  assert.equal(r.principales[1].intervalos[0].inicioIso, '2027-06-28', 'los planes publicados se mueven a la misma fecha');
  assert.ok(opcionesDeSiembra({ ventana: base.ventanaSiembra, base: '06-15', registrada: '06-28' }).some((o) => o.valor === '06-28' && o.esRegistrada));
});

test('sin zona de clima: hay meses por calendario y la exposición queda sin estimación', () => {
  const r = armarComparacion({ ...base, declaradas: [], clima: null, zona: null });
  assert.equal(r.sinZona, true);
  assert.ok(r.principales.every((e) => e.agua.sinEstimacion && e.calor.sinEstimacion));
  assert.deepEqual(r.principales.map((e) => e.cobertura.meses), [10, 12, 10]);
});

test('suelo: sin equivalencia verificada no se aplica la regla; con Leptosol la soya no se recomienda', () => {
  const soya = (sueloReglasId) => armarComparacion({ ...base, declaradas: [], sueloReglasId }).secundarias[0].suelo.estado;
  assert.equal(soya(null), 'sin_dato');
  assert.equal(soya('luvisol'), 'apta');
  assert.equal(soya('leptosol'), 'no_recomendable');
  assert.equal(armarComparacion({ ...base, declaradas: [], sueloReglasId: 'leptosol' }).principales[1].suelo.estado, 'no_aplica', 'la canavalia no tiene aptitud por suelo documentada');
});

// ---------------------------------------------------------------------
// Paquete de datos del servidor: no mezclar cargas incompatibles
// ---------------------------------------------------------------------
test('el paquete se rechaza si falta un documento o si el clima no es el de la zona', () => {
  const documentos = Object.fromEntries(REQUERIDOS.map((r) => [r, leer(`data/${r}`)]));
  for (const z of zonas.zonas) documentos[z.archivoClima] = leer(`data/${z.archivoClima}`);
  assert.equal(validarPaquete(documentos), null);
  for (const [id, doc] of Object.entries(documentos)) assert.equal(validarDocumento(id, doc), null, id);
  const { 'reglas.json': _, ...sinReglas } = documentos;
  assert.match(validarPaquete(sinReglas), /falta reglas\.json/);
  assert.match(validarPaquete({ ...documentos, 'clima/yuc-sur.json': documentos['clima/camp-chenes.json'] }), /es de la zona camp-chenes/);
  assert.match(validarPaquete({ ...documentos, 'clima/yuc-sur.json': { ...uman, zona: { id: 'yuc-sur' } } }), /no corresponde al punto/);
  assert.match(validarDocumento('clima/yuc-sur.json', { zona: {} }), /clima sin/);
});
