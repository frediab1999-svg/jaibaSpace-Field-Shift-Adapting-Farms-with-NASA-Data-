# Rol 4 — Motor y PWA sin conexión

> **Para tu IA:** eres asistente del desarrollador del motor y la PWA de jaibaSpace, equipo del NASA Space Apps Challenge 2026 en el reto *Field Shift*. Debes implementar `comparar(entrada, { clima, planes, reglas })` como **función pura de JavaScript** según `docs/contrato-datos.md` (secciones 4, 5 y 6). También debes hacer que la app se instale, funcione sin conexión y guarde la parcela en el teléfono. No hay backend. El contexto completo está en `docs/00-contexto-general.md`.

## Entregable del día

> Implementa `comparar(entrada)` con los datos del Rol 2 y las reglas del Rol 3. Devuelve ambos planes, la explicación por criterio y los datos de la parcela que falta confirmar. Configura la instalación, el funcionamiento sin conexión y el guardado de la parcela en el teléfono.

## Parte A — El motor

### Firma

```js
// app/src/motor/comparar.js
export function comparar(entrada, { clima, planes, reglas }) { /* ... */ return salida; }
```

- **Pura y síncrona.** No hace `fetch`, no lee el DOM y no usa `Date.now()` salvo en el campo `generado`. Así se puede probar con Node y con los archivos de ejemplo.
- La carga de los JSON va en otro módulo, por ejemplo `app/src/datos.js`, que hace `fetch('./data/clima.json')` y deja que el *service worker* lo sirva desde la caché.

### Algoritmo

Es el mismo de la sección 6 del contrato:

1. **Fechas de las etapas.** Para cada plan, ciclo y temporada completa (`ventana.diasConDato === ventana.diasEsperados`):
   - siembra = `anio-MM-DD` del ciclo,
   - inicio de la etapa = siembra + `desdeDia`,
   - fin de la etapa = siembra + `hastaDia`.
   - Si `cosecha < siembra`, el ciclo termina al año siguiente.
2. **Traslapes.** Toma las `temporadas[].rachas` con `dias >= reglas.rachaRelevanteDias`. Un traslape es `max(0, min(fin) − max(inicio) + 1)` días.
3. **Rachas secas.**
   - Una temporada está afectada si se traslapa al menos una etapa con `sensibilidad === "alta"`.
   - `valor = afectadas / analizadas` y `puntaje = 1 − valor`.
4. **Cobertura.**
   - Para cada mes del 1 al 12, el mes está cubierto si algún ciclo está en pie al menos `reglas.cobertura.diasMinimosPorMes` días. Usa un año no bisiesto de referencia.
   - `puntaje = 1 − mesesDescubierto / 12`.
5. **Total.** `pesos = reglas.pesosPorPrioridad[entrada.prioridad]` y `puntajeTotal = Σ peso × puntaje`.
6. **Comparación.** Para cada criterio, si `|a − b| <= toleranciaEmpate[criterio]` el resultado es `"empate"`. Si no, gana el `id` con mejor resultado. Haz lo mismo para `recomendado` con `toleranciaEmpate.total`.
7. **Explicaciones** en español simple y con números concretos:
   - Rachas secas: «En 5 de 28 temporadas, la floración del maíz coincidió con una racha seca de 5 días o más.»
   - Cobertura: «El suelo queda descubierto de noviembre a mayo.»
   - `porQue`: combina la prioridad con los criterios. Si hay empate en rachas, dilo explícitamente.
8. **`datosPendientes`:** junta cada campo `null` de `entrada.parcela` y los `porConfirmar` de cada plan.
9. **`evidencia`:** guarda hasta 5 traslapes por plan, primero los más largos. Usa `anio`, `etapa`, `rachaInicio`, `rachaFin`, `diasRacha` y `diasTraslape`.
10. **Copia a la salida:**
    - `fuente` y `temporadasAnalizadas`, tomados de `clima`,
    - el aviso «Comparación de exposición histórica; no es un pronóstico de cosecha.»

### Validaciones y errores

- Si `entrada.prioridad` no está en `pesosPorPrioridad`, lanza `Error('prioridad inválida')`.
- Si un `cultivo` de un plan no está en `reglas.cultivos`, sigue sin las etapas de ese ciclo y agrega un aviso en `avisos`.
- Si no hay temporadas completas, `rachasSecas.valor = null` con la explicación «Sin datos suficientes».

