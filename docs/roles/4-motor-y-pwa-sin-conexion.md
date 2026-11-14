# Rol 4 — Motor y PWA sin conexión

> **Para tu IA:** eres asistente del desarrollador del motor y la PWA de jaibaSpace, equipo del NASA Space Apps Challenge 2026 en el reto *Field Shift*. Implementa `comparar(entrada, { clima, planes, reglas })` como función pura de JavaScript que compara **3 o más estrategias de rotación** con 5 criterios para una parcela de la **Península de Yucatán**, usando el clima de su zona y el ajuste de su tipo de suelo. Además, la carga de datos, la instalación, el funcionamiento sin conexión y el almacenamiento local de la parcela. No hay backend. El contexto completo está en `docs/00-contexto-general.md` y el algoritmo en `docs/contrato-datos.md` (sección 8).

## Entregable del día

> `comparar()` con los datos de clima del Rol 2 y las reglas del Rol 3, que devuelva el ranking, el detalle de cada estrategia (criterios, evidencia, beneficios, riesgos) y los datos pendientes. La PWA se instala y funciona en modo avión con todas las zonas.

## Parte A — El motor

### Firma

```js
// app/src/motor/comparar.js
export function comparar(entrada, { clima, planes, reglas }) { /* ... */ return salida; }
```

- **Pura y síncrona.** No hace `fetch`, no lee el DOM y no usa `Date.now()` salvo en el campo `generado`. Así se puede probar con Node.
- `clima` es el archivo de la zona de `entrada.parcela.ubicacion.zonaId`.
- La carga de JSON va en `app/src/datos.js`:

```js
// app/src/datos.js
export async function cargarBase() {}              // → { zonas, planes, reglas }
export async function cargarClima(zonaId) {}       // → clima de esa zona (fetch('./data/clima/<zonaId>.json'))
export async function cargarResumenPeninsula() {}  // → [{ zona, resumen }] para la vista del Rol 6
```

### Algoritmo

Es el de la sección 8 del contrato. Resumen:

1. **Preparación.**
   - Si `clima.zona.id !== entrada.parcela.ubicacion.zonaId`, lanza `Error('clima no corresponde a la zona')`.
   - `umbralRacha = reglas.rachaRelevanteDias + (reglas.suelos[tipoLocal]?.ajusteRachaDias ?? 0)`.
   - Construye dos conjuntos de fechas (`Set` de cadenas `YYYY-MM-DD`): **días secos relevantes** (rachas con `dias >= umbralRacha`) y **días de calor relevantes** (episodios con `dias >= reglas.episodioCalorRelevanteDias`), recorriendo todas las temporadas.
2. **Días críticos.** Para cada plan, año `Y` y ciclo: siembra = `Y-MM-DD`; cada etapa con `sensibilidad === "alta"` aporta los días de siembra + `desdeDia` a siembra + `hastaDia`. Si dos cultivos comparten fecha crítica, cuentan los dos. Analiza el año solo si todos sus días críticos caen en temporadas con `completa: true`.
3. **Rachas secas y calor.** Exposición del año = días críticos en el conjunto ÷ días críticos. `valor` = promedio; `puntaje = 1 − valor`; `aniosAfectados` = años con exposición mayor que 0.
4. **Cobertura.** Para cada mes del 1 al 12, el mes está cubierto si algún ciclo está en pie al menos `reglas.cobertura.diasMinimosPorMes` días. Usa un año no bisiesto de referencia; si `cosecha < siembra`, el ciclo sigue al año siguiente. `puntaje = 1 − mesesDescubierto / 12`.
5. **Atributos.** `puntaje = reglas.niveles[plan.atributos.fijacionNitrogeno]` (igual para `ingresoForraje`).
6. **Total y ranking.** `pesos = reglas.pesosPorPrioridad[entrada.prioridad]`; `puntajeTotal = Σ peso × puntaje`, redondeado a 2 decimales al final. Ordena de mayor a menor.
7. **Empates.** Por criterio, `mejores` = planes a `toleranciaEmpate[criterio]` o menos del mejor puntaje; si son todos, `sinDiferencia: true`. `recomendados` = planes a `toleranciaEmpate.total` o menos del primero.
8. **Riesgos calculados.** Agrega a `riesgos` cada cultivo con aptitud `baja` en el suelo elegido y, si `rachasSecas.valor ≥ 0.25`, una frase sobre la alta exposición en la zona.
9. **Explicaciones** en español simple, con frecuencias y no decimales:
   - Rachas: «En promedio, 6 de los 42 días críticos del maíz cayeron dentro de una racha seca de 4 días o más. Pasó en 25 de 28 años.»
   - Cobertura: «El suelo queda descubierto de noviembre a mayo.»
   - `porQue`: combina la prioridad con los criterios donde el plan es mejor o peor.
   - `comparacion.mensaje`: menciona el empate si `recomendados` tiene más de un plan.
