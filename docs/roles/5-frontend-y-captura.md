# Rol 5 — Frontend y captura

> **Arquitectura PENDIENTE (2026‑11‑14).** El equipo va a cambiar la arquitectura. Lo que este documento dice sobre PWA, backend o falta de backend, motor en el teléfono, *service worker*, hosting, almacenamiento local o modo sin conexión es la **propuesta anterior** y **no está decidido**. No lo implementes ni lo des por hecho hasta que el Rol 1 publique la nueva arquitectura. Ver `docs/00-contexto-general.md`, sección «Arquitectura (pendiente)».

> **Para tu IA:** eres asistente del desarrollador frontend de captura de jaibaSpace, equipo del NASA Space Apps Challenge 2026 en el reto *Field Shift*. Construye la pantalla **«Mi parcela»**: se carga el caso de ejemplo, se obtiene la ubicación (GPS o lista de municipios de Yucatán, Campeche y Quintana Roo), se asigna la **zona agroclimática** más cercana, el productor elige su **tipo de suelo** y su **prioridad**. Con eso se arma el objeto `entrada` de `docs/contrato-datos.md` (sección 6) y se llama al motor. El contexto completo está en `docs/00-contexto-general.md`. El usuario es un **productor de temporal de la península desde su teléfono**: lenguaje simple, botones grandes, y puede no tener conexión.

## Entregable del día

> La pantalla para cargar el ejemplo, ubicar la parcela, ver su zona y la distancia al punto de datos, elegir el suelo (o «no sé») y la prioridad, y conectar el formulario al motor.

## La pantalla «Mi parcela»

```
┌─────────────────────────────────┐
│ jaibaSpace                      │
│ Explora rotaciones para tu      │
│ parcela                         │
│                                 │
│ [ Cargar parcela de ejemplo ]   │
│   etiqueta: «Dato de ejemplo»   │
│                                 │
│ ¿Dónde está tu parcela?         │
│ [ Usar mi ubicación (GPS) ]     │
│ o elige tu municipio: [ ▼ ]     │
│ Zona: Noroeste de Yucatán       │
│ Datos de un punto a 12 km       │
│                                 │
│ ¿Qué suelo tiene?               │
│ ( ) Tsek'el – pedregoso         │
│ ( ) K'ankab – rojo, profundo    │
│ ( ) Ak'alche – bajo inundable   │
│ ( ) No sé                       │
│                                 │
│ ¿Qué quieres priorizar?         │
│ ( ) Cuidar el agua              │
│ ( ) Cuidar el suelo             │
│ ( ) Aportar nitrógeno           │
│ ( ) Tener más ingreso o forraje │
│                                 │
│ [  Ver mis opciones  ]          │
└─────────────────────────────────┘
```

- **Tres decisiones visibles:** dónde, qué suelo y qué priorizar. El cultivo actual (maíz) y la modalidad (temporal) vienen del ejemplo y solo se muestran.
- **Suelo:** las opciones y sus nombres vienen de `reglas.suelos`. Pon primero los `suelosPredominantes` de la zona, con la nota «común en tu zona». «No sé» envía `null`.
- **Prioridad:** las opciones vienen de `reglas.prioridades`.
- Si el tiempo alcanza, agrega una sección plegable «Más datos de mi parcela (opcional)»: cultivo anterior, fecha de siembra, profundidad y pedregosidad. Si se dejan vacíos van como `null` y el motor los pone en «falta confirmar».
- **Accesibilidad:** `<label>` en cada campo, radios reales, áreas táctiles de 44 px o más y `lang="es-MX"`.

## Ubicación y zona

### GPS

```js
navigator.geolocation.getCurrentPosition(
  pos => usar(pos.coords.latitude, pos.coords.longitude, 'gps'),
  err => mostrarLista(),          // permiso denegado o sin señal → lista de municipios
  { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 }
);
```

- Solo funciona con **HTTPS** o `localhost`.
- Redondea a 2 decimales al mostrar.
- La ubicación no sale del teléfono.

### Lista de municipios

- Crea `app/data/municipios.json` con los municipios de **Yucatán (106), Campeche (13) y Quintana Roo (11)**: `[{ "clave": "31xxx", "nombre": "...", "estado": "Yucatán", "lat": 0, "lon": 0 }]`.
  - Fuente: catálogo de áreas geoestadísticas de INEGI (AGEEML), con coordenadas de la cabecera municipal.
- Agrupa la lista por estado (`<optgroup>`).
- Para el MVP basta con los municipios de las zonas disponibles; el resto es ampliación.

### Asignar la zona

