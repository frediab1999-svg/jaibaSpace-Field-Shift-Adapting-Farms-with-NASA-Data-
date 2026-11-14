# jaibaSpace — Contexto general del proyecto

> **Cómo usar estos documentos con tu IA:** dale este archivo, `contrato-datos.md` y el archivo de tu rol en `roles/`. Este archivo explica qué construimos y por qué. El contrato fija los formatos JSON que comparten todos los roles. El archivo de tu rol dice qué te toca entregar.

## 1. El reto

- **Evento:** NASA Space Apps Challenge 2026.
- **Reto:** *Field Shift: Adapting Farms with NASA Data*.
  - Detalles: https://www.spaceappschallenge.org/2026/challenges/adapting-farms-with-nasa-data/?tab=details
  - Recursos: https://www.spaceappschallenge.org/2026/challenges/adapting-farms-with-nasa-data/?tab=resources
- **Qué pide (resumen):** una herramienta que ayude a un productor a decidir si conviene cambiar su práctica agrícola. Debe combinar cuatro piezas:
  1. observaciones de la NASA,
  2. información local del suelo,
  3. características de los cultivos,
  4. prioridades del productor.

> Nota: al generar estos documentos, el sitio de Space Apps no se pudo abrir desde la máquina del equipo por un error de certificado HTTPS. Este resumen se basa en el análisis que preparó el equipo. **Pendiente:** pegar aquí el texto oficial de las pestañas *Details* y *Resources* para confirmar que no falta ningún requisito.

## 2. Nuestra propuesta (MVP de un día)

**Una PWA que funciona sin conexión.** Ayuda a un productor de **maíz de temporal en Yucatán** a comparar dos planes para su parcela:

- **Plan actual:** la práctica que ya sigue.
- **Rotación alternativa:** una secuencia de cultivos distinta.

La comparación usa dos criterios:

| Criterio | Qué mide | Dato principal |
|---|---|---|
| **Exposición a rachas secas** | Si las etapas sensibles del cultivo coinciden con rachas secas históricas | Lluvia diaria NASA POWER / GPM IMERG |
| **Cobertura del suelo** | Cuántos meses al año queda el suelo descubierto | Calendario de cada plan (reglas agrícolas) |

El productor elige una sola prioridad: **disponibilidad de agua** o **cobertura del suelo**. La prioridad cambia cuánto pesa cada criterio.

### Las tres pantallas o funciones

1. **Mi parcela.** Se carga una parcela de ejemplo con ubicación (GPS o lista de municipios), cultivo actual y modalidad de temporal. Aquí está la única decisión: *«¿Qué quieres priorizar?»*.
2. **Comparar dos planes.** Muestra ambos planes lado a lado, con sus cultivos por ciclo y los dos criterios. Si una etapa sensible cae dentro de una racha seca histórica, se muestra la coincidencia.
3. **¿Por qué salió esto?** Debajo de cada plan va una razón en lenguaje simple, el dato de la NASA que se usó (con su fecha de actualización) y un dato de campo que falta verificar. Si ambos planes tienen la misma exposición a la sequía, se muestra como **empate** en ese criterio.

### Decisiones de arquitectura

- **No hay backend.** El motor `comparar(entrada)` es una función de JavaScript que corre en el teléfono.
  - El análisis original proponía `POST /comparar` en un backend. El reparto de roles lo cambió por una PWA estática.
  - El formato de entrada y salida del motor es el mismo en ambos casos.
- **Datos precalculados.** `clima.json`, `reglas.json` y `planes.json` son archivos estáticos que el *service worker* guarda en caché. La app funciona aunque la NASA no responda o el teléfono esté en modo avión.
- **Hosting estático con HTTPS**, por ejemplo GitHub Pages, Netlify o Vercel. El *service worker* y el GPS solo funcionan con HTTPS (o en `localhost`).

## 3. Fuentes de datos

| Fuente | Qué aporta | Uso en el MVP |
|---|---|---|
| **NASA POWER Daily API** (`power.larc.nasa.gov`) | Series diarias por coordenadas en JSON. Funciona como puerta de entrada a IMERG y MERRA‑2. | **Sí, fuente principal.** |
| **GPM IMERG** (parámetro `IMERG_PRECTOT`) | Lluvia diaria en mm/día con rejilla de unos 10 km. En nuestro punto hay datos válidos desde **1998‑01‑01**. | **Sí.** Lluvia para el comparador. |
| **MERRA‑2** (`PRECTOTCORR`, `T2M_MAX`) | Lluvia corregida desde **1981** y temperatura máxima, con rejilla más gruesa (unos 50 km). | Respaldo para tener una serie larga. La temperatura solo sirve como contexto. |
| **SMAP L4** | Humedad del suelo en superficie y zona de raíces, a 9 km. | Opcional. Contexto regional. |
| **HLS (Landsat/Sentinel‑2), ECOSTRESS** | Índices de vegetación a 30 m, temperatura de superficie y evapotranspiración. | Fuera del MVP. |
| **INEGI** | Edafología a escala 1:250 000 (textura y limitantes del suelo). | Solo como referencia regional, extraída a JSON. |
| **SIAP / DGSIAP** | Producción agrícola por municipio, cultivo, ciclo y modalidad (riego o temporal). | Contexto de qué se siembra en la zona. |
| **USDA (SSURGO, CDL)** | Suelo y cultivos con alto detalle, solo en EE. UU. | No aplica a Yucatán. |

