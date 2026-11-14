# Rol 3 — Reglas agrícolas

> **Para tu IA:** eres asistente del responsable de reglas agrícolas de jaibaSpace, equipo del NASA Space Apps Challenge 2026 en el reto *Field Shift*. Tu trabajo es respaldar las **tres estrategias de dos ciclos** que acordó el equipo para productores de temporal de la **Península de Yucatán** y escribir las reglas como JSON (`planes.json` y `reglas.json`, secciones 3 y 4 de `docs/contrato-datos.md`). **Toda fecha, umbral, ajuste o atributo necesita una fuente o queda en «por confirmar».** No presentes como hecho algo que no esté respaldado.

## Entregable del día

> `planes.json` con las 3 estrategias (dos ciclos cada una, objetivo, calendario, atributos, beneficios, riesgos y fuentes) y `reglas.json` con cultivos y etapas, tipos de suelo, prioridades, pesos y tolerancias. Una nota con las fuentes consultadas.

El contrato ya trae una propuesta completa. Tu trabajo es **confirmarla, corregirla o marcarla como por confirmar**, no empezar de cero.

## El caso

- **Productores:** temporal (sin riego) en Yucatán, Campeche y Quintana Roo.
- **Temporada de lluvias:** aproximadamente de junio a octubre. Las secas van de noviembre a mayo.
- **Datos de la NASA disponibles por zona:** lluvia diaria GPM IMERG y temperatura máxima MERRA‑2 desde 1998, con todas las rachas secas y episodios de calor por año. Los produce el Rol 2.
- **Prioridades del productor:** `agua`, `suelo`, `nitrogeno` o `ingreso`.

## Las 3 estrategias (acordadas por el equipo; contrato v0.3, sección 3)

Una **estrategia de rotación** es el plan de qué sembrar, en qué orden y para qué objetivo, durante varios ciclos en la misma parcela. Cada fila es un plan completo:

| Plan | Primer ciclo | Segundo ciclo | Objetivo |
|---|---|---|---|
| **Actual** (`actual`) | Maíz de temporal | Maíz de temporal | Cosechar maíz en ambos ciclos |
| **Rotación con cobertura** (`cobertura`) | Canavalia | Maíz de temporal | Dedicar un ciclo a cubrir el suelo antes de volver al maíz |
| **Rotación con otro grano** (`otro-grano`) | Frijol caupí | Maíz de temporal | Cosechar un grano distinto en el primer ciclo |

- **El primero es cultivo continuo** (repite maíz) y sirve como **referencia**. Los otros dos son **rotaciones** porque cambian el cultivo entre ciclos.
- **Asociación no es rotación.** Maíz y frijol **juntos en el mismo ciclo** es asociación de cultivos (como la milpa). Frijol en un ciclo y maíz en el siguiente es rotación. Ninguna de las 3 estrategias usa asociación.
- **Lo que debe quedar visible:** el plan `cobertura` no tiene cosecha de maíz en el ciclo 1. Cosechas de maíz: actual 2, cobertura 1, otro grano 1 (más 1 de caupí).

**Valores de ejemplo que ya están en el contrato y debes confirmar o corregir:**

| | Actual | Cobertura | Otro grano |
|---|---|---|---|
| Ciclo 1 | Maíz, 15 jun–31 oct | Canavalia, 15 jun–30 abr (corte o incorporación) | Caupí, 15 jun–15 sep |
| Ciclo 2 | Maíz, 15 jun–31 oct | Maíz, 15 jun–31 oct | Maíz, 15 jun–31 oct |
| Nitrógeno | bajo | alto | medio |
| Ingreso o forraje | alto (2 cosechas de maíz) | bajo (sin cosecha en el ciclo 1) | alto (caupí y maíz) |

Los niveles son **relativos entre los 3 planes**. Todo valor sin fuente va en `porConfirmar`.

**Cultivos en `reglas.json`:** `maiz`, `canavalia` y `caupi`. Se retiraron `maiz-precoz`, `frijol`, `calabaza` y `mucuna`.

- La canavalia **no tiene etapas de sensibilidad alta**, porque no se cosecha. Por eso no suma días críticos.
- El caupí tiene floración de sensibilidad alta (días 35–50, provisional). Con siembra el 15 de junio, eso cae del 20 de julio al 4 de agosto.

## Lo que debes investigar y citar

