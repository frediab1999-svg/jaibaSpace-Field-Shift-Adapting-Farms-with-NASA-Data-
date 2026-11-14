# Rol 3 — Reglas agrícolas

> **Para tu IA:** eres asistente del responsable de reglas agrícolas de jaibaSpace, equipo del NASA Space Apps Challenge 2026 en el reto *Field Shift*. Tu trabajo es definir dos planes de cultivo plausibles para un productor de **maíz de temporal en Yucatán** y escribir las reglas como JSON (`planes.json` y `reglas.json`, secciones 2 y 3 de `docs/contrato-datos.md`). **Toda fecha o umbral necesita una fuente o queda marcado como «por confirmar».** No presentes como hecho algo que no esté respaldado.

## Entregable del día

> Documenta los dos planes con su calendario por ciclo y sus fuentes. Escribe las reglas como un JSON de umbrales: exposición a rachas secas por etapa del cultivo y meses con el suelo descubierto.

## El caso

- **Productor (ficticio):** maíz de temporal (sin riego) en el occidente de Yucatán, punto 20.49 N, −89.75 O.
- **Temporada de lluvias:** aproximadamente de junio a octubre. Las secas van de noviembre a mayo.
- **Dato de la NASA disponible:** lluvia diaria de GPM IMERG desde 1998, con todas las rachas secas por año (inicio, fin y días). Lo produce el Rol 2.
- **Prioridad del productor:** `agua` (disponibilidad de agua) o `cobertura` (cobertura del suelo). Cambia el peso de cada criterio.

## Los dos planes (propuesta inicial, por validar)

| | Plan actual | Rotación alternativa |
|---|---|---|
| Ciclo 1 | Maíz grano, siembra hacia el 15 de junio y cosecha hacia el 31 de octubre | Maíz grano con las mismas fechas |
| Ciclo 2 | Nada: suelo descubierto de noviembre a mayo | Leguminosa de cobertura (p. ej., mucuna o canavalia) intercalada hacia el 15 de julio, que queda en pie en secas |
| Idea | Práctica tradicional de un solo ciclo | Mantener el suelo cubierto y aportar nitrógeno |

**Alternativas que puedes evaluar en lugar de la anterior:**

- **Cambiar la fecha de siembra o usar una variedad de ciclo corto.** Esto sí cambia la exposición a rachas secas. Si ambos planes siembran maíz el mismo día, el criterio de rachas casi siempre saldrá **empate**. Eso es válido y la app lo muestra como empate, pero el demo es más interesante si la rotación también mueve alguna etapa sensible.
- **Maíz con frijol o calabaza** (milpa). Es la asociación tradicional de la región.

Elige una opción y documenta por qué.

## Lo que debes investigar y citar

| Dato | Para qué | Fuentes sugeridas |
|---|---|---|
| Fecha típica de siembra de maíz de temporal en Yucatán | `siembra` del plan actual | SIAP (calendario agrícola), INIFAP (guías técnicas para la península), SADER |
| Duración del ciclo y días hasta la floración | `etapas[].desdeDia` y `hastaDia` | INIFAP, FAO‑56 (Kc y duración de etapas), fichas de variedades criollas o híbridas locales |
| Etapa más sensible al déficit hídrico | `sensibilidad: "alta"` | FAO‑56 y literatura agronómica. La floración (espiga y jilote) suele ser la crítica en maíz, pero confírmalo con una fuente. |
| Leguminosa de cobertura adaptada a suelos pedregosos y someros de Yucatán | Ciclo 2 de la rotación | INIFAP, CIMMYT, experiencias de abonos verdes en la península |
| Suelos locales | Contexto y `datosPendientes` | INEGI, edafología 1:250 000. Los suelos dominantes son someros y pedregosos (*tsek'el*) y rojos más profundos (*k'ankab*); confirma con INEGI. |
| Qué se siembra en la zona | Plausibilidad | SIAP / DGSIAP, producción por municipio, ciclo primavera‑verano y modalidad de temporal |

