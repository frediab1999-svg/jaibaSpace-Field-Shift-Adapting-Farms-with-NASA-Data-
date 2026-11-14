# Rol 5 — Frontend y captura

> **Para tu IA:** eres asistente del desarrollador frontend de captura de jaibaSpace, equipo del NASA Space Apps Challenge 2026 en el reto *Field Shift*. Construye la pantalla **«Mi parcela»**. Ahí se carga el caso de ejemplo, se obtiene la ubicación (GPS o lista de municipios) y el productor elige su prioridad. Con eso se arma el objeto `entrada` de `docs/contrato-datos.md` (sección 4) y se llama al motor. El contexto completo está en `docs/00-contexto-general.md`. El usuario es un **productor de Yucatán desde su teléfono**. Usa un lenguaje simple y botones grandes, y asume que puede no tener conexión.

## Entregable del día

> Arma la pantalla para cargar el caso de ejemplo, con ubicación por GPS o lista de municipios, y para elegir la prioridad del productor: disponibilidad de agua o cobertura del suelo. Conecta el formulario al motor.

## La pantalla «Mi parcela»

```
┌─────────────────────────────────┐
│ jaibaSpace                      │
│ Compara tu plan de siembra      │
│                                 │
│ [ Cargar parcela de ejemplo ]   │
│   etiqueta: «Dato de ejemplo»   │
│                                 │
│ Ubicación                       │
│ [ Usar mi ubicación (GPS) ]     │
│ o elige tu municipio: [ ▼ ]     │
│ 20.49° N, 89.75° O              │
│                                 │
│ Cultivo actual: Maíz            │
│ Modalidad: Temporal             │
│                                 │
│ ¿Qué quieres priorizar?         │
│ ( ) Disponibilidad de agua      │
│ ( ) Cobertura del suelo         │
│                                 │
│ [   Comparar planes   ]         │
└─────────────────────────────────┘
```

- **La única decisión visible es la prioridad.** Los demás campos vienen del ejemplo y solo se muestran.
- Si el tiempo alcanza, se pueden editar en una sección plegable «Datos de mi parcela (opcional)»:
  - cultivo anterior,
  - fecha de siembra,
  - tipo de suelo local (*tsek'el*, *k'ankab* u otro),
  - profundidad,
  - pedregosidad.
  Si se dejan vacíos van como `null` y el motor los pone en «datos por confirmar».
- **Accesibilidad:**
  - usa `<label>` en cada campo,
  - usa radios reales para la prioridad,
  - deja áreas táctiles de al menos 44 px,
  - pon el texto en `lang="es-MX"`.

## Ubicación

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
- **No envíes la ubicación a ningún servidor.** Todo se queda en el teléfono.

### Lista de municipios

- Crea `app/data/municipios.json` con los municipios de Yucatán: `[{ "clave": "31xxx", "nombre": "...", "lat": 0, "lon": 0 }]`.
  - Fuente: catálogo de áreas geoestadísticas de INEGI (AGEEML), con coordenadas de la cabecera municipal.
- Para el MVP basta con unos pocos, incluido el del punto de ejemplo (20.49 N, −89.75 O, municipio por confirmar). Marca el resto como ampliación.

### Aviso importante: clima por punto

En el MVP solo hay `clima.json` para **un punto**. Si el GPS o el municipio elegido quedan lejos de ese punto, más de unos 15 km (la rejilla de IMERG es de unos 10 km), muestra este aviso:

> «Por ahora usamos la lluvia histórica del punto de ejemplo (20.49° N, 89.75° O). Tu ubicación queda a X km.»

Calcula la distancia con la fórmula de Haversine. No ocultes esta diferencia.

## Conectar con el motor

```js
import { comparar } from '../motor/comparar.js';
import { cargarDatos } from '../datos.js';              // fetch de data/*.json (los da el Rol 4)
import { guardarParcela, cargarParcela } from '../almacen.js';

const datos = await cargarDatos();                      // { clima, planes, reglas }
const entrada = construirEntrada(formulario);           // según el contrato, sección 4
guardarParcela(entrada);
const salida = comparar(entrada, datos);
mostrarResultados(salida);                              // la pantalla del Rol 6
```

- **Mientras el motor no esté listo**, usa un `comparar` falso que devuelva `app/fixtures/salida-ejemplo.json`.
- **Al abrir la app**, si `cargarParcela()` devuelve algo, rellena el formulario con eso.
- **Validación:** sin prioridad elegida, el botón «Comparar planes» queda deshabilitado y aparece el texto «Elige qué quieres priorizar».

## Objeto `entrada` que debes producir

```json
{
  "version": "0.1",
  "parcela": {
    "id": "ejemplo-01",
    "esEjemplo": true,
    "nombre": "Parcela de ejemplo",
    "ubicacion": { "lat": 20.49, "lon": -89.75, "municipio": "por confirmar", "origen": "lista" },
    "modalidad": "temporal",
    "cultivoActual": "maiz",
    "cicloAnterior": { "cultivo": null, "fechaSiembra": null },
    "suelo": { "tipoLocal": null, "profundidad": null, "pedregosidad": null }
  },
  "prioridad": "agua",
  "planes": ["actual", "rotacion"]
}
```

## Con quién te coordinas

| Rol | Qué recibes o entregas |
|---|---|
| Rol 1 | El esqueleto, el estilo base y la parcela de ejemplo |
| Rol 4 | `comparar`, `cargarDatos`, `guardarParcela`, `cargarParcela` y el botón de instalar |
| Rol 6 | Le pasas `salida` para que la pinte. Acuerden cómo navegar entre pantallas (dos secciones en la misma página es lo más simple). |
| Rol 2 | Coordenadas del punto con clima, por si genera más municipios |

## Criterios de terminado

- [ ] La parcela de ejemplo carga con un toque y lleva la etiqueta «Dato de ejemplo».
- [ ] El GPS funciona en HTTPS y, si falla, la app pasa a la lista de municipios sin romperse.
- [ ] El aviso de distancia aparece cuando aplica.
- [ ] La prioridad es obligatoria. El botón llama a `comparar` y muestra el resultado.
- [ ] La parcela se guarda y se recupera al reabrir la app.
- [ ] Todo funciona en modo avión después de la primera visita.