| Dato | Para qué | Fuentes sugeridas |
|---|---|---|
| Fecha típica de siembra de maíz de temporal en cada estado | `siembra` de los planes | SIAP (calendario agrícola), INIFAP (guías para la península), SADER |
| Duración del ciclo y días a floración (maíz criollo y caupí o x'pelón) | `etapas[].desdeDia` y `hastaDia` | INIFAP, FAO‑56, fichas de variedades locales |
| Sensibilidad al déficit hídrico por etapa | `sensibilidad` | FAO‑56 y literatura agronómica |
| Canavalia como cobertura: fecha de siembra, cuándo se corta o incorpora y si sirve de forraje | Estrategia `cobertura` | Ensayo de leguminosas de cobertura con maíz en el sur de Yucatán (SciELO), INIFAP, CIMMYT |
| Caupí (x'pelón): variedades locales, ciclo, mercado y tolerancia a sequía y encharcamiento | Estrategia `otro-grano` | INIFAP, ECOSUR, SIAP |
| Tipos de suelo maya y su equivalencia | `reglas.suelos` | INEGI (edafología 1:250 000); Bautista y Zinck (2010), clasificación maya de suelos y su comparación con WRB; FAO GAEZ |
| Suelos predominantes por zona | `zonas.json → suelosPredominantes` | INEGI |
| Umbral de calor para el maíz | `umbralCalorC` | Literatura sobre viabilidad del polen y estrés térmico en maíz |
| Qué se siembra en cada zona | Plausibilidad de las estrategias | SIAP / DGSIAP |

## Decisiones que debes confirmar en `reglas.json`

1. **`umbralDiaSecoMm`** (provisional: 1.0 mm/día).
2. **`rachaRelevanteDias`** (provisional: 5) y el **ajuste por suelo**: *tsek'el* −1, *k'ankab* 0, *ak'alche* +1. La idea es que un suelo pedregoso y poco profundo retiene menos agua y el cultivo se estresa antes.
3. **Sensibilidad alta del establecimiento del maíz.** Es una propuesta nueva: los datos muestran que las rachas largas caen sobre todo en **junio**, justo después de la siembra, y una racha seca ahí obliga a resembrar. Confírmala o cámbiala a `media`.
4. **`umbralCalorC`** (provisional: 35 °C) y **`episodioCalorRelevanteDias`** (provisional: 3).
5. **Aptitud por suelo y cultivo** (`alta`, `media`, `baja`). Por ejemplo, en *ak'alche* el maíz y el caupí se proponen como `baja` por encharcamiento.
6. **Cobertura:** un mes cuenta como cubierto si un ciclo está en pie al menos 15 días. Decide si el rastrojo cuenta; si sí, agrégalo como ciclo con `proposito: "rastrojo"`.
7. **`atributos`** de las 3 estrategias (`fijacionNitrogeno`, `ingresoForraje`).
8. **`pesosPorPrioridad`** (cada fila suma 1) y **`toleranciaEmpate`**.

### Cómo usa el motor tus reglas

- **Días críticos:** los días de etapas con sensibilidad `alta`, contados desde la siembra de cada ciclo.
- **Rachas secas:** qué parte de los días críticos cayó dentro de una racha de al menos `rachaRelevanteDias + ajuste del suelo` días. Se promedia en 28 años.
- **Calor:** igual, con episodios de calor de al menos `episodioCalorRelevanteDias`.
- **Cobertura:** meses descubiertos según tus calendarios.
- **Nitrógeno e ingreso:** el nivel del plan (`bajo` 0, `medio` 0.5, `alto` 1).
- **Total:** suma de puntajes por su peso según la prioridad. Dentro de la tolerancia es **empate**.
- **Riesgos automáticos:** cultivos con aptitud `baja` en el suelo elegido.

### Lo que dicen los datos (cálculo exploratorio del Rol 2)

Con tus reglas provisionales y los datos reales:

- **Mover la siembra del maíz dos semanas casi no cambia la exposición a sequía** (10 % contra 11 % de los días críticos en el noroeste de Yucatán).
- **La zona sí la cambia mucho:** del 5 % en el sur de Campeche al 28 % en Quintana Roo.
- **El calor pega en el establecimiento de junio**, no en la floración de agosto.
- **Con las 3 estrategias, el maíz del ciclo 2 es el mismo en los tres planes.** Si se siembra en las mismas fechas, tiene la misma exposición a rachas secas: **empate** en ese ciclo. Las diferencias de sequía vienen del ciclo 1: maíz en `actual`, canavalia sin días críticos en `cobertura`, y floración del caupí en `otro-grano`.
- *(Por recalcular)* Los resultados por prioridad del cálculo exploratorio eran de las 4 estrategias de v0.2 y ya no aplican. Se repiten cuando el Rol 4 defina cómo contar los dos ciclos.

## Por cada estrategia, documenta también

- `descripcionCorta`: una frase en lenguaje de productor.
- `beneficios` y `riesgos`: 2 o 3 frases cortas cada uno.
- `fuentes`: cita cada fecha, duración y atributo.
- `porConfirmar`: datos de la parcela real que faltan (fecha real de siembra, semilla, mano de obra, humedad residual).

## Textos de ayuda para el Rol 6

Escribe 1 o 2 frases sencillas para la ayuda «¿Qué significa?»:
- qué es un cultivo fijador de nitrógeno,
- qué es un cultivo de cobertura,
- qué es una rotación y en qué se diferencia de una asociación de cultivos,
- por qué el suelo desnudo pierde humedad y materia orgánica.

## A quién le entregas qué

| Para | Entregas | Lo usa para |
|---|---|---|
| Rol 4 (motor) | `app/data/planes.json` y `app/data/reglas.json` | Calcular los criterios |
| Rol 2 (datos) | Umbrales de día seco y de calor confirmados; suelos predominantes por zona | Regenerar el clima y completar `zonas.json` |
| Rol 5 (captura) | Nombres de suelos y prioridades en lenguaje simple | Opciones del formulario |
| Rol 6 (resultados) | Textos de estrategias y ayudas | Explicaciones en lenguaje simple |
| Rol 1 (líder) | La lista de supuestos sin fuente | Decidir qué se etiqueta como «dato de ejemplo» |

## Criterios de terminado

- [ ] Las 3 estrategias en `planes.json` (dos ciclos cada una), con objetivo, calendario, atributos, beneficios, riesgos y fuentes.
- [ ] Fechas de la canavalia y del caupí, y etapas del caupí, con fuente o en `porConfirmar`.
- [ ] `reglas.json` válido, con cultivos, suelos, prioridades, pesos y tolerancias; cada fila de pesos suma 1.
- [ ] Cada número tiene una fuente o aparece en `porConfirmar`.
- [ ] Una nota corta (debajo) con las fuentes consultadas y sus enlaces.

## Fuentes consultadas

*(Llenar durante el día.)*
