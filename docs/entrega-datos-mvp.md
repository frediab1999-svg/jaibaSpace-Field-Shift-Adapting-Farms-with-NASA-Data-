# jaibaSpace · Entrega de ingeniería de datos

Referencia: `develop`, commit `282f646`, secciones 1 y 2 de `docs/contrato-datos.md`. La entrega cubre el mínimo del MVP, con una zona por estado. Se usó **Umán** como punto de referencia del Noroeste por decisión del equipo. Los JSON conservan `"version": "0.2"` porque esa es la versión de ambos formatos dentro del contrato general v0.3.

## Qué copiar y quién lo consume

Extrae `jaibaSpace-entrega-datos-v03.zip` en la **raíz del repositorio**, donde están `README.md`, `app/` y `data-pipeline/`. El ZIP trae las carpetas de destino. Si copias a mano, pega cada archivo completo en la ruta indicada.

| Archivo | Ruta desde la raíz del repo | Quién lo consume |
|---|---|---|
| `zonas.json` | `app/data/zonas.json` | **Captura (Rol 5)** usa zonas y puntos de referencia. **Motor (Rol 4)** usa `archivoClima` para cargar el clima que corresponde al ID elegido. **Resultados (Rol 6)** usa nombres y zonas para el mapa y la presentación. |
| `yuc-noroeste.json` | `app/data/clima/yuc-noroeste.json` | **Motor (Rol 4)** cruza rachas y calor con las etapas del cultivo. **Resultados (Rol 6)** muestra fuentes, fechas y evidencia. |
| `camp-chenes.json` | `app/data/clima/camp-chenes.json` | **Motor (Rol 4)** y **Resultados (Rol 6)** para Los Chenes. |
| `qroo-centro.json` | `app/data/clima/qroo-centro.json` | **Motor (Rol 4)** y **Resultados (Rol 6)** para la Zona maya. |
| Esta guía | `docs/entrega-datos-mvp.md` | Equipo e integración. |

Captura entrega `parcela.ubicacion.zonaId`. El motor busca ese ID en `zonas.json`, resuelve `archivoClima` relativo a `app/data/` y comprueba que `clima.zona.id` coincida. Puede consumir esos archivos donde el equipo decida ejecutar la comparación. Para producir el ranking aún necesita `planes.json`, `reglas.json` y la regla de simulación de los dos ciclos.

## Datos entregados

| ID | Punto exacto (latitud, longitud) | Temporadas completas | Mediana de lluvia jun–ago | Mediana de racha máxima jun–ago |
|---|---|---:|---:|---:|
| `yuc-noroeste` | Umán (20.834, −89.787) | 28 | 492.25 mm | 6 días |
| `camp-chenes` | Hopelchén (19.75, −89.84) | 28 | 536.81 mm | 6.5 días |
| `qroo-centro` | Felipe Carrillo Puerto (19.58, −88.05) | 28 | 482.48 mm | 10 días |

Período **1998–2025**, con GPM IMERG para lluvia y MERRA-2 para temperaturas máximas, vía NASA POWER. Cada JSON trae la URL exacta de descarga por punto, unidades, resolución, fechas de corte y las definiciones del pipeline. El umbral de día seco es **< 1 mm**, la racha mínima exportada es de **3 días** y el umbral de calor es **≥ 35 °C**. El motor tiene acceso a rachas y episodios del año completo. La ventana junio–agosto se usa para los resúmenes. Se verificaron coordenadas, IDs, fechas, completitud anual y coincidencia de rachas y episodios con las series de origen.

Los tipos de suelo del catálogo se conservan como sugerencias provisionales del contrato, con `porConfirmar`. La referencia agroclimática representa el entorno regional. Cada productor indica cuál es el suelo de su parcela.

## Actualización del ejemplo del Noroeste

El `develop` revisado todavía documenta `20.49, -89.75` y cifras del entorno de Muna bajo la etiqueta Noroeste. La entrega usa **20.834, −89.787** (coordenadas de Umán) y sus cifras recalculadas. Esas cifras coinciden con las del punto anterior de Umán (20.88194, −89.75), porque ambos puntos caen en la misma celda de IMERG y de MERRA-2. Actualicen los ejemplos en el README, el contexto general, el contrato y los documentos de datos y captura antes de volver a usar el ejemplo en pantalla o en el pitch. En ejemplos agrícolas que dependan de la parcela anterior, revisen también el traslape calculado.

Texto listo para pegar en el README o el pitch:

> En Umán, de junio a agosto, en 2022 se estimaron 440.36 mm de lluvia y una racha seca máxima de 4 días. En 2025 se estimaron 438.14 mm y una racha máxima de 9 días, del 19 al 27 de agosto. Fuente: GPM IMERG vía NASA POWER. Se considera día seco aquel con menos de 1 mm de lluvia.

## Comprobación y regeneración

Desde la raíz del repo, para regenerar todos los JSON del catálogo entregado:

```bash
python data-pipeline/clima.py app/data
```

El comando requiere internet y escribe los JSON procesados en `app/data/clima/` y las respuestas originales en `data-pipeline/raw/`. Los JSON del ZIP ya están generados y pueden copiarse directamente. El archivo ZIP completo sirve para distribución. Para el PR hacia `develop`, agregar los archivos extraídos en `app/data/` y `docs/`.

Fuentes: [NASA POWER, datos diarios](https://power.larc.nasa.gov/docs/services/api/temporal/daily/) · [NASA POWER, metodología de lluvia y temperatura](https://power.larc.nasa.gov/docs/methodology/data/sources_meteorology/) · [CONAGUA, coordenadas de referencia de Umán](https://smn.conagua.gob.mx/tools/PHP/ConsultaCluster.php?clave=4&tipo=ENCS) · [Contrato de datos v0.3](https://github.com/frediab1999-svg/jaibaSpace-Field-Shift-Adapting-Farms-with-NASA-Data-/blob/282f646db076a999a648e269d71033c99aac6f87/docs/contrato-datos.md#L53)
