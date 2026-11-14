# Rol 6 — Frontend y resultados

> **Arquitectura PENDIENTE (2026‑11‑14).** El equipo va a cambiar la arquitectura. Lo que este documento dice sobre PWA, backend o falta de backend, motor en el teléfono, *service worker*, hosting, almacenamiento local o modo sin conexión es la **propuesta anterior** y **no está decidido**. No lo implementes ni lo des por hecho hasta que el Rol 1 publique la nueva arquitectura. Ver `docs/00-contexto-general.md`, sección «Arquitectura (pendiente)».

> **Para tu IA:** eres asistente del desarrollador frontend de resultados de jaibaSpace, equipo del NASA Space Apps Challenge 2026 en el reto *Field Shift*. Construye la pantalla que pinta la `salida` de `comparar()` (sección 7 de `docs/contrato-datos.md`): las **3 estrategias de dos ciclos ordenadas** (actual, rotación con cobertura y rotación con otro grano), el **«¿Por qué?»** de cada una (razón, evidencia NASA, beneficios, riesgos y lo que falta confirmar) y una vista de **cómo se compara la zona del productor con el resto de la Península de Yucatán**. También prepara el **guion de la demo**, incluido el modo avión. El contexto completo está en `docs/00-contexto-general.md`. El usuario es un productor de temporal desde su teléfono: lenguaje simple, sin tecnicismos.

## Entregable del día

> La pantalla «Tus opciones» con el ranking, el detalle de cada estrategia y su calendario; la vista «Tu zona en la península»; y el recorrido de la demo ensayado en modo avión.

## Empieza ya con datos falsos

Trabaja desde el primer minuto con `app/fixtures/salida-ejemplo.json`. Cuando el motor esté listo, solo cambias la fuente del objeto.

## Las 3 estrategias que vas a mostrar (contrato v0.3)

| Plan | Primer ciclo | Segundo ciclo | Objetivo | Cosechas de maíz |
|---|---|---|---|---|
| **Tu plan actual** (`actual`) | Maíz | Maíz | Cosechar maíz en ambos ciclos | 2 |
| **Rotación con cobertura** (`cobertura`) | Canavalia (cobertura) | Maíz | Cubrir el suelo un ciclo antes de volver al maíz | 1 |
| **Rotación con otro grano** (`otro-grano`) | Frijol caupí | Maíz | Cosechar un grano distinto en el primer ciclo | 1 (más 1 de caupí) |

- La actual es **cultivo continuo** y sirve de **referencia**. Las otras dos son **rotaciones**.
- **Lo que debe verse sin abrir nada:** el cultivo de cada ciclo, cuántas cosechas de maíz da el plan (`cosechasMaiz`) y que la cobertura **no tiene cosecha de maíz en el ciclo 1**.
- El maíz del ciclo 2 es igual en los tres planes. Si las fechas coinciden, su exposición a sequía es la misma, y eso se muestra como **empate**, no como derrota.

## La pantalla «Tus opciones»

Maqueta. El orden, los puntajes y la recomendación los calcula el motor del Rol 4 y están **pendientes de recalcular** para v0.3. No los inventes en la interfaz.

```
┌─────────────────────────────────────┐
│ Zona: Noroeste de Yucatán (0 km)    │
│ Suelo: Tsek'el · Prioridad: agua    │
│ ★ Recomendada: (comparacion.mensaje)│
├─────────────────────────────────────┤
│ Rotación con cobertura       ★      │
│  Ciclo 1  Canavalia · cobertura     │
│           (sin cosecha de maíz)     │
│  Ciclo 2  Maíz                      │
│  Cosechas de maíz: 1                │
│  Suelo ✓ Mejor · Nitrógeno ✓ Mejor  │
│  [ ¿Por qué? ]                      │
├─────────────────────────────────────┤
│ Rotación con otro grano             │
│  Ciclo 1  Frijol caupí · grano      │
│  Ciclo 2  Maíz                      │
│  Cosechas de maíz: 1 (+1 de caupí)  │
│  Ingreso ✓ Mejor                    │
├─────────────────────────────────────┤
│ Tu plan actual (referencia)         │
│  Ciclo 1  Maíz   Ciclo 2  Maíz      │
│  Cosechas de maíz: 2                │
│  ⚠ Suelo descubierto en secas       │
├─────────────────────────────────────┤
│ [ Cambiar prioridad ] [ Otra zona ] │
│ Comparación histórica; no predice   │
│ cosechas. Apoya tu decisión, no la  │
│ reemplaza.                          │
└─────────────────────────────────────┘
```