10. **`datosPendientes`:** cada campo `null` de `entrada.parcela` y los `porConfirmar` de cada plan. Si el suelo es `null`, agrega un aviso: «Usamos el umbral general de sequía porque no indicaste tu tipo de suelo».
11. **`evidencia`:** hasta 5 traslapes por criterio y plan, primero los más largos: `anio`, `cultivo`, `etapa`, `inicio`, `fin`, `dias`, `diasTraslape`.
12. **Copia a la salida** `zona` (con `distanciaKm`), `suelo` (con `umbralRachaDias`), `fuentes`, `temporadasAnalizadas` y los tres avisos fijos del contrato.

### Validaciones y errores

- `entrada.prioridad` no está en `pesosPorPrioridad` → `Error('prioridad inválida')`.
- `entrada.planes` tiene menos de 3 ids o no incluye `"actual"` → `Error('se necesitan al menos 3 estrategias, incluida la actual')`.
- Un plan pedido no existe en `planes.json` → `Error('plan desconocido: <id>')`.
- Un `cultivo` no está en `reglas.cultivos` → sigue sin las etapas de ese ciclo y agrega un aviso.
- `suelo.tipoLocal` no está en `reglas.suelos` → trátalo como `null` y agrega un aviso.
- Sin temporadas completas → `rachasSecas.valor = null` y `estresCalor.valor = null`, con la explicación «Sin datos suficientes».

### Pruebas mínimas (Node, sin framework)

```js
// app/src/motor/comparar.test.mjs  — node app/src/motor/comparar.test.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { comparar } from './comparar.js';
const j = p => JSON.parse(readFileSync(new URL(p, import.meta.url)));
const planes = j('../../data/planes.json'), reglas = j('../../data/reglas.json');
const entrada = j('../../data/parcela-ejemplo.json');           // yuc-noroeste, tsekel, agua
const clima = j('../../data/clima/yuc-noroeste.json');
const qroo = j('../../data/clima/qroo-centro.json');
const s = comparar(entrada, { clima, planes, reglas });
const plan = id => s.planes.find(p => p.id === id);

// 4 estrategias y ranking completo
assert.equal(s.planes.length, 4);
assert.equal(s.ranking.length, 4);
// Cobertura: actual 7 meses descubiertos, cobertura 3, milpa 7, relevo 6
assert.equal(plan('actual').criterios.coberturaSuelo.mesesDescubierto, 7);
assert.equal(plan('cobertura').criterios.coberturaSuelo.mesesDescubierto, 3);
assert.equal(plan('relevo').criterios.coberturaSuelo.mesesDescubierto, 6);
// Actual y cobertura tienen los mismos días críticos → misma exposición a sequía
assert.equal(plan('actual').criterios.rachasSecas.valor, plan('cobertura').criterios.rachasSecas.valor);
// El suelo cambia el umbral: tsek'el usa 4 días, k'ankab 5
assert.equal(s.suelo.umbralRachaDias, 4);
const kankab = { ...entrada, parcela: { ...entrada.parcela, suelo: { ...entrada.parcela.suelo, tipoLocal: 'kankab' } } };
assert.ok(comparar(kankab, { clima, planes, reglas }).planes.find(p => p.id === 'actual').criterios.rachasSecas.valor
          <= plan('actual').criterios.rachasSecas.valor);
// La prioridad cambia los pesos y el primer lugar
const ingreso = comparar({ ...entrada, prioridad: 'ingreso' }, { clima, planes, reglas });
assert.notDeepEqual(ingreso.pesosAplicados, s.pesosAplicados);
assert.ok(ingreso.comparacion.recomendados.includes('milpa'));
// La zona importa: Quintana Roo se expone más a la sequía que el noroeste de Yucatán
const enQroo = { ...entrada, parcela: { ...entrada.parcela, ubicacion: { ...entrada.parcela.ubicacion, zonaId: 'qroo-centro' } } };
assert.ok(comparar(enQroo, { clima: qroo, planes, reglas }).planes.find(p => p.id === 'actual').criterios.rachasSecas.valor
          > plan('actual').criterios.rachasSecas.valor);
// Menos de 3 estrategias es error
assert.throws(() => comparar({ ...entrada, planes: ['actual', 'milpa'] }, { clima, planes, reglas }));
console.log('ok');
```

