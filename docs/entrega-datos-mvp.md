# jaibaSpace · Datos publicados del MVP

Estado al **2026-11-15**. Describe los archivos de `app/data` que hoy consumen el servidor y la PWA, y cómo comprobarlos. Sustituye a la entrega anterior, que describía Umán y `clima/yuc-noroeste.json`.

## Qué cambió respecto a la entrega anterior

- **El piloto pasó de Umán a Tekax.** El equipo de reglas agrícolas (Rol 3, PR #11) movió la zona `yuc-noroeste` (Umán, 20.834, −89.787) a `yuc-sur` (San Felipe Segundo, Tekax, 19.8122, −89.4702) y borró `clima/yuc-noroeste.json`. La razón está en `docs/rol-3-fuentes-y-rotaciones.md`: en Umán casi no hay maíz ni soya de temporal para evaluar los ciclos.
- **Umán ya no es una zona publicada.** Su serie se conserva solo como caso de control de las pruebas (`app/tests/fixtures/clima-uman-control.json`). No se usa en ninguna pantalla.
- **La referencia antigua 20.49, −89.75** queda cerca de Muna. No corresponde a Umán ni a Tekax y no se usa.

## Archivos y quién los consume

| Archivo en `app/data` | Formato | Quién lo consume |
|---|---|---|
| `zonas.json` | v0.2 | Servidor (`zones`, punto en PostGIS). PWA: asignación de zona y carga del clima |
| `clima/yuc-sur.json`, `clima/camp-chenes.json`, `clima/qroo-centro.json` | v0.2 | Servidor (`climate_datasets` y contenido). PWA: motor de exposición, calendario y predicción |
| `planes.json` | v0.4 | PWA: «Opciones para tu parcela» |
| `reglas.json` | v0.3 | PWA: etapas, umbrales y suelos del motor |
| `catalogos/*.json` | v0.1-prototipo | PWA: cultivos, semillas, suelos, municipios y listas de captura |

El servidor los carga con `python -m app.seed` y los publica en `GET /api/v1/bundle`. La PWA descarga ese paquete, lo valida y lo guarda en el teléfono. Si nunca pudo descargarlo, usa estos mismos archivos, que van empaquetados con la app.

Hay tres versiones distintas y no se mezclan:

- **Versión del formato:** el campo `version` de cada archivo (`0.2` en zonas y clima).
- **Versión del dataset:** la huella SHA-256 del archivo, que el servidor calcula al cargarlo (`climate_datasets.version`, `bundle.documents[].sha256`).
- **Fuente original:** NASA POWER Daily API v2.10.3, con su fecha de descarga y de corte dentro de cada archivo de clima.

## Zonas y puntos

| ID | Punto de referencia del clima (latitud, longitud) | Años completos | Mediana de lluvia jun–ago | Mediana de racha máxima jun–ago |
|---|---|---:|---:|---:|
| `yuc-sur` | San Felipe Segundo, Tekax (19.8122, −89.4702) | 28 | 482.70 mm | 7 días |
| `camp-chenes` | Hopelchén (19.75, −89.84) | 28 | 536.81 mm | 6.5 días |
| `qroo-centro` | Felipe Carrillo Puerto (19.58, −88.05) | 28 | 482.48 mm | 10 días |

- El punto de cada zona es una **referencia climática regional**. No es la ubicación de una parcela. El GPS de la parcela es otro dato y puede faltar.
- El orden de los campos siempre es explícito: `lat` y `lon` en los JSON, `latitude=` y `longitude=` en la URL de NASA. En GeoJSON y en PostGIS va **longitud primero**: `POINT(-89.4702 19.8122)`.
- `catalogos/municipios.json` trae `zonaId` solo en los tres municipios donde está el punto de una zona (Tekax 31079, Hopelchén 04006 y Felipe Carrillo Puerto 23002). Para los demás, la correspondencia municipio–zona está pendiente y la PWA lo dice.

## Qué trae cada archivo de clima

- **Periodo:** 1998–2025, 28 años, todos completos (365 o 366 días con dato). Corte: 2025-12-31.
- **Lluvia:** `IMERG_PRECTOT` (GPM IMERG), mm/día, resolución de 0.1° (~10 km).
- **Temperatura máxima:** `T2M_MAX` (MERRA-2), °C, resolución de 0.5° × 0.625° (~50 km).
- **Estándar temporal:** UTC. **Vía:** NASA POWER, con la URL exacta de la consulta por punto.
- **Contenido:** por año, la lluvia y la racha más larga de junio a agosto, todas las rachas secas de 3 días o más (día seco: menos de 1 mm) y todos los episodios de 1 día o más con 35 °C o más. No trae la serie diaria.
- **Faltantes:** el valor de relleno de NASA (−999) se guarda como `null`, nunca como 0. Un `null` corta la racha.

### Qué se puede calcular con los eventos publicados

- **Sí:** cambiar la duración mínima de un evento hacia arriba (rachas de 5 días o más, calor de 3 días o más), cruzar eventos con una etapa del cultivo, contar años con coincidencia y días de la etapa dentro de un evento.
- **No:** cambiar el umbral de lluvia (1 mm) o de temperatura (35 °C), ni detectar rachas de menos de 3 días. Eso necesita la serie diaria: hay que cambiar `data-pipeline/clima.py` y volver a exportar.
- **Límite:** el pipeline corta los eventos al cambiar de año. Una racha que cruza el 31 de diciembre viene en dos pedazos. El motor los vuelve a unir, pero un pedazo de menos de 3 días no está en el archivo. Solo afecta a etapas que tocan el cambio de año; los planes actuales no lo hacen.
- **Años evaluables:** una etapa solo se evalúa si todos los años que toca están completos (`completa`, `diasConDato = diasEsperados`). El archivo no dice qué días faltan, así que un año incompleto no se evalúa: no se cuenta como año sin racha.

## Comprobación y regeneración

Desde la raíz del repositorio:

```bash
python data-pipeline/auditar_datos.py app/data          # sin internet
python data-pipeline/auditar_datos.py app/data --nasa   # vuelve a descargar NASA POWER y compara
```

La auditoría comprueba la correspondencia zona–archivo, el punto contra la URL de NASA, la procedencia, los años, los días esperados, los eventos, las medianas y las claves cruzadas con `planes.json`, `reglas.json` y los catálogos. Sale con código 1 si algo falla.

Resultado del 2026-11-15: 7 comprobaciones correctas y 0 errores. Los tres archivos son idénticos a una descarga fresca de NASA procesada con `clima.py` (solo cambia la fecha de descarga).

Para regenerar los tres archivos de clima (requiere internet): `python data-pipeline/clima.py app/data`. Después hay que volver a correr `python -m app.seed` en el servidor para publicar el paquete nuevo.

## Pendientes de datos

- Solo hay 3 de las 7 zonas previstas. Una parcela con punto se asigna a la zona más cercana y la PWA avisa si queda a más de 50 km.
- La correspondencia municipio–zona solo existe para tres municipios.
- `primerDatoValido` dice 1998-01-01 porque la API entrega datos desde enero, aunque la NASA documenta el inicio de IMERG en junio de 1998. No afecta a los planes actuales, que empiezan en junio.
- Los catálogos de `catalogos/` siguen siendo de prototipo (`esEjemplo`): faltan las claves INEGI de los demás municipios y la disponibilidad real de semillas.

Fuentes: [NASA POWER, datos diarios](https://power.larc.nasa.gov/docs/services/api/temporal/daily/) · [NASA POWER, metodología de lluvia y temperatura](https://power.larc.nasa.gov/docs/methodology/data/sources_meteorology/)