### Pruebas mínimas (Node, sin framework)

```js
// app/src/motor/comparar.test.mjs  — node app/src/motor/comparar.test.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { comparar } from './comparar.js';
const j = p => JSON.parse(readFileSync(new URL(p, import.meta.url)));
const datos = { clima: j('../../data/clima.json'), planes: j('../../data/planes.json'), reglas: j('../../data/reglas.json') };
const entrada = j('../../data/parcela-ejemplo.json');

const s = comparar(entrada, datos);
assert.equal(s.planes.length, 2);
assert.ok(['actual', 'rotacion', 'empate'].includes(s.comparacion.rachasSecas));
// Mismo maíz y mismas fechas en ambos planes → empate en rachas
// (si el Rol 3 cambia las fechas, ajusta esta prueba)
// Plan actual con maíz del 15 de junio al 31 de octubre → 7 meses descubiertos
assert.equal(s.planes.find(p => p.id === 'actual').criterios.coberturaSuelo.mesesDescubierto, 7);
// Cambiar la prioridad cambia los pesos
assert.notDeepEqual(comparar({ ...entrada, prioridad: 'cobertura' }, datos).pesosAplicados, s.pesosAplicados);
console.log('ok');
```

Caso conocido para verificar los traslapes: en 2025, la racha del 6 al 17 de junio se traslapa **3 días** con el establecimiento de un maíz sembrado el 15 de junio (del 15 al 17 de junio).

## Parte B — PWA sin conexión

### Manifest (`app/manifest.webmanifest`)

```json
{
  "name": "jaibaSpace — Compara tu parcela",
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

- **Precaché al instalar:** `index.html`, CSS, JS, `manifest`, iconos y **todos los `data/*.json`**.
- **Estrategia:**
  - *cache-first* para los archivos estáticos,
  - *stale-while-revalidate* para `data/*.json`, que se actualiza si hay red.
- **Versiona** el nombre de la caché (`jaiba-v1`, `jaiba-v2`, …) y borra las viejas en `activate`. Durante el desarrollo, el código viejo en caché es la trampa más común.
- `self.skipWaiting()` y `clients.claim()` para que la nueva versión tome el control rápido.
- Requiere **HTTPS** o `localhost`.

### Guardar la parcela en el teléfono

- `localStorage` basta para el MVP. Usa la clave `jaiba.parcela.v1` con el JSON de `entrada`.
- Envuelve cada lectura y escritura en `try/catch`. En modo privado puede fallar y la app debe seguir funcionando con el ejemplo.
- Expón una API para los roles de frontend:

```js
// app/src/almacen.js
export function guardarParcela(entrada) {}
export function cargarParcela() {}        // → entrada | null
export function borrarParcela() {}
```

### Instalación

- Escucha `beforeinstallprompt` y expón `puedeInstalar()` y `instalar()` para que el Rol 5 o el Rol 6 pongan un botón «Instalar».
- En iOS no hay prompt. Basta con un texto: «Compartir → Agregar a inicio».

## Con quién te coordinas

| Rol | Qué recibes o entregas |
|---|---|
| Rol 1 | El contrato congelado y el esqueleto del repo. Le avisas cuando el motor pase las pruebas. |
| Rol 2 | Recibes `clima.json`. Mientras tanto, usa el ejemplo del contrato. |
| Rol 3 | Recibes `planes.json` y `reglas.json`. Mientras tanto, usa el ejemplo del contrato. |
| Rol 5 | Te llama con `comparar(entrada, datos)` y usa `guardarParcela` y `cargarParcela`. |
| Rol 6 | Consume tu `salida`. Respeta el formato exacto del contrato. |

## Criterios de terminado

- [ ] `comparar()` pasa las pruebas con los datos reales.
- [ ] La salida respeta el contrato (compárala con `app/fixtures/salida-ejemplo.json`).
- [ ] La app se instala en Android (Chrome) y aparece «Agregar a inicio» en iOS.
- [ ] Con el modo avión activo después de la primera visita, la app abre, compara y muestra los resultados.
- [ ] La parcela guardada sobrevive a recargar la app.