### Elementos obligatorios

1. **Encabezado:** zona y distancia, suelo y prioridad (con los nombres en lenguaje simple), y `comparacion.mensaje`. Si `recomendados` tiene más de un plan, dilo: «Estas opciones quedan prácticamente empatadas».
2. **Una tarjeta por estrategia**, en el orden de `ranking`:
   - nombre, `objetivo`, `descripcionCorta` y puntaje total; la actual se llama «Tu plan actual (referencia)»,
   - **los dos ciclos** con su cultivo y propósito, y **cuántas cosechas de maíz** da el plan (`cosechasMaiz`). Si un ciclo es de cobertura, dilo: «sin cosecha de maíz»,
   - estrella o insignia «Recomendada» si está en `recomendados`,
   - insignias «Mejor» en los criterios donde aparece en `comparacion.porCriterio.<criterio>.mejores`; si `sinDiferencia` es `true`, no pongas insignia en ese criterio,
   - el riesgo principal (el primero de `riesgos`) con ícono de advertencia.
3. **Calendario por ciclo:** una fila para el **ciclo 1** y otra para el **ciclo 2** (`calendario[].ciclo`), cada una con su barra desde `siembra` hasta `cosecha`, las `etapasCriticas` marcadas y los **meses descubiertos en gris**. Es la respuesta directa a «cuándo queda desnudo el campo». En un ciclo de cobertura, la barra termina cuando se corta o incorpora la canavalia, no en una cosecha.
4. **«¿Por qué?»** (al tocar la tarjeta), con 5 bloques que responden a lo que pide el reto:
   - **Por qué:** `porQue`.
   - **Evidencia:** la explicación de cada criterio y los `datosNasa` (descripción, parámetro y fecha de corte). Plegable: «Ver años con rachas secas», con `evidencia` en este formato: «2025: racha de 12 días (6–17 jun), 3 días durante el establecimiento del maíz».
   - **Beneficios:** `beneficios`.
   - **Riesgos que debes revisar con un técnico:** `riesgos`.
   - **Falta confirmar en tu parcela:** `faltaConfirmar`.
5. **Pie:** `fuentes.lluvia` y `fuentes.temperatura` con enlace, fecha de descarga, `avisos`, `datosPendientes` y, si la parcela es de ejemplo, «Dato de ejemplo».

### La vista «Tu zona en la península»

Con `cargarResumenPeninsula()` del Rol 4 (los `resumen` de cada `clima/*.json`):

- Una fila o barra por zona con la **mediana de la racha seca más larga de junio a agosto** y la **lluvia de junio a agosto**. Resalta la zona del productor.
- Un texto que conteste: «¿Mi zona es más seca o más húmeda que el resto?».
- Si sobra tiempo, el mapa SVG del Rol 5 con las zonas coloreadas por racha seca (con etiqueta de texto, no solo color).

Esta vista muestra el hallazgo central para el pitch: **Quintana Roo llueve más al año pero tiene las rachas secas de verano más largas**.

### Ayuda «¿Qué significa?»

Un botón pequeño junto a los términos, con 1 o 2 frases (textos del Rol 3):
- **racha seca:** varios días seguidos con menos de 1 mm de lluvia,
- **días críticos:** los días en que el cultivo más sufre si le falta agua (establecimiento y floración),
- **IMERG y MERRA‑2:** estimaciones de lluvia y temperatura hechas con satélites y modelos de la NASA,
- **dato satelital contra dato de campo:** el satélite mide una zona de unos 10 km (lluvia) o 50 km (temperatura); tu parcela puede ser distinta,
- **fijador de nitrógeno**, **cultivo de cobertura**,
- **rotación contra asociación:** rotación es cambiar de cultivo de un ciclo al siguiente (caupí y luego maíz); asociación es sembrar dos cultivos juntos en el mismo ciclo (maíz y frijol a la vez). La app compara rotaciones.

### Reglas de presentación

