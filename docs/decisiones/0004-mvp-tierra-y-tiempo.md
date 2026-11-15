# 0004. MVP del Hackathon: el tiempo y la conservación de la tierra

- **Estado:** implementada en `feature/mvp-tierra-y-tiempo`, para revisión
- **Fecha:** 2026-11-15
- **Punto de partida:** `develop` en `c54e3e7`

## Problema

La revisión de `develop` encontró que la app mostraba datos de la NASA, pero no ayudaba a decidir:

1. **El cuestionario no influía en nada.** El formulario preguntaba años seguidos, qué había antes, cómo le fue y la prioridad, pero ningún cálculo los usaba. La app no distinguía una tierra sobreexplotada de una tierra virgen.
2. **La ubicación no cambiaba los números.** Solo había 3 puntos de clima (Tekax, Hopelchén y Felipe Carrillo Puerto). Cualquier parcela tomaba el punto más cercano. Si estaba a más de 50 km, aparecía una advertencia. 27 de los 30 municipios del catálogo no tenían zona.
3. **«Opciones» repetía los mismos datos** en los dos ciclos y en las tres estrategias, y su «¿Por qué?» mostraba trazabilidad y códigos sin traducir.
4. **«Predicción» mostraba hasta 8 señales**, varias con «Sin dato».
5. El menú tenía una tarjeta de temporada con aspecto de calendario. Eso, la foto de la parcela y el sabucán no aportaban al caso de uso.

## Enfoque

La app responde a una pregunta: **«¿Cómo siembro mi parcela los próximos dos años sin acabarme la tierra?»** Hay dos casos de uso:

- **Pablo:** su tierra se ha sembrado muchas veces seguidas y está cansada. Quiere recuperarla sin dejar de cosechar.
- **Juan:** su terreno nunca se ha sembrado (monte). Quiere empezar sin deteriorarlo.

Se mantiene lo mínimo que pide el reto (`docs/reto-oficial.md`):

- se usan observaciones de la NASA, el suelo, las características de los cultivos y las prioridades del productor;
- se muestran los meses sin cultivo y las temporadas vulnerables;
- **se comparan al menos tres estrategias, incluida la actual**;
- de cada estrategia se dice por qué se sugiere, la evidencia, los beneficios, lo que falta saber y los riesgos que hay que revisar con un técnico;
- la herramienta apoya la decisión del productor, no la reemplaza.

## Flujo

```
Primera vez:  Nombre → Bienvenida → Cuestionario (4 pasos) → Diagnóstico de tu tierra → Tu plan de 2 años → Guardar plan
Después:      Menú (Tu tierra) → Diagnóstico → Plan / ¿Cuándo me conviene sembrar? → Terminar siembra → el diagnóstico se actualiza
```

## Decisiones

### Cuestionario de 4 pasos (`ui/captura/parcela-form.js`)

Una pregunta por pantalla:

1. **Dónde está:** nombre y ubicación (mapa, GPS o municipio).
2. **Cómo está tu tierra:**
   - «Ya la he sembrado»: qué siembra y en qué mes, años seguidos, si descansa, si quema, cómo le fue la última vez y señales de cansancio.
   - «Nunca se ha sembrado»: qué hay hoy (monte, acahual, potrero…), si va a tumbar todo y qué piensa sembrar.
3. **Suelo y tamaño.**
4. **Qué busca:** comer, vender o cuidar la tierra. Se traduce a las prioridades de `reglas.json`: agua, ingreso y suelo.

Campos nuevos de la parcela, todos locales: `descanso`, `quema`, `senales`, `resultadoReciente`, `practica`, `desmonte`, `objetivo` y `climaPunto`. Se quitó `foto`.

### Diagnóstico de la tierra (`motor/diagnostico.js`, funciones puras con pruebas)

Es una **regla del modelo**, no un análisis de suelo. Se muestra como tal y falta validarla con el Rol 3 y técnicos de la zona.

| Respuesta | Puntos |
|---|---|
| 2–3 años seguidos / 4 o más | 1 / 2 |
| Nunca descansa | 1 |
| Quema (sí o a veces) | 1 |
| Última cosecha regular / mala | 1 / 2 |
| Señales de cansancio | 1 por señal, máximo 2 |

- De 0 a 2 puntos, la tierra está en buen estado; de 3 a 4, se está cansando; con 5 o más, está cansada.
- «Nunca se ha sembrado» da **tierra nueva** y no se puntúa.
- «No sé» no suma; queda como dato faltante.
- Las temporadas que se cierran en la app suman años seguidos. El resultado de la última temporada reemplaza al del cuestionario (`modules/parcel/tierra.js`).

