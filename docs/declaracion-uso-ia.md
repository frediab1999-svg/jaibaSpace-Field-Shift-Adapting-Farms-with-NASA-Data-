# Declaración de uso de inteligencia artificial — jaibaSpace

Fecha: **15 de noviembre de 2026**. Alcance: implementación beta de jaibaSpace para NASA Space Apps Challenge.

## Respuesta para el formulario de entrega

Sí. Utilizamos herramientas de inteligencia artificial como apoyo para implementar y documentar nuestra solución. La idea del proyecto, el enfoque del problema, los objetivos, la dirección visual y las decisiones de producto fueron definidos por el equipo. Usamos la IA para acelerar la ejecución de esas decisiones.

Utilizamos **Claude** para la implementación de todo el backend y, junto con **Stitch — Design with AI**, para apoyar la implementación del frontend siguiendo las ideas y la dirección de look and feel del equipo. Utilizamos **Gemini** para generar imágenes bajo las indicaciones del equipo. Utilizamos **Codex** para complementar y organizar la documentación, así como para revisar el repositorio y redactar instrucciones de ejecución local y esta declaración.

Los datos climáticos utilizados proceden de NASA POWER; no son datos climáticos generados por un modelo de lenguaje. La asistencia de IA en código, cálculos o documentación no convierte las salidas del sistema en mediciones de campo ni en predicciones de rendimiento. El equipo asume la responsabilidad de revisar el contenido y de identificar los elementos asistidos por IA en la entrega final.

## Dónde y cómo se utilizó IA

| Área | Herramienta | Uso declarado | Ubicación principal |
|---|---|---|---|
| Backend | Claude | Generación y asistencia en la implementación de todo el backend: API, acceso a datos, configuración, migraciones y pruebas. | `server/` |
| Frontend | Claude y Stitch — Design with AI | Apoyo en la implementación de la interfaz y sus funcionalidades a partir de las ideas, el diseño deseado y la dirección visual del equipo. Se declara la intervención de Stitch aunque la dirección creativa haya sido humana. | `app/`, especialmente `app/src/` |
| Imágenes | Gemini | Generación de imágenes mediante indicaciones del equipo y posterior preparación para su uso en la web. Son imágenes generadas con IA, aunque hayan sido solicitadas, seleccionadas o editadas por el equipo. | Recursos identificados en la sección siguiente |
| Documentación | Codex | Complementación, organización y revisión de textos; análisis del repositorio; instrucciones de arranque de la beta y redacción de esta declaración. | `docs/` y `README.md` |

Esta tabla recoge los usos confirmados por el equipo para esta declaración. No atribuye versiones concretas de modelos ni certifica una revisión humana exhaustiva de cada archivo. Si se confirma otro uso de IA en scripts, datos derivados, pruebas u otros recursos, debe incorporarse antes de la entrega.

## Imágenes generadas con Gemini

El equipo confirmó que utilizó Gemini para generar imágenes. La relación documentada en `docs/look-and-feel.md` comprende los siguientes recursos de `app/src/assets/img/`:

- `fondo-milpa.jpg`, `bordado.webp` y `mapa-peninsula.webp`.
- `semilla-*.jpg` y `foto-*.jpg`.
- `ico-*.jpg` y `letrero-*.webp`.

Algunas de estas imágenes fueron retocadas y detalladas manualmente por integrantes del equipo de frontend para adaptarlas a las necesidades visuales y de uso del proyecto. Esta edición humana forma parte del trabajo del equipo y no cambia su origen como imágenes generadas con IA.

Para estas imágenes, la atribución descriptiva es: **«Imagen generada con IA mediante Gemini, bajo indicaciones del equipo jaibaSpace»**. En las que recibieron cambios manuales, se añade: **«Retocada y adaptada manualmente por el equipo de frontend»**.

Antes de entregar, el equipo debe completar el inventario si existen otros recursos generados con IA, incluidos `nodo-*.webp`, iconos de instalación o imágenes usadas en la presentación. La lista anterior no certifica la procedencia de los recursos que no identifica.

## Datos y resultados del sistema

Los archivos climáticos de `app/data/clima/` se obtienen mediante el pipeline del proyecto a partir de NASA POWER, con los productos GPM IMERG y MERRA-2. Los eventos y resúmenes publicados son datos procesados; no deben presentarse como observaciones directas de cada parcela.