- **No inventes números.** Todo sale de `salida`.
- Cambia proporciones por frecuencias: «6 de cada 42 días» se entiende mejor que «0.145».
- Fechas en español: «31 dic 2025». Usa `toLocaleDateString('es-MX')`.
- No uses solo el color: agrega «Mejor», «Recomendada» o un ícono con etiqueta. Mantén contraste AA.
- A 360 px de ancho las tarjetas se apilan. Si quieres comparar dos estrategias lado a lado, que sea opcional.
- Botón «Cambiar prioridad» (recalcula ahí mismo) y «Otra zona» (vuelve a la captura con el selector de zona).

## Guion de la demo (3–4 minutos)

Prepáralo y ensáyalo con la app **ya instalada** en el teléfono de la demo.

1. **El problema (20 s):** «Un productor de maíz de temporal en la península tiene que decidir si cambia su rotación. El total de lluvia engaña.»
2. **Dato NASA (30 s):** «En el noroeste de Yucatán, 2022 y 2025 tuvieron casi la misma lluvia de junio a agosto (488 contra 469 mm), pero en 2025 hubo una racha seca de 12 días, más del doble. Dato de GPM IMERG vía NASA POWER.»
3. **Mi parcela (30 s):** carga el ejemplo (señala «Dato de ejemplo»), muestra la zona y la distancia, elige suelo *tsek'el* y prioridad «Cuidar el agua».
4. **Tus opciones (60 s):** recorre las 3 estrategias: ciclo 1 y ciclo 2 de cada una, cuántas cosechas de maíz da cada plan (2, 1 y 1 más caupí), que la cobertura no cosecha maíz en el ciclo 1, los meses descubiertos en gris y el empate del maíz del ciclo 2.
5. **¿Por qué? (30 s):** abre una estrategia: razón, dato NASA con fecha, beneficios, riesgos y lo que falta confirmar.
6. **Cambiar prioridad (20 s):** cambia a «Cuidar el suelo» y luego a «Tener más ingreso», y muestra cómo cambia el orden. Los resultados exactos salen del motor recalculado para v0.3.
7. **Otra zona (30 s):** cambia a la zona maya de Quintana Roo con la misma parcela: los mismos planes tienen el doble o el triple de días críticos en racha seca y aparece la advertencia de riesgo. Muestra la vista de la península: «Aquí llueve más al año, pero el verano trae rachas secas más largas».
8. **Modo avión (20 s):** activa modo avión, cierra y reabre la app, y repite la comparación.
9. **Cierre (20 s):** «No reemplaza al productor ni al técnico: le muestra patrones con datos de la NASA para que decida mejor.» Lo que sigue: humedad del suelo SMAP, más rotaciones, validación en campo.

> El paso 7 viene del cálculo exploratorio de v0.2 para el maíz, con reglas provisionales. El paso 6 depende del motor recalculado para las 3 estrategias de v0.3. Verifica los dos con el motor real y ajusta el guion.

### Lista de verificación antes de la demo

- [ ] La app está instalada y se abrió al menos una vez con conexión, para llenar la caché (las 7 zonas).
- [ ] El modo avión se probó **antes** de subir al escenario, incluido el cambio de zona.
- [ ] Los resultados de los pasos 6 y 7 coinciden con el motor real.
- [ ] Brillo al máximo y notificaciones desactivadas.
- [ ] Respaldo: video corto grabado del flujo completo por si falla el teléfono.

## Con quién te coordinas

| Rol | Qué recibes o entregas |
|---|---|
| Rol 4 | La `salida` real y `cargarResumenPeninsula()`. Si falta un campo, pídelo y que el líder lo agregue al contrato. |
| Rol 5 | La navegación entre «Mi parcela» y resultados, el selector de zona y, si existe, el mapa SVG |
| Rol 2 | Los números para el pitch (2022 contra 2025, tabla de la península) |
| Rol 3 | Textos de cada estrategia y de la ayuda «¿Qué significa?» |
| Rol 1 | La URL final y la versión desplegada para la demo |

## Criterios de terminado

- [ ] Las 3 estrategias se ven ordenadas y legibles a 360 px de ancho, con sus dos ciclos y sus cosechas de maíz.
- [ ] Cada estrategia muestra por qué, evidencia, beneficios, riesgos y lo que falta confirmar.
- [ ] El calendario muestra los meses con el suelo descubierto.
- [ ] Se ven la zona, la distancia, los datos de la NASA con su parámetro y fecha de corte.
- [ ] Los empates se muestran como empate.
- [ ] «Falta confirmar», «Dato de ejemplo» y «apoya, no reemplaza» están visibles.
- [ ] El guion de la demo está ensayado, incluido el modo avión.