### Estrategia sugerida

Las tres estrategias principales se muestran **siempre**. El diagnóstico solo decide el orden y cuál lleva el sello «Sugerida para tu tierra».

| Estado | Sugerida | Notas |
|---|---|---|
| Cansada, prioridad suelo | Ciclo de canavalia y luego maíz | — |
| Cansada, prioridad comer o vender | Maíz con canavalia intercalada | «Si puedes dejar un ciclo, la cobertura la recupera más rápido» |
| Se está cansando / buen estado | Maíz con canavalia intercalada | — |
| Nueva | Maíz con canavalia intercalada | No quemar; dejar franjas de monte si se abre monte |

- En tierra nueva, la estrategia de referencia es «Lo que se hace normalmente» (roza, tumba y quema con maíz cada año), porque todavía no hay una práctica propia.
- La soya solo aparece con suelo k'ankab verificado, prioridad «vender» y nunca en tierra nueva.

### Clima del punto exacto (`modules/climate/climaPunto.js`, `server/app/modules/climate/punto.py`)

- Al guardar la parcela se pide `GET /api/v1/climate/point?lat&lon`. El servidor consulta NASA POWER (IMERG_PRECTOT y T2M_MAX, de 1998 a 2025), lo procesa igual que `data-pipeline/clima.py` y lo guarda en caché por celda redondeada a dos decimales.
- Si el servidor no responde, la app lo intenta directo a NASA POWER y lo procesa en el teléfono con la misma lógica. Se comprobó que JS y Python dan resultados idénticos en 28 años con huecos.
- El resultado se guarda en el teléfono y después funciona sin conexión.
- Sin red se usa el clima de la zona con un texto neutro («se afinará a tu punto…») y se reintenta al volver la red. **Se quitaron las advertencias de distancia.**
- El documento tiene la misma forma que `app/data/clima/<zona>.json`, así que el motor no cambió.
- Límite real: la lluvia viene en cuadros de unos 10 km y la temperatura en cuadros de unos 50 km.

### Pantallas

- **Diagnóstico** (`#/diagnostico/:id`, nueva):
  - el estado de la tierra con sus razones;
  - «El tiempo de tu tierra»: meses sin cultivo con la práctica actual y lo que gana la estrategia sugerida;
  - el clima de la temporada en palabras;
  - la referencia de rendimiento de Tekax.
- **Tu plan de 2 años** (`#/opciones/:id`):
  - un resumen de meses cubiertos;
  - tres tarjetas, cada una con **cinco líneas visibles**: por qué está, lo que dicen los datos, qué gana la tierra, lo que todavía no sabemos y qué revisar con el técnico;
  - «Fuentes y supuestos», plegado.
- **¿Cuándo me conviene sembrar?** (`#/prediccion/:id`):
  - la **mejor fecha de siembra** del maíz en el punto (1 y 15 de cada mes de la ventana oficial), con una barra por fecha;
  - como máximo tres señales: sequía, calor y estado de la tierra;
  - el resto solo si tiene dato, plegado. Se quitaron «Clima que viene» y «Productores de tu zona», que casi siempre salían sin dato.
- **Menú:** la tarjeta de temporada se cambió por un acceso a «Tu tierra».
- Se quitaron la **foto** de la parcela y el **sabucán** (pantalla, calendario, voz e imagen).

### Referencia del municipio

`catalogos/municipios.json` incluye en Tekax la referencia de rendimiento: 2.22 t/ha en 2024 y 2.35 t/ha en 2025 (SADER/DGSIAP, maíz grano, temporal). Se muestra con la nota de que es el promedio del municipio, no un pronóstico de la parcela.

### Ejemplos

`fixtures/ejemplo-milpa.json` suma `ej-pablo` (tierra cansada, cerca de Tekax) y `ej-juan` (monte, cerca de Tekax). La bienvenida los ofrece como «Mira un ejemplo».

## Pendiente

- Validar con técnicos la regla de puntos y el orden de las estrategias.
- Las etapas sensibles de frijol, calabaza y canavalia: hoy solo el maíz se cruza con el clima.
- La caché de `/climate/point` vive en memoria del servidor: se pierde al reiniciarlo. Para producción conviene guardarla en PostgreSQL.
- Opcional, según el reto: humedad del suelo SMAP.