```js
// Haversine en km
function distanciaKm(a, b) {
  const R = 6371, rad = x => x * Math.PI / 180;
  const dLat = rad(b.lat - a.lat), dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
function zonaMasCercana(ubicacion, zonas) {
  return zonas
    .map(z => ({ zona: z, km: distanciaKm(ubicacion, z.punto) }))
    .sort((a, b) => a.km - b.km)[0];   // → { zona, km }
}
```

- Guarda `zonaId` y `distanciaZonaKm` (1 decimal) en `entrada.parcela.ubicacion`.
- **Siempre** muestra la zona y la distancia: «Zona: Noroeste de Yucatán. Usamos datos de un punto a 12 km de tu parcela.»
- Si la distancia pasa de unos **50 km**, agrega: «Tu parcela queda lejos de nuestros puntos de datos; toma el resultado como una referencia regional.»
- Si el punto queda fuera de la península (por ejemplo, un GPS en otro estado), muestra «Por ahora solo cubrimos Yucatán, Campeche y Quintana Roo» y ofrece la lista.
- Agrega un selector «Cambiar zona» para la demo: permite comparar la misma parcela en otra zona.

### Si sobra tiempo: mapa de zonas

Un mapa simple de la península en SVG (sin teselas, para que funcione offline) con las 7 zonas como puntos que se pueden tocar. Tocar una zona la selecciona. Responde a la sugerencia del reto de usar mapas interactivos.

## Conectar con el motor

```js
import { comparar } from '../motor/comparar.js';
import { cargarBase, cargarClima } from '../datos.js';   // los da el Rol 4
import { guardarParcela, cargarParcela } from '../almacen.js';

const { zonas, planes, reglas } = await cargarBase();
const entrada = construirEntrada(formulario, zonas);     // sección 6 del contrato
const clima = await cargarClima(entrada.parcela.ubicacion.zonaId);
guardarParcela(entrada);
const salida = comparar(entrada, { clima, planes, reglas });
mostrarResultados(salida);                               // la pantalla del Rol 6
```

- **Mientras el motor no esté listo**, usa un `comparar` falso que devuelva `app/fixtures/salida-ejemplo.json`.
- **Al abrir la app**, si `cargarParcela()` devuelve algo, rellena el formulario con eso.
- **Validación:** sin ubicación o sin prioridad, el botón «Ver mis opciones» queda deshabilitado y aparece el texto de lo que falta. El suelo no es obligatorio («No sé» es válido).
- `entrada.planes` es siempre `["actual", "cobertura", "otro-grano"]` (las 3 estrategias del contrato v0.3).

## Objeto `entrada` que debes producir

```json
{
  "version": "0.3",
  "parcela": {
    "id": "ejemplo-01",
    "esEjemplo": true,
    "nombre": "Parcela de ejemplo",
    "ubicacion": {
      "lat": 20.49, "lon": -89.75, "municipio": "por confirmar", "estado": "Yucatán",
      "origen": "lista", "zonaId": "yuc-noroeste", "distanciaZonaKm": 0
    },
    "modalidad": "temporal",
    "cultivoActual": "maiz",
    "cicloAnterior": { "cultivo": null, "fechaSiembra": null },
    "suelo": { "tipoLocal": "tsekel", "profundidad": null, "pedregosidad": null }
  },
  "prioridad": "agua",
  "planes": ["actual", "cobertura", "otro-grano"]
}
```

## Con quién te coordinas

| Rol | Qué recibes o entregas |
|---|---|
| Rol 1 | El esqueleto, el estilo base y la parcela de ejemplo |
| Rol 2 | `zonas.json` con los puntos de cada zona |
| Rol 3 | Los nombres de suelos y prioridades en lenguaje simple |
| Rol 4 | `comparar`, `cargarBase`, `cargarClima`, `guardarParcela`, `cargarParcela` y el botón de instalar |
| Rol 6 | Le pasas `salida`. Acuerden la navegación (dos secciones en la misma página es lo más simple) y el botón «Cambiar prioridad». |

## Criterios de terminado

- [ ] La parcela de ejemplo carga con un toque y lleva la etiqueta «Dato de ejemplo».
- [ ] El GPS funciona en HTTPS y, si falla, la app pasa a la lista de municipios sin romperse.
- [ ] La zona y la distancia al punto de datos siempre están visibles.
- [ ] El suelo se puede elegir o dejar en «No sé».
- [ ] La prioridad es obligatoria. El botón llama a `comparar` y muestra el resultado.
- [ ] La parcela se guarda y se recupera al reabrir la app.
- [ ] Todo funciona en modo avión después de la primera visita.