**Valores esperados con las reglas provisionales** (cálculo exploratorio sobre los datos reales de `yuc-noroeste`, suelo *tsek'el*, prioridad `agua`; tu motor debe acercarse a estos):

| Plan | Rachas secas (valor) | Calor (valor) | Meses descubiertos | Total |
|---|---:|---:|---:|---:|
| cobertura | 0.145 | 0.099 | 3 | 0.78 |
| milpa | 0.154 | 0.111 | 7 | 0.77 |
| relevo | 0.347 | 0.057 | 6 | 0.71 |
| actual | 0.145 | 0.099 | 7 | 0.68 |

Caso conocido para verificar traslapes: en 2025, la racha del 6 al 17 de junio se traslapa **3 días** con el establecimiento de un maíz sembrado el 15 de junio (del 15 al 17).

## Parte B — PWA sin conexión

### Manifest (`app/manifest.webmanifest`)

```json
{
  "name": "jaibaSpace — Rotaciones para tu parcela",
  "short_name": "jaibaSpace",
  "start_url": "./",
  "scope": "./",
  "display": "standalone",
  "lang": "es-MX",
  "background_color": "#ffffff",
  "theme_color": "#1f6f43",
  "icons": [
    { "src": "icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "icons/icon-512-maskable.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

- Usa **rutas relativas** (`./`) para que funcione en GitHub Pages bajo `/<repo>/`.

### Service worker (`app/sw.js`)

- **Precaché al instalar:** `index.html`, CSS, JS, manifest, iconos, `data/zonas.json`, `data/planes.json`, `data/reglas.json`, `data/municipios.json` y **todos los `data/clima/*.json`** (unos 850 KB las 7 zonas). Así el productor puede cambiar de zona sin conexión.
- **Estrategia:** *cache-first* para los archivos estáticos y *stale-while-revalidate* para `data/**/*.json`.
- **Versiona** el nombre de la caché (`jaiba-v1`, `jaiba-v2`, …) y borra las viejas en `activate`.
- `self.skipWaiting()` y `clients.claim()` para que la nueva versión tome el control rápido.
- Requiere **HTTPS** o `localhost`.

### Guardar la parcela en el teléfono

- `localStorage` con la clave `jaiba.parcela.v2` y el JSON de `entrada`.
- Envuelve cada lectura y escritura en `try/catch`. En modo privado puede fallar y la app debe seguir con el ejemplo.
- Si encuentras una parcela `v1`, ignórala.

```js
// app/src/almacen.js
export function guardarParcela(entrada) {}
export function cargarParcela() {}        // → entrada | null
export function borrarParcela() {}
```

### Instalación

- Escucha `beforeinstallprompt` y expón `puedeInstalar()` e `instalar()` para que el Rol 5 o el Rol 6 pongan un botón «Instalar».
- En iOS no hay aviso. Basta con un texto: «Compartir → Agregar a inicio».

## Con quién te coordinas

| Rol | Qué recibes o entregas |
|---|---|
| Rol 1 | El contrato congelado y el esqueleto. Le avisas cuando el motor pase las pruebas. |
| Rol 2 | Recibes `clima/<zona>.json`. Mientras tanto, usa el ejemplo del contrato. |
| Rol 3 | Recibes `planes.json` y `reglas.json`. Mientras tanto, usa los del contrato. |
| Rol 5 | Te llama con `comparar()`, usa `cargarBase`, `cargarClima`, `guardarParcela` y `cargarParcela`. |
| Rol 6 | Consume tu `salida` y `cargarResumenPeninsula()`. Respeta el formato exacto del contrato. |

## Criterios de terminado

- [ ] `comparar()` pasa las pruebas con los datos reales.
- [ ] La salida respeta el contrato (compárala con `app/fixtures/salida-ejemplo.json`).
- [ ] La app se instala en Android (Chrome) y aparece «Agregar a inicio» en iOS.
- [ ] En modo avión, después de la primera visita, la app abre, cambia de zona, compara y muestra resultados.
- [ ] La parcela guardada sobrevive a recargar la app.
