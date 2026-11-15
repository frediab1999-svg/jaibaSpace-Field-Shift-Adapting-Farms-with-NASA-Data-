# Contexto general del proyecto jaibaSpace

> **Contexto actualizado del proyecto.** El MVP documentado en v0.2 es el antecedente del producto. El alcance vigente incluye varios cultivos, proyección climática y estadísticas colectivas, con una PWA offline, API y base de datos. La especificación v0.2 se retiró; los nuevos contratos de dominio y API deben definirse antes de implementar las integraciones. La arquitectura está en [`arquitectura-y-estructura.md`](arquitectura-y-estructura.md).

## Resumen

jaibaSpace es una aplicación web progresiva (PWA) para productores de temporal de la Península de Yucatán. Permitirá explorar opciones de manejo para varios cultivos y explicar sus ventajas, riesgos e incertidumbres usando clima, tipo de suelo, semillas y prioridades del productor. El maíz y las cuatro estrategias de v0.2 son el caso inicial documentado, no el límite del producto.

La herramienta combina exposición climática histórica, proyecciones de escenarios climáticos e información voluntaria de siembras y cosechas. Las estadísticas colectivas se consultan por zona y periodo. **No promete rendimientos ni garantiza cosechas**; comunica incertidumbre y apoya la decisión del productor y del técnico que lo asesora.

## Usuario y necesidad

- **Usuario principal:** productor de temporal, sin riego, que usa un teléfono.
- **Usuario de apoyo:** técnico o asesor agrícola que revisa la evidencia y los riesgos.
- **Necesidad:** comparar prácticas agrícolas ante variaciones climáticas y reconocer cuándo el cultivo enfrenta condiciones críticas o el suelo queda descubierto.
- **Cobertura geográfica:** Yucatán, Campeche y Quintana Roo, organizados en siete zonas agroclimáticas representativas.

## Cultivos y estrategias

La documentación v0.2 define cuatro planes de ejemplo para maíz. La arquitectura nueva debe permitir agregar cultivos, variedades, etapas y estrategias mediante catálogos y reglas configurables, sin asumir que todas las decisiones aplican a todos los cultivos. Los calendarios y atributos requieren respaldo agronómico y no son recomendaciones universales.

| Plan | Manejo descrito | Propósito |
|---|---|---|
| **Actual** (`actual`) | Maíz de temporal | Referencia de cultivo continuo. |
| **Cobertura** (`cobertura`) | Maíz con mucuna o canavalia intercalada | Cubrir el suelo y aportar nitrógeno. |
| **Milpa** (`milpa`) | Maíz, frijol y calabaza | Representar una asociación tradicional con alimentos diversos. |
| **Relevo** (`relevo`) | Maíz precoz seguido por frijol de relevo | Explorar dos cosechas y prolongar la cobertura del suelo. |

El término **asociación** describe cultivos sembrados juntos, como la milpa. El **relevo** describe cultivos sembrados en momentos distintos dentro del calendario agrícola. La definición y las fechas de cada plan se encuentran en el contrato y deben confirmarse con el Rol 3.

## Criterios y prioridades

Cada plan se evalúa con cinco criterios:

1. **Rachas secas:** proporción de días críticos del cultivo que coincide con rachas secas.
2. **Estrés por calor:** proporción de días críticos expuestos a episodios de calor.
3. **Cobertura del suelo:** meses en que el suelo queda descubierto.
4. **Fijación de nitrógeno:** atributo relativo de los cultivos incluidos.
5. **Ingreso o forraje:** cosechas y subproductos que aporta el plan, según atributos documentados.

El productor selecciona una prioridad —agua, suelo, nitrógeno o ingreso— y el motor aplica pesos definidos en reglas. Las prioridades, etapas y atributos deben adaptarse al cultivo seleccionado. Los resultados exploratorios de v0.2 dependen de reglas provisionales y no se deben extrapolar a otros cultivos.

## Datos y zona

Los datos históricos v0.2 usan NASA POWER Daily API:

- **Lluvia:** GPM IMERG, parámetro `IMERG_PRECTOT`, desde 1998, resolución aproximada de 10 km.
- **Temperatura máxima:** MERRA‑2, parámetro `T2M_MAX`, resolución aproximada de 50 km.
- **Periodo resumido en la documentación:** 1998–2025.

La proyección climática es una capacidad aprobada para la evolución del producto, pero la fuente, los escenarios y los periodos de proyección todavía deben definirse. Se presentará como escenario climático, no como predicción de cosecha.

El Rol 2 prepara los archivos climáticos por zona mediante Python antes de publicar la app. La parcela se asocia al punto de zona más cercano y la interfaz muestra el nombre de la zona y la distancia. El clima de zona es una referencia regional; no equivale a una medición en la parcela.

Los tipos de suelo locales considerados son *tsek'el*, *k'ankab* y *ak'alche*. El tipo de suelo puede modificar el umbral usado para considerar relevante una racha seca y la aptitud relativa de los cultivos. Si se desconoce, el sistema debe dejarlo como faltante y no inventarlo.

Los datos faltantes se representan como `null`, nunca como cero ni como el valor técnico `-999`. La app debe mostrar fuente, parámetro y fecha de corte de los datos NASA.

## Arquitectura aprobada para la evolución del proyecto

- La PWA se construye en JavaScript y conserva capacidad de uso sin conexión.
- Una API en FastAPI sirve consultas, valida datos y sincroniza registros cuando vuelve la conexión.
- PostgreSQL con PostGIS almacena parcelas autorizadas, observaciones de cosecha, catálogos geográficos y resultados agregados.
- El teléfono conserva los datos de trabajo localmente y sincroniza según consentimiento y disponibilidad de red.
- Un pipeline Python prepara los datos NASA, escenarios climáticos y catálogos gubernamentales que se encuentren disponibles.
- La ubicación se usa para asignar zona y consultar estadísticas; la precisión y el uso compartido deben ser visibles para el usuario.
- La estructura propuesta y responsabilidades de módulos están en [`arquitectura-y-estructura.md`](arquitectura-y-estructura.md).

## Flujo principal de la aplicación

1. El productor carga una parcela de ejemplo o registra su ubicación mediante GPS o municipio.
2. La aplicación asigna una zona agroclimática y muestra la distancia al punto de referencia.
3. El productor selecciona un tipo de suelo, o indica que no lo sabe, y elige una prioridad.
4. El motor compara las opciones configuradas para el cultivo y muestra criterios, evidencia e incertidumbre.
5. El productor revisa calendario, meses descubiertos, beneficios, riesgos y datos por confirmar.
6. La aplicación consulta estadísticas colectivas por zona y periodo, y muestra escenarios climáticos disponibles.
7. El productor puede registrar una cosecha con un cuestionario corto y consultar su historial.

## Principios de comunicación

- Usar lenguaje claro para productores y asesores.
- Etiquetar los datos de ejemplo.
- Distinguir datos climáticos regionales de observaciones en campo.
- Mostrar qué información falta confirmar en lugar de completarla con suposiciones.
- Presentar la comparación como exposición histórica, nunca como pronóstico de cosecha.
- Decir explícitamente que la herramienta apoya la decisión y no reemplaza al productor ni al técnico.

## Organización del trabajo

| Rol | Responsabilidad principal |
|---|---|
| 1. Líder técnico e integración | Contrato, integración, publicación y recorte de alcance. |
| 2. Ingeniería de datos | Zonas y series NASA procesadas por zona. |
| 3. Reglas agrícolas | Planes, cultivos, suelos, pesos y fuentes o pendientes. |
| 4. Motor y PWA | Comparación, carga de datos, almacenamiento local y modo sin conexión. |
| 5. Frontend y captura | Ubicación, suelo y prioridad. |
| 6. Frontend y resultados | Ranking, explicaciones, comparación regional y demo. |

Los requisitos vigentes están en [`requisitos-del-sistema.md`](requisitos-del-sistema.md). Antes de implementar la nueva arquitectura, se debe definir el contrato versionado para parcelas, cultivos, variedades, cosechas, consentimiento, sincronización, estadísticas y escenarios climáticos.