**Consulta de NASA POWER verificada** (respondió con datos reales el 2026‑11‑14):

```
https://power.larc.nasa.gov/api/temporal/daily/point?parameters=IMERG_PRECTOT,T2M_MAX&community=AG&longitude=-89.75&latitude=20.49&start=20200101&end=20251231&format=JSON&time-standard=UTC
```

- La serie está en `properties.parameter.<PARAM>` con claves `YYYYMMDD`.
- Las unidades están en `parameters.<PARAM>.units`.
- El valor faltante está en `header.fill_value` y es `-999.0`. **Debe convertirse a `null`. Nunca debe contarse como 0 mm de lluvia.**

## 4. Caso de ejemplo

- **Punto:** 20.49° N, 89.75° O, en el occidente de Yucatán. **El municipio está por confirmar.**
- **Productor ficticio:** maíz de temporal. Todos los datos de la parcela (cultivo anterior, fecha de siembra, suelo) son **datos del ejemplo** y deben verse etiquetados así en la app.
- **Ventana de demostración:** del 1 de junio al 31 de agosto. **Día seco:** lluvia menor que 1 mm/día. Ambas son decisiones provisionales que el responsable de reglas agrícolas debe confirmar.

**Dato para el pitch (IMERG, verificado):**

| Temporada | Lluvia jun–ago | Racha seca más larga | Fechas de la racha |
|---|---:|---:|---|
| 2022 | 488.48 mm | 5 días | 17–21 jul |
| 2025 | 468.75 mm | 12 días | 6–17 jun |

En 2022 y 2025 llovió casi lo mismo, pero en 2025 la racha seca duró más del doble. Por eso el total de lluvia no basta: importa **cuándo** cae la racha respecto a las etapas del cultivo.

Con IMERG de 1998 a 2025 (28 temporadas completas), la **mediana** de la racha más larga es de **7 días**. Las peores temporadas fueron 1998 (18 días), 2025 (12) y 2014 (11).

## 5. Roles

| # | Rol | Archivo | Entregable del día |
|---|---|---|---|
| 1 | Líder técnico e integración | `roles/1-lider-tecnico-e-integracion.md` | Contrato del motor con un ejemplo falso en la primera hora, flujo completo, PWA publicada en HTTPS y decisión de qué recortar |
| 2 | Ingeniería de datos | `roles/2-ingenieria-de-datos.md` | `clima.json` con lluvia NASA, rachas por año, mediana y peores años |
| 3 | Reglas agrícolas | `roles/3-reglas-agricolas.md` | `planes.json` y `reglas.json` con calendarios, etapas sensibles y meses con suelo descubierto, cada uno con su fuente |
| 4 | Motor y PWA sin conexión | `roles/4-motor-y-pwa-sin-conexion.md` | `comparar(entrada)`, instalación, funcionamiento sin conexión y parcela guardada en el teléfono |
| 5 | Frontend y captura | `roles/5-frontend-y-captura.md` | Pantalla de parcela con GPS o lista de municipios, selector de prioridad y conexión con el motor |
| 6 | Frontend y resultados | `roles/6-frontend-y-resultados.md` | Comparación lado a lado, dato NASA con fecha y recorrido de la demo en modo avión |

### Dependencias entre roles

```
            contrato-datos.md (Rol 1, hora 1)
           /        |          \          \
   Rol 2 clima   Rol 3 reglas   Rol 5 UI   Rol 6 UI
        \          /              |          |
       Rol 4 motor comparar() ----+----------+
                     |
           Rol 1 integra y publica la PWA
```

Todos trabajan desde el primer minuto con **datos falsos que respetan el contrato** y los cambian por los reales cuando estén listos.

## 6. Reglas de honestidad de datos (para todos)

- Todo dato inventado o de ejemplo lleva `"esEjemplo": true` o la etiqueta visible «dato de ejemplo».
- Siempre se muestran la fuente, el parámetro y la **fecha de corte** del dato de la NASA.
- La app compara exposición histórica. **No predice cosechas ni garantiza resultados.**
- Si falta un dato de campo, se dice qué falta en lugar de inventarlo.

## 7. Estructura propuesta del repositorio

```
/app                     PWA (Roles 1, 4, 5, 6)
  index.html
  manifest.webmanifest
  sw.js
  /src/motor/comparar.js
  /src/ui/...
  /data/clima.json         (Rol 2)
  /data/reglas.json        (Rol 3)
  /data/planes.json        (Rol 3)
  /data/parcela-ejemplo.json
  /data/municipios.json    (Rol 5)
/data-pipeline           scripts de descarga y normalización (Rol 2)
/docs                    estos documentos
```

El líder técnico puede cambiar esta estructura. Si lo hace, debe actualizar este archivo.