## Las reglas que debes fijar en `reglas.json`

1. **`umbralDiaSecoMm`**: el provisional es 1.0 mm/día. Confírmalo o cámbialo con una justificación.
2. **`rachaRelevanteDias`**: cuántos días secos seguidos cuentan como estrés en una etapa sensible. El provisional es 5.
3. **Etapas por cultivo**: `id`, `nombre`, `desdeDia`, `hastaDia` (días desde la siembra) y `sensibilidad` (`alta`, `media` o `baja`).
4. **Cobertura**: un mes cuenta como cubierto si un ciclo está en pie al menos 15 días de ese mes (`diasMinimosPorMes`). Decide si el rastrojo cuenta como cobertura. Si cuenta, agrégalo como ciclo con `proposito: "rastrojo"`.
5. **`pesosPorPrioridad`**: propuesta de 0.7 / 0.3 según la prioridad. Ajústalo si tienes un argumento.
6. **`toleranciaEmpate`**: diferencia mínima para que un plan gane en un criterio.

### Cómo usa el motor tus reglas

Resumen del algoritmo del contrato:

- **Rachas secas:** el motor recorre cada temporada histórica y calcula las fechas de cada etapa (siembra + `desdeDia` hasta siembra + `hastaDia`). Una temporada cuenta como afectada si una racha de `rachaRelevanteDias` días o más se traslapa con una etapa de sensibilidad `alta`. El valor del criterio es la proporción de temporadas afectadas.
- **Cobertura:** el motor cuenta los meses descubiertos al año según tus calendarios.
- **Total:** el motor suma cada puntaje multiplicado por su peso según la prioridad. Si la diferencia está dentro de la tolerancia, el resultado es **empate**.

### Dato útil del Rol 2 para calibrar

Con siembra el 15 de junio y floración entre los días 55 y 75, la floración cae entre el 9 y el 29 de agosto. En los datos IMERG de 1998 a 2025, la mayoría de las rachas más largas de junio a agosto ocurren **en junio**. Por ejemplo: 2025 (6–17 de junio), 1998 (2–19 de junio), 2014 (8–18 de junio) y 2023 (13–22 de junio). Eso afecta más al **establecimiento** que a la floración. Revisa si conviene:

- dar sensibilidad `alta` al establecimiento, o
- ampliar la ventana de resumen hasta octubre para cubrir la floración y el llenado.

Pídele al Rol 2 las rachas de julio a septiembre si las necesitas.

## Por cada plan, documenta también

- `descripcionCorta`: una frase en lenguaje de productor.
- `fuentes`: cita cada fecha o duración.
- `porConfirmar`: datos de la parcela real que faltan (fecha real de siembra, cultivo anterior, profundidad del suelo, disponibilidad de semilla, mano de obra).

## A quién le entregas qué

| Para | Entregas | Lo usa para |
|---|---|---|
| Rol 4 (motor) | `app/data/planes.json` y `app/data/reglas.json` | Calcular los criterios |
| Rol 2 (datos) | La ventana del cultivo y el umbral confirmados | Regenerar el resumen de `clima.json` |
| Rol 6 (resultados) | Los textos cortos de cada plan y las razones típicas | Explicaciones en lenguaje simple |
| Rol 1 (líder) | La lista de supuestos sin fuente | Decidir qué se etiqueta como «dato de ejemplo» |

## Criterios de terminado

- [ ] Dos planes en `planes.json`, cada uno con calendario por ciclo y fuentes.
- [ ] `reglas.json` válido, con etapas por cultivo, umbrales, pesos y tolerancias.
- [ ] Cada número tiene una fuente o aparece en `porConfirmar`.
- [ ] Una nota corta (puede ir en este archivo, debajo) con las fuentes consultadas y sus enlaces.

## Fuentes consultadas

*(Llenar durante el día.)*
