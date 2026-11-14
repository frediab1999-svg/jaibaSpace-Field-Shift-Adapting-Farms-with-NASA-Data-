# Rol 6 — Frontend y resultados

> **Para tu IA:** eres asistente del desarrollador frontend de resultados de jaibaSpace, equipo del NASA Space Apps Challenge 2026 en el reto *Field Shift*. Construye la pantalla que pinta la `salida` de `comparar()` (sección 7 de `docs/contrato-datos.md`): las **4 estrategias de rotación ordenadas**, el **«¿Por qué?»** de cada una (razón, evidencia NASA, beneficios, riesgos y lo que falta confirmar) y una vista de **cómo se compara la zona del productor con el resto de la Península de Yucatán**. También prepara el **guion de la demo**, incluido el modo avión. El contexto completo está en `docs/00-contexto-general.md`. El usuario es un productor de temporal desde su teléfono: lenguaje simple, sin tecnicismos.

## Entregable del día

> La pantalla «Tus opciones» con el ranking, el detalle de cada estrategia y su calendario; la vista «Tu zona en la península»; y el recorrido de la demo ensayado en modo avión.

## Empieza ya con datos falsos

Trabaja desde el primer minuto con `app/fixtures/salida-ejemplo.json`. Cuando el motor esté listo, solo cambias la fuente del objeto.

## La pantalla «Tus opciones»

```
┌─────────────────────────────────────┐
│ Zona: Noroeste de Yucatán (0 km)    │
│ Suelo: Tsek'el · Prioridad: agua    │
│                                     │
│ ★ Recomendadas (empate)             │
│ «La cobertura y la milpa quedan     │
│  prácticamente empatadas…»          │
├─────────────────────────────────────┤
│ 1. Maíz + cobertura        0.78 ★   │
│    [ene ··· jun▓▓▓▓▓▓▓▓▓ feb ··· ]  │
│    Sequía ✓ Mejor · Suelo ✓ Mejor   │
│    [ ¿Por qué? ]                    │
├─────────────────────────────────────┤
│ 2. Milpa                   0.77 ★   │
│    [ene ··· jun▓▓▓▓▓oct ······· ]   │
│    Sequía ✓ Mejor · Ingreso ✓ Mejor │
├─────────────────────────────────────┤
│ 3. Maíz precoz + relevo    0.71     │
│    ⚠ Sequía: 15 de 42 días críticos │
├─────────────────────────────────────┤
│ 4. Tu plan actual          0.68     │
│    Suelo descubierto 7 meses        │
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
   - nombre, `descripcionCorta` y puntaje total; la actual se llama «Tu plan actual»,
   - estrella o insignia «Recomendada» si está en `recomendados`,
   - insignias «Mejor» en los criterios donde aparece en `comparacion.porCriterio.<criterio>.mejores`; si `sinDiferencia` es `true`, no pongas insignia en ese criterio,
   - el riesgo principal (el primero de `riesgos`) con ícono de advertencia.
3. **Calendario de 12 meses por estrategia:** una barra por ciclo desde `calendario[].siembra` hasta `cosecha`, con las `etapasCriticas` marcadas y los **meses descubiertos en gris**. Es la respuesta directa a «cuándo queda desnudo el campo».
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
- **fijador de nitrógeno**, **cultivo de cobertura**, **siembra de relevo**.

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
4. **Tus opciones (60 s):** recorre el ranking, el empate entre cobertura y milpa, los meses descubiertos en gris y el riesgo del relevo.
5. **¿Por qué? (30 s):** abre una estrategia: razón, dato NASA con fecha, beneficios, riesgos y lo que falta confirmar.
6. **Cambiar prioridad (20 s):** cambia a «Cuidar el suelo»: ahora la cobertura gana sola. Luego a «Tener más ingreso»: empatan milpa y relevo.
7. **Otra zona (30 s):** cambia a la zona maya de Quintana Roo con la misma parcela: los mismos planes tienen el doble o el triple de días críticos en racha seca y aparece la advertencia de riesgo. Muestra la vista de la península: «Aquí llueve más al año, pero el verano trae rachas secas más largas».
8. **Modo avión (20 s):** activa modo avión, cierra y reabre la app, y repite la comparación.
9. **Cierre (20 s):** «No reemplaza al productor ni al técnico: le muestra patrones con datos de la NASA para que decida mejor.» Lo que sigue: humedad del suelo SMAP, más estrategias, validación en campo.

> Los resultados de los pasos 6 y 7 salen del cálculo exploratorio con las reglas provisionales. Verifícalos con el motor real y ajusta el guion si cambian.

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

- [ ] Las 4 estrategias se ven ordenadas y legibles a 360 px de ancho.
- [ ] Cada estrategia muestra por qué, evidencia, beneficios, riesgos y lo que falta confirmar.
- [ ] El calendario muestra los meses con el suelo descubierto.
- [ ] Se ven la zona, la distancia, los datos de la NASA con su parámetro y fecha de corte.
- [ ] Los empates se muestran como empate.
- [ ] «Falta confirmar», «Dato de ejemplo» y «apoya, no reemplaza» están visibles.
- [ ] El guion de la demo está ensayado, incluido el modo avión.
