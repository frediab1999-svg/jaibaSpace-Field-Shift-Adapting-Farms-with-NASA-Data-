# Rol 3 — Reglas agrícolas

> **Para tu IA:** eres asistente del responsable de reglas agrícolas de jaibaSpace, equipo del NASA Space Apps Challenge 2026 en el reto *Field Shift*. Tu trabajo es respaldar **cuatro estrategias de rotación** para productores de temporal de la **Península de Yucatán** y escribir las reglas como JSON (`planes.json` y `reglas.json`, secciones 3 y 4 de `docs/contrato-datos.md`). **Toda fecha, umbral, ajuste o atributo necesita una fuente o queda en «por confirmar».** No presentes como hecho algo que no esté respaldado.

## Entregable del día

> `planes.json` con 4 estrategias (calendario, atributos, beneficios, riesgos y fuentes) y `reglas.json` con cultivos y etapas, tipos de suelo, prioridades, pesos y tolerancias. Una nota con las fuentes consultadas.

El contrato ya trae una propuesta completa. Tu trabajo es **confirmarla, corregirla o marcarla como por confirmar**, no empezar de cero.

## El caso

- **Productores:** temporal (sin riego) en Yucatán, Campeche y Quintana Roo.
- **Temporada de lluvias:** aproximadamente de junio a octubre. Las secas van de noviembre a mayo.
- **Datos de la NASA disponibles por zona:** lluvia diaria GPM IMERG y temperatura máxima MERRA‑2 desde 1998, con todas las rachas secas y episodios de calor por año. Los produce el Rol 2.
- **Prioridades del productor:** `agua`, `suelo`, `nitrogeno` o `ingreso`.

## Las 4 estrategias (propuesta por validar)

| | Actual | Cobertura | Milpa | Relevo |
|---|---|---|---|---|
| Ciclos | Maíz 15 jun–31 oct | Maíz + mucuna o canavalia (15 jul–28 feb) | Maíz + frijol (15 jun–15 sep) + calabaza (15 jun–15 oct) | Maíz precoz (1 jul–15 oct) + frijol de relevo (1 oct–31 dic) |
| Meses descubiertos | 7 | 3 | 7 | 6 |
| Nitrógeno | bajo | alto | medio | medio |
| Ingreso o forraje | medio | bajo | alto | alto |
| Idea | Referencia | Cubrir el suelo y fijar nitrógeno | Tradición maya, tres cosechas | Dos cosechas al año |

Si cambias una estrategia, documenta por qué. Opciones que también podrías evaluar: canavalia en lugar de mucuna; sorgo o cacahuate como cultivo tolerante a la sequía; frijol x'pelón (*Vigna unguiculata*) en la milpa.

## Lo que debes investigar y citar

| Dato | Para qué | Fuentes sugeridas |
|---|---|---|
| Fecha típica de siembra de maíz de temporal en cada estado | `siembra` de los planes | SIAP (calendario agrícola), INIFAP (guías para la península), SADER |
| Duración del ciclo y días a floración (maíz criollo, maíz precoz, frijol, calabaza) | `etapas[].desdeDia` y `hastaDia` | INIFAP, FAO‑56, fichas de variedades locales |
| Sensibilidad al déficit hídrico por etapa | `sensibilidad` | FAO‑56 y literatura agronómica |
| Leguminosa de cobertura adaptada a suelos pedregosos | Estrategia de cobertura | INIFAP, CIMMYT, experiencias de abonos verdes en la península |
| Frijol de relevo con humedad residual | Estrategia de relevo | INIFAP, ECOSUR |
| Tipos de suelo maya y su equivalencia | `reglas.suelos` | INEGI (edafología 1:250 000); Bautista y Zinck (2010), clasificación maya de suelos y su comparación con WRB; FAO GAEZ |
| Suelos predominantes por zona | `zonas.json → suelosPredominantes` | INEGI |
| Umbral de calor para el maíz | `umbralCalorC` | Literatura sobre viabilidad del polen y estrés térmico en maíz |
| Qué se siembra en cada zona | Plausibilidad de las estrategias | SIAP / DGSIAP |

## Decisiones que debes confirmar en `reglas.json`

1. **`umbralDiaSecoMm`** (provisional: 1.0 mm/día).
2. **`rachaRelevanteDias`** (provisional: 5) y el **ajuste por suelo**: *tsek'el* −1, *k'ankab* 0, *ak'alche* +1. La idea es que un suelo pedregoso y poco profundo retiene menos agua y el cultivo se estresa antes.
3. **Sensibilidad alta del establecimiento del maíz.** Es una propuesta nueva: los datos muestran que las rachas largas caen sobre todo en **junio**, justo después de la siembra, y una racha seca ahí obliga a resembrar. Confírmala o cámbiala a `media`.
4. **`umbralCalorC`** (provisional: 35 °C) y **`episodioCalorRelevanteDias`** (provisional: 3).
5. **Aptitud por suelo y cultivo** (`alta`, `media`, `baja`). Por ejemplo, en *ak'alche* el maíz y el frijol se proponen como `baja` por encharcamiento.
6. **Cobertura:** un mes cuenta como cubierto si un ciclo está en pie al menos 15 días. Decide si el rastrojo cuenta; si sí, agrégalo como ciclo con `proposito: "rastrojo"`.
7. **`atributos`** de cada estrategia (`fijacionNitrogeno`, `ingresoForraje`).
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

- **Mover la siembra del maíz dos semanas casi no cambia la exposición a sequía** (10 % contra 11 % de los días críticos en el noroeste de Yucatán). Por eso la cuarta estrategia es un relevo y no solo un cambio de fecha.
- **La zona sí la cambia mucho:** del 5 % en el sur de Campeche al 28 % en Quintana Roo.
- **El frijol de relevo se expone más** (23 % a 36 %), porque florece al empezar las secas. Es un riesgo real que debe verse en la app.
- **El calor pega en el establecimiento de junio**, no en la floración de agosto.
- **La recomendación cambia con la prioridad:** agua → empatan cobertura y milpa; suelo o nitrógeno → cobertura; ingreso → empatan milpa y relevo. Pasa igual en las 7 zonas: la zona cambia el nivel de riesgo, no tanto el orden. Si quieres que la zona pese más en la recomendación, una vía es una estrategia con un cultivo tolerante a la sequía (sorgo, cacahuate) que gane en las zonas más secas.

## Por cada estrategia, documenta también

- `descripcionCorta`: una frase en lenguaje de productor.
- `beneficios` y `riesgos`: 2 o 3 frases cortas cada uno.
- `fuentes`: cita cada fecha, duración y atributo.
- `porConfirmar`: datos de la parcela real que faltan (fecha real de siembra, semilla, mano de obra, humedad residual).

## Textos de ayuda para el Rol 6

Escribe 1 o 2 frases sencillas para la ayuda «¿Qué significa?»:
- qué es un cultivo fijador de nitrógeno,
- qué es un cultivo de cobertura,
- qué es una siembra de relevo,
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

- [ ] 4 estrategias en `planes.json`, cada una con calendario, atributos, beneficios, riesgos y fuentes.
- [ ] `reglas.json` válido, con cultivos, suelos, prioridades, pesos y tolerancias; cada fila de pesos suma 1.
- [ ] Cada número tiene una fuente o aparece en `porConfirmar`.
- [ ] Una nota corta (debajo) con las fuentes consultadas y sus enlaces.

## Fuentes consultadas

*(Llenar durante el día.)*