Los planes y reglas agrícolas de `app/data/planes.json` y `app/data/reglas.json` incluyen fuentes, supuestos y elementos pendientes de validación. Las parcelas de demostración de `app/fixtures/ejemplo-milpa.json` son ficticias y no representan registros reales de productores. El origen oficial de una fuente no supone que NASA haya validado la interpretación agrícola o avalado el producto.

El motor implementado con asistencia de IA calcula indicadores a partir de los datos y reglas publicados. No se presenta como un modelo de aprendizaje automático entrenado para predecir cosechas.

## Identificación requerida en la entrega

De acuerdo con el texto de participación facilitado por el equipo, además de responder el formulario deben identificarse los elementos generados con IA dentro del proyecto final:

| Tipo de contenido | Identificación que debe acompañarlo |
|---|---|
| Imágenes y vídeos generados con IA | Marca de agua visible, por ejemplo **«Generado con IA · Gemini»** para las imágenes declaradas. Si se reutilizan en una presentación o vídeo, la identificación debe seguir siendo visible. |
| Audio generado con IA, si se incorpora | Reconocimiento en el texto descriptivo y en los metadatos del archivo, indicando la herramienta utilizada. Este documento no declara generación de audio porque el equipo no la ha confirmado. |
| Código asistido o generado con IA | Texto descriptivo que indique herramienta y alcance, acompañado de metadatos en los archivos o artefactos correspondientes. Esta declaración aporta la descripción general; deben conservarse también las atribuciones asociadas al código entregado. |
| Datos generados o procesados con asistencia de IA, si corresponde | Descripción de la intervención, herramienta y procedencia, junto con metadatos del conjunto. Debe distinguirse la fuente original de cualquier transformación o contenido sintético. |

Ejemplo de metadatos para un archivo de código, adaptado al lenguaje correspondiente y a su procedencia real:

```text
ai_assisted: true
ai_tool: Claude
ai_scope: Implementación del backend a partir de requisitos del equipo
human_responsibility: Equipo jaibaSpace
ai_disclosure: docs/declaracion-uso-ia.md
```

Para documentación complementada con Codex, se puede usar el mismo esquema indicando `ai_tool: Codex` y el alcance concreto. No debe atribuirse una herramienta a un archivo sin confirmar su participación.

## Elementos de marca de NASA

El contenido generado con IA no puede utilizar, contener ni modificar elementos de marca o diseño de NASA, incluidos logotipos, banderas e identificadores de misión, conforme al texto proporcionado por el equipo. Antes de entregar deben revisarse las imágenes, vídeos y demás recursos generados para comprobar este requisito.

La referencia a NASA POWER identifica la fuente de los datos; no expresa patrocinio ni aprobación de jaibaSpace por parte de NASA.

## Estado y comprobaciones antes de entregar

Esta declaración documenta los usos confirmados por el equipo y proporciona el texto para el formulario. **La existencia de este archivo no certifica por sí sola que la entrega cumpla todos los requisitos de identificación.**

- [x] Declarar Claude en el backend y Claude/Stitch en la implementación del frontend.
- [x] Declarar Gemini en las imágenes y Codex en la documentación.
- [x] Distinguir la dirección creativa del equipo de la generación asistida por IA.
- [ ] Completar y verificar el inventario de recursos generados con IA.
- [ ] Incorporar o verificar las marcas de agua visibles en todas las imágenes y vídeos que correspondan.
- [ ] Incorporar o verificar los textos descriptivos y metadatos de código y datos asistidos por IA.
- [ ] Identificar audio generado con IA si se incorpora en la entrega.
- [ ] Revisar que el contenido generado no incluya elementos de marca o diseño de NASA.
- [ ] Revisar esta declaración contra los archivos finales y copiar la respuesta al formulario.

La creación de este documento no modifica imágenes, código funcional ni metadatos de otros archivos. Las comprobaciones pendientes deben completarse sobre la versión final que se entregue.

<!-- ai_assisted: true; ai_tool: Codex; ai_scope: Redacción de la declaración a partir de información confirmada por el equipo y del texto de participación proporcionado; human_responsibility: Equipo jaibaSpace; date: 2026-11-15 -->
